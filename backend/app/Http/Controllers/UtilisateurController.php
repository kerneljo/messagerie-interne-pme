<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Consultation publique (authentifiée) d'un profil utilisateur.
 * Différent du contrôleur Admin : pas d'accès aux données sensibles.
 */
class UtilisateurController extends Controller
{
    public function show(Utilisateur $utilisateur): JsonResponse
    {
        // Un utilisateur désactivé n'est pas visible
        if ($utilisateur->statut_compte !== 'actif') {
            abort(404, 'Utilisateur introuvable.');
        }

        $utilisateur->load(['service', 'role', 'poste']);
        $moi = auth()->user();

        // ---- Stats de collaboration avec MOI (l'utilisateur connecté) ----
        $stats = $this->statsAvec($moi, $utilisateur);

        return response()->json([
            'matricule' => $utilisateur->matricule,
            'nom' => $utilisateur->nom,
            'prenom' => $utilisateur->prenom,
            'email' => $utilisateur->email,
            'photo_url' => $utilisateur->photo_url,
            'statut_compte' => $utilisateur->statut_compte,
            'derniere_connexion' => $utilisateur->derniere_connexion?->toIso8601String(),
            'date_creation' => $utilisateur->date_creation?->toIso8601String(),
            'poste' => $utilisateur->poste ? [
                'code_poste' => $utilisateur->poste->code_poste,
                'libelle' => $utilisateur->poste->libelle,
            ] : null,
            'service' => $utilisateur->service ? [
                'code_service' => $utilisateur->service->code_service,
                'nom_service' => $utilisateur->service->nom_service,
            ] : null,
            'role' => $utilisateur->role ? [
                'code_role' => $utilisateur->role->code_role,
                'libelle' => $utilisateur->role->libelle,
            ] : null,
            'stats' => $stats,
        ]);
    }

    /**
     * Calcule les statistiques d'échange entre deux utilisateurs :
     * nombre de conversations communes, messages envoyés de part et d'autre,
     * fichiers échangés, date de dernière interaction.
     */
    private function statsAvec(Utilisateur $moi, Utilisateur $autre): array
    {
        if ($moi->matricule === $autre->matricule) {
            return [
                'conversations' => 0,
                'messages_envoyes' => 0,
                'messages_recus' => 0,
                'fichiers_echanges' => 0,
                'derniere_interaction' => null,
            ];
        }

        // Conversations où les deux sont participants
        $referenceConversations = DB::table('participant as p1')
            ->join('participant as p2', 'p1.reference_conversation', '=', 'p2.reference_conversation')
            ->where('p1.matricule', $moi->matricule)
            ->where('p2.matricule', $autre->matricule)
            ->pluck('p1.reference_conversation')
            ->all();

        $nbConversations = count($referenceConversations);

        if ($nbConversations === 0) {
            return [
                'conversations' => 0,
                'messages_envoyes' => 0,
                'messages_recus' => 0,
                'fichiers_echanges' => 0,
                'derniere_interaction' => null,
            ];
        }

        // Messages envoyés par moi vers lui
        $messagesEnvoyes = DB::table('message')
            ->whereIn('reference_conversation', $referenceConversations)
            ->where('matricule_expediteur', $moi->matricule)
            ->where('est_supprime', false)
            ->count();

        // Messages reçus de lui
        $messagesRecus = DB::table('message')
            ->whereIn('reference_conversation', $referenceConversations)
            ->where('matricule_expediteur', $autre->matricule)
            ->where('est_supprime', false)
            ->count();

        // Fichiers échangés (dans les messages entre les deux)
        $fichiers = DB::table('fichier')
            ->join('message', 'fichier.reference_message', '=', 'message.reference_message')
            ->whereIn('message.reference_conversation', $referenceConversations)
            ->whereIn('message.matricule_expediteur', [$moi->matricule, $autre->matricule])
            ->count();

        // Dernière interaction
        $derniere = DB::table('message')
            ->whereIn('reference_conversation', $referenceConversations)
            ->whereIn('matricule_expediteur', [$moi->matricule, $autre->matricule])
            ->where('est_supprime', false)
            ->max('date_envoi');

        return [
            'conversations' => $nbConversations,
            'messages_envoyes' => $messagesEnvoyes,
            'messages_recus' => $messagesRecus,
            'fichiers_echanges' => $fichiers,
            'derniere_interaction' => $derniere ? \Illuminate\Support\Carbon::parse($derniere)->toIso8601String() : null,
        ];
    }
}
