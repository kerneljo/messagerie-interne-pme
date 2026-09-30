<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalAudit extends Model
{
    protected $table = 'journal_audit';
    protected $primaryKey = 'reference_audit';
    public $timestamps = false;

    protected $fillable = ['action', 'details_action', 'adresse_ip', 'matricule'];

    protected function casts(): array
    {
        return ['date_action' => 'datetime'];
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'matricule', 'matricule');
    }
}
