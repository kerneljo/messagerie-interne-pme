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
                'photo_url' => $m->expediteur->photo_url,
            ],
            'apercu' => $this->apercu($m),
            'nb_fichiers' => $m->fichiers->count(),
            'lu' => (bool) $m->lu_par_moi,
        ]));
    }

    /**
     * GET /api/messages/envoyes
     *
     * Style Gmail : regroupe les messages ENVOYÉS par destinataire (conversation DIRECT)
     * ou par groupe (conversation GROUPE).
     */
    public function envoyes(Request $request): JsonResponse
    {
        $u = $request->user();

        // Récupère tous les messages envoyés par l'utilisateur
        $messages = Message::query()
            ->where('matricule_expediteur', $u->matricule)
            ->with(['conversation.participants', 'fichiers'])
            ->withCount('lecteurs')
            ->orderByDesc('reference_message')
            ->get();

        // Regroupement
        $groupes = [];

        foreach ($messages as $m) {
            $conv = $m->conversation;
            if (!$conv) continue;

            if ($conv->type === 'DIRECT') {
                // Regroupe par destinataire (l'autre participant)
                $autre = $conv->participants->where('matricule', '!=', $u->matricule)->first();
                if (!$autre) continue;

                $cle = 'user_' . $autre->matricule;

                if (!isset($groupes[$cle])) {
                    $groupes[$cle] = [
                        'cle' => $cle,
                        'type' => 'DIRECT',
                        'reference_conversation' => $conv->reference_conversation,
                        'destinataire' => [
                            'matricule' => $autre->matricule,
                            'nom' => $autre->nom,
                            'prenom' => $autre->prenom,
                            'photo_url' => $autre->photo_url,
                        ],
                        'titre' => $autre->prenom . ' ' . $autre->nom,
                        'nb_messages' => 0,
                        'nb_fichiers' => 0,
                        'dernier_apercu' => '',
                        'dernier_message_id' => 0,
                        'derniere_date' => null,
                        'nb_lus' => 0,
                    ];
                }

                $groupes[$cle]['nb_messages']++;
                $groupes[$cle]['nb_fichiers'] += $m->fichiers->count();
                $groupes[$cle]['nb_lus'] += $m->lecteurs_count;

                // Le premier message rencontré est le plus récent (tri DESC)
                if ($m->reference_message > $groupes[$cle]['dernier_message_id']) {
                    $groupes[$cle]['dernier_apercu'] = $this->apercu($m);
                    $groupes[$cle]['dernier_message_id'] = $m->reference_message;
                    $groupes[$cle]['derniere_date'] = $m->date_envoi?->toIso8601String();
                    $groupes[$cle]['reference_conversation'] = $conv->reference_conversation;
                }
            } else {
                // GROUPE : une ligne par conversation
                $cle = 'conv_' . $conv->reference_conversation;

                if (!isset($groupes[$cle])) {
                    $groupes[$cle] = [
                        'cle' => $cle,
                        'type' => 'GROUPE',
                        'reference_conversation' => $conv->reference_conversation,
                        'destinataire' => null,
                        'titre' => $conv->titre,
                        'participants_count' => $conv->participants->count(),
                        'nb_messages' => 0,
                        'nb_fichiers' => 0,
                        'dernier_apercu' => '',
                        'dernier_message_id' => 0,
                        'derniere_date' => null,
                        'nb_lus' => 0,
                    ];
                }

                $groupes[$cle]['nb_messages']++;
                $groupes[$cle]['nb_fichiers'] += $m->fichiers->count();
                $groupes[$cle]['nb_lus'] += $m->lecteurs_count;

                if ($m->reference_message > $groupes[$cle]['dernier_message_id']) {
                    $groupes[$cle]['dernier_apercu'] = $this->apercu($m);
                    $groupes[$cle]['dernier_message_id'] = $m->reference_message;
                    $groupes[$cle]['derniere_date'] = $m->date_envoi?->toIso8601String();
                }
            }
        }

        // Tri par date du dernier message (le plus récent en haut)
        usort($groupes, fn ($a, $b) => strcmp($b['derniere_date'] ?? '', $a['derniere_date'] ?? ''));

        // Pagination manuelle
        $parPage = $this->parPage($request);
        $page = (int) $request->query('page', 1);
        $total = count($groupes);
        $items = array_slice(array_values($groupes), ($page - 1) * $parPage, $parPage);

        return response()->json([
            'data' => $items,
            'meta' => [
                'page' => $page,
                'par_page' => $parPage,
                'total' => $total,
                'derniere_page' => max(1, (int) ceil($total / $parPage)),
            ],
        ]);
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
