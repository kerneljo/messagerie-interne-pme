<?php

namespace App\Http\Controllers;

use App\Models\Poste;
use Illuminate\Http\JsonResponse;

class PosteController extends Controller
{
    /** Liste publique des postes actifs (pour le formulaire d'inscription). */
    public function index(): JsonResponse
    {
        return response()->json(
            Poste::where('actif', true)
                ->orderBy('libelle')
                ->get(['code_poste', 'libelle'])
        );
    }
}
