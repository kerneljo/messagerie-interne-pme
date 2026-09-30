<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Annuaire : liste des collegues (comptes actifs) pour creer une conversation. */
class AnnuaireController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limite = max(1, min((int) $request->query('limite', 50), 200));

        $requete = Utilisateur::with('service')
            ->where('statut_compte', 'actif')
            ->where('matricule', '<>', $request->user()->matricule)
            ->orderBy('nom')
            ->orderBy('prenom');

        if ($request->filled('q')) {
            $motif = '%' . addcslashes((string) $request->query('q'), '%_\\') . '%';
            $requete->where(function ($w) use ($motif) {
                $w->where('nom', 'ilike', $motif)->orWhere('prenom', 'ilike', $motif);
            });
        }

        return response()->json(
            $requete->limit($limite)->get()->map(fn ($u) => [
                'matricule' => $u->matricule,
                'nom' => $u->nom,
                'prenom' => $u->prenom,
                'poste' => $u->poste,
                'service' => $u->service?->nom_service,
            ])->values()
        );
    }
}
