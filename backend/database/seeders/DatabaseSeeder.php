<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Service;
use App\Models\Utilisateur;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $direction = Service::create(['nom_service' => 'Direction']);
        Service::create(['nom_service' => 'Informatique']);
        Service::create(['nom_service' => 'Ressources humaines']);

        $admin = Role::create(['libelle' => 'Administrateur']);
        Role::create(['libelle' => 'Employe']);

        // Compte de DEVELOPPEMENT uniquement : changer ce mot de passe !
        Utilisateur::create([
            'nom' => 'Admin',
            'prenom' => 'Systeme',
            'email' => 'admin@entreprise.local',
            'mot_de_passe_hash' => 'ChangeMe!2026', // hache automatiquement (cast 'hashed')
            'poste' => 'Administrateur',
            'code_service' => $direction->code_service,
            'code_role' => $admin->code_role,
        ]);
    }
}
