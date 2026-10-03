<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateur', function (Blueprint $table) {
            $table->dropColumn('poste');
        });
    }

    public function down(): void
    {
        Schema::table('utilisateur', function (Blueprint $table) {
            $table->string('poste', 100)->nullable()->after('mot_de_passe_hash');
        });
    }
};
