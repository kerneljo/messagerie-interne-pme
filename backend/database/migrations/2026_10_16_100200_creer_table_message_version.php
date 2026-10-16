<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Chaque ligne conserve le contenu REMPLACÉ par une modification, et la date du remplacement
        Schema::create('message_version', function (Blueprint $table) {
            $table->bigIncrements('reference_version');
            $table->bigInteger('reference_message');
            $table->text('contenu')->nullable();
            $table->timestamp('date_version')->useCurrent();

            $table->index(['reference_message', 'reference_version']);
            $table->foreign('reference_message')->references('reference_message')->on('message')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_version');
    }
};
