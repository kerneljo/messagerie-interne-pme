<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Annuaire : liste des collegues (comptes actifs) pour choisir des destinataires. */
class AnnuaireController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limite = max(1, min((int) $request->query('limite', 20), 50));
        $q = trim((string) $request->query('q', ''));
        $codeService = $request->query('code_service');

        // Cas 1 : filtre service → on affiche tous les utilisateurs du service
        if ($codeService) {
            return $this->parService($request, (int) $codeService, $limite);
        }

        // Cas 2 : recherche par nom → nécessite 2+ caractères
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        return $this->parRecherche($request, $q, $limite);
    }

    /** Liste des services (pour alimenter le select). */
    public function services(): JsonResponse
    {
        $services = Service::withCount(['utilisateurs' => function ($q) {
                $q->where('statut_compte', 'actif');
            }])
            ->orderBy('nom_service')
            ->get()
            ->map(fn ($s) => [
                'code_service' => $s->code_service,
                'nom_service' => $s->nom_service,
                'nb_utilisateurs' => $s->utilisateurs_count,
            ]);

        return response()->json($services);
    }

    /** Recherche par nom / prénom / email / poste / service. */
    private function parRecherche(Request $request, string $q, int $limite): JsonResponse
    {
        $motif = '%' . addcslashes($q, '%_\\') . '%';

        $resultats = Utilisateur::with(['service', 'poste'])
            ->where('statut_compte', 'actif')
            ->where('matricule', '<>', $request->user()->matricule)
            ->where(function ($w) use ($motif) {
                $w->where('nom', 'ilike', $motif)
                    ->orWhere('prenom', 'ilike', $motif)
                    ->orWhere('email', 'ilike', $motif)
                    ->orWhereHas('service', fn ($s) => $s->where('nom_service', 'ilike', $motif))
                    ->orWhereHas('poste', fn ($p) => $p->where('libelle', 'ilike', $motif));
            })
            ->orderBy('nom')
            ->orderBy('prenom')
            ->limit($limite)
            ->get();

        return response()->json($this->formater($resultats));
    }

    /** Liste des utilisateurs d'un service donné. */
    private function parService(Request $request, int $codeService, int $limite): JsonResponse
    {
        $resultats = Utilisateur::with(['service', 'poste'])
            ->where('statut_compte', 'actif')
            ->where('matricule', '<>', $request->user()->matricule)
            ->where('code_service', $codeService)
            ->orderBy('nom')
            ->orderBy('prenom')
            ->limit($limite)
            ->get();

        return response()->json($this->formater($resultats));
    }

    private function formater($utilisateurs): array
    {
        return $utilisateurs->map(fn ($u) => [
            'matricule' => $u->matricule,
            'nom' => $u->nom,
            'prenom' => $u->prenom,
            'email' => $u->email,
            'photo_url' => $u->photo_url,
            'poste' => $u->poste?->libelle,
            'service' => $u->service?->nom_service,
            'code_service' => $u->service?->code_service,
        ])->all();
    }
}
