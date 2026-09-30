<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role', function (Blueprint $table) {
            $table->id('code_role');
            $table->string('libelle', 50)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role');
    }
};
