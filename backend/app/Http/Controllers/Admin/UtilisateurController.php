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
        $requete = Utilisateur::with(['service', 'role', 'poste']);

        // Recherche (nom, prénom, email)
        if ($request->filled('q')) {
            $motif = '%' . addcslashes((string) $request->query('q'), '%_\\') . '%';
            $requete->where(function ($w) use ($motif) {
                $w->where('nom', 'ilike', $motif)
                    ->orWhere('prenom', 'ilike', $motif)
                    ->orWhere('email', 'ilike', $motif);
            });
        }

        // Filtres
        if ($request->filled('statut')) {
            $requete->where('statut_compte', $request->query('statut'));
        }
        if ($request->filled('code_role')) {
            $requete->where('code_role', (int) $request->query('code_role'));
        }
        if ($request->filled('code_service')) {
            $requete->where('code_service', (int) $request->query('code_service'));
        }

        // Tri
        $tri = in_array($request->query('tri'), ['nom', 'prenom', 'email', 'date_creation', 'derniere_connexion'], true)
            ? $request->query('tri')
            : 'nom';
        $ordre = $request->query('ordre') === 'desc' ? 'desc' : 'asc';
        $requete->orderBy($tri, $ordre);
        if ($tri === 'nom') {
            $requete->orderBy('prenom', $ordre);
        }

        $parPage = max(5, min((int) $request->query('par_page', 15), 100));
        $page = $requete->paginate($parPage);

        // Stats globales (indépendantes du filtre)
        $total = Utilisateur::count();
        $actifs = Utilisateur::where('statut_compte', 'actif')->count();
        $enAttente = Utilisateur::where('statut_compte', 'en_attente')->count();
        $desactives = Utilisateur::where('statut_compte', 'desactive')->count();

        return response()->json([
            'data' => $page->through(fn ($u) => $this->presenter($u))->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'par_page' => $page->perPage(),
                'total' => $page->total(),
                'derniere_page' => $page->lastPage(),
            ],
            'stats' => [
                'total' => $total,
                'actifs' => $actifs,
                'en_attente' => $enAttente,
                'desactives' => $desactives,
            ],
        ]);
    }

    public function show(Utilisateur $utilisateur): JsonResponse
    {
        return response()->json($this->presenter($utilisateur->load(['service', 'role', 'poste'])));
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);

        $data = $request->validate([
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('utilisateur', 'email')],
            'mot_de_passe' => ['required', Password::min(8)],
            'code_poste' => ['nullable', 'integer', Rule::exists('poste', 'code_poste')],
            'code_service' => ['required', 'integer', Rule::exists('service', 'code_service')],
            'code_role' => ['required', 'integer', Rule::exists('role', 'code_role')],
        ]);

        $utilisateur = Utilisateur::create([
            'nom' => $data['nom'],
            'prenom' => $data['prenom'],
            'email' => $data['email'],
            'mot_de_passe_hash' => $data['mot_de_passe'],
            'code_poste' => $data['code_poste'] ?? null,
            'code_service' => $data['code_service'],
            'code_role' => $data['code_role'],
            'statut_compte' => 'actif', // créé par un admin → actif directement
        ]);

        Audit::log('CREATION_UTILISATEUR', $request->user()->matricule, "utilisateur #{$utilisateur->matricule}");

        return response()->json($this->presenter($utilisateur->fresh(['service', 'role', 'poste'])), 201);
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
            'mot_de_passe' => ['sometimes', Password::min(8)],
            'code_poste' => ['sometimes', 'nullable', 'integer', Rule::exists('poste', 'code_poste')],
            'code_service' => ['sometimes', 'integer', Rule::exists('service', 'code_service')],
            'code_role' => ['sometimes', 'integer', Rule::exists('role', 'code_role')],
            'statut_compte' => ['sometimes', Rule::in(['actif', 'desactive'])],
        ]);

        $moi = $request->user();
        $estMoiMeme = (int) $moi->matricule === (int) $utilisateur->matricule;

        // 🔒 Protection 1 : on ne se désactive pas soi-même, on ne change pas son propre rôle
        if ($estMoiMeme) {
            $desactive = isset($data['statut_compte']) && $data['statut_compte'] !== 'actif';
            $changeRole = isset($data['code_role']) && (int) $data['code_role'] !== (int) $utilisateur->code_role;
            if ($desactive || $changeRole) {
                return response()->json(
                    ['message' => 'Vous ne pouvez pas désactiver votre compte ni changer votre propre rôle.'],
                    422
                );
            }
        }

        // 🔒 Protection 2 : on ne désactive pas / rétrograde pas le DERNIER admin actif
        $roleAdmin = (int) (\App\Models\Role::where('libelle', 'Administrateur')->value('code_role') ?? 0);
        $estAdminActuel = (int) $utilisateur->code_role === $roleAdmin && $utilisateur->statut_compte === 'actif';

        $seraDesactive = isset($data['statut_compte']) && $data['statut_compte'] !== 'actif';
        $seraRetrograde = isset($data['code_role']) && (int) $data['code_role'] !== $roleAdmin;

        if ($estAdminActuel && ($seraDesactive || $seraRetrograde)) {
            $autresAdminsActifs = Utilisateur::where('code_role', $roleAdmin)
                ->where('statut_compte', 'actif')
                ->where('matricule', '!=', $utilisateur->matricule)
                ->count();

            if ($autresAdminsActifs === 0) {
                return response()->json(
                    ['message' => 'Impossible : c’est le dernier administrateur actif. Nommez un autre administrateur d’abord.'],
                    422
                );
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
            Audit::log(
                $data['statut_compte'] === 'actif' ? 'ACTIVATION_UTILISATEUR' : 'DESACTIVATION_UTILISATEUR',
                $adminId,
                "utilisateur #{$utilisateur->matricule}"
            );
        }
        if ($motDePasseChange) {
            Audit::log('RESET_MOT_DE_PASSE', $adminId, "utilisateur #{$utilisateur->matricule}");
        }
        $champs = implode(', ', array_keys(Arr::except($data, ['mot_de_passe_hash', 'statut_compte'])));
        if ($champs !== '') {
            Audit::log('MODIF_UTILISATEUR', $adminId, "utilisateur #{$utilisateur->matricule} : {$champs}");
        }

        return response()->json($this->presenter($utilisateur->fresh(['service', 'role', 'poste'])));
    }

    /** Désactivation (soft) — pas de vrai delete pour préserver l'intégrité. */
    public function destroy(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        $moi = $request->user();

        if ((int) $moi->matricule === (int) $utilisateur->matricule) {
            return response()->json(['message' => 'Vous ne pouvez pas désactiver votre propre compte.'], 422);
        }

        $roleAdmin = (int) (\App\Models\Role::where('libelle', 'Administrateur')->value('code_role') ?? 0);
        if ((int) $utilisateur->code_role === $roleAdmin && $utilisateur->statut_compte === 'actif') {
            $autresAdminsActifs = Utilisateur::where('code_role', $roleAdmin)
                ->where('statut_compte', 'actif')
                ->where('matricule', '!=', $utilisateur->matricule)
                ->count();

            if ($autresAdminsActifs === 0) {
                return response()->json(
                    ['message' => 'Impossible de désactiver le dernier administrateur actif.'],
                    422
                );
            }
        }

        if ($utilisateur->statut_compte === 'desactive') {
            return response()->json(['message' => 'Ce compte est déjà désactivé.'], 422);
        }

        $utilisateur->update(['statut_compte' => 'desactive']);

        Audit::log('DESACTIVATION_UTILISATEUR', $moi->matricule, "utilisateur #{$utilisateur->matricule}");

        return response()->json($this->presenter($utilisateur->fresh(['service', 'role', 'poste'])));
    }

    /** Réactivation d'un compte désactivé. */
    public function reactiver(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        if ($utilisateur->statut_compte === 'actif') {
            return response()->json(['message' => 'Ce compte est déjà actif.'], 422);
        }

        $utilisateur->update(['statut_compte' => 'actif']);

        Audit::log('ACTIVATION_UTILISATEUR', $request->user()->matricule, "utilisateur #{$utilisateur->matricule}");

        return response()->json($this->presenter($utilisateur->fresh(['service', 'role', 'poste'])));
    }

    /** ✅ Validation d'un compte en attente (inscription). */
    public function valider(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        if ($utilisateur->statut_compte !== 'en_attente') {
            return response()->json(
                ['message' => 'Ce compte n’est pas en attente de validation.'],
                422
            );
        }

        $utilisateur->update(['statut_compte' => 'actif']);

        Audit::log(
            'VALIDATION_UTILISATEUR',
            $request->user()->matricule,
            "utilisateur #{$utilisateur->matricule}"
        );

        return response()->json([
            'message' => 'Compte validé.',
            'data' => $this->presenter($utilisateur->fresh(['service', 'role', 'poste'])),
        ]);
    }

    /** ❌ Refus d'un compte en attente. */
    public function refuser(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        if ($utilisateur->statut_compte !== 'en_attente') {
            return response()->json(
                ['message' => 'Ce compte n’est pas en attente de validation.'],
                422
            );
        }

        // On garde la trace du refus mais on bloque la connexion.
        // Option A (par défaut) : passage en 'desactive'.
        // Option B : statut dédié 'refuse' (nécessite de l'ajouter au CHECK contrainte / enum).
        $utilisateur->update(['statut_compte' => 'desactive']);

        Audit::log(
            'REFUS_UTILISATEUR',
            $request->user()->matricule,
            "utilisateur #{$utilisateur->matricule}"
        );

        return response()->json([
            'message' => 'Compte refusé.',
            'data' => $this->presenter($utilisateur->fresh(['service', 'role', 'poste'])),
        ]);
    }

    private function presenter(Utilisateur $u): array
    {
        $u->loadMissing('service', 'role', 'poste');

        return [
            'matricule' => $u->matricule,
            'nom' => $u->nom,
            'prenom' => $u->prenom,
            'email' => $u->email,
            'poste' => $u->poste ? [
                'code_poste' => $u->poste->code_poste,
                'libelle' => $u->poste->libelle,
            ] : null,
            'statut_compte' => $u->statut_compte,
            'derniere_connexion' => $u->derniere_connexion?->toIso8601String(),
            'date_creation' => $u->date_creation?->toIso8601String(),
            'service' => $u->service ? [
                'code_service' => $u->service->code_service,
                'nom_service' => $u->service->nom_service,
            ] : null,
            'role' => $u->role ? [
                'code_role' => $u->role->code_role,
                'libelle' => $u->role->libelle,
            ] : null,
        ];
    }
}
