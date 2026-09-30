<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation', function (Blueprint $table) {
            $table->id('reference_conversation');
            $table->string('titre', 150)->nullable();
            // DIRECT = 2 participants ; GROUPE = 3+ (tous ecrivent) ; DIFFUSION = 2+ (seul le createur ecrit)
            $table->enum('type', ['DIRECT', 'GROUPE', 'DIFFUSION'])->default('DIRECT');
            $table->timestamp('date_creation')->useCurrent();
            $table->foreignId('matricule_createur')->constrained('utilisateur', 'matricule');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation');
    }
};
