<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prise_en_compte', function (Blueprint $table) {
            $table->bigInteger('reference_message');
            $table->bigInteger('matricule');
            $table->string('statut', 20);
            $table->timestamp('date_statut')->useCurrent();

            $table->primary(['reference_message', 'matricule']);
            $table->index(['matricule', 'statut']);

            $table->foreign('reference_message')->references('reference_message')->on('message')->cascadeOnDelete();
            $table->foreign('matricule')->references('matricule')->on('utilisateur')->cascadeOnDelete();
        });

        DB::statement("ALTER TABLE prise_en_compte ADD CONSTRAINT prise_en_compte_statut_check CHECK (statut IN ('PRIS_EN_COMPTE', 'FAIT'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('prise_en_compte');
    }
};
