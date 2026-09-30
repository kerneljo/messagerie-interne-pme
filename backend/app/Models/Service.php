<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $table = 'service';
    protected $primaryKey = 'code_service';
    public $timestamps = false;

    protected $fillable = ['nom_service'];

    public function utilisateurs(): HasMany
    {
        return $this->hasMany(Utilisateur::class, 'code_service', 'code_service');
    }
}
