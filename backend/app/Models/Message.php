<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    protected $table = 'message';
    protected $primaryKey = 'reference_message';
    // date_envoi : valeur par defaut en base ; date_modification : a renseigner lors d'une edition
    public $timestamps = false;

    protected $fillable = [
        'contenu', 'date_modification', 'est_supprime',
        'matricule_expediteur', 'reference_conversation', 'reference_message_parent',
    ];

    protected function casts(): array
    {
        return [
            'date_envoi' => 'datetime',
            'date_modification' => 'datetime',
            'est_supprime' => 'boolean',
        ];
    }

    /** Suppression logique : les messages supprimes sont masques par defaut. */
    protected static function booted(): void
    {
        static::addGlobalScope('non_supprimes', function (Builder $query) {
            $query->where($query->getModel()->getTable() . '.est_supprime', false);
        });
        // Pour les inclure (audit, moderation) : Message::withoutGlobalScope('non_supprimes')
    }

    /** ENVOYER */
    public function expediteur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'matricule_expediteur', 'matricule');
    }

    /** CONTENIR */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'reference_conversation', 'reference_conversation');
    }

    /** REPONDRE_A : message parent (0,1) */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reference_message_parent', 'reference_message');
    }

    /** REPONDRE_A : reponses (0,n) */
    public function reponses(): HasMany
    {
        return $this->hasMany(Message::class, 'reference_message_parent', 'reference_message');
    }

    /** JOINDRE */
    public function fichiers(): HasMany
    {
        return $this->hasMany(Fichier::class, 'reference_message', 'reference_message');
    }

    /** LIRE : utilisateurs ayant lu le message. */
    public function lecteurs(): BelongsToMany
    {
        return $this->belongsToMany(
            Utilisateur::class, 'lecture_message', 'reference_message', 'matricule'
        )->withPivot('date_lecture');
    }
}
