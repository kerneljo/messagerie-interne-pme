<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message', function (Blueprint $table) {
            $table->string('categorie', 20)->default('NORMAL');
            $table->timestamp('echeance')->nullable();
        });

        DB::statement("ALTER TABLE message ADD CONSTRAINT message_categorie_check CHECK (categorie IN ('NORMAL', 'INFORMATION', 'ACTION_REQUISE', 'URGENT'))");

        // Accélère la liste « À traiter » : seuls les messages qui attendent un accusé sont indexés
        DB::statement("CREATE INDEX message_actions_index ON message (reference_conversation, reference_message) WHERE categorie IN ('ACTION_REQUISE', 'URGENT') AND est_supprime = false");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS message_actions_index');
        DB::statement('ALTER TABLE message DROP CONSTRAINT IF EXISTS message_categorie_check');

        Schema::table('message', function (Blueprint $table) {
            $table->dropColumn(['categorie', 'echeance']);
        });
    }
};
