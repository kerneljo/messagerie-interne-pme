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
    public $timestamps = false; // date_creation est remplie par la base (useCurrent)

    protected $fillable = [
        'nom', 'prenom', 'email', 'mot_de_passe_hash', 'poste',
        'statut_compte', 'derniere_connexion', 'code_service', 'code_role',
    ];

    protected $hidden = ['mot_de_passe_hash'];

    protected function casts(): array
    {
        return [
            // 'hashed' : Laravel hache automatiquement la valeur a l'affectation
            'mot_de_passe_hash' => 'hashed',
            'derniere_connexion' => 'datetime',
            'date_creation' => 'datetime',
        ];
    }

    /** Colonne utilisee par Laravel pour verifier le mot de passe. */
    public function getAuthPassword(): string
    {
        return $this->mot_de_passe_hash;
    }

    /** Nom de la colonne du mot de passe (utile si Laravel doit re-hacher le mot de passe). */
    public function getAuthPasswordName(): string
    {
        return 'mot_de_passe_hash';
    }

    /** Pas de colonne remember_token dans notre MCD : on desactive la fonction. */
    public function getRememberTokenName(): string
    {
        return '';
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'code_service', 'code_service');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'code_role', 'code_role');
    }

    /** PARTICIPER : conversations dont l'utilisateur est membre. */
    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(
            Conversation::class, 'participant', 'matricule', 'reference_conversation'
        )->withPivot('date_ajout');
    }

    /** CREER */
    public function conversationsCreees(): HasMany
    {
        return $this->hasMany(Conversation::class, 'matricule_createur', 'matricule');
    }

    /** ENVOYER */
    public function messagesEnvoyes(): HasMany
    {
        return $this->hasMany(Message::class, 'matricule_expediteur', 'matricule');
    }

    /** LIRE : messages lus par l'utilisateur. */
    public function messagesLus(): BelongsToMany
    {
        return $this->belongsToMany(
            Message::class, 'lecture_message', 'matricule', 'reference_message'
        )->withPivot('date_lecture');
    }

    /** TRACER */
    public function audits(): HasMany
    {
        return $this->hasMany(JournalAudit::class, 'matricule', 'matricule');
    }
}
