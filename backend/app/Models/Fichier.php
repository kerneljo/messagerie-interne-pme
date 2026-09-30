<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fichier extends Model
{
    protected $table = 'fichier';
    protected $primaryKey = 'reference_fichier';
    public $timestamps = false;

    protected $fillable = [
        'nom_original', 'nom_stocke', 'type_mime', 'taille', 'hash_sha256', 'reference_message',
    ];

    // Ne jamais exposer le nom stocke / hash au frontend sans raison
    protected $hidden = ['nom_stocke', 'hash_sha256'];

    protected function casts(): array
    {
        return ['date_upload' => 'datetime'];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reference_message', 'reference_message');
    }
}
