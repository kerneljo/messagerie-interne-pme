<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fichier', function (Blueprint $table) {
            $table->id('reference_fichier');
            $table->string('nom_original', 255);
            $table->string('nom_stocke', 255)->unique(); // technique (MLD) : UUID, stocke hors dossier public
            $table->string('type_mime', 100);
            $table->unsignedBigInteger('taille'); // en octets
            $table->char('hash_sha256', 64); // technique (MLD) : controle d'integrite
            $table->timestamp('date_upload')->useCurrent();
            $table->foreignId('reference_message')->constrained('message', 'reference_message')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fichier');
    }
};
