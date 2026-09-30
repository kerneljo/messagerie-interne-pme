<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Service;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests de l'API messagerie.
 * DatabaseTransactions : chaque test est annule a la fin (rollback), les donnees de developpement ne sont pas touchees.
 */
class MessagerieTest extends TestCase
{
    use DatabaseTransactions;

    private Service $service;
    private Role $roleEmploye;
    private Role $roleAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->withHeader('Accept', 'application/json');

        $this->service = Service::create(['nom_service' => 'Test ' . uniqid()]);
        $this->roleEmploye = Role::firstOrCreate(['libelle' => 'Employe']);
        $this->roleAdmin = Role::firstOrCreate(['libelle' => 'Administrateur']);
    }

    private function utilisateur(string $prenom, bool $admin = false): Utilisateur
    {
        $utilisateur = Utilisateur::create([
            'nom' => 'Test',
            'prenom' => $prenom,
            'email' => strtolower($prenom) . uniqid() . '@test.local',
            'mot_de_passe_hash' => 'MotDePasse123',
            'statut_compte' => 'actif',
            'code_service' => $this->service->code_service,
            'code_role' => ($admin ? $this->roleAdmin : $this->roleEmploye)->code_role,
        ]);

        // Recharge depuis la base : recupere aussi les valeurs par defaut (date_creation...)
        return $utilisateur->refresh();
    }

    private function conversationDirecte(Utilisateur $a, Utilisateur $b): int
    {
        return $this->actingAs($a)
            ->postJson('/api/conversations', ['type' => 'DIRECT', 'participants' => [$b->matricule]])
            ->json('reference_conversation');
    }

    public function test_conversation_directe_creee_puis_reutilisee(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');

        $r1 = $this->actingAs($a)->postJson('/api/conversations', ['type' => 'DIRECT', 'participants' => [$b->matricule]]);
        $r1->assertCreated()->assertJsonPath('type', 'DIRECT');

        $r2 = $this->actingAs($b)->postJson('/api/conversations', ['type' => 'DIRECT', 'participants' => [$a->matricule]]);
        $r2->assertOk();

        $this->assertSame($r1->json('reference_conversation'), $r2->json('reference_conversation'));
    }

    public function test_groupe_exige_au_moins_trois_participants(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');

        $this->actingAs($a)->postJson('/api/conversations', [
            'type' => 'GROUPE', 'titre' => 'Equipe', 'participants' => [$b->matricule],
        ])->assertStatus(422);
    }

    public function test_message_non_lu_puis_marque_lu(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $conv = $this->conversationDirecte($a, $b);

        $this->actingAs($a)->postJson("/api/conversations/$conv/messages", ['contenu' => 'Bonjour'])->assertCreated();

        $liste = $this->actingAs($b)->getJson('/api/conversations')->assertOk();
        $this->assertSame(1, $liste->json('0.non_lus'));

        $this->actingAs($b)->postJson("/api/conversations/$conv/lu")->assertOk()->assertJsonPath('marques', 1);

        $this->assertSame(0, $this->actingAs($b)->getJson('/api/conversations')->json('0.non_lus'));

        // L'expediteur voit qu'une personne a lu son message
        $messages = $this->actingAs($a)->getJson("/api/conversations/$conv/messages")->assertOk();
        $this->assertSame(1, $messages->json('messages.0.nb_lecteurs'));
    }

    public function test_un_non_participant_n_a_aucun_acces(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $intrus = $this->utilisateur('Carla');
        $conv = $this->conversationDirecte($a, $b);

        $this->actingAs($intrus)->getJson("/api/conversations/$conv/messages")->assertForbidden();
        $this->actingAs($intrus)->postJson("/api/conversations/$conv/messages", ['contenu' => 'intrus'])->assertForbidden();
    }

    public function test_en_diffusion_seul_le_createur_ecrit(): void
    {
        $createur = $this->utilisateur('Chef');
        $d1 = $this->utilisateur('Dest1');
        $d2 = $this->utilisateur('Dest2');

        $conv = $this->actingAs($createur)->postJson('/api/conversations', [
            'type' => 'DIFFUSION', 'titre' => 'Annonce', 'participants' => [$d1->matricule, $d2->matricule],
        ])->assertCreated()->json('reference_conversation');

        $this->actingAs($d1)->postJson("/api/conversations/$conv/messages", ['contenu' => 'Je reponds'])->assertForbidden();
        $this->actingAs($createur)->postJson("/api/conversations/$conv/messages", ['contenu' => 'Info a tous'])->assertCreated();

        // Les deux destinataires voient le meme message
        $this->actingAs($d1)->getJson("/api/conversations/$conv/messages")->assertOk()->assertJsonCount(1, 'messages');
        $this->actingAs($d2)->getJson("/api/conversations/$conv/messages")->assertOk()->assertJsonCount(1, 'messages');
    }

    public function test_reponse_a_un_message(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $conv = $this->conversationDirecte($a, $b);

        $parent = $this->actingAs($a)->postJson("/api/conversations/$conv/messages", ['contenu' => 'Question ?'])
            ->json('reference_message');
        $this->actingAs($b)->postJson("/api/conversations/$conv/messages", [
            'contenu' => 'Reponse', 'reference_message_parent' => $parent,
        ])->assertCreated()->assertJsonPath('reponse_a.reference_message', $parent);
    }

    public function test_suppression_logique_reservee_a_l_auteur(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $conv = $this->conversationDirecte($a, $b);

        $ref = $this->actingAs($a)->postJson("/api/conversations/$conv/messages", ['contenu' => 'A supprimer'])
            ->json('reference_message');

        $this->actingAs($b)->deleteJson("/api/messages/$ref")->assertForbidden();
        $this->actingAs($a)->deleteJson("/api/messages/$ref")->assertOk();

        $this->actingAs($b)->getJson("/api/conversations/$conv/messages")->assertJsonCount(0, 'messages');
        $this->assertDatabaseHas('message', ['reference_message' => $ref, 'est_supprime' => true]);
    }

    public function test_fichier_envoye_et_telechargeable_par_les_participants_seulement(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $intrus = $this->utilisateur('Carla');
        $conv = $this->conversationDirecte($a, $b);

        $pdf = UploadedFile::fake()->create('rapport.pdf', 100, 'application/pdf');
        $reponse = $this->actingAs($a)->post("/api/conversations/$conv/messages", [
            'contenu' => 'Voir piece jointe', 'fichiers' => [$pdf],
        ])->assertCreated()->assertJsonCount(1, 'fichiers');

        $ref = $reponse->json('fichiers.0.reference_fichier');

        $this->actingAs($b)->get("/api/fichiers/$ref")->assertOk();
        $this->actingAs($intrus)->get("/api/fichiers/$ref")->assertForbidden();
    }

    public function test_extension_dangereuse_refusee(): void
    {
        $a = $this->utilisateur('Alice');
        $b = $this->utilisateur('Bob');
        $conv = $this->conversationDirecte($a, $b);

        $php = UploadedFile::fake()->create('script.php', 1, 'application/x-php');
        $this->actingAs($a)->post("/api/conversations/$conv/messages", ['fichiers' => [$php]])
            ->assertStatus(422);
    }

    public function test_administration_reservee_aux_administrateurs(): void
    {
        $employe = $this->utilisateur('Emp');
        $admin = $this->utilisateur('Adm', true);

        $this->actingAs($employe)->getJson('/api/admin/utilisateurs')->assertForbidden();
        $this->actingAs($employe)->getJson('/api/admin/journal-audit')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/admin/utilisateurs')->assertOk();
        $this->actingAs($admin)->getJson('/api/admin/journal-audit')->assertOk();
    }

    public function test_admin_cree_un_utilisateur_avec_mot_de_passe_hache(): void
    {
        $admin = $this->utilisateur('Adm', true);
        $email = 'nouveau' . uniqid() . '@test.local';

        $this->actingAs($admin)->postJson('/api/admin/utilisateurs', [
            'nom' => 'Nouveau', 'prenom' => 'Agent', 'email' => $email,
            'mot_de_passe' => 'MotDePasse123', 'code_service' => $this->service->code_service,
            'code_role' => $this->roleEmploye->code_role,
        ])->assertCreated()->assertJsonPath('statut_compte', 'actif');

        $cree = Utilisateur::where('email', $email)->first();
        $this->assertNotSame('MotDePasse123', $cree->mot_de_passe_hash);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('MotDePasse123', $cree->mot_de_passe_hash));
    }

    public function test_l_administrateur_ne_peut_pas_se_desactiver(): void
    {
        $admin = $this->utilisateur('Adm', true);

        $this->actingAs($admin)->patchJson("/api/admin/utilisateurs/{$admin->matricule}", ['statut_compte' => 'desactive'])
            ->assertStatus(422);
    }

    public function test_compte_desactive_est_rejete(): void
    {
        $a = $this->utilisateur('Alice');
        $a->update(['statut_compte' => 'desactive']);

        $this->actingAs($a)->getJson('/api/conversations')->assertForbidden();
    }
}
