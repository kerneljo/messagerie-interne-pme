<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Service;
use App\Models\Utilisateur;
use App\Support\Audit;
use App\Mail\CodeVerificationMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    private const MAX_TENTATIVES = 5;
    private const BLOCAGE_SECONDES = 300;
    private const MAX_DEMANDES_EN_ATTENTE = 100;
    private const OTP_DUREE_MINUTES = 15; // Durée de validité du code

    /**
     * ÉTAPE 1 : Valider le formulaire d'inscription et envoyer l'OTP par email.
     * Ne crée PAS l'utilisateur (on attend la vérification).
     */
    public function envoyerCode(Request $request): JsonResponse
    {
        if (Utilisateur::where('statut_compte', 'en_attente')->count() >= self::MAX_DEMANDES_EN_ATTENTE) {
            return response()->json(['message' => 'Trop de demandes en attente. Réessayez plus tard.'], 429);
        }

        $data = $request->validate([
            'nom'      => ['required', 'string', 'max:100'],
            'prenom'   => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:255', 'unique:utilisateur,email'],
            'code_poste' => ['required', 'integer', 'exists:poste,code_poste'],
            'password' => ['required', 'string', 'confirmed', Password::min(10)->letters()->numbers()],
        ]);

        // Générer un code à 6 chiffres
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Stocker les données et le code en cache pendant 15 minutes
        Cache::put('otp_inscription_' . Str::lower($data['email']), [
            'code' => $code,
            'donnees' => $data,
        ], now()->addMinutes(self::OTP_DUREE_MINUTES));

        // Envoyer l'email
        Mail::to($data['email'])->send(new CodeVerificationMail($code));

        return response()->json([
            'message' => 'Un code de vérification a été envoyé à votre adresse email.',
            // Décommenter la ligne ci-dessous UNIQUEMENT pour tester sans envoyer de vrai email :
             'debug_code' => $code,
        ]);
    }

    /**
     * ÉTAPE 2 : Vérifier l'OTP et créer le compte (statut en_attente).
     */
    public function verifierCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code'  => ['required', 'string', 'size:6'],
        ]);

        $cleCache = 'otp_inscription_' . Str::lower($data['email']);
        $cache = Cache::get($cleCache);

        if (!$cache) {
            return response()->json(['message' => 'Code expiré ou email introuvable. Recommencez l\'inscription.'], 422);
        }

        if ($cache['code'] !== $data['code']) {
            return response()->json(['message' => 'Le code saisi est incorrect.'], 422);
        }

        // Code bon : on récupère les données mises en cache
        $donnees = $cache['donnees'];

        // On vérifie une dernière fois que l'email n'a pas été pris entre temps
        if (Utilisateur::where('email', $donnees['email'])->exists()) {
            Cache::forget($cleCache);
            return response()->json(['message' => 'Cet email est déjà utilisé.'], 422);
        }

        // Création du compte (reprend exactement votre logique initiale)
        $role    = Role::where('libelle', 'Employe')->firstOrFail();
        $service = Service::where('nom_service', 'Direction')->firstOrFail();

        $utilisateur = Utilisateur::create([
            'nom'               => $donnees['nom'],
            'prenom'            => $donnees['prenom'],
            'email'             => $donnees['email'],
            'code_poste'        => $donnees['code_poste'],
            'mot_de_passe_hash' => $donnees['password'], // cast 'hashed' hachage auto
            'code_service'      => $service->code_service,
            'code_role'         => $role->code_role,
            'statut_compte'     => 'en_attente',
        ]);

        Audit::log('REGISTER', $utilisateur->matricule, 'Compte créé en attente (via vérification email)');

        // On nettoie le cache
        Cache::forget($cleCache);

        return response()->json([
            'message' => 'Email vérifié avec succès. Votre compte est en attente de validation par un administrateur.',
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

        $cle = Str::lower($data['email']) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($cle, self::MAX_TENTATIVES)) {
            $s = RateLimiter::availableIn($cle);
            return response()->json(['message' => "Trop de tentatives. Reessayez dans {$s} secondes."], 429);
        }

        $connu = Utilisateur::where('email', $data['email'])->first();

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
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }

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
        $request->session()->regenerate();

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
