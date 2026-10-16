<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $table = 'conversation';
    protected $primaryKey = 'reference_conversation';
    public $timestamps = false;

    protected $fillable = ['titre', 'type', 'photo_url', 'matricule_createur'];
    //                                      ^^^^^^^^^^ AJOUT

    protected function casts(): array
    {
        return ['date_creation' => 'datetime'];
    }

    public function createur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'matricule_createur', 'matricule');
    }

    /** PARTICIPER */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(
            Utilisateur::class, 'participant', 'reference_conversation', 'matricule'
        )->withPivot('date_ajout', 'role');
        //                    ^^^^^^^^^^^^^^^^^ AJOUT
    }

    /** CONTENIR */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'reference_conversation', 'reference_conversation');
    }

    public function aParticipant(int $matricule): bool
    {
        return $this->participants()->wherePivot('matricule', $matricule)->exists();
    }
}
