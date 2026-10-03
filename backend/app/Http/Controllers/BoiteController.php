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
    /**
     * GET /api/messages/recus
     *
     * Style Gmail : regroupe les messages REÇUS par expéditeur (conversation DIRECT)
     * ou par groupe (conversation GROUPE).
     */
    public function recus(Request $request): JsonResponse
    {
        $u = $request->user();
        $monMatricule = (int) $u->matricule;

        // Récupère TOUS les messages reçus (où je ne suis PAS l'expéditeur)
        $messages = Message::query()
            ->whereIn('reference_conversation', fn ($q) => $q->select('reference_conversation')
                ->from('participant')->where('matricule', $monMatricule))
            ->where('matricule_expediteur', '<>', $monMatricule)
            ->with(['expediteur', 'conversation.participants', 'fichiers', 'lecteurs'])
            ->orderByDesc('reference_message')
            ->get();

        // Regroupement
        $groupes = [];

        foreach ($messages as $m) {
            $conv = $m->conversation;
            if (!$conv) continue;

            if ($conv->type === 'DIRECT') {
                // Regroupe par expéditeur
                $expediteur = $m->expediteur;
                if (!$expediteur) continue;

                $cle = 'user_' . $expediteur->matricule;

                if (!isset($groupes[$cle])) {
                    $groupes[$cle] = [
                        'cle' => $cle,
                        'type' => 'DIRECT',
                        'reference_conversation' => $conv->reference_conversation,
                        'expediteur' => [
                            'matricule' => $expediteur->matricule,
                            'nom' => $expediteur->nom,
                            'prenom' => $expediteur->prenom,
                            'photo_url' => $expediteur->photo_url,
                        ],
                        'titre' => $expediteur->prenom . ' ' . $expediteur->nom,
                        'nb_messages' => 0,
                        'nb_non_lus' => 0,
                        'nb_fichiers' => 0,
                        'dernier_apercu' => '',
                        'dernier_message_id' => 0,
                        'derniere_date' => null,
                    ];
                }

                $groupes[$cle]['nb_messages']++;
                $groupes[$cle]['nb_fichiers'] += $m->fichiers->count();

                // Non lu ? Je ne suis PAS dans les lecteurs
                $aEteLuParMoi = $m->lecteurs
                    ->where('matricule', $monMatricule)
                    ->isNotEmpty();

                if (!$aEteLuParMoi) {
                    $groupes[$cle]['nb_non_lus']++;
                }

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
                        'expediteur' => null,
                        'titre' => $conv->titre,
                        'participants_count' => $conv->participants->count(),
                        'nb_messages' => 0,
                        'nb_non_lus' => 0,
                        'nb_fichiers' => 0,
                        'dernier_apercu' => '',
                        'dernier_message_id' => 0,
                        'derniere_date' => null,
                    ];
                }

                $groupes[$cle]['nb_messages']++;
                $groupes[$cle]['nb_fichiers'] += $m->fichiers->count();

                $aEteLuParMoi = $m->lecteurs
                    ->where('matricule', $monMatricule)
                    ->isNotEmpty();

                if (!$aEteLuParMoi) {
                    $groupes[$cle]['nb_non_lus']++;
                }

                if ($m->reference_message > $groupes[$cle]['dernier_message_id']) {
                    $groupes[$cle]['dernier_apercu'] = $this->apercu($m);
                    $groupes[$cle]['dernier_message_id'] = $m->reference_message;
                    $groupes[$cle]['derniere_date'] = $m->date_envoi?->toIso8601String();
                }
            }
        }

        usort($groupes, fn ($a, $b) => strcmp($b['derniere_date'] ?? '', $a['derniere_date'] ?? ''));

        // Stats globales
        $totalMessages = $messages->count();
        $totalNonLus = $messages->filter(function ($m) use ($monMatricule) {
            return !$m->lecteurs->where('matricule', $monMatricule)->isNotEmpty();
        })->count();

        return response()->json([
            'data' => array_values($groupes),
            'stats' => [
                'total' => $totalMessages,
                'non_lus' => $totalNonLus,
            ],
        ]);
    }

    /**
     * GET /api/messages/envoyes
     *
     * Style Gmail : regroupe les messages que J'AI ENVOYÉS par destinataire.
     */
    public function envoyes(Request $request): JsonResponse
    {
        $u = $request->user();
        $monMatricule = (int) $u->matricule;

        $messages = Message::query()
            ->where('matricule_expediteur', $monMatricule)
            ->with(['conversation.participants', 'fichiers', 'lecteurs'])
            ->withCount('lecteurs')
            ->orderByDesc('reference_message')
            ->get();

        $groupes = [];

        foreach ($messages as $m) {
            $conv = $m->conversation;
            if (!$conv) continue;

            if ($conv->type === 'DIRECT') {
                $autre = $conv->participants->where('matricule', '!=', $monMatricule)->first();
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
                        'nb_non_lus' => 0,
                        'nb_fichiers' => 0,
                        'dernier_apercu' => '',
                        'dernier_message_id' => 0,
                        'derniere_date' => null,
                    ];
                }

                $groupes[$cle]['nb_messages']++;
                $groupes[$cle]['nb_fichiers'] += $m->fichiers->count();

                $aEteLuParDestinataire = $m->lecteurs
                    ->where('matricule', $autre->matricule)
                    ->isNotEmpty();

                if (!$aEteLuParDestinataire) {
                    $groupes[$cle]['nb_non_lus']++;
                }

                if ($m->reference_message > $groupes[$cle]['dernier_message_id']) {
                    $groupes[$cle]['dernier_apercu'] = $this->apercu($m);
                    $groupes[$cle]['dernier_message_id'] = $m->reference_message;
                    $groupes[$cle]['derniere_date'] = $m->date_envoi?->toIso8601String();
                }
            } else {
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
                        'nb_non_lus' => 0,
                        'nb_fichiers' => 0,
                        'dernier_apercu' => '',
                        'dernier_message_id' => 0,
                        'derniere_date' => null,
                    ];
                }

                $groupes[$cle]['nb_messages']++;
                $groupes[$cle]['nb_fichiers'] += $m->fichiers->count();

                if ($m->reference_message > $groupes[$cle]['dernier_message_id']) {
                    $groupes[$cle]['dernier_apercu'] = $this->apercu($m);
                    $groupes[$cle]['dernier_message_id'] = $m->reference_message;
                    $groupes[$cle]['derniere_date'] = $m->date_envoi?->toIso8601String();
                }
            }
        }

        usort($groupes, fn ($a, $b) => strcmp($b['derniere_date'] ?? '', $a['derniere_date'] ?? ''));

        return response()->json([
            'data' => array_values($groupes),
            'stats' => [
                'total' => $messages->count(),
                'non_lus' => $messages->filter(function ($m) use ($monMatricule) {
                    return !$m->lecteurs->where('matricule', $monMatricule)->isNotEmpty();
                })->count(),
            ],
        ]);
    }

    private function apercu(Message $m): string
    {
        $texte = Str::limit((string) $m->contenu, 140);

        return $texte !== '' ? $texte : ($m->fichiers->isNotEmpty() ? 'Pièce jointe' : '');
    }
}
