<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Poste;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Poste::withCount('utilisateurs')->orderBy('libelle');

        if ($recherche = $request->query('q')) {
            $query->where('libelle', 'ilike', "%{$recherche}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'libelle'     => ['required', 'string', 'max:100', 'unique:poste,libelle'],
            'description' => ['nullable', 'string', 'max:500'],
            'actif'       => ['boolean'],
        ]);

        $poste = Poste::create($data);

        Audit::log('POSTE_CREATION', $request->user()->matricule, "Poste #{$poste->code_poste} : {$poste->libelle}");

        return response()->json($poste, 201);
    }

    public function update(Request $request, Poste $poste): JsonResponse
    {
        $data = $request->validate([
            'libelle'     => ['required', 'string', 'max:100', 'unique:poste,libelle,' . $poste->code_poste . ',code_poste'],
            'description' => ['nullable', 'string', 'max:500'],
            'actif'       => ['boolean'],
        ]);

        $poste->update($data);

        Audit::log('POSTE_MODIFICATION', $request->user()->matricule, "Poste #{$poste->code_poste}");

        return response()->json($poste);
    }

    public function destroy(Request $request, Poste $poste): JsonResponse
    {
        if ($poste->utilisateurs()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : des utilisateurs sont rattachés à ce poste.',
            ], 409);
        }

        $id = $poste->code_poste;
        $poste->delete();

        Audit::log('POSTE_SUPPRESSION', $request->user()->matricule, "Poste #{$id}");

        return response()->json(['message' => 'Poste supprimé.']);
    }
}
