<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    /**
     * Description des permissions par rôle.
     * En dur dans le code : les rôles sont stables et leur modification
     * nécessite un redéploiement (choix de conception assumé).
     */
    private const PERMISSIONS = [
        'Administrateur' => [
            'Accès complet à l’application',
            'Gérer les utilisateurs (créer, modifier, désactiver)',
            'Gérer les référentiels (postes, services, rôles)',
            'Consulter le journal d’audit',
            'Toutes les fonctionnalités de messagerie',
        ],
        'Employe' => [
            'Envoyer et recevoir des messages',
            'Créer des conversations',
            'Consulter l’annuaire interne',
            'Envoyer des pièces jointes',
        ],
    ];

    public function index(): JsonResponse
    {
        $roles = Role::withCount('utilisateurs')
            ->orderBy('code_role')
            ->get()
            ->map(function ($role) {
                return [
                    'code_role' => $role->code_role,
                    'libelle' => $role->libelle,
                    'utilisateurs_count' => $role->utilisateurs_count,
                    'permissions' => self::PERMISSIONS[$role->libelle] ?? [],
                ];
            });

        return response()->json($roles);
    }
}
