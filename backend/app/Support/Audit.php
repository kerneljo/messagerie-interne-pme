<?php

namespace App\Support;

use App\Models\JournalAudit;

class Audit
{
    /** Enregistre une action dans JOURNAL_AUDIT (utilisateur, action, IP, details). */
    public static function log(string $action, int $matricule, ?string $details = null): void
    {
        JournalAudit::create([
            'action' => $action,
            'details_action' => $details,
            'adresse_ip' => request()->ip(),
            'matricule' => $matricule,
        ]);
    }
}
