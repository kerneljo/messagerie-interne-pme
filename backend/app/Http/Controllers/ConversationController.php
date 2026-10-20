<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Utilisateur;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConversationController extends Controller
{
    // Même règle que l'interface : au-delà, l'envoi individuel groupé est refusé
    private const ROLES_SANS_LIMITE = ['Administrateur', 'Manager'];
    private const LIMITE_ENVOI_INDIVIDUEL = 10;

    /** Mes conversations, avec messages non lus, aperçu du dernier message, triées par activité. */
    public function index(Request $request): JsonResponse
    {
        $u = $request->user();

        $conversations = $u->conversations()
            ->with(['participants.poste', 'participants.service'])
            ->withCount(['messages as non_lus' => function ($q) use ($u) {
                $q->where('message.matricule_expediteur', '<>', $u->matricule)
                    ->whereNotExists(function ($sub) use ($u) {
                        $sub->select(DB::raw(1))
                            ->from('lecture_message')
                            ->whereColumn('lecture_message.reference_message', 'message.reference_message')
                            ->where('lecture_message.matricule', $u->matricule);
                    });
            }])
            ->withMax('messages as derniere_activite', 'date_envoi')
            ->addSelect([
                'dernier_message' => Message::select('contenu')
                    ->whereColumn('message.reference_conversation', 'conversation.reference_conversation')
                    ->orderByDesc('reference_message')
                    ->limit(1),
                'dernier_message_expediteur' => Message::select('matricule_expediteur')
                    ->whereColumn('message.reference_conversation', 'conversation.reference_conversation')
                    ->orderByDesc('reference_message')
                    ->limit(1),
            ])
            ->orderByRaw('derniere_activite DESC NULLS LAST')
            ->get();

        return response()->json($conversations->map(fn ($c) => $this->presenter($c, $u))->values());
    }

    /**
     * Création d'une nouvelle discussion (logique unifiée).
     */
    public function creer(Request $request): JsonResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'participants' => ['required', 'array', 'min:1', 'max:200'],
            'participants.*' => ['integer', 'distinct',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
            'creer_groupe' => ['boolean'],
            'titre' => ['required_if:creer_groupe,true', 'nullable', 'string', 'max:150'],
        ]);

        $destinataires = collect($data['participants'])
            ->map(fn ($m) => (int) $m)
            ->reject(fn ($m) => $m === (int) $u->matricule)
            ->unique()
            ->values();

        if ($destinataires->isEmpty()) {
            throw ValidationException::withMessages([
                'participants' => 'Vous devez sélectionner au moins un destinataire.',
            ]);
        }

        // Un groupe compte au moins trois personnes, vous compris
        if (! empty($data['creer_groupe']) && $destinataires->count() < 2) {
            throw ValidationException::withMessages([
                'participants' => 'Un groupe doit compter au moins deux autres participants.',
            ]);
        }

        // Envoi individuel à plusieurs personnes : plafond selon le rôle (même règle que l'interface)
        if (empty($data['creer_groupe']) && $destinataires->count() > 1) {
            $limite = in_array($u->role?->libelle, self::ROLES_SANS_LIMITE, true)
                ? 200
                : self::LIMITE_ENVOI_INDIVIDUEL;

            if ($destinataires->count() > $limite) {
                throw ValidationException::withMessages([
                    'participants' => "Votre rôle permet d'écrire à {$limite} personnes au maximum en une fois.",
                ]);
            }
        }

        // CAS 1 — Un seul destinataire → conversation DIRECT
        if ($destinataires->count() === 1) {
            $idDestinataire = (int) $destinataires->first();

            $conversation = DB::transaction(function () use ($u, $idDestinataire) {
                return $this->trouverOuCreerDirect($u, $idDestinataire);
            });
            $conversation->refresh();

            Audit::log('OUVERTURE_CONVERSATION', $u->matricule,
                "conversation #{$conversation->reference_conversation} (DIRECT)");

            return response()->json([
                'type' => 'DIRECT',
                'nombre' => 1,
                'conversation' => $this->presenter($conversation->load('participants.poste'), $u),
            ], 201);
        }

        // CAS 2 — Plusieurs destinataires + créer un groupe
        if (! empty($data['creer_groupe'])) {
            $membres = $destinataires
                ->push((int) $u->matricule)
                ->unique()
                ->values();

            $conversation = DB::transaction(function () use ($data, $u, $membres) {
                $c = Conversation::create([
                    'titre' => $data['titre'],
                    'type' => 'GROUPE',
                    'matricule_createur' => $u->matricule,
                ]);
                // Le créateur devient ADMIN, les autres MEMBRE
                $attach = $membres->mapWithKeys(fn ($m) => [
                    $m => ['role' => $m === (int) $u->matricule ? 'ADMIN' : 'MEMBRE'],
                ])->all();
                $c->participants()->attach($attach);

                return $c;
            });
            $conversation->refresh();

            Audit::log('CREATION_GROUPE', $u->matricule,
                "conversation #{$conversation->reference_conversation} : {$conversation->titre}");

            return response()->json([
                'type' => 'GROUPE',
                'nombre' => 1,
                'conversation' => $this->presenter($conversation->load('participants.poste'), $u),
            ], 201);
        }

        // CAS 3 — Plusieurs destinataires sans groupe → DIFFUSION 1→N
        $conversations = DB::transaction(function () use ($u, $destinataires) {
            $resultat = [];
            foreach ($destinataires as $idDestinataire) {
                $resultat[] = $this->trouverOuCreerDirect($u, $idDestinataire);
            }
            return $resultat;
        });

        Audit::log('OUVERTURE_DIFFUSION', $u->matricule,
            count($conversations) . " conversation(s)");

        return response()->json([
            'type' => 'DIFFUSION',
            'nombre' => count($conversations),
            'conversations' => collect($conversations)->map(
                fn ($c) => $this->presenter($c->fresh('participants.poste'), $u)
            )->values(),
        ], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);

        return response()->json($this->presenter($conversation->load('participants.poste'), $request->user()));
    }

    // ============================================================
    // GESTION DU GROUPE
    // ============================================================

    public function update(Request $request, Conversation $conversation): JsonResponse
    {
        $u = $request->user();

        if ($conversation->type !== 'GROUPE') {
            return response()->json(['message' => 'Action réservée aux groupes.'], 422);
        }

        if ((int) $conversation->matricule_createur !== (int) $u->matricule) {
            return response()->json(['message' => 'Seul le créateur peut modifier ce groupe.'], 403);
        }

        $data = $request->validate([
            'titre' => ['sometimes', 'string', 'max:150'],
            'photo' => ['sometimes', 'image', 'max:5120'],
        ]);

        if (array_key_exists('titre', $data)) {
            $conversation->titre = trim($data['titre']);
        }

        if ($request->hasFile('photo')) {
            if ($conversation->photo_url) {
                $ancien = str_replace('/storage/', '', $conversation->photo_url);
                Storage::disk('public')->delete($ancien);
            }
            $chemin = $request->file('photo')->store('groupes', 'public');
            $conversation->photo_url = Storage::url($chemin);
        }

        $conversation->save();

        Audit::log('MAJ_GROUPE', $u->matricule,
            "conversation #{$conversation->reference_conversation}");

        return response()->json([
            'conversation' => $this->presenter($conversation->fresh()->load('participants.poste'), $u),
        ]);
    }

    public function promouvoirParticipant(Request $request, Conversation $conversation, int $matricule): JsonResponse
    {
        $u = $request->user();

        if ($conversation->type !== 'GROUPE') {
            return response()->json(['message' => 'Action réservée aux groupes.'], 422);
        }

        if ((int) $conversation->matricule_createur !== (int) $u->matricule) {
            return response()->json(['message' => 'Seul le créateur peut promouvoir un membre.'], 403);
        }

        $existe = $conversation->participants()
            ->where('utilisateur.matricule', $matricule)
            ->exists();

        if (! $existe) {
            return response()->json(['message' => 'Participant introuvable.'], 404);
        }

        $conversation->participants()->updateExistingPivot($matricule, [
            'role' => 'ADMIN',
        ]);

        Audit::log('PROMOTION_ADMIN', $u->matricule,
            "conversation #{$conversation->reference_conversation} : utilisateur #{$matricule}");

        return response()->json(['message' => 'Participant promu administrateur.']);
    }

    public function quitterGroupe(Request $request, Conversation $conversation): JsonResponse
    {
        $u = $request->user();

        if ($conversation->type !== 'GROUPE') {
            return response()->json(['message' => 'Action réservée aux groupes.'], 422);
        }

        if ((int) $conversation->matricule_createur === (int) $u->matricule) {
            return response()->json([
                'message' => 'Le créateur ne peut pas quitter le groupe. Transférez la propriété ou supprimez le groupe.',
            ], 422);
        }

        $conversation->participants()->detach($u->matricule);

        Audit::log('QUITTER_GROUPE', $u->matricule,
            "conversation #{$conversation->reference_conversation}");

        return response()->json(['message' => 'Vous avez quitté le groupe.']);
    }

    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        $u = $request->user();

        if ($conversation->type !== 'GROUPE') {
            return response()->json(['message' => 'Action réservée aux groupes.'], 422);
        }

        if ((int) $conversation->matricule_createur !== (int) $u->matricule) {
            return response()->json(['message' => 'Seul le créateur peut supprimer ce groupe.'], 403);
        }

        if ($conversation->photo_url) {
            $ancien = str_replace('/storage/', '', $conversation->photo_url);
            Storage::disk('public')->delete($ancien);
        }

        // Les lignes « fichier » partent avec les messages (cascade) : on relève d'abord les fichiers
        // physiques, pour ne pas les laisser orphelins sur le disque
        $chemins = DB::table('fichier')
            ->join('message', 'message.reference_message', '=', 'fichier.reference_message')
            ->where('message.reference_conversation', $conversation->reference_conversation)
            ->pluck('fichier.nom_stocke');
        $nbMessages = DB::table('message')
            ->where('reference_conversation', $conversation->reference_conversation)
            ->count();

        DB::transaction(function () use ($conversation) {
            $conversation->messages()->delete();
            $conversation->participants()->detach();
            $conversation->delete();
        });

        if ($chemins->isNotEmpty()) {
            Storage::disk('local')->delete($chemins->all());
        }

        Audit::log('SUPPRESSION_GROUPE', $u->matricule,
            "conversation #{$conversation->reference_conversation} : {$nbMessages} message(s), {$chemins->count()} fichier(s) supprimé(s)");

        return response()->json(['message' => 'Groupe supprimé.']);
    }
        /**
     * Supprimer une conversation pour l'utilisateur connecté uniquement.
     * Équivalent de "Supprimer la discussion" sur WhatsApp.
     * 
     * - Pour un GROUPE : l'utilisateur quitte simplement le groupe.
     * - Pour un DIRECT : si l'autre personne est encore là, on garde la conversation
     *   mais on détache l'utilisateur. Si plus personne n'est là, on supprime tout.
     */
    public function supprimerPourMoi(Request $request, Conversation $conversation): JsonResponse
    {
        $u = $request->user();

        if (! $conversation->aParticipant((int) $u->matricule)) {
            return response()->json(['message' => 'Conversation introuvable.'], 404);
        }

        // On retire l'utilisateur de la conversation
        $conversation->participants()->detach($u->matricule);

        // Si c'est un DIRECT et qu'il ne reste plus aucun participant, on nettoie tout
        if ($conversation->type === 'DIRECT' && $conversation->participants()->count() === 0) {
            // Relever les fichiers physiques avant suppression
            $chemins = DB::table('fichier')
                ->join('message', 'message.reference_message', '=', 'fichier.reference_message')
                ->where('message.reference_conversation', $conversation->reference_conversation)
                ->pluck('fichier.nom_stocke');

            DB::transaction(function () use ($conversation) {
                $conversation->messages()->delete();
                $conversation->delete();
            });

            if ($chemins->isNotEmpty()) {
                Storage::disk('local')->delete($chemins->all());
            }
        }

        Audit::log('SUPPRESSION_CONVERSATION', $u->matricule,
            "conversation #{$conversation->reference_conversation} ({$conversation->type})");

        return response()->json(['message' => 'Conversation supprimée.']);
    }

    // ============================================================
    // PARTICIPANTS
    // ============================================================

    /**
     * Ajouter un ou plusieurs participants.
     * ✅ Accessible à TOUT participant du groupe (pas seulement le créateur).
     */
    public function ajouterParticipant(Request $request, Conversation $conversation): JsonResponse
    {
        $u = $request->user();

        // ✅ Vérification : l'utilisateur doit être membre de la conversation
        if (! $conversation->aParticipant((int) $u->matricule)) {
            return response()->json(['message' => 'Vous ne faites pas partie de cette conversation.'], 403);
        }

        // Interdire l'ajout sur une conversation DIRECT ou DIFFUSION
        if ($conversation->type !== 'GROUPE') {
            return response()->json(['message' => 'On ne peut ajouter des participants qu\'à un groupe.'], 422);
        }

        $data = $request->validate([
            'matricule' => ['required_without:matricules', 'integer',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
            'matricules' => ['required_without:matricule', 'array'],
            'matricules.*' => ['integer', 'distinct',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
        ]);

        $matricules = $data['matricules'] ?? [(int) $data['matricule']];
        $matricules = collect($matricules)->map(fn ($m) => (int) $m)->unique()->values();

        $existants = $conversation->participants()->pluck('utilisateur.matricule')->all();
        $nouveaux = $matricules->reject(fn ($m) => in_array($m, $existants))->values();

        if (count($existants) + $nouveaux->count() > 200) {
            return response()->json(['message' => 'Un groupe est limité à 200 participants.'], 422);
        }

        if ($nouveaux->isNotEmpty()) {
            $attach = $nouveaux->mapWithKeys(fn ($m) => [$m => ['role' => 'MEMBRE']])->all();
            $conversation->participants()->attach($attach);
        }

        Audit::log('AJOUT_PARTICIPANT', $u->matricule,
            "conversation #{$conversation->reference_conversation} : " . $nouveaux->implode(', '));

        return response()->json([
            'conversation' => $this->presenter($conversation->fresh()->load('participants.poste'), $u),
        ]);
    }

    /**
     * Retirer un participant.
     * ✅ Réservé au créateur (via Gate::authorize).
     */
    public function retirerParticipant(Request $request, Conversation $conversation, int $matricule): JsonResponse
    {
        Gate::authorize('gererParticipants', $conversation);

        if ($matricule === (int) $conversation->matricule_createur) {
            return response()->json(['message' => 'Le créateur ne peut pas être retiré.'], 422);
        }

        $minimum = $conversation->type === 'GROUPE' ? 3 : 2;
        if ($conversation->participants()->count() - 1 < $minimum) {
            return response()->json([
                'message' => "Cette conversation doit garder au moins {$minimum} participants.",
            ], 422);
        }

        $conversation->participants()->detach($matricule);

        Audit::log('RETRAIT_PARTICIPANT', $request->user()->matricule,
            "conversation #{$conversation->reference_conversation} : utilisateur #{$matricule}");

        return response()->json($this->presenter($conversation->fresh()->load('participants.poste'), $request->user()));
    }

    public function ouvrirDirect(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        $moi = $request->user();

        if ((int) $moi->matricule === (int) $utilisateur->matricule) {
            return response()->json(['message' => 'Impossible d’ouvrir une conversation avec vous-même.'], 422);
        }

        if ($utilisateur->statut_compte !== 'actif') {
            return response()->json(['message' => 'Cet utilisateur n’est pas actif.'], 422);
        }

        $conversation = DB::transaction(function () use ($moi, $utilisateur) {
            return $this->trouverOuCreerDirect($moi, (int) $utilisateur->matricule);
        });
        $conversation->refresh();

        return response()->json(
            $this->presenter($conversation->load('participants.poste'), $moi)
        );
    }

    // ============================================================
    // Helpers
    // ============================================================

    private function trouverOuCreerDirect(Utilisateur $expediteur, int $idDestinataire): Conversation
    {
        // Deux demandes simultanées entre les mêmes personnes ne créent qu'une conversation
        // (verrou valable jusqu'à la fin de la transaction appelante)
        $a = min((int) $expediteur->matricule, $idDestinataire);
        $b = max((int) $expediteur->matricule, $idDestinataire);
        DB::select('select pg_advisory_xact_lock(hashtextextended(?::text, 0))', ["direct:{$a}:{$b}"]);

        $existante = Conversation::where('type', 'DIRECT')
            ->whereHas('participants', fn ($q) => $q->where('utilisateur.matricule', $expediteur->matricule))
            ->whereHas('participants', fn ($q) => $q->where('utilisateur.matricule', $idDestinataire))
            ->first();

        if ($existante) {
            return $existante;
        }

        $conv = Conversation::create([
            'titre' => null,
            'type' => 'DIRECT',
            'matricule_createur' => $expediteur->matricule,
        ]);
        $conv->participants()->attach([$expediteur->matricule, $idDestinataire]);

        return $conv;
    }

    private function presenter(Conversation $c, Utilisateur $u): array
    {
        $c->loadMissing(['participants.poste', 'participants.service']);

        $titre = $c->type === 'DIRECT'
            ? $c->participants->where('matricule', '!=', $u->matricule)
                ->map(fn ($p) => $p->prenom . ' ' . $p->nom)->implode(', ')
            : $c->titre;

        return [
            'reference_conversation' => $c->reference_conversation,
            'type' => $c->type,
            'titre' => $titre,
            'photo_url' => $c->photo_url ? asset('storage/' . Str::after($c->photo_url, '/storage/')) : null,
            'matricule_createur' => $c->matricule_createur,
            'date_creation' => $c->date_creation?->toIso8601String(),
            'participants' => $c->participants->map(fn ($p) => [
                'matricule' => $p->matricule,
                'nom' => $p->nom,
                'prenom' => $p->prenom,
                'photo_url' => $p->photo_url,
                'poste' => $p->poste?->libelle,
                'service' => is_object($p->service)
                    ? ($p->service->nom_service ?? null)
                    : ($p->service ?? null),
                'role' => $p->pivot->role ?? 'MEMBRE',
            ])->values(),
            'non_lus' => (int) ($c->non_lus ?? 0),
            'dernier_message' => isset($c->dernier_message) ? Str::limit($c->dernier_message, 80) : null,
            'dernier_message_expediteur' => $c->dernier_message_expediteur ?? null,
            'derniere_activite' => isset($c->derniere_activite)
                ? Carbon::parse($c->derniere_activite)->toIso8601String() : null,
        ];
    }
}
