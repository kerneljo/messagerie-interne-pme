<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service', function (Blueprint $table) {
            $table->id('code_service');
            $table->string('nom_service', 100)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service');
    }
};
