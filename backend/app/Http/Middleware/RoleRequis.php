<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Usage : RoleRequis::class . ':Administrateur' (ou plusieurs roles separes par des virgules). */
class RoleRequis
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $libelle = $request->user()?->role?->libelle;

        if ($libelle === null || ! in_array($libelle, $roles, true)) {
            abort(403, 'Acces refuse.');
        }

        return $next($request);
    }
}
