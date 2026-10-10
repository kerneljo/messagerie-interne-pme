<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Canaux de diffusion
|--------------------------------------------------------------------------
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->matricule === (int) $id;
});

// Canal d'une conversation : seuls les participants peuvent écouter
Broadcast::channel('conversation.{reference}', function ($user, $reference) {
    return \DB::table('participant')
        ->where('reference_conversation', $reference)
        ->where('matricule', $user->matricule)
        ->exists();
});
