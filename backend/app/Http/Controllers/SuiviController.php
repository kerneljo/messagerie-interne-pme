<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Messages qui engagent : accusé « pris en compte », suivi par l'expéditeur,
 * historique des modifications et liste « À traiter ».
 */
class SuiviController extends Controller
{
    /** Catégories qui attendent un accusé de chaque destinataire. */
    public const CATEGORIES_AVEC_ACCUSE = ['ACTION_REQUISE', 'URGENT'];

    /** Un destinataire accuse réception (ou indique que c'est fait). */
    public function priseEnCompte(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('view', $message->conversation);
        $u = $request->user();

        $data = $request->validate([
            'statut' => ['required', Rule::in(['PRIS_EN_COMPTE', 'FAIT'])],
        ]);

        if ((int) $message->matricule_expediteur === (int) $u->matricule) {
            return response()->json(['message' => 'Vous ne pouvez pas accuser réception de votre propre message.'], 422);
        }

        if (! in_array($message->categorie, self::CATEGORIES_AVEC_ACCUSE, true)) {
            return response()->json(['message' => 'Ce message n’attend pas d’accusé de réception.'], 422);
        }

        $actuel = DB::table('prise_en_compte')
            ->where('reference_message', $message->reference_message)
            ->where('matricule', $u->matricule)
            ->value('statut');

        // Pas de retour arrière : ce qui est fait reste fait
        if ($actuel === 'FAIT' && $data['statut'] === 'PRIS_EN_COMPTE') {
            return response()->json(['message' => 'Ce message est déjà marqué comme fait.'], 422);
        }

        $date = now();

        DB::transaction(function () use ($message, $u, $data, $date) {
            DB::table('prise_en_compte')->upsert(
                [[
                    'reference_message' => $message->reference_message,
                    'matricule' => $u->matricule,
                    'statut' => $data['statut'],
                    'date_statut' => $date,
                ]],
                ['reference_message', 'matricule'],
                ['statut', 'date_statut']
            );

            // Accuser réception vaut lecture
            DB::table('lecture_message')->insertOrIgnore([
                'reference_message' => $message->reference_message,
                'matricule' => $u->matricule,
            ]);
        });

        Audit::log('PRISE_EN_COMPTE', $u->matricule,
            "message #{$message->reference_message} : {$data['statut']}");

        return response()->json([
            'ma_prise_en_compte' => [
                'statut' => $data['statut'],
                'date_statut' => $date->toIso8601String(),
            ],
        ]);
    }

    /** Suivi nominatif d'un message : qui a lu, qui a pris en compte. Réservé à l'expéditeur. */
    public function suivi(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('suivre', $message);

        $conversation = $message->conversation->load('participants');
        $attendus = $conversation->participants
            ->where('matricule', '!=', $message->matricule_expediteur);

        $lectures = DB::table('lecture_message')
            ->where('reference_message', $message->reference_message)
            ->pluck('date_lecture', 'matricule');

        $prises = DB::table('prise_en_compte')
            ->where('reference_message', $message->reference_message)
            ->get()
            ->keyBy(fn ($r) => (int) $r->matricule);

        $destinataires = $attendus->map(function ($p) use ($lectures, $prises) {
            $pc = $prises->get((int) $p->matricule);
            $dateLecture = $lectures->get((int) $p->matricule);

            return [
                'matricule' => $p->matricule,
                'nom' => $p->nom,
                'prenom' => $p->prenom,
                'photo_url' => $p->photo_url,
                'etat' => $pc?->statut ?? ($dateLecture ? 'LU' : 'EN_ATTENTE'),
                'date' => self::iso($pc?->date_statut ?? $dateLecture),
            ];
        })->values();

        return response()->json([
            'categorie' => $message->categorie,
            'echeance' => self::iso($message->echeance),
            'attend_accuse' => in_array($message->categorie, self::CATEGORIES_AVEC_ACCUSE, true),
            'resume' => [
                'attendus' => $destinataires->count(),
                'lus' => $destinataires->whereIn('etat', ['LU', 'PRIS_EN_COMPTE', 'FAIT'])->count(),
                'pris_en_compte' => $destinataires->whereIn('etat', ['PRIS_EN_COMPTE', 'FAIT'])->count(),
                'fait' => $destinataires->where('etat', 'FAIT')->count(),
            ],
            'destinataires' => $destinataires,
        ]);
    }

