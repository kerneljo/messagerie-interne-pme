<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AnnuaireController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FichierController;
use App\Http\Controllers\MessageController;
use App\Http\Middleware\CompteActif;
use App\Http\Middleware\RoleRequis;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', CompteActif::class])->group(function () {
    // Session
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Annuaire (pour choisir des destinataires)
    Route::get('/annuaire', [AnnuaireController::class, 'index']);

    // Conversations
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::post('/conversations/{conversation}/participants', [ConversationController::class, 'ajouterParticipant']);
    Route::delete('/conversations/{conversation}/participants/{matricule}', [ConversationController::class, 'retirerParticipant'])
        ->whereNumber('matricule');

    // Messages
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::post('/conversations/{conversation}/lu', [MessageController::class, 'marquerLus']);
    Route::patch('/messages/{message}', [MessageController::class, 'update']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);

    // Pieces jointes
    Route::get('/fichiers/{fichier}', [FichierController::class, 'telecharger']);

    // Administration (role Administrateur uniquement)
    Route::middleware(RoleRequis::class . ':Administrateur')->prefix('admin')->group(function () {
        Route::apiResource('utilisateurs', Admin\UtilisateurController::class)->only(['index', 'show', 'store', 'update']);
        Route::apiResource('services', Admin\ServiceController::class)->except('show');
        Route::apiResource('roles', Admin\RoleController::class)->except('show');
        Route::get('/journal-audit', [Admin\JournalAuditController::class, 'index']);
    });
});
