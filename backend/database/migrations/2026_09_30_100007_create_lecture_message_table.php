<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lecture_message', function (Blueprint $table) {
            $table->foreignId('reference_message')->constrained('message', 'reference_message')->cascadeOnDelete();
            $table->foreignId('matricule')->constrained('utilisateur', 'matricule')->cascadeOnDelete();
            $table->timestamp('date_lecture')->useCurrent();
            $table->primary(['reference_message', 'matricule']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lecture_message');
    }
};
