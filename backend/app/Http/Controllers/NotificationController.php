<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** Liste des notifications, filtrable par type. */
    public function index(Request $request): JsonResponse
    {
        $u = $request->user();
        $filtre = $request->query('type');

        $requete = Notification::where('matricule_destinataire', $u->matricule)
            ->orderByDesc('date_creation');

        // Filtres par onglet
        if ($filtre === 'action') {
            $requete->whereIn('type', ['action_requise', 'urgent']);
        } elseif (in_array($filtre, ['mention', 'information', 'message', 'reaction'], true)) {
            $requete->where('type', $filtre);
        }

        $notifications = $requete->limit(100)->get();

        return response()->json(
            $notifications->map(fn ($n) => $this->presenter($n))->values()
        );
    }

    /** Compteur pour le badge de la sidebar. */
    public function compteur(Request $request): JsonResponse
    {
        $u = $request->user();

        $total = Notification::where('matricule_destinataire', $u->matricule)
            ->where('est_lue', false)
            ->count();

        $actions = Notification::where('matricule_destinataire', $u->matricule)
            ->where('est_lue', false)
            ->whereIn('type', ['action_requise', 'urgent'])
            ->count();

        return response()->json([
            'total' => $total,
            'actions' => $actions,
        ]);
    }

    /** Marque une notification comme lue. */
    public function marquerLue(Request $request, Notification $notification): JsonResponse
    {
        if ((int) $notification->matricule_destinataire !== (int) $request->user()->matricule) {
            abort(403, 'Action non autorisée.');
        }

        $notification->update([
            'est_lue' => true,
            'date_lecture' => now(),
        ]);

        // ✅ Correction : retourner du JSON au lieu de noContent()
        return response()->json([
            'message' => 'Notification marquée comme lue.',
            'notification' => $this->presenter($notification->fresh()),
        ]);
    }

    /** Marque toutes les notifications comme lues, sauf les actions requises. */
    public function toutMarquerLues(Request $request): JsonResponse
    {
        $nombre = Notification::where('matricule_destinataire', $request->user()->matricule)
            ->where('est_lue', false)
            ->whereNotIn('type', ['action_requise', 'urgent'])  // on ne touche pas aux actions
            ->update([
                'est_lue' => true,
                'date_lecture' => now(),
            ]);

        // ✅ Correction : retourner du JSON au lieu de noContent()
        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues.',
            'nombre' => $nombre,
        ]);
    }

    private function presenter(Notification $n): array
    {
        return [
            'reference_notification' => $n->reference_notification,
            'type' => $n->type,
            'extrait' => $n->extrait,
            'est_lue' => (bool) $n->est_lue,
            'date_creation' => $n->date_creation?->toIso8601String(),
            'date_lecture' => $n->date_lecture?->toIso8601String(),
            'reference_message' => $n->reference_message,
            'reference_conversation' => $n->reference_conversation,
        ];
    }
}