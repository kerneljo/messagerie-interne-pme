<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\Utilisateur;

class ConversationPolicy
{
    /** Lire une conversation : reserve aux participants (meme les administrateurs n'y ont pas acces). */
    public function view(Utilisateur $u, Conversation $c): bool
    {
        return $c->aParticipant((int) $u->matricule);
    }

    /** Ecrire : participant ; en DIFFUSION, seul le createur peut ecrire. */
    public function ecrire(Utilisateur $u, Conversation $c): bool
    {
        if (! $c->aParticipant((int) $u->matricule)) {
            return false;
        }

        return $c->type !== 'DIFFUSION' || (int) $c->matricule_createur === (int) $u->matricule;
    }

    /** Ajouter / retirer des participants : createur d'un GROUPE ou d'une DIFFUSION. */
    public function gererParticipants(Utilisateur $u, Conversation $c): bool
    {
        return $c->type !== 'DIRECT' && (int) $c->matricule_createur === (int) $u->matricule;
    }
}
