<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reaction', function (Blueprint $table) {
            $table->id('reference_reaction');
            $table->string('emoji', 10);
            $table->unsignedBigInteger('reference_message');
            $table->unsignedBigInteger('matricule');
            $table->timestamp('date_reaction')->useCurrent();

            // Contraintes
            $table->foreign('reference_message')
                ->references('reference_message')
                ->on('message')
                ->onDelete('cascade');
            $table->foreign('matricule')
                ->references('matricule')
                ->on('utilisateur')
                ->onDelete('cascade');

            // Un utilisateur ne peut réagir qu'une fois avec un emoji donné sur un message
            $table->unique(['reference_message', 'matricule', 'emoji']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reaction');
    }
};
