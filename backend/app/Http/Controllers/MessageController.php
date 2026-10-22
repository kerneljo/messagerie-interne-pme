<?php

namespace App\Http\Controllers;

use App\Events\MessageEnvoye;
use App\Events\UtilisateurEcrit;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Utilisateur;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
    private const CATEGORIES = ['NORMAL', 'INFORMATION', 'ACTION_REQUISE', 'URGENT'];

    /** Messages d'une conversation. Pagination vers le passe : ?avant=<reference_message>&limite=30 */
    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);
        $u = $request->user();
        $limite = max(1, min((int) $request->query('limite', 30), 100));

        $requete = $conversation->messages()
            ->with(['expediteur', 'fichiers', 'parent.expediteur'])
            ->withCount('lecteurs')
            ->withExists(['lecteurs as lu_par_moi' => fn ($q) => $q->where('lecture_message.matricule', $u->matricule)]);

        if ($request->filled('avant')) {
            $requete->where('reference_message', '<', (int) $request->query('avant'));
        }

        $messages = $requete->orderByDesc('reference_message')->limit($limite)->get()->reverse()->values();
        $extras = self::enrichir($messages, (int) $u->matricule, $conversation);

        return response()->json([
            'messages' => $messages
                ->map(fn ($m) => self::presenter($m, $extras[$m->reference_message] ?? null))
                ->values(),
            'peut_charger_plus' => $messages->count() === $limite,
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('ecrire', $conversation);
        $u = $request->user();

        $data = $request->validate([
            'contenu' => ['nullable', 'string', 'max:5000'],
            'categorie' => ['nullable', Rule::in(self::CATEGORIES)],
            'echeance' => ['nullable', 'date', 'after:now'],
            'reference_message_parent' => ['nullable', 'integer',
                Rule::exists('message', 'reference_message')
                    ->where('reference_conversation', $conversation->reference_conversation)],
            'fichiers' => ['nullable', 'array', 'max:5'],
            'fichiers.*' => ['file', 'max:10240',
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,txt,csv,png,jpg,jpeg,gif,webp'],
        ]);

        $contenu = trim((string) ($data['contenu'] ?? ''));
        $fichiers = Arr::wrap($request->file('fichiers', []));

        if ($contenu === '' && count($fichiers) === 0) {
            throw ValidationException::withMessages([
                'contenu' => 'Un message doit contenir du texte ou au moins un fichier.',
            ]);
        }

        // Une échéance n'a de sens que pour un message qui attend un accusé
        $categorie = $data['categorie'] ?? 'NORMAL';
        $echeance = in_array($categorie, SuiviController::CATEGORIES_AVEC_ACCUSE, true) && ! empty($data['echeance'])
            ? Carbon::parse($data['echeance'])
            : null;

        $stockes = [];
        try {
            $message = DB::transaction(function () use ($conversation, $u, $contenu, $data, $fichiers, $categorie, $echeance, &$stockes) {
                $m = new Message();
                $m->forceFill([
                    'contenu' => $contenu !== '' ? $contenu : null,
                    'matricule_expediteur' => $u->matricule,
                    'reference_conversation' => $conversation->reference_conversation,
                    'reference_message_parent' => $data['reference_message_parent'] ?? null,
                    'categorie' => $categorie,
                    'echeance' => $echeance,
                ])->save();

                foreach ($fichiers as $f) {
                    $taille = $f->getSize();
                    $mime = $f->getMimeType() ?: 'application/octet-stream';
                    $hash = hash_file('sha256', $f->getRealPath());
                    $nom = self::nettoyerNom($f->getClientOriginalName());

                    // Disque prive (storage/app/private), nom aleatoire : jamais accessible directement par URL
                    $chemin = $f->store('messagerie', 'local');
                    $stockes[] = $chemin;

                    $m->fichiers()->create([
                        'nom_original' => $nom,
                        'nom_stocke' => $chemin,
                        'type_mime' => $mime,
                        'taille' => $taille,
                        'hash_sha256' => $hash,
                    ]);
                }

                return $m;
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($stockes); // pas de fichier orphelin si la base echoue
            throw $e;
        }

        $message->refresh()->load(['expediteur', 'fichiers', 'parent.expediteur']);
        $message->loadCount('lecteurs');

        $details = "message #{$message->reference_message} dans conversation #{$conversation->reference_conversation}";
        if ($categorie !== 'NORMAL') {
            $details .= " ({$categorie})";
        }
        Audit::log('ENVOI_MESSAGE', $u->matricule, $details);

        foreach ($message->fichiers as $f) {
            Audit::log('ENVOI_FICHIER', $u->matricule,
                "fichier #{$f->reference_fichier} ({$f->nom_original}) dans message #{$message->reference_message}");
        }

        // ✅ Génération de notifications claires et explicites
        if ($categorie !== 'NORMAL') {
            // Correction de l'ambiguïté sur la colonne matricule
            $destinataires = $conversation->participants()
                ->where('participant.matricule', '!=', $u->matricule)
                ->pluck('participant.matricule');

            // Préparation du texte de la notification
            $nomExpediteur = trim($u->prenom . ' ' . $u->nom);
            $contexte = $conversation->type === 'DIRECT' ? '' : " dans le groupe {$conversation->titre}";

            $libelleCategorie = match($categorie) {
                'URGENT' => 'un message urgent',
                'ACTION_REQUISE' => 'une action requise',
                'INFORMATION' => 'une information',
                default => 'un message',
            };

            // Si le message contient du texte, on l'affiche. Sinon, on indique une pièce jointe.
            $apercuContenu = $contenu !== '' ? ": « " . Str::limit($contenu, 100) . " »" : " avec une pièce jointe.";

            $extrait = "{$nomExpediteur} vous a envoyé {$libelleCategorie}{$contexte}{$apercuContenu}";

            $typeNotif = match($categorie) {
                'URGENT', 'ACTION_REQUISE' => 'action_requise',
                'INFORMATION' => 'information',
                default => 'message',
            };

            foreach ($destinataires as $matricule) {
                Notification::create([
                    'matricule_destinataire' => $matricule,
                    'type' => $typeNotif,
                    'reference_message' => $message->reference_message,
                    'reference_conversation' => $conversation->reference_conversation,
                    'extrait' => Str::limit($extrait, 250), // Limite de sécurité pour la BDD
                    'est_lue' => false,
                    'date_creation' => now(),
                ]);
            }
        }

        // ✅ Détection des mentions @
        if ($contenu !== '' && preg_match_all('/@([\wÀ-ÿ]+(?:\s+[\wÀ-ÿ]+)*)/', $contenu, $matches)) {
            foreach ($matches[1] as $nomComplet) {
                $mentionne = Utilisateur::whereRaw(
                    "CONCAT(prenom, ' ', nom) = ?", [trim($nomComplet)]
                )->first();

                if ($mentionne && $mentionne->matricule !== $u->matricule) {
                    // Eviter les doublons si le destinataire a deja recu une notif pour ce message
                    $existe = Notification::where('matricule_destinataire', $mentionne->matricule)
                        ->where('reference_message', $message->reference_message)
                        ->exists();

                    if (! $existe) {
                        $nomExpediteur = trim($u->prenom . ' ' . $u->nom);
                        $contexte = $conversation->type === 'DIRECT' ? '' : " dans le groupe {$conversation->titre}";
                        
                        Notification::create([
                            'matricule_destinataire' => $mentionne->matricule,
                            'type' => 'mention',
                            'reference_message' => $message->reference_message,
                            'reference_conversation' => $conversation->reference_conversation,
                            'extrait' => Str::limit("{$nomExpediteur} vous a mentionné{$contexte} : « " . Str::limit($contenu, 100) . " »", 250),
                            'est_lue' => false,
                            'date_creation' => now(),
                        ]);
                    }
                }
            }
        }

        // Diffusion temps réel aux autres participants
        broadcast(new MessageEnvoye($message))->toOthers();

        $extras = self::enrichir(collect([$message]), (int) $u->matricule, $conversation);

        return response()->json(self::presenter($message, $extras[$message->reference_message] ?? null), 201);
    }

    public function update(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('modifier', $message);

        $data = $request->validate(['contenu' => ['required', 'string', 'max:5000']]);

        if ($data['contenu'] !== $message->contenu) {
            DB::transaction(function () use ($message, $data) {
                // L'ancien contenu est conservé : consultable par les participants, jamais par l'audit
                DB::table('message_version')->insert([
                    'reference_message' => $message->reference_message,
                    'contenu' => $message->contenu,
                    'date_version' => now(),
                ]);

                $message->update(['contenu' => $data['contenu'], 'date_modification' => now()]);
            });

            Audit::log('MODIF_MESSAGE', $request->user()->matricule, "message #{$message->reference_message}");
        }

        $message->load(['expediteur', 'fichiers', 'parent.expediteur']);
        $message->loadCount('lecteurs');
        $extras = self::enrichir(collect([$message]), (int) $request->user()->matricule, $message->conversation);

        return response()->json(self::presenter($message, $extras[$message->reference_message] ?? null));
    }

    /** Suppression logique (est_supprime = true). */
    public function destroy(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('supprimer', $message);

        $message->update(['est_supprime' => true]);

        Audit::log('SUPPR_MESSAGE', $request->user()->matricule, "message #{$message->reference_message}");

        return response()->json(['message' => 'Message supprime.']);
    }

    /** Marque comme lus tous les messages recus (non envoyes par moi) de la conversation. */
    public function marquerLus(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);
        $u = $request->user();

        $ids = $conversation->messages()
            ->where('matricule_expediteur', '<>', $u->matricule)
            ->whereDoesntHave('lecteurs', fn ($q) => $q->where('lecture_message.matricule', $u->matricule))
            ->pluck('reference_message');

        if ($ids->isNotEmpty()) {
            DB::table('lecture_message')->insertOrIgnore(
                $ids->map(fn ($id) => ['reference_message' => $id, 'matricule' => $u->matricule])->all()
            );
        }

        return response()->json(['marques' => $ids->count()]);
    }

    /** Signale aux autres participants qu'un utilisateur est en train d'écrire. */
    public function typing(Request $request, Conversation $conversation): Response
    {
        Gate::authorize('ecrire', $conversation);
        $u = $request->user();

        broadcast(new UtilisateurEcrit(
            (int) $conversation->reference_conversation,
            (int) $u->matricule,
            trim($u->prenom . ' ' . $u->nom),
        ))->toOthers();

        return response()->noContent();
    }

    private static function enrichir(Collection $messages, int $moi, Conversation $conversation): array
    {
        $concernes = $messages->filter(
            fn ($m) => in_array($m->categorie, SuiviController::CATEGORIES_AVEC_ACCUSE, true)
        );

        if ($concernes->isEmpty()) {
            return [];
        }

        $prises = DB::table('prise_en_compte')
            ->whereIn('reference_message', $concernes->pluck('reference_message')->all())
            ->get()
            ->groupBy('reference_message');

        $attendus = max($conversation->participants()->count() - 1, 0);
        $extras = [];

        foreach ($concernes as $m) {
            $lignes = $prises->get($m->reference_message, collect());

            if ((int) $m->matricule_expediteur === $moi) {
                $extras[$m->reference_message] = ['suivi' => [
                    'attendus' => $attendus,
                    'lus' => (int) ($m->lecteurs_count ?? 0),
                    'pris_en_compte' => $lignes->count(),
                    'fait' => $lignes->where('statut', 'FAIT')->count(),
                ]];
            } else {
                $maLigne = $lignes->firstWhere('matricule', $moi);
                $extras[$m->reference_message] = ['ma_prise_en_compte' => $maLigne ? [
                    'statut' => $maLigne->statut,
                    'date_statut' => Carbon::parse($maLigne->date_statut)->toIso8601String(),
                ] : null];
            }
        }

        return $extras;
    }

    public static function presenter(Message $m, ?array $extra = null): array
    {
        return [
            'reference_message' => $m->reference_message,
            'reference_conversation' => $m->reference_conversation,
            'contenu' => $m->contenu,
            'date_envoi' => $m->date_envoi?->toIso8601String(),
            'date_modification' => $m->date_modification?->toIso8601String(),
            'categorie' => $m->categorie ?? 'NORMAL',
            'echeance' => $m->echeance ? Carbon::parse($m->echeance)->toIso8601String() : null,
            'expediteur' => $m->expediteur ? [
                'matricule' => $m->expediteur->matricule,
                'nom' => $m->expediteur->nom,
                'prenom' => $m->expediteur->prenom,
                'photo_url' => $m->expediteur->photo_url,
            ] : null,
            'reponse_a' => $m->parent ? [
                'reference_message' => $m->parent->reference_message,
                'apercu' => Str::limit((string) $m->parent->contenu, 80),
                'expediteur' => $m->parent->expediteur
                    ? $m->parent->expediteur->prenom . ' ' . $m->parent->expediteur->nom : null,
            ] : null,
            'fichiers' => $m->fichiers->map(fn ($f) => [
                'reference_fichier' => $f->reference_fichier,
                'nom_original' => $f->nom_original,
                'type_mime' => $f->type_mime,
                'taille' => $f->taille,
            ])->values(),
            'lu_par_moi' => (bool) ($m->lu_par_moi ?? false),
            'nb_lecteurs' => (int) ($m->lecteurs_count ?? 0),
            'ma_prise_en_compte' => $extra['ma_prise_en_compte'] ?? null,
            'suivi' => $extra['suivi'] ?? null,
            'reactions' => \App\Http\Controllers\ReactionController::agreger($m),
        ];
    }

    private static function nettoyerNom(string $nom): string
    {
        $nom = basename(str_replace('\\', '/', $nom));
        $nom = preg_replace('/[\x00-\x1F\x7F]/', '', $nom) ?? '';

        return Str::limit($nom !== '' ? $nom : 'fichier', 200, '');
    }
}