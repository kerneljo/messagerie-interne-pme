<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reaction extends Model
{
    protected $table = 'reaction';
    protected $primaryKey = 'reference_reaction';
    public $timestamps = false;

    protected $fillable = ['emoji', 'reference_message', 'matricule'];

    protected function casts(): array
    {
        return ['date_reaction' => 'datetime'];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reference_message', 'reference_message');
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'matricule', 'matricule');
    }
}
