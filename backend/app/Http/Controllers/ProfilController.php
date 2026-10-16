<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class ProfilController extends Controller
{
    /** Récupère le profil complet + stats. */
    public function show(Request $request): JsonResponse
    {
        $u = $request->user()->load(['service', 'role', 'poste']);

        // Stats simples
        $nbMessagesEnvoyes = $u->messagesEnvoyes()->count();
        $nbConversations = $u->conversations()->count();

        return response()->json([
            'matricule' => $u->matricule,
            'nom' => $u->nom,
            'prenom' => $u->prenom,
            'email' => $u->email,
            'photo_profil' => $u->photo_profil,
            'photo_url' => $u->photo_profil ? asset('storage/' . $u->photo_profil) : null,
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
            'poste' => $u->poste ? [
                'code_poste' => $u->poste->code_poste,
                'libelle' => $u->poste->libelle,
            ] : null,
            'stats' => [
                'messages_envoyes' => $nbMessagesEnvoyes,
                'conversations' => $nbConversations,
            ],
        ]);
    }

    /** Upload / remplace la photo de profil. */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => [
                'required',
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:5120', // 5 Mo
            ],
        ], [
            'photo.required' => 'Aucune image sélectionnée.',
            'photo.image' => 'Le fichier doit être une image.',
            'photo.mimes' => 'Formats acceptés : JPG, PNG, WEBP.',
            'photo.max' => 'L’image ne doit pas dépasser 5 Mo.',
        ]);

        $u = $request->user();

        // Supprime l'ancienne photo si elle existe
        if ($u->photo_profil && Storage::disk('public')->exists($u->photo_profil)) {
            Storage::disk('public')->delete($u->photo_profil);
        }

        // Stocke la nouvelle photo
        $chemin = $request->file('photo')->store('photos-profil', 'public');

        $u->photo_profil = $chemin;
        $u->save();

        Audit::log('PHOTO_PROFIL_MAJ', $u->matricule);

        return response()->json([
            'message' => 'Photo de profil mise à jour.',
            'photo_profil' => $u->photo_profil,
            'photo_url' => asset('storage/' . $u->photo_profil),
        ]);
    }

    /** Supprime la photo de profil (retour aux initiales). */
    public function supprimerPhoto(Request $request): JsonResponse
    {
        $u = $request->user();

        if (! $u->photo_profil) {
            return response()->json(['message' => 'Aucune photo à supprimer.'], 422);
        }

        if (Storage::disk('public')->exists($u->photo_profil)) {
            Storage::disk('public')->delete($u->photo_profil);
        }

        $u->photo_profil = null;
        $u->save();

        Audit::log('PHOTO_PROFIL_SUPPRESSION', $u->matricule);

        return response()->json(['message' => 'Photo supprimée.']);
    }

    /** Changement de mot de passe (même règle de robustesse que l'inscription). */
    public function changerMotDePasse(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mot_de_passe_actuel' => ['required', 'string'],
            'nouveau_mot_de_passe' => ['required', 'string', 'confirmed', Password::min(10)->letters()->numbers()],
        ], [
            'mot_de_passe_actuel.required' => 'Le mot de passe actuel est requis.',
            'nouveau_mot_de_passe.required' => 'Le nouveau mot de passe est requis.',
            'nouveau_mot_de_passe.confirmed' => 'Les deux mots de passe ne correspondent pas.',
            'nouveau_mot_de_passe.min' => 'Le mot de passe doit contenir au moins 10 caractères.',
        ]);

        $u = $request->user();

        if (! Hash::check($data['mot_de_passe_actuel'], $u->mot_de_passe_hash)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
                'errors' => ['mot_de_passe_actuel' => ['Le mot de passe actuel est incorrect.']],
            ], 422);
        }

        if (Hash::check($data['nouveau_mot_de_passe'], $u->mot_de_passe_hash)) {
            return response()->json([
                'message' => 'Le nouveau mot de passe doit être différent de l’ancien.',
                'errors' => ['nouveau_mot_de_passe' => ['Le nouveau mot de passe doit être différent de l’ancien.']],
            ], 422);
        }

        $u->mot_de_passe_hash = $data['nouveau_mot_de_passe'];
        $u->save();

        // Nouvel identifiant de session : une session volée avant le changement n'a plus de valeur
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        Audit::log('RESET_MOT_DE_PASSE', $u->matricule, 'Changement par l’utilisateur lui-même');

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
}
