<?php

namespace App\Http\Controllers;

use App\Models\Fichier;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class FichierController extends Controller
{
    /** Telechargement controle : seul un participant de la conversation peut recuperer le fichier. */
    public function telecharger(Request $request, Fichier $fichier): Response
    {
        $message = $fichier->message; // null si le message a ete supprime (suppression logique)
        abort_if($message === null, 404);

        Gate::authorize('view', $message->conversation);
        abort_unless(Storage::disk('local')->exists($fichier->nom_stocke), 404);

        Audit::log('TELECHARGEMENT_FICHIER', $request->user()->matricule,
            "fichier #{$fichier->reference_fichier} ({$fichier->nom_original})");

        return Storage::disk('local')->download(
            $fichier->nom_stocke,
            $fichier->nom_original,
            ['X-Content-Type-Options' => 'nosniff']
        );
    }
}
