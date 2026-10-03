<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Service;
use App\Models\Utilisateur;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    private const MAX_TENTATIVES = 5;
    private const BLOCAGE_SECONDES = 300;

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom'      => ['required', 'string', 'max:100'],
            'prenom'   => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:255', 'unique:utilisateur,email'],
            'code_poste' => ['required', 'integer', 'exists:poste,code_poste'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ]);

        // 🔒 Le backend décide : rôle Employe, service Direction, statut actif
        $role    = Role::where('libelle', 'Employe')->firstOrFail();
        $service = Service::where('nom_service', 'Direction')->firstOrFail();

        $utilisateur = Utilisateur::create([
            'nom'               => $data['nom'],
            'prenom'            => $data['prenom'],
            'email'             => $data['email'],
            'code_poste'        => $data['code_poste'],
            'mot_de_passe_hash' => $data['password'], // cast 'hashed' → hachage auto
            'code_service'      => $service->code_service,
            'code_role'         => $role->code_role,
            'statut_compte'     => 'actif',
            // matricule : généré automatiquement par PostgreSQL (sequence)
        ]);

        Auth::login($utilisateur);
        $request->session()->regenerate();

        Audit::log('REGISTER', $utilisateur->matricule);

        return response()->json($this->presenter($utilisateur), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Limitation : 5 echecs par couple (email + IP) puis blocage de 5 minutes
        $cle = Str::lower($data['email']) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($cle, self::MAX_TENTATIVES)) {
            $s = RateLimiter::availableIn($cle);
            return response()->json(['message' => "Trop de tentatives. Reessayez dans {$s} secondes."], 429);
        }

        $connu = Utilisateur::where('email', $data['email'])->first();

        // Seuls les comptes actifs peuvent se connecter
        $ok = Auth::attempt([
            'email' => $data['email'],
            'password' => $data['password'],
            'statut_compte' => 'actif',
        ]);

        if (! $ok) {
            RateLimiter::hit($cle, self::BLOCAGE_SECONDES);
            if ($connu) {
                Audit::log('LOGIN_ECHEC', $connu->matricule,
                    $connu->statut_compte === 'actif' ? 'Mot de passe incorrect' : 'Compte desactive');
            }
            // Message volontairement generique : ne revele pas si l'email existe
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }

        RateLimiter::clear($cle);
        $request->session()->regenerate(); // protection contre la fixation de session

        $utilisateur = Auth::user();
        $utilisateur->forceFill(['derniere_connexion' => now()])->save();
        Audit::log('LOGIN', $utilisateur->matricule);

        return response()->json($this->presenter($utilisateur));
    }

    public function logout(Request $request): JsonResponse
    {

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Deconnecte.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->presenter($request->user()));
    }

    /** Ne renvoie que les champs utiles au frontend. */
    private function presenter(Utilisateur $u): array
    {
        $u->loadMissing('service', 'role', 'poste');

        return [
            'matricule' => $u->matricule,
            'nom' => $u->nom,
            'prenom' => $u->prenom,
            'email' => $u->email,
            'photo_url' => $u->photo_profil ? asset('storage/' . $u->photo_profil) : null,
            'poste' => $u->poste ? ['code_poste' => $u->poste->code_poste, 'libelle' => $u->poste->libelle] : null,
            'service' => ['code_service' => $u->service->code_service, 'nom_service' => $u->service->nom_service],
            'role' => ['code_role' => $u->role->code_role, 'libelle' => $u->role->libelle],
        ];
    }
}
