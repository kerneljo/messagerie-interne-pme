<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Fichier;
use App\Models\JournalAudit;
use App\Models\Message;
use App\Models\Service;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /** Statistiques personnelles (et globales pour un administrateur). ?tz=Indian/Antananarivo */
    public function index(Request $request): JsonResponse
    {
        $u = $request->user();

        $tz = (string) $request->query('tz', 'UTC');
        if (! in_array($tz, \DateTimeZone::listIdentifiers(), true)) {
            $tz = 'UTC';
        }

        // Sous-requete : les conversations dont je suis membre
        $mesConversations = fn ($q) => $q->select('reference_conversation')
            ->from('participant')
            ->where('matricule', $u->matricule);

        $nonLus = Message::whereIn('reference_conversation', $mesConversations)
            ->where('matricule_expediteur', '<>', $u->matricule)
            ->whereDoesntHave('lecteurs', fn ($q) => $q->where('lecture_message.matricule', $u->matricule))
            ->count();

        $parType = Conversation::whereIn('reference_conversation', $mesConversations)
            ->selectRaw('type, count(*) as n')
            ->groupBy('type')
            ->pluck('n', 'type');

        // 7 derniers jours (jour courant inclus), calcules dans le fuseau de l'utilisateur
        $jours = collect(range(6, 0))->map(fn ($i) => Carbon::now($tz)->subDays($i)->toDateString());
        $depuis = Carbon::now($tz)->subDays(6)->startOfDay()->utc();

        $recents = Message::whereIn('reference_conversation', $mesConversations)
            ->where('date_envoi', '>=', $depuis)
            ->get(['date_envoi', 'matricule_expediteur']);

        $parJour = $jours->mapWithKeys(fn ($j) => [$j => ['jour' => $j, 'envoyes' => 0, 'recus' => 0]])->all();
        foreach ($recents as $m) {
            $jour = $m->date_envoi->copy()->setTimezone($tz)->toDateString();
            if (! isset($parJour[$jour])) {
                continue;
            }
            $cle = (int) $m->matricule_expediteur === (int) $u->matricule ? 'envoyes' : 'recus';
            $parJour[$jour][$cle]++;
        }
        $activite = array_values($parJour);

        $fichiers7j = Fichier::whereHas('message', fn ($q) => $q->whereIn('reference_conversation', $mesConversations))
            ->where('date_upload', '>=', $depuis)
            ->count();

        return response()->json([
            'non_lus' => $nonLus,
            'conversations' => [
                'total' => (int) $parType->sum(),
                'direct' => (int) ($parType['DIRECT'] ?? 0),
                'groupe' => (int) ($parType['GROUPE'] ?? 0),
                'diffusion' => (int) ($parType['DIFFUSION'] ?? 0),
            ],
            'envoyes_7j' => array_sum(array_column($activite, 'envoyes')),
            'recus_7j' => array_sum(array_column($activite, 'recus')),
            'fichiers_7j' => $fichiers7j,
            'activite' => $activite,
            'admin' => $u->estAdministrateur() ? [
                'utilisateurs_actifs' => Utilisateur::where('statut_compte', 'actif')->count(),
                'utilisateurs_desactives' => Utilisateur::where('statut_compte', 'desactive')->count(),
                'services' => Service::count(),
                'connexions_24h' => JournalAudit::where('action', 'LOGIN')->where('date_action', '>=', now()->subDay())->count(),
                'echecs_connexion_24h' => JournalAudit::where('action', 'LOGIN_ECHEC')->where('date_action', '>=', now()->subDay())->count(),
            ] : null,
        ]);
    }
}
