<?php

namespace Database\Seeders;

use App\Models\Poste;
use Illuminate\Database\Seeder;

class PosteSeeder extends Seeder
{
    public function run(): void
    {
        $postes = [
            // Direction
            ['Directeur général', 'Direction générale de l\'entreprise'],
            ['Directeur adjoint', 'Assiste la direction générale'],
            ['Gérant', 'Gestion de la structure'],

            // Administration
            ['Assistant de direction', 'Support à la direction'],
            ['Secrétaire', 'Tâches administratives'],
            ['Office manager', 'Gestion des bureaux'],

            // Ressources humaines
            ['Responsable RH', 'Pilotage des ressources humaines'],
            ['Chargé RH', 'Recrutement et gestion du personnel'],
            ['Assistant RH', 'Support RH'],

            // Comptabilité / Finance
            ['Directeur financier', 'Direction financière'],
            ['Comptable', 'Comptabilité générale'],
            ['Aide-comptable', 'Support comptable'],
            ['Contrôleur de gestion', 'Contrôle et analyse financière'],

            // Commercial
            ['Directeur commercial', 'Direction des ventes'],
            ['Responsable commercial', 'Management de l\'équipe commerciale'],
            ['Commercial', 'Vente et prospection'],
            ['Chargé de clientèle', 'Relation client'],

            // Informatique
            ['Directeur informatique', 'Direction des systèmes d\'information'],
            ['Chef de projet IT', 'Pilotage de projets informatiques'],
            ['Développeur', 'Développement logiciel'],
            ['Administrateur système', 'Gestion des infrastructures'],
            ['Technicien support', 'Support utilisateur'],

            // Production / Technique
            ['Chef d\'atelier', 'Management de la production'],
            ['Technicien', 'Travaux techniques'],
            ['Opérateur', 'Production'],
            ['Agent de maintenance', 'Maintenance des équipements'],

            // Marketing / Communication
            ['Responsable marketing', 'Stratégie marketing'],
            ['Chargé de communication', 'Communication interne et externe'],
            ['Community manager', 'Réseaux sociaux'],

            // Transversal
            ['Chef de projet', 'Pilotage de projets'],
            ['Consultant', 'Mission de conseil'],
            ['Stagiaire', 'En formation'],
            ['Alternant', 'En alternance'],
        ];

        foreach ($postes as [$libelle, $description]) {
            Poste::firstOrCreate(
                ['libelle' => $libelle],
                ['description' => $description, 'actif' => true]
            );
        }
    }
}
