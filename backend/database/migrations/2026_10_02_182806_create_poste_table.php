<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poste', function (Blueprint $table) {
            $table->id('code_poste');
            $table->string('libelle', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamp('date_creation')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poste');
    }
};
