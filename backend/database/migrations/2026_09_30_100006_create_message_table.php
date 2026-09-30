<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message', function (Blueprint $table) {
            $table->id('reference_message');
            $table->text('contenu')->nullable(); // NULL possible si piece jointe seule
            $table->timestamp('date_envoi')->useCurrent();
            $table->timestamp('date_modification')->nullable();
            $table->boolean('est_supprime')->default(false); // suppression logique
            $table->foreignId('matricule_expediteur')->constrained('utilisateur', 'matricule');
            $table->foreignId('reference_conversation')->constrained('conversation', 'reference_conversation')->cascadeOnDelete();
            $table->foreignId('reference_message_parent')->nullable()->constrained('message', 'reference_message')->nullOnDelete();
            $table->index(['reference_conversation', 'date_envoi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message');
    }
};
