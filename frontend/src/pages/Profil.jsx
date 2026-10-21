import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Briefcase, Building2, Calendar, Camera, Check, Clock, Copy,
  Eye, EyeOff, KeyRound, Mail, Shield, Trash2, User as UserIcon,
  Monitor, Moon, Sun, Palette,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'
import imageLaterite from '../images/laterite.png'
import { Bouton, Chargement } from '../components/ui'
import ConfirmationModal from '../components/ConfirmationModal'

const ONGLETS = [
  { id: 'profil', libelle: 'Profil', icone: UserIcon },
  { id: 'securite', libelle: 'Sécurité', icone: KeyRound },
  { id: 'theme', libelle: 'Thème', icone: Palette },
]

const TAILLE_MAX_PHOTO = 5 * 1024 * 1024 //5Mo
const TYPES_PHOTO = ['image/jpeg', 'image/png', 'image/webp']

const NIVEAUX_MDP = [
  { label: 'En attente…', couleur: 'bg-slate-300' },
  { label: 'Faible', couleur: 'bg-action-600' },
  { label: 'Moyen', couleur: 'bg-mangue-500' },
  { label: 'Bon', couleur: 'bg-indigo-400' },
  { label: 'Excellent', couleur: 'bg-indigo-600' },
]

/* ───────────────────────────── Utilitaires ───────────────────────────── */

const libellePoste = (poste) => (typeof poste === 'string' ? poste : poste?.libelle) || ''

