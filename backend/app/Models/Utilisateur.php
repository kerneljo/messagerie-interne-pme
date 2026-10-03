<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Utilisateur extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'utilisateur';
    protected $primaryKey = 'matricule';
    public $timestamps = false;

    protected $fillable = [
        'nom', 'prenom', 'email', 'photo_profil', 'mot_de_passe_hash', 'code_poste',
        'statut_compte', 'derniere_connexion', 'code_service', 'code_role',
    ];

    protected $hidden = ['mot_de_passe_hash'];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_profil
            ? asset('storage/' . $this->photo_profil)
            : null;
    }


    protected function casts(): array
    {
        return [
            'mot_de_passe_hash' => 'hashed',
            'derniere_connexion' => 'datetime',
            'date_creation' => 'datetime',
        ];
    }

    public function getAuthPassword(): string { return $this->mot_de_passe_hash; }
    public function getAuthPasswordName(): string { return 'mot_de_passe_hash'; }
    public function getRememberTokenName(): string { return ''; }

    public function estAdministrateur(): bool
    {
        return $this->role?->libelle === 'Administrateur';
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'code_service', 'code_service');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'code_role', 'code_role');
    }

    public function poste(): BelongsTo
    {
        return $this->belongsTo(Poste::class, 'code_poste', 'code_poste');
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'participant', 'matricule', 'reference_conversation')->withPivot('date_ajout');
    }

    public function conversationsCreees(): HasMany
    {
        return $this->hasMany(Conversation::class, 'matricule_createur', 'matricule');
    }

    public function messagesEnvoyes(): HasMany
    {
        return $this->hasMany(Message::class, 'matricule_expediteur', 'matricule');
    }

    public function messagesLus(): BelongsToMany
    {
        return $this->belongsToMany(Message::class, 'lecture_message', 'matricule', 'reference_message')->withPivot('date_lecture');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(JournalAudit::class, 'matricule', 'matricule');
    }
}
