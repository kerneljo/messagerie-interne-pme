<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JournalAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalAuditController extends Controller
{
    /**
     * Niveaux de log (inspiré du kernel Linux / syslog).
     * 0 EMERG → 7 DEBUG
     *
     * 3 = CRIT    : alerte, action immédiate (brute force)
     * 4 = WARNING : anomalie (échec connexion)
     * 5 = NOTICE  : action importante (création, modif, suppression)
     * 6 = INFO    : événement normal (connexion réussie)
     */
    private const NIVEAUX = [
        'LOGIN_ECHEC'               => 4,
        'RESET_MOT_DE_PASSE'        => 5,
        'CREATION_UTILISATEUR'      => 5,
        'MODIF_UTILISATEUR'         => 5,
        'ACTIVATION_UTILISATEUR'    => 5,
        'DESACTIVATION_UTILISATEUR' => 5,
        'POSTE_CREATION'            => 5,
        'POSTE_MODIFICATION'        => 5,
        'POSTE_SUPPRESSION'         => 5,
        'SERVICE_CREATION'          => 5,
        'SERVICE_MODIFICATION'      => 5,
        'SERVICE_SUPPRESSION'       => 5,
        'ROLE_CREATION'             => 5,
        'ROLE_MODIFICATION'         => 5,
        'ROLE_SUPPRESSION'          => 5,
        'REGISTER'                  => 5,
        'LOGIN'                     => 6,
    ];

    /** Niveau par défaut : NOTICE et supérieur (exclut INFO = LOGIN). */
    private const NIVEAU_DEFAUT = 5;

    /** Seuil d'alerte brute force : 5 échecs sur la même IP en 5 minutes. */
    private const SEUIL_BRUTE_FORCE = 5;
    private const FENETRE_BRUTE_FORCE_MINUTES = 5;

    public function index(Request $request): JsonResponse
    {
        $niveauMin = (int) $request->query('niveau_min', self::NIVEAU_DEFAUT);
        $niveauMin = max(0, min(7, $niveauMin));

        $actionsAutorisees = array_keys(array_filter(
            self::NIVEAUX,
            fn ($n) => $n <= $niveauMin
        ));

        $requete = JournalAudit::with('utilisateur')
            ->whereIn('action', $actionsAutorisees)
            ->orderByDesc('date_action');

        // Recherche
        if ($request->filled('q')) {
            $motif = '%' . addcslashes((string) $request->query('q'), '%_\\') . '%';
            $requete->where(function ($w) use ($motif) {
                $w->where('action', 'ilike', $motif)
                    ->orWhere('details_action', 'ilike', $motif)
                    ->orWhere('adresse_ip', 'ilike', $motif)
                    ->orWhereHas('utilisateur', function ($u) use ($motif) {
                        $u->where('nom', 'ilike', $motif)
                            ->orWhere('prenom', 'ilike', $motif)
                            ->orWhere('email', 'ilike', $motif);
                    });
            });
        }

        // Filtre niveau minimum
        if ($request->filled('niveau_max')) {
            $niveauMax = (int) $request->query('niveau_max');
            $requete->whereIn('action', array_keys(array_filter(
                self::NIVEAUX,
                fn ($n) => $n <= $niveauMax
            )));
        }

        // Filtre action spécifique (pour "voir uniquement les échecs")
        if ($request->filled('action')) {
            $requete->where('action', $request->query('action'));
        }

        // Filtre période
        $periode = $request->query('periode', '7j');
        $depuis = match ($periode) {
            '24h' => now()->subDay(),
            '7j' => now()->subDays(7),
            '30j' => now()->subDays(30),
            default => null,
        };
        if ($depuis) {
            $requete->where('date_action', '>=', $depuis);
        }

        $parPage = max(10, min((int) $request->query('par_page', 50), 200));
        $page = $requete->paginate($parPage);

        // Détection brute force : IPs avec >= 5 échecs dans les 5 dernières minutes
        $seuil = now()->subMinutes(self::FENETRE_BRUTE_FORCE_MINUTES);
        $ipsSuspectes = JournalAudit::where('action', 'LOGIN_ECHEC')
            ->where('date_action', '>=', $seuil)
            ->whereNotNull('adresse_ip')
            ->selectRaw('adresse_ip, COUNT(*) as total')
            ->groupBy('adresse_ip')
            ->havingRaw('COUNT(*) >= ?', [self::SEUIL_BRUTE_FORCE])
            ->pluck('total', 'adresse_ip')
            ->all();

        // Stats
        $total30j = JournalAudit::whereIn('action', $actionsAutorisees)
            ->where('date_action', '>=', now()->subDays(30))
            ->count();
        $connexions24h = JournalAudit::where('action', 'LOGIN')
            ->where('date_action', '>=', now()->subDay())
            ->count();
        $echecs24h = JournalAudit::where('action', 'LOGIN_ECHEC')
            ->where('date_action', '>=', now()->subDay())
            ->count();

        return response()->json([
            'data' => collect($page->items())->map(fn ($l) => $this->presenter($l, $ipsSuspectes))->values()->all(),
            'meta' => [
                'page' => $page->currentPage(),
                'par_page' => $page->perPage(),
                'total' => $page->total(),
                'derniere_page' => $page->lastPage(),
            ],
            'stats' => [
                'total_30j' => $total30j,
                'connexions_24h' => $connexions24h,
                'echecs_24h' => $echecs24h,
            ],
            'alertes' => [
                'brute_force' => collect($ipsSuspectes)->map(fn ($total, $ip) => [
                    'adresse_ip' => $ip,
                    'tentatives' => $total,
                ])->values()->all(),
            ],
        ]);
    }

    private function presenter(JournalAudit $l, array $ipsSuspectes = []): array
    {
        // Niveau de base
        $niveauBase = self::NIVEAUX[$l->action] ?? 6;

        // Si c'est un LOGIN_ECHEC et que l'IP est en brute force → CRIT (3)
        $niveau = $niveauBase;
        $bruteForce = false;
        if ($l->action === 'LOGIN_ECHEC' && $l->adresse_ip && isset($ipsSuspectes[$l->adresse_ip])) {
            $niveau = 3;
            $bruteForce = true;
        }

        return [
            'reference_audit' => $l->reference_audit,
            'action' => $l->action,
            'niveau' => $niveau,
            'brute_force' => $bruteForce,
            'details_action' => $l->details_action,
            'adresse_ip' => $l->adresse_ip,
            'date_action' => $l->date_action?->toIso8601String(),
            'utilisateur' => $l->utilisateur ? [
                'matricule' => $l->utilisateur->matricule,
                'nom' => $l->utilisateur->nom,
                'prenom' => $l->utilisateur->prenom,
                'email' => $l->utilisateur->email,
            ] : null,
        ];
    }
}
