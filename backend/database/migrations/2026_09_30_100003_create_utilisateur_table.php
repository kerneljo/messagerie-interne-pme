<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('utilisateur', function (Blueprint $table) {
            $table->id('matricule');
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->string('email', 150)->unique();
            $table->string('mot_de_passe_hash', 255); // stocke hache (bcrypt/Argon2id)
            $table->string('poste', 100)->nullable();
            $table->enum('statut_compte', ['actif', 'desactive'])->default('actif');
            $table->timestamp('derniere_connexion')->nullable();
            $table->timestamp('date_creation')->useCurrent();
            $table->foreignId('code_service')->constrained('service', 'code_service');
            $table->foreignId('code_role')->constrained('role', 'code_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilisateur');
    }
};
