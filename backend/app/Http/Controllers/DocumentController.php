<?php

namespace App\Http\Controllers;

use App\Models\Fichier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

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
            'date_debut' => ['nullable', 'date_format:Y-m-d'],
            'date_fin' => ['nullable', 'date_format:Y-m-d'],
            'tri' => ['nullable', Rule::in(['recent', 'ancien', 'nom', 'taille'])],
        ]);

        $limite = (int) ($data['limite'] ?? 30);
        $q = trim((string) ($data['q'] ?? ''));

        $requete = Fichier::query()
            ->whereHas('message', function ($m) use ($moi, $data) {
                $m->where('est_supprime', false)
                    ->whereIn('reference_conversation', fn ($s) => $s
                        ->select('reference_conversation')
                        ->from('participant')
                        ->where('matricule', $moi));

                if (! empty($data['date_debut'])) {
                    $m->whereDate('date_envoi', '>=', $data['date_debut']);
                }
                if (! empty($data['date_fin'])) {
                    $m->whereDate('date_envoi', '<=', $data['date_fin']);
                }
            })
            ->with(['message.expediteur', 'message.conversation.participants']);

        $tri = $data['tri'] ?? 'recent';
        switch ($tri) {
            case 'ancien':
                $requete->orderBy('reference_fichier', 'asc');
                break;
            case 'nom':
                $requete->orderBy('nom_original', 'asc');
                break;
            case 'taille':
                $requete->orderBy('taille', 'desc');
                break;
            case 'recent':
            default:
                $requete->orderByDesc('reference_fichier');
                break;
        }

        if ($q !== '') {
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

        // ✅ URL signée valable 7 jours (pour éviter les images cassées)
        $urlPreview = null;
        if (str_starts_with($f->type_mime ?? '', 'image/')) {
            $urlPreview = URL::temporarySignedRoute(
                'fichiers.preview',
                now()->addDays(7),
                ['fichier' => $f->reference_fichier]
            );
        }

        return [
            'reference_fichier' => $f->reference_fichier,
            'nom_original' => $f->nom_original,
            'type_mime' => $f->type_mime,
            'taille' => $f->taille,
            'hash_sha256' => $f->hash_sha256,
            'date_envoi' => $m?->date_envoi?->toIso8601String(),
            'envoye_par_moi' => (int) $m?->matricule_expediteur === $moi,
            'url_preview' => $urlPreview,
            'expediteur' => $m?->expediteur ? [
                'matricule' => $m->expediteur->matricule,
                'nom' => $m->expediteur->nom,
                'prenom' => $m->expediteur->prenom,
                'photo_url' => $m->expediteur->photo_url,
            ] : null,
            'conversation' => [
                'reference_conversation' => $conv?->reference_conversation,
                'type' => $conv?->type,
                'titre' => $titre,
            ],
        ];
    }
}
