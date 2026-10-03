<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateur', function (Blueprint $table) {
            $table->unsignedBigInteger('code_poste')->nullable()->after('poste');
            $table->foreign('code_poste')->references('code_poste')->on('poste')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('utilisateur', function (Blueprint $table) {
            $table->dropForeign(['code_poste']);
            $table->dropColumn('code_poste');
        });
    }
};
