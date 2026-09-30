<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participant', function (Blueprint $table) {
            $table->foreignId('reference_conversation')->constrained('conversation', 'reference_conversation')->cascadeOnDelete();
            $table->foreignId('matricule')->constrained('utilisateur', 'matricule')->cascadeOnDelete();
            $table->timestamp('date_ajout')->useCurrent();
            $table->primary(['reference_conversation', 'matricule']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participant');
    }
};
