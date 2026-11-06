<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Appareils connectés (une session = un jeton Sanctum).
 *
 * Routes à ajouter dans le groupe protégé (auth:sanctum) :
 *   Route::get('/profil/sessions', [SessionController::class, 'index']);
 *   Route::delete('/profil/sessions', [SessionController::class, 'destroyAutres']);
 *   Route::delete('/profil/sessions/{id}', [SessionController::class, 'destroy']);
 */
class SessionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $courantId = $user->currentAccessToken()?->id;

        return $user->tokens()
            ->orderByDesc('last_used_at')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'appareil' => $this->navigateur($t->user_agent),
                'systeme' => $this->systeme($t->user_agent),
                'lieu' => $t->ip_address,
                'derniere_activite' => ($t->last_used_at ?? $t->created_at)?->toIso8601String(),
                'actuelle' => $t->id === $courantId,
            ])
            ->values();
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $token = $user->tokens()->where('id', $id)->firstOrFail();

        if ($token->id === $user->currentAccessToken()?->id) {
            abort(422, "Utilisez « Se déconnecter » pour fermer cette session.");
        }

        $token->delete();

        return response()->noContent();
    }

    public function destroyAutres(Request $request)
    {
        $user = $request->user();

        $user->tokens()
            ->where('id', '!=', $user->currentAccessToken()?->id)
            ->delete();

        return response()->noContent();
    }

    private function navigateur(?string $ua): string
    {
        return match (true) {
            str_contains((string) $ua, 'Edg/') => 'Edge',
            str_contains((string) $ua, 'OPR/') => 'Opera',
            str_contains((string) $ua, 'Firefox/') => 'Firefox',
            str_contains((string) $ua, 'Chrome/') => 'Chrome',
            str_contains((string) $ua, 'Safari/') => 'Safari',
            default => 'Navigateur',
        };
    }

    private function systeme(?string $ua): string
    {
        return match (true) {
            str_contains((string) $ua, 'Android') => 'Android',
            str_contains((string) $ua, 'iPhone'), str_contains((string) $ua, 'iPad') => 'iOS',
            str_contains((string) $ua, 'Windows') => 'Windows',
            str_contains((string) $ua, 'Mac OS') => 'macOS',
            str_contains((string) $ua, 'Linux') => 'Linux',
            default => '',
        };
    }
}
