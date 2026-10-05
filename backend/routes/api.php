<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AnnuaireController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoiteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FichierController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\UtilisateurController;
use App\Http\Controllers\PosteController;
use App\Http\Middleware\CompteActif;
use App\Http\Middleware\RoleRequis;
use Illuminate\Support\Facades\Route;

// Routes publiques
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/postes', [PosteController::class, 'index']);
Route::get('/roles', fn() => response()->json(App\Models\Role::orderBy('libelle')->get(['code_role', 'libelle'])));
Route::get('/services', fn() => response()->json(App\Models\Service::orderBy('nom_service')->get(['code_service', 'nom_service'])));

// Routes protégées
Route::middleware(['auth:sanctum', CompteActif::class])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/utilisateurs/{utilisateur}/profil', [UtilisateurController::class, 'show']);
    Route::get('/profil', [ProfilController::class, 'show']);
    Route::put('/profil/mot-de-passe', [ProfilController::class, 'changerMotDePasse']);
    Route::post('/profil/photo', [ProfilController::class, 'uploadPhoto']);
    Route::delete('/profil/photo', [ProfilController::class, 'supprimerPhoto']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/messages/recus', [BoiteController::class, 'recus']);
    Route::get('/messages/envoyes', [BoiteController::class, 'envoyes']);
    Route::get('/annuaire', [AnnuaireController::class, 'index']);
    Route::get('/annuaire/services', [AnnuaireController::class, 'services']);

    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::post('/conversations/groupe', [ConversationController::class, 'creerGroupe']);
    Route::post('/conversations/ouvrir/{utilisateur}', [ConversationController::class, 'ouvrirDirect']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::post('/conversations/{conversation}/participants', [ConversationController::class, 'ajouterParticipant']);
    Route::delete('/conversations/{conversation}/participants/{matricule}', [ConversationController::class, 'retirerParticipant'])
        ->whereNumber('matricule');

    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::post('/conversations/{conversation}/lu', [MessageController::class, 'marquerLus']);
    Route::patch('/messages/{message}', [MessageController::class, 'update']);
    Route::post('/messages/{message}/reactions', [App\Http\Controllers\ReactionController::class, 'toggle']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);

    Route::get('/fichiers/{fichier}', [FichierController::class, 'telecharger']);

    // Admin
    Route::middleware(RoleRequis::class . ':Administrateur')->prefix('admin')->group(function () {
        Route::apiResource('utilisateurs', Admin\UtilisateurController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
        Route::post('utilisateurs/{utilisateur}/reactiver', [Admin\UtilisateurController::class, 'reactiver']);
        Route::apiResource('services', Admin\ServiceController::class)->except('show');
        Route::get('roles', [Admin\RoleController::class, 'index']);
        Route::apiResource('postes', Admin\PosteController::class)->except('show');
        Route::get('/journal-audit', [Admin\JournalAuditController::class, 'index']);
	Route::post('utilisateurs/{utilisateur}/valider', [Admin\UtilisateurController::class, 'valider']);
	Route::post('utilisateurs/{utilisateur}/refuser', [Admin\UtilisateurController::class, 'refuser']);
    });
});
