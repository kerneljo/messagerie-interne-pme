<?php

namespace App\Http\Controllers;

use App\Models\Fichier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Vue « Documents » : les pièces jointes des conversations dont je suis participant.
 * La restriction aux participants est faite dans la requête : rien d'autre n'est listé.
 * Le téléchargement lui-même reste contrôlé par FichierController.
 */
class DocumentController extends Controller
{
    private const CATEGORIES = [
        'pdf' => ['pdf'],
        'texte' => ['doc', 'docx', 'odt', 'txt'],
        'tableur' => ['xls', 'xlsx', 'ods', 'csv'],
        'presentation' => ['ppt', 'pptx'],
        'image' => ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    ];

    public function index(Request $request): JsonResponse
    {
        $moi = (int) $request->user()->matricule;

        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'categorie' => ['nullable', Rule::in(array_keys(self::CATEGORIES))],
            'avant' => ['nullable', 'integer', 'min:1'],
            'limite' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $limite = (int) ($data['limite'] ?? 30);
        $q = trim((string) ($data['q'] ?? ''));

        $requete = Fichier::query()
            ->whereHas('message', function ($m) use ($moi) {
                $m->where('est_supprime', false)
                    ->whereIn('reference_conversation', fn ($s) => $s
                        ->select('reference_conversation')
                        ->from('participant')
                        ->where('matricule', $moi));
            })
            ->with(['message.expediteur', 'message.conversation.participants'])
            ->orderByDesc('reference_fichier');

        if ($q !== '') {
            // Les jokers saisis par l'utilisateur sont neutralisés
            $requete->where('nom_original', 'ilike', '%' . addcslashes($q, '%_\\') . '%');
        }

        if (! empty($data['categorie'])) {
            $extensions = self::CATEGORIES[$data['categorie']];
            $requete->where(function ($w) use ($extensions) {
                foreach ($extensions as $ext) {
                    $w->orWhere('nom_original', 'ilike', '%.' . $ext);
                }
            });
        }

        if (isset($data['avant'])) {
            $requete->where('reference_fichier', '<', (int) $data['avant']);
        }

        // On lit un élément de plus pour savoir s'il reste des pages
        $fichiers = $requete->limit($limite + 1)->get();
        $peutPlus = $fichiers->count() > $limite;

        return response()->json([
            'documents' => $fichiers->take($limite)
                ->map(fn ($f) => $this->presenter($f, $moi))
                ->values(),
            'peut_charger_plus' => $peutPlus,
        ]);
    }

    private function presenter(Fichier $f, int $moi): array
    {
        $m = $f->message;
        $conv = $m?->conversation;

        $titre = $conv?->type === 'DIRECT'
            ? $conv->participants->where('matricule', '!=', $moi)
                ->map(fn ($p) => $p->prenom . ' ' . $p->nom)->implode(', ')
            : $conv?->titre;

        return [
            'reference_fichier' => $f->reference_fichier,
            'nom_original' => $f->nom_original,
            'type_mime' => $f->type_mime,
            'taille' => $f->taille,
            'hash_sha256' => $f->hash_sha256,
            'date_envoi' => $m?->date_envoi?->toIso8601String(),
            'envoye_par_moi' => (int) $m?->matricule_expediteur === $moi,
            'expediteur' => $m?->expediteur ? [
                'matricule' => $m->expediteur->matricule,
                'nom' => $m->expediteur->nom,
                'prenom' => $m->expediteur->prenom,
            ] : null,
            'conversation' => [
                'reference_conversation' => $conv?->reference_conversation,
                'type' => $conv?->type,
                'titre' => $titre,
            ],
        ];
    }
}
