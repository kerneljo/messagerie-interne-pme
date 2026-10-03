<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
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

        return response()->json([
            'messages' => $messages->map(fn ($m) => self::presenter($m))->values(),
            'peut_charger_plus' => $messages->count() === $limite,
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('ecrire', $conversation);
        $u = $request->user();

        $data = $request->validate([
            'contenu' => ['nullable', 'string', 'max:5000'],
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

        $stockes = [];
        try {
            $message = DB::transaction(function () use ($conversation, $u, $contenu, $data, $fichiers, &$stockes) {
                $m = Message::create([
                    'contenu' => $contenu !== '' ? $contenu : null,
                    'matricule_expediteur' => $u->matricule,
                    'reference_conversation' => $conversation->reference_conversation,
                    'reference_message_parent' => $data['reference_message_parent'] ?? null,
                ]);

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

        Audit::log('ENVOI_MESSAGE', $u->matricule,
            "message #{$message->reference_message} dans conversation #{$conversation->reference_conversation}");
        foreach ($message->fichiers as $f) {
            Audit::log('ENVOI_FICHIER', $u->matricule,
                "fichier #{$f->reference_fichier} ({$f->nom_original}) dans message #{$message->reference_message}");
        }

        return response()->json(self::presenter($message), 201);
    }

    public function update(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('modifier', $message);

        $data = $request->validate(['contenu' => ['required', 'string', 'max:5000']]);

        $message->update(['contenu' => $data['contenu'], 'date_modification' => now()]);
        $message->load(['expediteur', 'fichiers', 'parent.expediteur']);

        Audit::log('MODIF_MESSAGE', $request->user()->matricule, "message #{$message->reference_message}");

        return response()->json(self::presenter($message));
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

    public static function presenter(Message $m): array
    {
        return [
            'reference_message' => $m->reference_message,
            'reference_conversation' => $m->reference_conversation,
            'contenu' => $m->contenu,
            'date_envoi' => $m->date_envoi?->toIso8601String(),
            'date_modification' => $m->date_modification?->toIso8601String(),
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
