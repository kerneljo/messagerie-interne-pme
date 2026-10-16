<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation', function (Blueprint $table) {
            $table->string('photo_url', 500)->nullable()->after('titre');
        });
    }

    public function down(): void
    {
        Schema::table('conversation', function (Blueprint $table) {
            $table->dropColumn('photo_url');
        });
    }
};
