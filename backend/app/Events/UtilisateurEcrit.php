<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UtilisateurEcrit implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $referenceConversation,
        public int $matricule,
        public string $nomComplet,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.' . $this->referenceConversation)];
    }

    public function broadcastAs(): string
    {
        return 'UtilisateurEcrit';
    }

    public function broadcastWith(): array
    {
        return [
            'matricule' => $this->matricule,
            'nom_complet' => $this->nomComplet,
        ];
    }
}
