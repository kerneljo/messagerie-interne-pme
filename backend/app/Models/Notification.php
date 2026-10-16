<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notification';
    protected $primaryKey = 'reference_notification';
    public $timestamps = false;

    protected $fillable = [
        'matricule_destinataire',
        'type',
        'reference_message',
        'reference_conversation',
        'extrait',
        'est_lue',
        'date_lecture',
    ];

    protected function casts(): array
    {
        return [
            'est_lue' => 'boolean',
            'date_lecture' => 'datetime',
            'date_creation' => 'datetime',
        ];
    }

    /** DESTINATAIRE */
    public function destinataire(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'matricule_destinataire', 'matricule');
    }

    /** MESSAGE */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reference_message', 'reference_message');
    }

    /** CONVERSATION */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'reference_conversation', 'reference_conversation');
    }
}
