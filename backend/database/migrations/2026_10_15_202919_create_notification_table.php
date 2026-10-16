<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification', function (Blueprint $table) {
            $table->id('reference_notification');

            $table->foreignId('matricule_destinataire')
                ->constrained('utilisateur', 'matricule')
                ->cascadeOnDelete();

            $table->string('type', 30);
            // 'action_requise', 'mention', 'information', 'message', 'reaction'

            $table->foreignId('reference_message')
                ->nullable()
                ->constrained('message', 'reference_message')
                ->cascadeOnDelete();

            $table->foreignId('reference_conversation')
                ->nullable()
                ->constrained('conversation', 'reference_conversation')
                ->cascadeOnDelete();

            $table->text('extrait')->nullable();
            $table->boolean('est_lue')->default(false);
            $table->timestamp('date_lecture')->nullable();
            $table->timestamp('date_creation')->useCurrent();

            // Index pour les requêtes fréquentes (liste + compteur)
            $table->index(['matricule_destinataire', 'est_lue', 'date_creation']);
            $table->index(['matricule_destinataire', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification');
    }
};
