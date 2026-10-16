<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participant', function (Blueprint $table) {
            // 'MEMBRE' par défaut, 'ADMIN' si promu par le créateur
            $table->string('role', 20)->default('MEMBRE')->after('matricule');
        });
    }

    public function down(): void
    {
        Schema::table('participant', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
