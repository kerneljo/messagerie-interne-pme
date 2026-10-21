<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AnnuaireController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FichierController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\UtilisateurController;
use App\Http\Controllers\PosteController;
use App\Http\Middleware\CompteActif;
use App\Http\Middleware\RoleRequis;
use Illuminate\Support\Facades\Route;

// Routes publiques
// Un matricule est toujours numérique : « moi » n'est jamais pris pour un matricule
Route::pattern('matricule', '[0-9]+');

Route::post('/register', [AuthController::class, 'register']);
Route::post('/inscription/envoyer-code', [AuthController::class, 'envoyerCode']);
Route::post('/inscription/verifier-code', [AuthController::class, 'verifierCode']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/fichiers/{fichier}/preview', [FichierController::class, 'preview'])
    ->name('fichiers.preview');
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
    Route::get('/annuaire', [AnnuaireController::class, 'index']);
    Route::get('/annuaire/services', [AnnuaireController::class, 'services']);
    Route::get('/annuaire/suggestions', [AnnuaireController::class, 'suggestions']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/compteur', [NotificationController::class, 'compteur']);
    Route::post('/notifications/tout-lire', [NotificationController::class, 'toutMarquerLues']);
    Route::post('/notifications/{notification}/lire', [NotificationController::class, 'marquerLue']);

    // ============ CONVERSATIONS ============
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations/creer', [ConversationController::class, 'creer']);
    Route::post('/conversations/ouvrir/{utilisateur}', [ConversationController::class, 'ouvrirDirect']);

    // --- Groupe : CRUD ---
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::patch('/conversations/{conversation}', [ConversationController::class, 'update']); // ← NOUVEAU : modifier titre/photo
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']); // ← NOUVEAU : supprimer le groupe

    // --- Participants ---
    Route::post('/conversations/{conversation}/participants', [ConversationController::class, 'ajouterParticipant']);
    Route::patch('/conversations/{conversation}/participants/{matricule}', [ConversationController::class, 'promouvoirParticipant']) // ← NOUVEAU : promouvoir admin
        ->whereNumber('matricule');
    Route::delete('/conversations/{conversation}/participants/moi', [ConversationController::class, 'quitterGroupe']); // ← NOUVEAU : quitter le groupe
    Route::delete('/conversations/{conversation}/participants/{matricule}', [ConversationController::class, 'retirerParticipant'])
        ->whereNumber('matricule');

    // ============ MESSAGES ============
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::post('/conversations/{conversation}/lu', [MessageController::class, 'marquerLus']);
    Route::post('/conversations/{conversation}/typing', [MessageController::class, 'typing']);
    Route::patch('/messages/{message}', [MessageController::class, 'update']);
    Route::post('/messages/{message}/reactions', [App\Http\Controllers\ReactionController::class, 'toggle']);
    Route::post('/messages/{message}/prise-en-compte', [App\Http\Controllers\SuiviController::class, 'priseEnCompte'])->middleware('throttle:60,1,suivi');
    Route::get('/messages/{message}/suivi', [App\Http\Controllers\SuiviController::class, 'suivi']);
    Route::get('/messages/{message}/versions', [App\Http\Controllers\SuiviController::class, 'versions']);
    Route::get('/actions', [App\Http\Controllers\SuiviController::class, 'actions']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
    Route::delete('/conversations/{conversation}/moi', [ConversationController::class, 'supprimerPourMoi']);

    // Fichiers et documents
    Route::get('/fichiers/{fichier}', [FichierController::class, 'telecharger']);
    Route::get('/documents', [App\Http\Controllers\DocumentController::class, 'index']);

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
