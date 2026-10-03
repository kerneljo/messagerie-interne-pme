<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $requete = Service::withCount('utilisateurs')->orderBy('nom_service');

        if ($recherche = $request->query('q')) {
            $motif = '%' . addcslashes($recherche, '%_\\') . '%';
            $requete->where('nom_service', 'ilike', $motif);
        }

        return response()->json($requete->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom_service' => ['required', 'string', 'max:100', 'unique:service,nom_service'],
        ]);

        $service = Service::create($data);

        Audit::log(
            'SERVICE_CREATION',
            $request->user()->matricule,
            "service #{$service->code_service} : {$service->nom_service}"
        );

        return response()->json($service->loadCount('utilisateurs'), 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'nom_service' => [
                'required', 'string', 'max:100',
                Rule::unique('service', 'nom_service')->ignore($service->code_service, 'code_service'),
            ],
        ]);

        $service->update($data);

        Audit::log(
            'SERVICE_MODIFICATION',
            $request->user()->matricule,
            "service #{$service->code_service}"
        );

        return response()->json($service->loadCount('utilisateurs'));
    }

    public function destroy(Request $request, Service $service): JsonResponse
    {
        if ($service->utilisateurs()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : des utilisateurs sont rattachés à ce service.',
            ], 409);
        }

        $id = $service->code_service;
        $nom = $service->nom_service;
        $service->delete();

        Audit::log('SERVICE_SUPPRESSION', $request->user()->matricule, "service #{$id} : {$nom}");

        return response()->json(['message' => 'Service supprimé.']);
    }
}
