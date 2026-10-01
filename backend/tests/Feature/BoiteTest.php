<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Service;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/** Tests du dashboard, de la boite de reception, des envoyes et de l'annuaire par service. */
class BoiteTest extends TestCase
{
    use DatabaseTransactions;

    private Service $service;
    private Role $roleEmploye;
    private Role $roleAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Accept', 'application/json');

        $this->service = Service::create(['nom_service' => 'Compta' . uniqid()]);
        $this->roleEmploye = Role::firstOrCreate(['libelle' => 'Employe']);
        $this->roleAdmin = Role::firstOrCreate(['libelle' => 'Administrateur']);
    }

    private function utilisateur(string $prenom, bool $admin = false): Utilisateur
    {
        $u = Utilisateur::create([
            'nom' => 'Test',
            'prenom' => $prenom,
            'email' => strtolower($prenom) . uniqid() . '@test.local',
            'mot_de_passe_hash' => 'MotDePasse123',
            'statut_compte' => 'actif',
            'code_service' => $this->service->code_service,
            'code_role' => ($admin ? $this->roleAdmin : $this->roleEmploye)->code_role,
        ]);

        return $u->refresh();
    }

    /** A ecrit a B : renvoie [reference_conversation, reference_message]. */
    private function envoyer(Utilisateur $a, Utilisateur $b, string $texte = 'Bonjour'): array
    {
        $conv = $this->actingAs($a)
            ->postJson('/api/conversations', ['type' => 'DIRECT', 'participants' => [$b->matricule]])
            ->json('reference_conversation');
        $msg = $this->actingAs($a)
            ->postJson("/api/conversations/$conv/messages", ['contenu' => $texte])
            ->assertCreated()->json('reference_message');

        return [$conv, $msg];
    }

    public function test_recus_liste_les_messages_des_autres_et_filtre_les_non_lus(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        [$conv] = $this->envoyer($a, $b, 'Message pour Bob');

        $recus = $this->actingAs($b)->getJson('/api/messages/recus')->assertOk();
        $this->assertSame(1, $recus->json('total'));
        $this->assertSame('Message pour Bob', $recus->json('data.0.apercu'));
        $this->assertFalse($recus->json('data.0.lu'));
        $this->assertSame('Alice Test', $recus->json('data.0.conversation.titre'));

        // L'expediteur ne recoit pas son propre message
        $this->actingAs($a)->getJson('/api/messages/recus')->assertOk()->assertJsonPath('total', 0);

        $this->actingAs($b)->getJson('/api/messages/recus?non_lus=1')->assertJsonPath('total', 1);
        $this->actingAs($b)->postJson("/api/conversations/$conv/lu")->assertOk();
        $this->actingAs($b)->getJson('/api/messages/recus?non_lus=1')->assertJsonPath('total', 0);
        $this->actingAs($b)->getJson('/api/messages/recus')->assertJsonPath('data.0.lu', true);
    }

    public function test_recus_recherche_par_texte(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $this->envoyer($a, $b, 'Facture octobre');

        $this->actingAs($b)->getJson('/api/messages/recus?q=facture')->assertJsonPath('total', 1);
        $this->actingAs($b)->getJson('/api/messages/recus?q=introuvable')->assertJsonPath('total', 0);
    }

    public function test_envoyes_indique_les_destinataires_et_les_lectures(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        [$conv] = $this->envoyer($a, $b, 'Ceci est envoye');

        $envoyes = $this->actingAs($a)->getJson('/api/messages/envoyes')->assertOk();
        $this->assertSame(1, $envoyes->json('total'));
        $this->assertSame('Bob Test', $envoyes->json('data.0.titre'));
        $this->assertSame(1, $envoyes->json('data.0.destinataires'));
        $this->assertSame(0, $envoyes->json('data.0.lus'));

        $this->actingAs($b)->postJson("/api/conversations/$conv/lu")->assertOk();
        $this->assertSame(1, $this->actingAs($a)->getJson('/api/messages/envoyes')->json('data.0.lus'));

        $this->actingAs($b)->getJson('/api/messages/envoyes')->assertJsonPath('total', 0);
    }

    public function test_dashboard_compte_non_lus_et_activite(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $this->envoyer($a, $b);

        $d = $this->actingAs($b)->getJson('/api/dashboard?tz=Indian/Antananarivo')->assertOk();
        $this->assertSame(1, $d->json('non_lus'));
        $this->assertSame(1, $d->json('conversations.total'));
        $this->assertSame(1, $d->json('conversations.direct'));
        $this->assertCount(7, $d->json('activite'));
        $this->assertSame(1, $d->json('recus_7j'));
        $this->assertSame(0, $d->json('envoyes_7j'));
        $this->assertNull($d->json('admin'));

        $this->assertSame(1, $this->actingAs($a)->getJson('/api/dashboard')->json('envoyes_7j'));
    }

    public function test_dashboard_admin_contient_les_statistiques_globales(): void
    {
        $admin = $this->utilisateur('Adm', true);

        $d = $this->actingAs($admin)->getJson('/api/dashboard')->assertOk();
        $this->assertNotNull($d->json('admin'));
        $this->assertArrayHasKey('utilisateurs_actifs', $d->json('admin'));
    }

    public function test_annuaire_recherche_par_nom_de_service(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');

        $reponse = $this->actingAs($a)->getJson('/api/annuaire?q=' . urlencode($this->service->nom_service))->assertOk();

        $matricules = collect($reponse->json())->pluck('matricule')->all();
        $this->assertContains($b->matricule, $matricules);
        $this->assertNotContains($a->matricule, $matricules); // on ne se voit pas soi-meme
    }
}
