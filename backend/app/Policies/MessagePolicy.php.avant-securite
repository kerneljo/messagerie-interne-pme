<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\Utilisateur;

class MessagePolicy
{
    public function modifier(Utilisateur $u, Message $m): bool
    {
        return (int) $m->matricule_expediteur === (int) $u->matricule;
    }

    public function supprimer(Utilisateur $u, Message $m): bool
    {
        return (int) $m->matricule_expediteur === (int) $u->matricule;
    }
}
