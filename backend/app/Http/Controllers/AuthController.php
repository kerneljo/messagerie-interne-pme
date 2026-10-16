<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Service;
use App\Models\Utilisateur;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    private const MAX_TENTATIVES = 5;
    private const BLOCAGE_SECONDES = 300;
    private const MAX_DEMANDES_EN_ATTENTE = 100;

    /**
     * Inscription publique.
     * Le compte est créé avec le statut "en_attente" et NE connecte PAS l'utilisateur.
     * Un administrateur devra valider le compte pour qu'il soit utilisable.
     */
    public function register(Request $request): JsonResponse
    {
        // Plafond de demandes en attente : empêche de saturer la file de validation
        if (Utilisateur::where('statut_compte', 'en_attente')->count() >= self::MAX_DEMANDES_EN_ATTENTE) {
            return response()->json([
                'message' => 'Trop de demandes en attente. Réessayez plus tard.',
            ], 429);
        }

        $data = $request->validate([
            'nom'      => ['required', 'string', 'max:100'],
            'prenom'   => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:255', 'unique:utilisateur,email'],
            'code_poste' => ['required', 'integer', 'exists:poste,code_poste'],
            'password' => ['required', 'string', 'confirmed', Password::min(10)->letters()->numbers()],
        ]);

        // Le backend décide : rôle Employe, service Direction, statut en_attente
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
            'statut_compte'     => 'en_attente',
            // matricule : généré automatiquement par PostgreSQL (sequence)
        ]);

        Audit::log('REGISTER', $utilisateur->matricule, 'Compte créé en attente de validation');

        // Pas de Auth::login() : l'utilisateur N'EST PAS connecté
        return response()->json([
            'message' => 'Votre compte a été créé. Il est en attente de validation par un administrateur.',
            'statut'  => 'en_attente',
        ], 201);
    }

    /**
     * Connexion.
     * Le mot de passe est vérifié EN PREMIER : l'état du compte (en attente, désactivé)
     * n'est révélé qu'à quelqu'un qui connaît le bon mot de passe.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Limitation : 5 échecs par couple (email + IP) puis blocage de 5 minutes
        $cle = Str::lower($data['email']) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($cle, self::MAX_TENTATIVES)) {
            $s = RateLimiter::availableIn($cle);
            return response()->json(['message' => "Trop de tentatives. Reessayez dans {$s} secondes."], 429);
        }

        $connu = Utilisateur::where('email', $data['email'])->first();

        // Un coût de hachage est toujours payé, même si l'e-mail est inconnu :
        // le temps de réponse ne permet pas de deviner si le compte existe
        if ($connu) {
            $motDePasseOk = Hash::check($data['password'], $connu->getAuthPassword());
        } else {
            Hash::make($data['password']);
            $motDePasseOk = false;
        }

        if (! $motDePasseOk) {
            RateLimiter::hit($cle, self::BLOCAGE_SECONDES);
            if ($connu) {
                Audit::log('LOGIN_ECHEC', $connu->matricule, 'Mot de passe incorrect');
            }
            // Message volontairement générique : ne révèle pas si l'email existe
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }

        // Mot de passe correct : on peut indiquer l'état du compte
        if ($connu->statut_compte === 'en_attente') {
            Audit::log('LOGIN_ECHEC', $connu->matricule, 'Compte en attente de validation');
            return response()->json([
                'message' => 'Votre compte est en attente de validation par un administrateur.',
            ], 403);
        }

        if ($connu->statut_compte !== 'actif') {
            Audit::log('LOGIN_ECHEC', $connu->matricule, 'Compte desactive');
            return response()->json([
                'message' => 'Votre compte a été désactivé. Contactez un administrateur.',
            ], 403);
        }

        RateLimiter::clear($cle);
        Auth::login($connu);
        $request->session()->regenerate(); // protection contre la fixation de session

        $connu->forceFill(['derniere_connexion' => now()])->save();
        Audit::log('LOGIN', $connu->matricule);

        return response()->json($this->presenter($connu));
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
