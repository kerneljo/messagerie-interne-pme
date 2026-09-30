<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /** Role utilise par le controle d'acces : on ne le renomme ni ne le supprime. */
    private const ROLE_SYSTEME = 'Administrateur';

    public function index(): JsonResponse
    {
        return response()->json(Role::withCount('utilisateurs')->orderBy('libelle')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'libelle' => ['required', 'string', 'max:50', Rule::unique('role', 'libelle')],
        ]);

        $role = Role::create($data);
        Audit::log('CREATION_ROLE', $request->user()->matricule, "role #{$role->code_role}");

        return response()->json($role, 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if ($role->libelle === self::ROLE_SYSTEME) {
            return response()->json(['message' => 'Ce role systeme ne peut pas etre modifie.'], 422);
        }

        $data = $request->validate([
            'libelle' => ['required', 'string', 'max:50',
                Rule::unique('role', 'libelle')->ignore($role->code_role, 'code_role')],
        ]);

        $role->update($data);
        Audit::log('MODIF_ROLE', $request->user()->matricule, "role #{$role->code_role}");

        return response()->json($role);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($role->libelle === self::ROLE_SYSTEME) {
            return response()->json(['message' => 'Ce role systeme ne peut pas etre supprime.'], 422);
        }
        if ($role->utilisateurs()->exists()) {
            return response()->json(['message' => 'Ce role est encore attribue a des utilisateurs.'], 409);
        }

        $id = $role->code_role;
        $role->delete();
        Audit::log('SUPPR_ROLE', $request->user()->matricule, "role #{$id}");

        return response()->json(['message' => 'Role supprime.']);
    }
}
