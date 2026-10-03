<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Poste extends Model
{
    protected $table = 'poste';
    protected $primaryKey = 'code_poste';
    public $timestamps = false;

    protected $fillable = ['libelle', 'description', 'actif'];

    protected function casts(): array
    {
        return [
            'actif' => 'boolean',
            'date_creation' => 'datetime',
        ];
    }

    public function utilisateurs(): HasMany
    {
        return $this->hasMany(Utilisateur::class, 'code_poste', 'code_poste');
    }
}
