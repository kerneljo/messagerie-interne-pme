<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JournalAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class JournalAuditController extends Controller
{
    /** Filtres : ?matricule=&action=&du=YYYY-MM-DD&au=YYYY-MM-DD&par_page= */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'matricule' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'max:100'],
            'du' => ['nullable', 'date'],
            'au' => ['nullable', 'date'],
        ]);

        $requete = JournalAudit::with('utilisateur')->orderByDesc('reference_audit');

        if ($request->filled('matricule')) {
            $requete->where('matricule', (int) $request->query('matricule'));
        }
        if ($request->filled('action')) {
            $requete->where('action', $request->query('action'));
        }
        if ($request->filled('du')) {
            $requete->where('date_action', '>=', Carbon::parse($request->query('du'))->startOfDay());
        }
        if ($request->filled('au')) {
            $requete->where('date_action', '<=', Carbon::parse($request->query('au'))->endOfDay());
        }

        $page = $requete->paginate(max(1, min((int) $request->query('par_page', 50), 200)));

        return response()->json($page->through(fn ($a) => [
            'reference_audit' => $a->reference_audit,
            'action' => $a->action,
            'details_action' => $a->details_action,
            'date_action' => $a->date_action?->toIso8601String(),
            'adresse_ip' => $a->adresse_ip,
            'utilisateur' => $a->utilisateur ? [
                'matricule' => $a->utilisateur->matricule,
                'nom' => $a->utilisateur->nom,
                'prenom' => $a->utilisateur->prenom,
            ] : null,
        ]));
    }
}
