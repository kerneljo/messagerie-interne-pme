<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Utilisateur;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UtilisateurController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $requete = Utilisateur::with(['service', 'role'])->orderBy('nom')->orderBy('prenom');

        if ($request->filled('q')) {
            $motif = '%' . addcslashes((string) $request->query('q'), '%_\\') . '%';
            $requete->where(function ($w) use ($motif) {
                $w->where('nom', 'ilike', $motif)
                    ->orWhere('prenom', 'ilike', $motif)
                    ->orWhere('email', 'ilike', $motif);
            });
        }
        if ($request->filled('statut')) {
            $requete->where('statut_compte', $request->query('statut'));
        }

        $page = $requete->paginate(max(1, min((int) $request->query('par_page', 20), 100)));

        return response()->json($page->through(fn ($u) => $this->presenter($u)));
    }

    public function show(Utilisateur $utilisateur): JsonResponse
    {
        return response()->json($this->presenter($utilisateur));
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);

        $data = $request->validate([
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('utilisateur', 'email')],
            'mot_de_passe' => ['required', Password::min(10)->mixedCase()->numbers()],
            'poste' => ['nullable', 'string', 'max:100'],
            'code_service' => ['required', 'integer', Rule::exists('service', 'code_service')],
            'code_role' => ['required', 'integer', Rule::exists('role', 'code_role')],
        ]);

        $utilisateur = Utilisateur::create([
            'nom' => $data['nom'],
            'prenom' => $data['prenom'],
            'email' => $data['email'],
            'mot_de_passe_hash' => $data['mot_de_passe'], // hache automatiquement (cast 'hashed')
            'poste' => $data['poste'] ?? null,
            'code_service' => $data['code_service'],
            'code_role' => $data['code_role'],
        ]);
        $utilisateur->refresh();

        Audit::log('CREATION_UTILISATEUR', $request->user()->matricule, "utilisateur #{$utilisateur->matricule}");

        return response()->json($this->presenter($utilisateur), 201);
    }

    public function update(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        if ($request->has('email')) {
            $request->merge(['email' => Str::lower((string) $request->input('email'))]);
        }

        $data = $request->validate([
            'nom' => ['sometimes', 'string', 'max:100'],
            'prenom' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', 'max:150',
                Rule::unique('utilisateur', 'email')->ignore($utilisateur->matricule, 'matricule')],
            'mot_de_passe' => ['sometimes', Password::min(10)->mixedCase()->numbers()],
            'poste' => ['sometimes', 'nullable', 'string', 'max:100'],
            'code_service' => ['sometimes', 'integer', Rule::exists('service', 'code_service')],
            'code_role' => ['sometimes', 'integer', Rule::exists('role', 'code_role')],
            'statut_compte' => ['sometimes', Rule::in(['actif', 'desactive'])],
        ]);

        // Evite qu'un administrateur se verrouille lui-meme
        $moi = $request->user();
        if ((int) $moi->matricule === (int) $utilisateur->matricule) {
            $desactive = ($data['statut_compte'] ?? 'actif') !== 'actif';
            $changeRole = isset($data['code_role']) && (int) $data['code_role'] !== (int) $utilisateur->code_role;
            if ($desactive || $changeRole) {
                return response()->json(
                    ['message' => 'Vous ne pouvez pas desactiver votre compte ni changer votre propre role.'], 422);
            }
        }

        $ancienStatut = $utilisateur->statut_compte;
        $motDePasseChange = isset($data['mot_de_passe']);
        if ($motDePasseChange) {
            $data['mot_de_passe_hash'] = $data['mot_de_passe'];
            unset($data['mot_de_passe']);
        }

        $utilisateur->update($data);

        $adminId = $moi->matricule;
        if (isset($data['statut_compte']) && $data['statut_compte'] !== $ancienStatut) {
            Audit::log($data['statut_compte'] === 'actif' ? 'ACTIVATION_UTILISATEUR' : 'DESACTIVATION_UTILISATEUR',
                $adminId, "utilisateur #{$utilisateur->matricule}");
        }
        if ($motDePasseChange) {
            Audit::log('RESET_MOT_DE_PASSE', $adminId, "utilisateur #{$utilisateur->matricule}");
        }
        $champs = implode(', ', array_keys(Arr::except($data, ['mot_de_passe_hash', 'statut_compte'])));
        if ($champs !== '') {
            Audit::log('MODIF_UTILISATEUR', $adminId, "utilisateur #{$utilisateur->matricule} : {$champs}");
        }

        return response()->json($this->presenter($utilisateur->fresh(['service', 'role'])));
    }

    private function presenter(Utilisateur $u): array
    {
        $u->loadMissing('service', 'role');

        return [
            'matricule' => $u->matricule,
            'nom' => $u->nom,
            'prenom' => $u->prenom,
            'email' => $u->email,
            'poste' => $u->poste,
            'statut_compte' => $u->statut_compte,
            'derniere_connexion' => $u->derniere_connexion?->toIso8601String(),
            'date_creation' => $u->date_creation?->toIso8601String(),
            'service' => $u->service ? ['code_service' => $u->service->code_service, 'nom_service' => $u->service->nom_service] : null,
            'role' => $u->role ? ['code_role' => $u->role->code_role, 'libelle' => $u->role->libelle] : null,
        ];
    }
}
