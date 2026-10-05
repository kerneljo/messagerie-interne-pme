<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE utilisateur DROP CONSTRAINT IF EXISTS utilisateur_statut_compte_check");

        DB::statement("ALTER TABLE utilisateur ALTER COLUMN statut_compte TYPE VARCHAR(20)");

        DB::statement("ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_statut_compte_check CHECK (statut_compte IN ('actif', 'en_attente', 'desactive'))");

        DB::statement("ALTER TABLE utilisateur ALTER COLUMN statut_compte SET DEFAULT 'en_attente'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE utilisateur DROP CONSTRAINT IF EXISTS utilisateur_statut_compte_check");

        DB::statement("ALTER TABLE utilisateur ALTER COLUMN statut_compte TYPE VARCHAR(20)");

        DB::statement("ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_statut_compte_check CHECK (statut_compte IN ('actif', 'desactive'))");

        DB::statement("ALTER TABLE utilisateur ALTER COLUMN statut_compte SET DEFAULT 'actif'");
    }
};
