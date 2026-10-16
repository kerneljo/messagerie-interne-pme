<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Service;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Annuaire : liste des collègues (comptes actifs) pour choisir des destinataires. */
class AnnuaireController extends Controller
{
    private const LIMITE_MAX = 200;
    private const MIN_RECHERCHE = 2;
    private const LIMITE_SUGGESTIONS = 5;

    /**
     * Sans filtre : tous les collègues actifs.
     * Filtres optionnels et combinables : code_service et q (nom, prénom, email, poste, service).
     */
    public function index(Request $request): JsonResponse
    {
        $limite = max(1, min((int) $request->query('limite', 50), self::LIMITE_MAX));
        $q = trim((string) $request->query('q', ''));
        $codeService = $request->query('code_service');

        $requete = Utilisateur::with(['service', 'poste'])
            ->where('statut_compte', 'actif')
            ->where('matricule', '<>', $request->user()->matricule);

        if ($codeService) {
            $requete->where('code_service', (int) $codeService);
        }

        if (mb_strlen($q) >= self::MIN_RECHERCHE) {
            $motif = '%' . addcslashes($q, '%_\\') . '%';

            $requete->where(function ($w) use ($motif) {
                $w->where('nom', 'ilike', $motif)
                    ->orWhere('prenom', 'ilike', $motif)
                    ->orWhere('email', 'ilike', $motif)
                    ->orWhereHas('service', fn ($s) => $s->where('nom_service', 'ilike', $motif))
                    ->orWhereHas('poste', fn ($p) => $p->where('libelle', 'ilike', $motif));
            });
        }

        $resultats = $requete
            ->orderBy('nom')
            ->orderBy('prenom')
            ->limit($limite)
            ->get();

        return response()->json($this->formater($resultats));
    }

    /**
     * Liste des services (pour alimenter le select).
     */
    public function services(Request $request): JsonResponse
    {
        $moi = $request->user()->matricule;

        $services = Service::withCount(['utilisateurs' => function ($q) use ($moi) {
                $q->where('statut_compte', 'actif')
                    ->where('matricule', '<>', $moi);
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

    /**
     * Suggestions pour le sélecteur de destinataires (quand le champ est vide) :
     *  - recents    : les N derniers contacts (conversations DIRECT récentes)
     *  - meme_service : les collègues du même service (hors récents)
     *  - autres     : quelques utilisateurs d'autres services (hors récents et hors même service)
     */
    public function suggestions(Request $request): JsonResponse
    {
        $moi = (int) $request->user()->matricule;
        $codeServiceMoi = $request->user()->code_service;

        // 1. Récents : 5 derniers contacts directs
        $recentsIds = Conversation::query()
            ->where('type', 'DIRECT')
            ->whereHas('participants', fn ($q) => $q->where('utilisateur.matricule', $moi))
            ->withMax('messages as derniere_activite', 'date_envoi')
            ->orderByDesc('derniere_activite')
            ->limit(10)
            ->get()
            ->flatMap(function ($c) use ($moi) {
                return $c->participants
                    ->where('matricule', '!=', $moi)
                    ->pluck('matricule');
            })
            ->unique()
            ->take(self::LIMITE_SUGGESTIONS)
            ->values();

        $recents = Utilisateur::with(['service', 'poste'])
            ->whereIn('matricule', $recentsIds)
            ->where('statut_compte', 'actif')
            ->get()
            ->sortBy(fn ($u) => $recentsIds->search($u->matricule))
            ->values();

        // 2. Même service (hors récents)
        $memeService = Utilisateur::with(['service', 'poste'])
            ->where('statut_compte', 'actif')
            ->where('matricule', '<>', $moi)
            ->where('code_service', $codeServiceMoi)
            ->whereNotIn('matricule', $recentsIds)
            ->orderBy('nom')
            ->orderBy('prenom')
            ->limit(self::LIMITE_SUGGESTIONS)
            ->get();

        // 3. Autres services (hors récents et hors même service)
        $autres = Utilisateur::with(['service', 'poste'])
            ->where('statut_compte', 'actif')
            ->where('matricule', '<>', $moi)
            ->where('code_service', '<>', $codeServiceMoi)
            ->whereNotIn('matricule', $recentsIds)
            ->orderBy('nom')
            ->orderBy('prenom')
            ->limit(self::LIMITE_SUGGESTIONS)
            ->get();

        return response()->json([
            'recents' => $this->formater($recents),
            'meme_service' => $this->formater($memeService),
            'autres' => $this->formater($autres),
        ]);
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
        ])->values()->all();
    }
}
