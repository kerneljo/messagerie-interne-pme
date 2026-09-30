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
            ->addSelect(['dernier_message' => Message::select('contenu')
                ->whereColumn('message.reference_conversation', 'conversation.reference_conversation')
                ->orderByDesc('reference_message')
                ->limit(1)])
            ->orderByRaw('derniere_activite DESC NULLS LAST')
            ->get();

        return response()->json($conversations->map(fn ($c) => $this->presenter($c, $u))->values());
    }

    public function store(Request $request): JsonResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'type' => ['required', Rule::in(['DIRECT', 'GROUPE', 'DIFFUSION'])],
            'titre' => [Rule::requiredIf($request->input('type') !== 'DIRECT'), 'nullable', 'string', 'max:150'],
            'participants' => ['required', 'array', 'min:1', 'max:200'],
            'participants.*' => ['integer', 'distinct',
                Rule::exists('utilisateur', 'matricule')->where('statut_compte', 'actif')],
        ]);

        // Le createur est toujours participant
        $membres = collect($data['participants'])
            ->map(fn ($m) => (int) $m)
            ->push((int) $u->matricule)
            ->unique()
            ->values();

        $erreur = match ($data['type']) {
            'DIRECT' => $membres->count() !== 2 ? 'Une conversation directe a exactement 2 participants.' : null,
            'GROUPE' => $membres->count() < 3 ? 'Un groupe a au moins 3 participants.' : null,
            'DIFFUSION' => $membres->count() < 2 ? 'Une diffusion a au moins 2 personnes.' : null,
        };
        if ($erreur) {
            throw ValidationException::withMessages(['participants' => $erreur]);
        }

        // Une seule conversation directe par paire d'utilisateurs
        if ($data['type'] === 'DIRECT') {
            $autre = $membres->first(fn ($m) => $m !== (int) $u->matricule);
            $existante = Conversation::where('type', 'DIRECT')
                ->whereHas('participants', fn ($q) => $q->where('utilisateur.matricule', $u->matricule))
                ->whereHas('participants', fn ($q) => $q->where('utilisateur.matricule', $autre))
                ->first();
            if ($existante) {
                return response()->json($this->presenter($existante, $u));
            }
        }

        $conversation = DB::transaction(function () use ($data, $u, $membres) {
            $c = Conversation::create([
                'titre' => $data['type'] === 'DIRECT' ? null : $data['titre'],
                'type' => $data['type'],
                'matricule_createur' => $u->matricule,
            ]);
            $c->participants()->attach($membres->all());

            return $c;
        });
        $conversation->refresh();

        Audit::log('CREATION_CONVERSATION', $u->matricule,
            "conversation #{$conversation->reference_conversation} ({$conversation->type})");

        return response()->json($this->presenter($conversation, $u), 201);
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

    private function presenter(Conversation $c, Utilisateur $u): array
    {
        $c->loadMissing('participants');

        // Conversation directe : le titre affiche est le nom de l'autre personne
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
                'poste' => $p->poste,
            ])->values(),
            'non_lus' => (int) ($c->non_lus ?? 0),
            'dernier_message' => isset($c->dernier_message) ? Str::limit($c->dernier_message, 80) : null,
            'derniere_activite' => isset($c->derniere_activite)
                ? Carbon::parse($c->derniere_activite)->toIso8601String() : null,
        ];
    }
}
