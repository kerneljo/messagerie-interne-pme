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
        // Mot de passe des comptes de DEVELOPPEMENT : definissable dans .env (SEED_PASSWORD)
        $motDePasse = env('SEED_PASSWORD', 'ChangeMe!2026');

        $direction = Service::create(['nom_service' => 'Direction']);
        $informatique = Service::create(['nom_service' => 'Informatique']);
        $rh = Service::create(['nom_service' => 'Ressources humaines']);

        $admin = Role::create(['libelle' => 'Administrateur']);
        $employe = Role::create(['libelle' => 'Employe']);

        $comptes = [
            ['Admin', 'Systeme', 'admin@entreprise.local', 'Administrateur', $direction, $admin, 'actif'],
            ['Rakoto', 'Alice', 'alice@entreprise.local', 'Developpeuse', $informatique, $employe, 'actif'],
            ['Rasoa', 'Bob', 'bob@entreprise.local', 'Technicien reseau', $informatique, $employe, 'actif'],
            ['Randria', 'Carla', 'carla@entreprise.local', 'Responsable RH', $rh, $employe, 'actif'],
            ['Rabe', 'David', 'david@entreprise.local', 'Ancien employe', $rh, $employe, 'desactive'],
        ];

        foreach ($comptes as [$nom, $prenom, $email, $poste, $service, $role, $statut]) {
            Utilisateur::create([
                'nom' => $nom,
                'prenom' => $prenom,
                'email' => $email,
                'mot_de_passe_hash' => $motDePasse, // hache automatiquement (cast 'hashed')
                'poste' => $poste,
                'statut_compte' => $statut,
                'code_service' => $service->code_service,
                'code_role' => $role->code_role,
            ]);
        }
    }
}
