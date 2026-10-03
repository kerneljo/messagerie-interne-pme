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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConversationController extends Controller
{
    /** Mes conversations, avec messages non lus, apercu du dernier message, triees par activite. */
    public function index(Request $request): JsonResponse
    {
        $u = $request->user();

        $conversations = $u->conversations()
            ->with('participants')
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
     * Envoi d'un message (auto-détection du type) :
     *   - 1 destinataire → crée/utilise UNE conversation DIRECT, envoie le message
     *   - N destinataires → crée/utilise N conversations DIRECT, envoie le message dans chacune
     *                        (mode "Envoi multiple" — chacun peut répondre individuellement)
     *
     * Les groupes (type=GROUPE) sont créés via l'endpoint dédié creerGroupe().
     */
    public function store(Request $request): JsonResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'participants' => ['required', 'array', 'min:1', 'max:200'],
            'participants.*' => ['integer', 'distinct',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        // On retire l'expéditeur de la liste s'il s'est ajouté
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

        // ========================================================
        // CAS 1 — Un seul destinataire → conversation DIRECT
        // ========================================================
        if ($destinataires->count() === 1) {
            $idDestinataire = (int) $destinataires->first();

            $conversation = DB::transaction(function () use ($u, $idDestinataire, $data) {
                $conv = $this->trouverOuCreerDirect($u, $idDestinataire);

                Message::create([
                    'contenu' => $data['message'],
                    'matricule_expediteur' => $u->matricule,
                    'reference_conversation' => $conv->reference_conversation,
                ]);

                return $conv;
            });
            $conversation->refresh();

            Audit::log('ENVOI_MESSAGE', $u->matricule,
                "conversation #{$conversation->reference_conversation} (DIRECT)");

            return response()->json([
                'type' => 'DIRECT',
                'nombre' => 1,
                'conversation' => $this->presenter($conversation->load('participants'), $u),
            ], 201);
        }

        // ========================================================
        // CAS 2 — Plusieurs destinataires → ENVOI MULTIPLE
        // Crée/récupère une conversation DIRECT avec chacun
        // ========================================================
        $conversations = DB::transaction(function () use ($u, $destinataires, $data) {
            $resultat = [];

            foreach ($destinataires as $idDestinataire) {
                $conv = $this->trouverOuCreerDirect($u, $idDestinataire);

                Message::create([
                    'contenu' => $data['message'],
                    'matricule_expediteur' => $u->matricule,
                    'reference_conversation' => $conv->reference_conversation,
                ]);

                $resultat[] = $conv;
            }

            return $resultat;
        });

        Audit::log('ENVOI_MULTIPLE', $u->matricule,
            count($conversations) . " conversation(s) mises à jour");

        return response()->json([
            'type' => 'MULTIPLE',
            'nombre' => count($conversations),
            'conversations' => collect($conversations)->map(
                fn ($c) => $this->presenter($c->fresh('participants'), $u)
            )->values(),
        ], 201);
    }

    /**
     * Création d'un groupe (3 participants minimum, titre obligatoire).
     * Endpoint dédié, utilisé depuis la page "Nouveau groupe".
     */
    public function creerGroupe(Request $request): JsonResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'titre' => ['required', 'string', 'max:150'],
            'participants' => ['required', 'array', 'min:2', 'max:200'],
            'participants.*' => ['integer', 'distinct',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
        ]);

        // On ajoute le créateur aux membres
        $membres = collect($data['participants'])
            ->map(fn ($m) => (int) $m)
            ->push((int) $u->matricule)
            ->unique()
            ->values();

        if ($membres->count() < 3) {
            throw ValidationException::withMessages([
                'participants' => 'Un groupe doit avoir au moins 3 participants (vous compris).',
            ]);
        }

        $conversation = DB::transaction(function () use ($data, $u, $membres) {
            $c = Conversation::create([
                'titre' => $data['titre'],
                'type' => 'GROUPE',
                'matricule_createur' => $u->matricule,
            ]);
            $c->participants()->attach($membres->all());

            return $c;
        });
        $conversation->refresh();

        Audit::log('CREATION_GROUPE', $u->matricule,
            "conversation #{$conversation->reference_conversation} : {$conversation->titre}");

        return response()->json(
            $this->presenter($conversation->load('participants'), $u),
            201
        );
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);

        return response()->json($this->presenter($conversation, $request->user()));
    }

    public function ajouterParticipant(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('gererParticipants', $conversation);

        $data = $request->validate([
            'matricule' => ['required', 'integer',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
        ]);

        $conversation->participants()->syncWithoutDetaching([(int) $data['matricule']]);

        Audit::log('AJOUT_PARTICIPANT', $request->user()->matricule,
            "conversation #{$conversation->reference_conversation} : utilisateur #{$data['matricule']}");

        return response()->json($this->presenter($conversation->fresh(), $request->user()));
    }

    public function retirerParticipant(Request $request, Conversation $conversation, int $matricule): JsonResponse
    {
        Gate::authorize('gererParticipants', $conversation);

        if ($matricule === (int) $conversation->matricule_createur) {
            return response()->json(['message' => 'Le createur ne peut pas etre retire.'], 422);
        }

        $minimum = $conversation->type === 'GROUPE' ? 3 : 2;
        if ($conversation->participants()->count() - 1 < $minimum) {
            return response()->json(['message' => "Cette conversation doit garder au moins {$minimum} participants."], 422);
        }

        $conversation->participants()->detach($matricule);

        Audit::log('RETRAIT_PARTICIPANT', $request->user()->matricule,
            "conversation #{$conversation->reference_conversation} : utilisateur #{$matricule}");

        return response()->json($this->presenter($conversation->fresh(), $request->user()));
    }

    /**
     * Ouvre (ou crée) une conversation directe avec un utilisateur donné.
     * Utilisé depuis la page profil.
     */
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
            $this->presenter($conversation->load('participants'), $moi)
        );
    }

    // ============================================================
    // Helpers
    // ============================================================

    /**
     * Cherche une conversation DIRECT entre deux utilisateurs, ou la crée.
     */
    private function trouverOuCreerDirect(Utilisateur $expediteur, int $idDestinataire): Conversation
    {
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
        $c->loadMissing('participants');

        // Conversation directe : le titre affiché est le nom de l'autre personne
        $titre = $c->type === 'DIRECT'
            ? $c->participants->where('matricule', '!=', $u->matricule)
                ->map(fn ($p) => $p->prenom . ' ' . $p->nom)->implode(', ')
            : $c->titre;

        return [
            'reference_conversation' => $c->reference_conversation,
            'type' => $c->type,
            'titre' => $titre,
            'matricule_createur' => $c->matricule_createur,
            'date_creation' => $c->date_creation?->toIso8601String(),
            'participants' => $c->participants->map(fn ($p) => [
                'matricule' => $p->matricule,
                'nom' => $p->nom,
                'prenom' => $p->prenom,
                'photo_url' => $p->photo_url,
                'poste' => $p->poste,
            ])->values(),
            'non_lus' => (int) ($c->non_lus ?? 0),
            'dernier_message' => isset($c->dernier_message) ? Str::limit($c->dernier_message, 80) : null,
            'dernier_message_expediteur' => $c->dernier_message_expediteur ?? null,
            'derniere_activite' => isset($c->derniere_activite)
                ? Carbon::parse($c->derniere_activite)->toIso8601String() : null,
        ];
    }
}
