<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $table = 'role';
    protected $primaryKey = 'code_role';
    public $timestamps = false;

    protected $fillable = ['libelle'];

    public function utilisateurs(): HasMany
    {
        return $this->hasMany(Utilisateur::class, 'code_role', 'code_role');
    }
}
