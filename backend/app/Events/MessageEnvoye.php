<?php

namespace App\Events;

use App\Http\Controllers\MessageController;
use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageEnvoye implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->reference_conversation),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageEnvoye';
    }

    public function broadcastWith(): array
    {
        // On réutilise le presenter existant pour avoir exactement la même forme
        // que ce que renvoie l'API REST. Le front pourra donc utiliser le même rendu.
        $this->message->loadMissing(['expediteur', 'fichiers', 'parent.expediteur']);
        $this->message->loadCount('lecteurs');

        return [
            'message' => MessageController::presenter($this->message),
        ];
    }
}
