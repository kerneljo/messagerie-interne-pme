<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Vues « Boite de reception » et « Envoyes » : tous les messages, toutes conversations confondues. */
class BoiteController extends Controller
{
    /** GET /api/messages/recus?non_lus=1&q=&page= */
    public function recus(Request $request): JsonResponse
    {
        $u = $request->user();

        $requete = Message::query()
            ->whereIn('reference_conversation', fn ($q) => $q->select('reference_conversation')
                ->from('participant')->where('matricule', $u->matricule))
            ->where('matricule_expediteur', '<>', $u->matricule)
            ->with(['expediteur', 'conversation', 'fichiers'])
            ->withExists(['lecteurs as lu_par_moi' => fn ($q) => $q->where('lecture_message.matricule', $u->matricule)])
            ->orderByDesc('reference_message');

        if ($request->boolean('non_lus')) {
            $requete->whereDoesntHave('lecteurs', fn ($q) => $q->where('lecture_message.matricule', $u->matricule));
        }

        if ($request->filled('q')) {
            $motif = '%' . addcslashes((string) $request->query('q'), '%_\\') . '%';
            $requete->where(function ($w) use ($motif) {
                $w->where('contenu', 'ilike', $motif)
                    ->orWhereHas('expediteur', fn ($e) => $e->where('nom', 'ilike', $motif)->orWhere('prenom', 'ilike', $motif));
            });
        }

        $page = $requete->paginate($this->parPage($request));

        return response()->json($page->through(fn (Message $m) => [
            'reference_message' => $m->reference_message,
            'reference_conversation' => $m->reference_conversation,
            'date_envoi' => $m->date_envoi?->toIso8601String(),
            'conversation' => [
                'titre' => $m->conversation->type === 'DIRECT'
                    ? $m->expediteur->prenom . ' ' . $m->expediteur->nom
                    : $m->conversation->titre,
                'type' => $m->conversation->type,
            ],
            'expediteur' => [
                'matricule' => $m->expediteur->matricule,
                'nom' => $m->expediteur->nom,
                'prenom' => $m->expediteur->prenom,
            ],
            'apercu' => $this->apercu($m),
            'nb_fichiers' => $m->fichiers->count(),
            'lu' => (bool) $m->lu_par_moi,
        ]));
    }

    /** GET /api/messages/envoyes?q=&page= */
    public function envoyes(Request $request): JsonResponse
    {
        $u = $request->user();

        $requete = Message::query()
            ->where('matricule_expediteur', $u->matricule)
            ->with(['conversation.participants', 'fichiers'])
            ->withCount('lecteurs')
            ->orderByDesc('reference_message');

        if ($request->filled('q')) {
            $motif = '%' . addcslashes((string) $request->query('q'), '%_\\') . '%';
            $requete->where('contenu', 'ilike', $motif);
        }

        $page = $requete->paginate($this->parPage($request));

        return response()->json($page->through(function (Message $m) use ($u) {
            $conversation = $m->conversation;
            $autres = $conversation->participants->where('matricule', '!=', $u->matricule);

            return [
                'reference_message' => $m->reference_message,
                'reference_conversation' => $m->reference_conversation,
                'date_envoi' => $m->date_envoi?->toIso8601String(),
                'conversation' => ['type' => $conversation->type],
                'titre' => $conversation->type === 'DIRECT'
                    ? $autres->map(fn (Utilisateur $p) => $p->prenom . ' ' . $p->nom)->implode(', ')
                    : $conversation->titre,
                'apercu' => $this->apercu($m),
                'nb_fichiers' => $m->fichiers->count(),
                'destinataires' => $autres->count(),
                'lus' => (int) $m->lecteurs_count,
            ];
        }));
    }

    private function apercu(Message $m): string
    {
        $texte = Str::limit((string) $m->contenu, 140);

        return $texte !== '' ? $texte : ($m->fichiers->isNotEmpty() ? 'Pièce jointe' : '');
    }

    private function parPage(Request $request): int
    {
        return max(1, min((int) $request->query('par_page', 20), 100));
    }
}
