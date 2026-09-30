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
    public function index(): JsonResponse
    {
        return response()->json(Service::withCount('utilisateurs')->orderBy('nom_service')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom_service' => ['required', 'string', 'max:100', Rule::unique('service', 'nom_service')],
        ]);

        $service = Service::create($data);
        Audit::log('CREATION_SERVICE', $request->user()->matricule, "service #{$service->code_service}");

        return response()->json($service, 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'nom_service' => ['required', 'string', 'max:100',
                Rule::unique('service', 'nom_service')->ignore($service->code_service, 'code_service')],
        ]);

        $service->update($data);
        Audit::log('MODIF_SERVICE', $request->user()->matricule, "service #{$service->code_service}");

        return response()->json($service);
    }

    public function destroy(Request $request, Service $service): JsonResponse
    {
        if ($service->utilisateurs()->exists()) {
            return response()->json(['message' => 'Ce service contient encore des utilisateurs.'], 409);
        }

        $id = $service->code_service;
        $service->delete();
        Audit::log('SUPPR_SERVICE', $request->user()->matricule, "service #{$id}");

        return response()->json(['message' => 'Service supprime.']);
    }
}
