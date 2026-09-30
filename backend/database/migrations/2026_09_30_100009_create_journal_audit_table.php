<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_audit', function (Blueprint $table) {
            $table->id('reference_audit');
            $table->string('action', 100);
            $table->text('details_action')->nullable();
            $table->timestamp('date_action')->useCurrent();
            $table->ipAddress('adresse_ip')->nullable();
            $table->foreignId('matricule')->constrained('utilisateur', 'matricule');
            $table->index(['matricule', 'date_action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_audit');
    }
};