    /** Historique des modifications : visible des participants, pas de l'administrateur. */
    public function versions(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('view', $message->conversation);

        $anciennes = DB::table('message_version')
            ->where('reference_message', $message->reference_message)
            ->orderByDesc('reference_version')
            ->get(['reference_version', 'contenu', 'date_version'])
            ->map(fn ($v) => [
                'reference_version' => $v->reference_version,
                'contenu' => $v->contenu,
                'remplace_le' => self::iso($v->date_version),
            ])
            ->values();

        return response()->json([
            'actuelle' => [
                'contenu' => $message->contenu,
                'modifie_le' => self::iso($message->date_modification),
            ],
            'date_envoi' => self::iso($message->date_envoi),
            'anciennes' => $anciennes,
        ]);
    }

    /**
     * « À traiter » : les messages qui m'attendent.
     * - URGENT : tant que je n'ai pas accusé réception
     * - ACTION_REQUISE : tant que je ne l'ai pas marqué comme fait
     */
    public function actions(Request $request): JsonResponse
    {
        $moi = (int) $request->user()->matricule;

        $messages = Message::query()
            ->where('est_supprime', false)
            ->whereIn('categorie', self::CATEGORIES_AVEC_ACCUSE)
            ->where('matricule_expediteur', '<>', $moi)
            ->whereIn('reference_conversation', fn ($s) => $s
                ->select('reference_conversation')
                ->from('participant')
                ->where('matricule', $moi))
            ->whereNotExists(function ($s) use ($moi) {
                $s->select(DB::raw(1))
                    ->from('prise_en_compte')
                    ->whereColumn('prise_en_compte.reference_message', 'message.reference_message')
                    ->where('prise_en_compte.matricule', $moi)
                    ->where(function ($w) {
                        $w->where('prise_en_compte.statut', 'FAIT')
                            ->orWhere('message.categorie', 'URGENT');
                    });
            })
            ->with(['expediteur', 'conversation.participants'])
            ->orderByRaw("CASE categorie WHEN 'URGENT' THEN 0 ELSE 1 END")
            ->orderByRaw('echeance ASC NULLS LAST')
            ->orderByDesc('reference_message')
            ->limit(100)
            ->get();

        $statuts = DB::table('prise_en_compte')
            ->where('matricule', $moi)
            ->whereIn('reference_message', $messages->pluck('reference_message')->all())
            ->pluck('statut', 'reference_message');

        $actions = $messages->map(function ($m) use ($moi, $statuts) {
            $echeance = $m->echeance ? Carbon::parse($m->echeance) : null;

            return [
                'reference_message' => $m->reference_message,
                'apercu' => Str::limit((string) $m->contenu, 140) ?: 'Pièce jointe',
                'categorie' => $m->categorie,
                'echeance' => $echeance?->toIso8601String(),
                'en_retard' => $echeance !== null && $echeance->isPast(),
                'etat' => $statuts->get($m->reference_message, 'EN_ATTENTE'),
                'date_envoi' => self::iso($m->date_envoi),
                'expediteur' => $m->expediteur ? [
                    'matricule' => $m->expediteur->matricule,
                    'nom' => $m->expediteur->nom,
                    'prenom' => $m->expediteur->prenom,
                    'photo_url' => $m->expediteur->photo_url,
                ] : null,
                'conversation' => [
                    'reference_conversation' => $m->reference_conversation,
                    'titre' => self::titre($m->conversation, $moi),
                ],
            ];
        })->values();

        return response()->json([
            'actions' => $actions,
            'en_attente' => $actions->where('etat', 'EN_ATTENTE')->count(),
        ]);
    }

    private static function iso($date): ?string
    {
        return $date ? Carbon::parse($date)->toIso8601String() : null;
    }

    private static function titre($conversation, int $moi): ?string
    {
        if (! $conversation) {
            return null;
        }

        return $conversation->type === 'DIRECT'
            ? $conversation->participants->where('matricule', '!=', $moi)
                ->map(fn ($p) => $p->prenom . ' ' . $p->nom)->implode(', ')
            : $conversation->titre;
    }
}