function formaterDate(iso, avecHeure = true) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(avecHeure ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function texteAnciennete(iso) {
  if (!iso) return ''
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (Number.isNaN(jours) || jours < 0) return ''
  if (jours < 1) return "Compte créé aujourd'hui"
  if (jours < 31) return `Membre depuis ${jours} jour${jours > 1 ? 's' : ''}`
  if (jours < 365) return `Membre depuis ${Math.floor(jours / 30)} mois`
  const ans = Math.floor(jours / 365)
  return `Membre depuis ${ans} an${ans > 1 ? 's' : ''}`
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function Profil() {
  const { rafraichir } = useAuth()
  const [chargement, setChargement] = useState(true)
  const [echec, setEchec] = useState(false)
  const [profil, setProfil] = useState(null)
  const [onglet, setOnglet] = useState('profil')
  const [copie, setCopie] = useState(false)

  async function charger() {
    try {
      const r = await api.get('/api/profil')
      setProfil(r.data)
      setEchec(false)
      await rafraichir?.()
    } catch {
      setEchec(true)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function copierEmail() {
    if (!profil?.email) return
    try {
      await navigator.clipboard.writeText(profil.email)
      setCopie(true)
      setTimeout(() => setCopie(false), 1500)
    } catch {
      // presse-papiers indisponible : on ignore
    }
  }

  if (chargement) return <Chargement />

  if (echec && !profil) {
    return (
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 size-10 text-red-500" />
          <p className="text-sm text-red-700">Impossible de charger le profil.</p>
        </div>
      </div>
    )
  }

  const poste = libellePoste(profil.poste)
  const actif = profil.statut_compte !== 'desactive'

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 pb-10 md:px-5 md:py-6">
      {/* ───── Carte d'identité ───── */}
      <section className="rounded-[28px] bg-papier shadow-sm ring-1 ring-slate-200/70">
        {/* Bandeau décoratif */}
        <div className="relative h-32 overflow-hidden rounded-t-[28px] bg-lagon-950 sm:h-40">
          <div aria-hidden="true" className="absolute inset-0">
            <span className="absolute -right-8 -top-14 size-52 rotate-12 rounded-[38%] bg-action-600/70" />
            <span className="absolute right-44 top-12 size-32 -rotate-6 rounded-[38%] bg-mangue-400/60" />
            <span className="absolute -bottom-20 -left-10 size-56 rounded-full bg-lagon-800" />
            <span className="absolute left-1/3 top-6 size-20 rotate-45 rounded-[38%] bg-lagon-800/80" />
          </div>
        </div>

        {/* Contenu sous le bandeau */}
        <div className="relative px-5 pb-10 sm:px-10 sm:pb-12">
          <div className="absolute -top-16 left-5 sm:-top-28 sm:left-10">
            <BlocPhoto profil={profil} />
          </div>

          <div className="flex justify-start pt-20 sm:pt-6 sm:pl-68">
            <ActionsPhoto profil={profil} onChange={charger} />
          </div>
        </div>
      </section>

      {/* ───── Onglets ───── */}
      <div
        role="tablist"
        aria-label="Sections du profil"
        className="mt-7 inline-flex rounded-2xl bg-white/70 p-1 ring-1 ring-slate-200/70"
      >
        {ONGLETS.map(({ id, libelle, icone: Icone }) => {
          const selectionne = onglet === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`onglet-${id}`}
              aria-selected={selectionne}
              aria-controls={`panneau-${id}`}
              onClick={() => setOnglet(id)}
                           className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                selectionne
                  ? 'rounded-bl-[5px] bg-action-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icone className="size-4" />
              {libelle}
            </button>
          )
        })}
      </div>

      <div className="mt-5" role="tabpanel" id={`panneau-${onglet}`} aria-labelledby={`onglet-${onglet}`}>
        {onglet === 'profil' && <OngletProfil profil={profil} poste={poste} actif={actif} />}
        {onglet === 'securite' && <OngletSecurite />}
        {onglet === 'theme' && <OngletTheme />}
      </div>
    </div>
  )
}

/* ───────────────────────────── Photo : affichage ───────────────────────────── */

function BlocPhoto({ profil }) {
  return (
    <div className="relative shrink-0">
      {profil.photo_url ? (
        <img
          src={profil.photo_url}
          alt={`${profil.prenom} ${profil.nom}`}
          className="size-32 rounded-[30%] bg-papier object-cover shadow-2xl ring-4 ring-papier sm:size-52"
        />
      ) : (
        <div className="flex size-32 items-center justify-center rounded-[30%] bg-mangue-300 shadow-2xl ring-4 ring-papier sm:size-52">
          <span className="font-display text-5xl font-extrabold text-lagon-950 sm:text-7xl">
            {profil.prenom?.[0]}
            {profil.nom?.[0]}
          </span>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── Photo : actions ───────────────────────────── */

function ActionsPhoto({ profil, onChange }) {
  const [uploadEnCours, setUploadEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const inputRef = useRef(null)

  async function choisirFichier(e) {
    const fichier = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!fichier) return
    setErreur('')

    if (fichier.size > TAILLE_MAX_PHOTO) {
      setErreur(`L'image ne doit pas dépasser ${TAILLE_MAX_PHOTO / (1024 * 1024)} Mo.`)
      return
    }
    if (!TYPES_PHOTO.includes(fichier.type)) {
      setErreur('Formats acceptés : JPG, PNG, WEBP.')
      return
    }

    setUploadEnCours(true)
    const donnees = new FormData()
    donnees.append('photo', fichier)

    try {
      await api.post('/api/profil/photo', donnees)
      await onChange()
    } catch (err) {
      const data = err.response?.data
      setErreur(data?.errors?.photo?.[0] || data?.message || "Erreur lors de l'envoi.")
    } finally {
      setUploadEnCours(false)
    }
  }

  async function supprimer() {
    setSuppressionEnCours(true)
    setErreur('')
    try {
      await api.delete('/api/profil/photo')
      setConfirmation(false)
      await onChange()
    } catch (err) {
      setConfirmation(false)
      setErreur(err.response?.data?.message || 'Suppression impossible.')
    } finally {
      setSuppressionEnCours(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadEnCours}
          className="inline-flex items-center gap-2.5 rounded-full bg-lagon-950 px-6 py-3 text-sm font-semibold text-papier shadow-lg transition hover:bg-lagon-800 hover:shadow-xl active:scale-[0.98] disabled:opacity-60 sm:px-7 sm:py-3.5 sm:text-base"
        >
          <Camera className="size-4 sm:size-5" />
          {uploadEnCours ? 'Envoi…' : 'Changer la photo'}
        </button>

        {profil.photo_url && (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] sm:px-6 sm:py-3.5 sm:text-base"
            aria-label="Retirer la photo"
            title="Retirer la photo"
          >
            <Trash2 className="size-4 sm:size-5" />
            Retirer
          </button>
        )}
      </div>

      {erreur && (
        <p className="max-w-[320px] text-right text-xs text-red-600 sm:text-sm" role="alert">
          {erreur}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={choisirFichier}
        aria-label="Choisir une photo de profil"
      />

      <ConfirmationModal
        ouvert={confirmation}
        onFermer={() => setConfirmation(false)}
        onConfirmer={supprimer}
        titre="Retirer la photo ?"
        message="Vos initiales seront affichées à la place de votre photo de profil."
        texteConfirmer="Retirer"
        texteAnnuler="Annuler"
        variant="danger"
        enCours={suppressionEnCours}
      />
    </div>
  )
}

/* ───────────────────────────── Éléments communs ───────────────────────────── */

function Pastille({ icone: Icone, texte, ton }) {
  const tons = {
    sombre: 'bg-lagon-950 text-papier',
    clair: 'bg-slate-100 text-slate-700',
    chaud: 'bg-mangue-300/60 text-lagon-950',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full rounded-bl-[5px] px-3 py-1 text-xs font-semibold ${tons[ton]}`}>
      <Icone className="size-3.5" />
      {texte}
    </span>
  )
}

function Fiche({ icone: Icone, titre, children }) {
  return (
    <section className="flex h-full flex-col rounded-3xl bg-papier p-6 shadow-sm ring-1 ring-slate-200/70">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[30%] bg-mangue-300/60 text-lagon-950">
          <Icone className="size-5" />
        </span>
        <h3 className="font-display text-lg font-bold text-slate-900">{titre}</h3>
      </header>
      <dl className="flex-1 divide-y divide-slate-200/70">{children}</dl>
    </section>
  )
}

function Champ({ label, children }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-[15px] font-semibold text-slate-900">{children}</dd>
    </div>
  )
}

/* ───────────────────────────── Onglet Profil ───────────────────────────── */

function OngletProfil({ profil, poste, actif }) {
  const anciennete = texteAnciennete(profil.date_creation)
  return (
    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Fiche icone={UserIcon} titre="Identité">
        <Champ label="Prénom">{profil.prenom}</Champ>
        <Champ label="Nom">{profil.nom}</Champ>
        <Champ label="Adresse e-mail">{profil.email}</Champ>
      </Fiche>

      <Fiche icone={Briefcase} titre="Poste">
        <Champ label="Intitulé">{poste || '—'}</Champ>
        <Champ label="Service">{profil.service?.nom_service || '—'}</Champ>
        <Champ label="Rôle">{profil.role?.libelle || '—'}</Champ>
        <Champ label="Statut">
          <span className="inline-flex items-center gap-2">
            <span className={`size-2 rounded-full ${actif ? 'bg-indigo-500' : 'bg-slate-400'}`} />
            {actif ? 'Actif' : 'Désactivé'}
          </span>
        </Champ>
      </Fiche>

      <Fiche icone={Calendar} titre="Compte">
        <Champ label="Créé le">{formaterDate(profil.date_creation)}</Champ>
        <Champ label="Dernière connexion">
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 text-slate-400" />
            {formaterDate(profil.derniere_connexion)}
          </span>
        </Champ>
        {anciennete && <Champ label="Ancienneté">{anciennete}</Champ>}
      </Fiche>
    </div>
  )
}

/* ───────────────────────────── Onglet Sécurité ───────────────────────────── */

function OngletSecurite() {
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [voir, setVoir] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState('')
  const [erreur, setErreur] = useState('')
  const [erreursChamps, setErreursChamps] = useState({})

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setSucces('')
    setErreursChamps({})

    if (nouveau !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }
    if (nouveau.length < 8) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setEnvoi(true)
    try {
      const r = await api.put('/api/profil/mot-de-passe', {
        mot_de_passe_actuel: motDePasseActuel,
        nouveau_mot_de_passe: nouveau,
        nouveau_mot_de_passe_confirmation: confirmation,
      })
      setSucces(r.data.message || 'Mot de passe modifié.')
      setMotDePasseActuel('')
      setNouveau('')
      setConfirmation('')
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErreursChamps(data.errors)
      setErreur(data?.message || 'Erreur.')
    } finally {
      setEnvoi(false)
    }
  }

  const erreurDe = (champ) => erreursChamps[champ]?.[0]

  const exigences = [
    { label: '8 caractères minimum', valide: nouveau.length >= 8 },
    { label: 'Une lettre majuscule', valide: /[A-Z]/.test(nouveau) },
    { label: 'Une lettre minuscule', valide: /[a-z]/.test(nouveau) },
    { label: 'Un chiffre', valide: /[0-9]/.test(nouveau) },
  ]
  const nbValides = exigences.filter((e) => e.valide).length
  const niveau = NIVEAUX_MDP[nbValides]

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
      <section className="rounded-3xl bg-papier p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:col-span-3">
        <header className="mb-7 flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[30%] bg-mangue-300/60 text-lagon-950">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">Modifier le mot de passe</h3>
            <p className="mt-0.5 text-sm text-slate-500">Choisissez un mot de passe fort et unique.</p>
          </div>
        </header>

        <form onSubmit={soumettre} className="space-y-5">
          <ChampMdp
            id="mot_de_passe_actuel"
            label="Mot de passe actuel"
            value={motDePasseActuel}
            onChange={setMotDePasseActuel}
            erreur={erreurDe('mot_de_passe_actuel')}
            voir={voir}
            setVoir={setVoir}
          />

          <div className="h-px bg-slate-200/70" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChampMdp
              id="nouveau_mot_de_passe"
              label="Nouveau mot de passe"
              value={nouveau}
              onChange={setNouveau}
              erreur={erreurDe('nouveau_mot_de_passe')}
              voir={voir}
              setVoir={setVoir}
              placeholder="8 caractères minimum"
              aide="Un mélange de lettres, chiffres et symboles."
            />

            <ChampMdp
              id="nouveau_mot_de_passe_confirmation"
              label="Confirmer le nouveau mot de passe"
              value={confirmation}
              onChange={setConfirmation}
              erreur={erreurDe('nouveau_mot_de_passe_confirmation')}
              voir={voir}
              setVoir={setVoir}
              valide={confirmation.length > 0 && nouveau === confirmation && nouveau.length >= 8}
            />
          </div>

          {erreur && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}
          {succes && (
            <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3" role="status">
              <Check className="mt-0.5 size-4 shrink-0 text-indigo-600" />
              <p className="text-sm text-indigo-800">{succes}</p>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200/70 pt-5">
            <Bouton
              type="submit"
              variante="primaire"
              disabled={envoi || !motDePasseActuel || !nouveau || !confirmation}
              className="px-5 py-2.5 font-semibold"
            >
              <KeyRound className="size-4" />
              {envoi ? 'Modification…' : 'Changer le mot de passe'}
            </Bouton>
          </div>
        </form>
      </section>

      <div className="space-y-5 lg:col-span-2">
        <section className="rounded-3xl bg-papier p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="size-4 text-slate-500" />
            <h4 className="font-display text-base font-bold text-slate-900">Solidité du mot de passe</h4>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < nbValides ? niveau.couleur : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-600" aria-live="polite">{niveau.label}</p>
          </div>

          <ul className="space-y-2.5">
            {exigences.map((e) => (
              <li key={e.label} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-[30%] transition-colors ${
                    e.valide ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className={e.valide ? 'font-semibold text-slate-800' : 'text-slate-500'}>{e.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-start gap-3 rounded-3xl bg-mangue-300/50 p-5 ring-1 ring-mangue-400/40">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[30%] bg-mangue-400 text-lagon-950">
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-lagon-950">Bon réflexe</h4>
            <p className="mt-1 text-xs leading-relaxed text-lagon-950/80">
              Après avoir changé votre mot de passe, pensez à vous déconnecter des autres appareils
              si votre compte a été compromis.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function ChampMdp({ id, label, value, onChange, erreur, voir, setVoir, placeholder, valide, aide }) {
  const bordure = erreur
    ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
    : valide
      ? 'border-indigo-300 focus:border-indigo-400 focus:ring-indigo-500/15'
      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/15'

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={voir ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          required
          className={`w-full rounded-xl border bg-white py-3 pl-4 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${bordure}`}
        />
        <button
          type="button"
          onClick={() => setVoir(!voir)}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-indigo-600"
          aria-label={voir ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
          title={voir ? 'Masquer' : 'Afficher'}
        >
          {voir ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {erreur ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="size-3" />
          {erreur}
        </p>
      ) : aide ? (
        <p className="mt-1.5 text-xs text-slate-500">{aide}</p>
      ) : null}
    </div>
  )
}

/* ───────────────────────────── Onglet Thème ───────────────────────────── */

const THEMES_DISPONIBLES = [
  {
    id: 'laterite',
    nom: 'Latérite',
    description: 'Terres rouges de Madagascar',
    icone: Sun,
    image: imageLaterite,
    couleurs: {
      fond: '#f6eedf',
      sidebar: '#0c2b2a',
      bulleRecue: '#ffffff',
      bulleEnvoyee: '#d1451f',
    },
  },
  {
    id: 'dark',
    nom: 'Basalte',
    description: 'Nuit profonde, accents chauds',
    icone: Moon,
    couleurs: {
      fond: '#0d0d0d',
      sidebar: '#000000',
      bulleRecue: '#2a2a2a',
      bulleEnvoyee: '#e8622e',
    },
  },
  {
    id: 'clair',
    nom: 'Calcaire',
    description: 'Blanc net et contrasté',
    icone: Monitor,
    couleurs: {
      fond: '#ffffff',
      sidebar: '#1a1a1a',
      bulleRecue: '#f5f5f5',
      bulleEnvoyee: '#d1451f',
    },
  },
]

function OngletTheme() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <header>
        <h3 className="font-display text-xl font-bold text-slate-900">Apparence</h3>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES_DISPONIBLES.map((t) => (
          <CarteTheme
            key={t.id}
            theme={t}
            selectionne={theme === t.id}
            onSelectionner={() => setTheme(t.id)}
          />
        ))}
      </div>
    </div>
  )
}

function CarteTheme({ theme, selectionne, onSelectionner }) {
  const Icone = theme.icone
  const c = theme.couleurs

  return (
    <button
      type="button"
      onClick={onSelectionner}
      aria-pressed={selectionne}
      className={`group relative overflow-hidden rounded-3xl bg-papier p-3 text-left shadow-sm transition-shadow duration-300 ${
        selectionne
          ? 'shadow-xl ring-2 ring-action-600'
          : 'ring-1 ring-slate-200/70 hover:shadow-lg hover:ring-slate-300'
      }`}
    >
      <div className="mb-4 overflow-hidden rounded-2xl ring-1 ring-black/10">
        <div className="aspect-[16/10] overflow-hidden bg-slate-100">
          {theme.image ? (
            <img
              src={theme.image}
              alt={`Aperçu du thème ${theme.nom}`}
              loading="lazy"
              className="size-full object-cover object-top"
            />
          ) : (
            <ApercuMockup couleurs={c} />
          )}
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-1">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: c.sidebar, color: '#fff' }}
        >
          <Icone className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{theme.nom}</p>
          <p className="mt-0.5 text-xs text-slate-500">{theme.description}</p>
        </div>
      </div>

      {selectionne && (
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-action-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          <Check className="size-3" strokeWidth={3} />
          Actif
        </span>
      )}
    </button>
  )
}
/* Mockup dessiné (fallback pour les thèmes sans image) */
function ApercuMockup({ couleurs }) {
  const c = couleurs
  return (
    <div className="flex size-full" style={{ backgroundColor: c.fond }}>
      {/* Sidebar */}
      <div
        className="flex w-1/4 flex-col gap-2 p-2"
        style={{ backgroundColor: c.sidebar }}
      >
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full" style={{ backgroundColor: c.bulleEnvoyee }} />
          <div className="h-1.5 w-8 rounded-full bg-white/40" />
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="h-2 w-full rounded-sm bg-white/25" />
          <div className="h-2 w-4/5 rounded-sm bg-white/15" />
          <div className="h-2 w-3/4 rounded-sm bg-white/15" />
        </div>
        <div className="mt-auto flex items-center gap-1.5">
          <div className="size-4 rounded-full" style={{ backgroundColor: c.bulleEnvoyee }} />
          <div className="h-1.5 w-8 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Zone messages */}
      <div className="flex flex-1 flex-col justify-end gap-1.5 p-2.5">
        <div
          className="h-3 w-3/5 self-start rounded-full"
          style={{ backgroundColor: c.bulleRecue }}
        />
        <div
          className="h-3 w-2/5 self-start rounded-full"
          style={{ backgroundColor: c.bulleRecue }}
        />
        <div
          className="h-3 w-2/5 self-end rounded-full"
          style={{ backgroundColor: c.bulleEnvoyee }}
        />
        <div
          className="h-3 w-1/2 self-end rounded-full"
          style={{ backgroundColor: c.bulleEnvoyee }}
        />
      </div>
    </div>
  )
}
