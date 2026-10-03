<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Reaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ReactionController extends Controller
{
    /** Nombre maximum de réactions différentes par utilisateur et par message. */
    private const MAX_REACTIONS_PAR_USER = 3;

    /**
     * Ajoute, retire ou remplace une réaction.
     *
     * - Si l'utilisateur a déjà réagi avec cet emoji → retire la réaction (toggle)
     * - Sinon si la limite (3) est atteinte → remplace la PLUS ANCIENNE réaction
     * - Sinon → ajoute simplement la nouvelle réaction
     *
     * POST /api/messages/{message}/reactions
     * Body : { emoji: "👍" }
     */
    public function toggle(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('view', $message->conversation);

        $data = $request->validate([
            'emoji' => ['required', 'string', 'max:10'],
        ]);

        $u = $request->user();

        // 1. L'utilisateur a-t-il déjà réagi avec cet emoji ?
        $existante = Reaction::where('reference_message', $message->reference_message)
            ->where('matricule', $u->matricule)
            ->where('emoji', $data['emoji'])
            ->first();

        if ($existante) {
            // Retire la réaction
            $existante->delete();
            $action = 'retire';
        } else {
            // 2. Combien de réactions l'utilisateur a-t-il déjà ?
            $mesReactions = Reaction::where('reference_message', $message->reference_message)
                ->where('matricule', $u->matricule)
                ->orderBy('date_reaction')
                ->get();

            // 3. Si la limite est atteinte → on remplace la plus ancienne
            if ($mesReactions->count() >= self::MAX_REACTIONS_PAR_USER) {
                $plusAncienne = $mesReactions->first();
                $plusAncienne->delete();
                $action = 'remplace';
            } else {
                $action = 'ajoute';
            }

            // 4. Ajoute la nouvelle réaction
            Reaction::create([
                'emoji' => $data['emoji'],
                'reference_message' => $message->reference_message,
                'matricule' => $u->matricule,
            ]);
        }

        return response()->json([
            'action' => $action,
            'reactions' => $this->agreger($message->fresh()),
        ]);
    }

    /**
     * Agrège les réactions d'un message par emoji.
     * Renvoie : [{ emoji, nb, moi }]
     */
    public static function agreger(Message $message): array
    {
        $moi = auth()->id();

        return Reaction::where('reference_message', $message->reference_message)
            ->selectRaw('emoji, COUNT(*) as nb')
            ->groupBy('emoji')
            ->orderByDesc('nb')
            ->get()
            ->map(function ($r) use ($message, $moi) {
                $moiAReagi = Reaction::where('reference_message', $message->reference_message)
                    ->where('matricule', $moi)
                    ->where('emoji', $r->emoji)
                    ->exists();

                return [
                    'emoji' => $r->emoji,
                    'nb' => (int) $r->nb,
                    'moi' => $moiAReagi,
                ];
            })
            ->values()
            ->all();
    }
}
