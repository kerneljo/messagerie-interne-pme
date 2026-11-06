import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Camera, Check, Copy, Eye, EyeOff, Info, KeyRound, Lock,
  Mail, Monitor, Moon, Pencil, Shield, Smartphone, Sun,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'
import imageLaterite from '../images/laterite.png'
import { Bouton, Chargement } from '../components/ui'
import ConfirmationModal from '../components/ConfirmationModal'

const ONGLETS = [
  { id: 'profil', libelle: 'Profil' },
  { id: 'securite', libelle: 'Sécurité' },
  { id: 'theme', libelle: 'Apparence' },
]

const TAILLE_MAX_PHOTO = 5 * 1024 * 1024
const TYPES_PHOTO = ['image/jpeg', 'image/png', 'image/webp']
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const NIVEAUX_MDP = [
  { label: 'En attente…', couleur: 'bg-slate-300' },
  { label: 'Faible', couleur: 'bg-red-500' },
  { label: 'Moyen', couleur: 'bg-amber-500' },
  { label: 'Bon', couleur: 'bg-emerald-400' },
  { label: 'Excellent', couleur: 'bg-emerald-600' },
]

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
const CARTE = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm'

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

function ilYA(iso) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(min)) return ''
  if (min < 2) return 'active maintenant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  return `il y a ${j} jour${j > 1 ? 's' : ''}`
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function Profil() {
  const { rafraichir } = useAuth()
  const [chargement, setChargement] = useState(true)
  const [echec, setEchec] = useState(false)
  const [profil, setProfil] = useState(null)
  const [onglet, setOnglet] = useState('profil')

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
  }, [])

  function surToucheOnglet(e, index) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    let suivant = index
    if (e.key === 'ArrowRight') suivant = (index + 1) % ONGLETS.length
    if (e.key === 'ArrowLeft') suivant = (index - 1 + ONGLETS.length) % ONGLETS.length
    if (e.key === 'Home') suivant = 0
    if (e.key === 'End') suivant = ONGLETS.length - 1
    setOnglet(ONGLETS[suivant].id)
    document.getElementById(`onglet-${ONGLETS[suivant].id}`)?.focus()
  }

  if (chargement) return <Chargement />

  if (echec && !profil) {
    return (
      <div className="mx-auto max-w-[1400px] p-4 md:p-8"> {/* ✅ Élargi */}
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 size-10 text-red-500" aria-hidden="true" />
          <p className="text-sm text-red-700">Impossible de charger le profil.</p>
        </div>
      </div>
    )
  }

  const poste = libellePoste(profil.poste)
  const actif = profil.statut_compte !== 'desactive'

  return (
    // ✅ Conteneur élargi et paddings augmentés
    <div className="mx-auto max-w-[1400px] px-4 py-6 pb-12 md:px-8 md:py-10 xl:max-w-[1600px]">
      {/* ✅ Grille plus large et espacée */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)] xl:gap-12">
        
        <CarteIdentite profil={profil} poste={poste} actif={actif} onChange={charger} />

        <div className="flex min-w-0 flex-col gap-6">
          <div role="tablist" aria-label="Sections du profil" className="flex gap-7 border-b border-slate-200">
            {ONGLETS.map(({ id, libelle }, index) => {
              const selectionne = onglet === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`onglet-${id}`}
                  aria-selected={selectionne}
                  aria-controls={`panneau-${id}`}
                  tabIndex={selectionne ? 0 : -1}
                  onClick={() => setOnglet(id)}
                  onKeyDown={(e) => surToucheOnglet(e, index)}
                  className={`-mb-px min-h-11 border-b-[3px] py-2.5 text-sm transition-colors ${FOCUS} ${
                    selectionne
                      ? 'border-[#C2410C] font-extrabold text-slate-900'
                      : 'border-transparent font-semibold text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {libelle}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" id={`panneau-${onglet}`} aria-labelledby={`onglet-${onglet}`}>
            {onglet === 'profil' && <OngletProfil profil={profil} poste={poste} onChange={charger} />}
            {onglet === 'securite' && <OngletSecurite />}
            {onglet === 'theme' && <OngletTheme />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────── Photo : logique ───────────────────────────── */

function usePhotoProfil(onChange) {
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

  return {
    inputRef, uploadEnCours, erreur, confirmation, setConfirmation,
    suppressionEnCours, choisirFichier, supprimer,
  }
}

/* ───────────────────────────── Carte d'identité (colonne gauche) ───────────────────────────── */

function CarteIdentite({ profil, poste, actif, onChange }) {
  const photo = usePhotoProfil(onChange)
  const nomComplet = `${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim()
  const ligne = [poste, profil.service?.nom_service].filter(Boolean).join(' · ')

  return (
    // ✅ Padding augmenté (p-8) et l'espacement interne (gap-6)
    <section className={`${CARTE} flex flex-col gap-6 px-8 py-8 lg:sticky lg:top-8`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          {profil.photo_url ? (
            <img src={profil.photo_url} alt={nomComplet} className="size-32 rounded-full object-cover shadow-md" /> // ✅ Photo agrandie (32)
          ) : (
            <div className="flex size-32 items-center justify-center rounded-full bg-slate-200 font-display text-4xl font-extrabold text-slate-800 shadow-sm">
              {profil.prenom?.[0]}
              {profil.nom?.[0]}
            </div>
          )}

          <button
            type="button"
            onClick={() => photo.inputRef.current?.click()}
            disabled={photo.uploadEnCours}
            aria-busy={photo.uploadEnCours}
            aria-label="Changer la photo de profil"
            title="Changer la photo"
            className={`absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full border-2 border-white bg-[#C2410C] text-white shadow-md transition hover:bg-[#9A3412] disabled:opacity-60 ${FOCUS}`}
          >
            {photo.uploadEnCours ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            ) : (
              <Camera className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <input
          ref={photo.inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={photo.choisirFichier}
          aria-label="Choisir une photo de profil"
        />

        {profil.photo_url && (
          <button
            type="button"
            onClick={() => photo.setConfirmation(true)}
            className={`min-h-11 rounded-lg px-3 text-[13px] text-slate-600 transition hover:text-red-600 ${FOCUS}`}
          >
            Retirer la photo
          </button>
        )}

        {photo.erreur && (
          <p className="text-sm text-red-600" role="alert">
            {photo.erreur}
          </p>
        )}

        <h2 className="mt-3 font-display text-2xl font-extrabold text-slate-900">{nomComplet}</h2> {/* ✅ Titre agrandi */}
        {ligne && <p className="text-sm text-slate-600">{ligne}</p>}

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {profil.role?.libelle && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {profil.role.libelle}
            </span>
          )}
          {!actif && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Compte désactivé
            </span>
          )}
        </div>
      </div>

      <dl className="flex flex-col gap-5 border-t border-slate-200/80 pt-6 text-sm"> {/* ✅ Gaps augmentés */}
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-slate-600">Compte créé le</dt>
          <dd className="font-semibold text-slate-900">{formaterDate(profil.date_creation, false)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-slate-600">Dernière connexion</dt>
          <dd className="font-semibold text-slate-900">{formaterDate(profil.derniere_connexion)}</dd>
        </div>
      </dl>

      <ConfirmationModal
        ouvert={photo.confirmation}
        onFermer={() => photo.setConfirmation(false)}
        onConfirmer={photo.supprimer}
        titre="Retirer la photo ?"
        message="Vos initiales seront affichées à la place de votre photo de profil."
        texteConfirmer="Retirer"
        texteAnnuler="Annuler"
        variant="danger"
        enCours={photo.suppressionEnCours}
      />
    </section>
  )
}

/* ───────────────────────────── Onglet Profil ───────────────────────────── */

function Ligne({ label, children, derniere = false }) {
  return (
    // ✅ Paddings verticaux augmentés (py-4)
    <div
      className={`grid grid-cols-1 gap-1 py-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-6 ${
        derniere ? '' : 'border-b border-slate-100'
      }`}
    >
      <dt className="text-slate-600">{label}</dt>
      <dd className="break-words font-semibold text-slate-900">{children}</dd>
    </div>
  )
}

function OngletProfil({ profil, poste, onChange }) {
  return (
    <div className="flex flex-col gap-6"> {/* ✅ Gap augmenté */}
      <CarteCoordonnees profil={profil} onChange={onChange} />

      <section className={CARTE}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-8 py-5"> {/* ✅ Padding augmenté */}
          <h3 className="font-display text-lg font-extrabold text-slate-900">Informations professionnelles</h3>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <Lock className="size-3" aria-hidden="true" />
            Géré par l'administrateur
          </span>
        </header>
        <dl className="px-8 pb-3 text-sm">
          <Ligne label="Prénom">{profil.prenom}</Ligne>
          <Ligne label="Nom">{profil.nom}</Ligne>
          <Ligne label="Intitulé">{poste || '—'}</Ligne>
          <Ligne label="Service">{profil.service?.nom_service || '—'}</Ligne>
          <Ligne label="Rôle" derniere>{profil.role?.libelle || '—'}</Ligne>
        </dl>
        <p className="border-t border-slate-100 px-8 py-4 text-[13px] text-slate-600"> {/* ✅ Padding augmenté */}
          Une correction est nécessaire ? Contactez votre administrateur.
        </p>
      </section>

      <AppareilsConnectes />
    </div>
  )
}

/* ───────────────────────────── Coordonnées (e-mail modifiable) ───────────────────────────── */

function CarteCoordonnees({ profil, onChange }) {
  const [edition, setEdition] = useState(false)
  const [email, setEmail] = useState(profil.email || '')
  const [motDePasse, setMotDePasse] = useState('')
  const [voir, setVoir] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [erreursChamps, setErreursChamps] = useState({})
  const [succes, setSucces] = useState('')
  const [copie, setCopie] = useState(false)

  useEffect(() => {
    if (!copie) return undefined
    const t = setTimeout(() => setCopie(false), 1500)
    return () => clearTimeout(t)
  }, [copie])

  useEffect(() => {
    if (!succes) return undefined
    const t = setTimeout(() => setSucces(''), 5000)
    return () => clearTimeout(t)
  }, [succes])

  async function copier() {
    if (!profil.email) return
    try {
      await navigator.clipboard.writeText(profil.email)
      setCopie(true)
    } catch {
      // presse-papiers indisponible
    }
  }

  function ouvrir() {
    setEmail(profil.email || '')
    setMotDePasse('')
    setErreur('')
    setErreursChamps({})
    setSucces('')
    setEdition(true)
  }

  function annuler() {
    setEdition(false)
    setErreur('')
    setErreursChamps({})
    setMotDePasse('')
  }

  async function enregistrer(e) {
    e.preventDefault()
    setErreur('')
    setErreursChamps({})

    const propre = email.trim()
    if (!REGEX_EMAIL.test(propre)) {
      setErreursChamps({ email: ['Adresse e-mail invalide.'] })
      return
    }
    if (propre.toLowerCase() === (profil.email || '').toLowerCase()) {
      setErreursChamps({ email: ['C\'est déjà votre adresse actuelle.'] })
      return
    }

    setEnvoi(true)
    try {
      const r = await api.put('/api/profil/email', {
        email: propre,
        mot_de_passe_actuel: motDePasse,
      })
      setSucces(r.data?.message || 'Adresse e-mail mise à jour.')
      setEdition(false)
      setMotDePasse('')
      await onChange()
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErreursChamps(data.errors)
      setErreur(data?.errors ? '' : data?.message || 'Modification impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  const erreurEmail = erreursChamps.email?.[0]

  return (
    <section className={CARTE}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-8 py-5">
        <h3 className="font-display text-lg font-extrabold text-slate-900">Coordonnées</h3>
        {!edition && (
          <button
            type="button"
            onClick={ouvrir}
            className={`flex min-h-11 items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:shadow ${FOCUS}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Modifier
          </button>
        )}
      </header>

      {succes && (
        <div
          className="mx-8 mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          role="status"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <p className="text-sm text-emerald-800">{succes}</p>
        </div>
      )}

      {!edition ? (
        <dl className="px-8 pb-3 text-sm">
          <Ligne label="Adresse e-mail" derniere>
            <div className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2.5">
                <Mail className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0 break-all text-base">{profil.email || '—'}</span>
              </span>
              {profil.email && (
                <button
                  type="button"
                  onClick={copier}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${FOCUS}`}
                  aria-label={copie ? 'Adresse copiée' : "Copier l'adresse e-mail"}
                >
                  {copie ? (
                    <Check className="size-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copie ? 'Copié' : 'Copier'}
                </button>
              )}
            </div>
          </Ligne>
        </dl>
      ) : (
        <form onSubmit={enregistrer} className="space-y-6 px-8 py-6">
          <div>
            <label htmlFor="nouvel_email" className="mb-2 block text-sm font-semibold text-slate-700">
              Nouvelle adresse e-mail
            </label>
            <input
              id="nouvel_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
              aria-invalid={Boolean(erreurEmail)}
              aria-describedby={erreurEmail ? 'nouvel_email-aide' : undefined}
              className={`w-full rounded-xl border bg-white px-4 py-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                erreurEmail
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
                  : 'border-slate-200 focus:border-[#C2410C] focus:ring-[#C2410C]/15'
              }`}
            />
            {erreurEmail && (
              <p id="nouvel_email-aide" className="mt-2 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="size-3" aria-hidden="true" />
                {erreurEmail}
              </p>
            )}
          </div>

          <ChampMdp
            id="mdp_confirmation_email"
            label="Mot de passe actuel"
            value={motDePasse}
            onChange={setMotDePasse}
            erreur={erreursChamps.mot_de_passe_actuel?.[0]}
            voir={voir}
            setVoir={setVoir}
            autoComplete="current-password"
            aide="Demandé pour confirmer qu'il s'agit bien de vous."
          />

          {erreur && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden="true" />
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-4 border-t border-slate-200/70 pt-6">
            <button
              type="button"
              onClick={annuler}
              disabled={envoi}
              className={`min-h-11 rounded-[10px] border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 ${FOCUS}`}
            >
              Annuler
            </button>
            <Bouton
              type="submit"
              variante="primaire"
              disabled={envoi || !email.trim() || !motDePasse}
              className="px-6 py-3 font-semibold"
            >
              {envoi ? 'Enregistrement…' : "Enregistrer l'adresse"}
            </Bouton>
          </div>
        </form>
      )}
    </section>
  )
}

/* ───────────────────────────── Appareils connectés ───────────────────────────── */

function appareilLocal() {
  const ua = navigator.userAgent
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  const sys = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return { id: 'local', appareil: nav, systeme: sys, lieu: '', derniere_activite: new Date().toISOString(), actuelle: true }
}

function IconeAppareil({ systeme }) {
  const mobile = /Android|iOS/.test(systeme || '')
  const Icone = mobile ? Smartphone : Monitor
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
      <Icone className="size-6" aria-hidden="true" />
    </span>
  )
}

function AppareilsConnectes() {
  const [sessions, setSessions] = useState(undefined)
  const [erreur, setErreur] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  const [enCours, setEnCours] = useState(false)

  async function charger() {
    try {
      const r = await api.get('/api/profil/sessions')
      const liste = Array.isArray(r.data) ? r.data : r.data?.data ?? []
      setSessions(liste)
    } catch {
      setSessions(null)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  async function fermer(id) {
    setErreur('')
    try {
      await api.delete(`/api/profil/sessions/${id}`)
      await charger()
    } catch (err) {
      setErreur(err.response?.data?.message || 'Déconnexion impossible.')
    }
  }

  async function fermerAutres() {
    setEnCours(true)
    setErreur('')
    try {
      await api.delete('/api/profil/sessions')
      setConfirmation(false)
      await charger()
    } catch (err) {
      setConfirmation(false)
      setErreur(err.response?.data?.message || 'Déconnexion impossible.')
    } finally {
      setEnCours(false)
    }
  }

  if (sessions === undefined) return null
  const disponible = Array.isArray(sessions)
  const liste = disponible ? sessions : [appareilLocal()]
  const autres = liste.filter((s) => !s.actuelle)

  return (
    <section className={CARTE} aria-label="Appareils connectés">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 px-8 py-5">
        <h3 className="font-display text-lg font-extrabold text-slate-900">Appareils connectés</h3>
        {autres.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            className={`min-h-11 rounded-[10px] bg-[#C2410C] px-5 text-[13px] font-semibold text-white transition hover:bg-[#9A3412] ${FOCUS}`}
          >
            Déconnecter les autres appareils
          </button>
        )}
      </header>

      {erreur && (
        <p className="px-8 pt-4 text-sm text-red-600" role="alert">
          {erreur}
        </p>
      )}

      <ul className="divide-y divide-slate-100">
        {liste.map((s) => {
          const maintenant = ilYA(s.derniere_activite) === 'active maintenant'
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-8 py-5">
              <div className="flex min-w-0 items-center gap-4">
                <IconeAppareil systeme={s.systeme} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-base">
                    {[s.appareil, s.systeme].filter(Boolean).join(' · ') || 'Appareil inconnu'}
                  </p>
                  <p className="flex items-center gap-2 text-[13px] text-slate-600 mt-0.5">
                    {maintenant && (
                      <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                    )}
                    {[s.lieu, ilYA(s.derniere_activite)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {s.actuelle ? (
                <span className="rounded-full bg-[#0B2925] px-4 py-1.5 text-xs font-semibold text-white">
                  Cet appareil
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => fermer(s.id)}
                  className={`min-h-11 rounded-[10px] border border-slate-300 bg-white px-5 text-[13px] font-semibold text-red-700 transition hover:bg-red-50 ${FOCUS}`}
                >
                  Déconnecter
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {disponible && autres.length === 0 && (
        <p className="border-t border-slate-100 px-8 py-4 text-[13px] text-slate-600">
          Aucune autre session active.
        </p>
      )}

      <ConfirmationModal
        ouvert={confirmation}
        onFermer={() => setConfirmation(false)}
        onConfirmer={fermerAutres}
        titre="Déconnecter les autres appareils ?"
        message="Toutes les autres sessions seront fermées. Vous devrez vous reconnecter sur ces appareils."
        texteConfirmer="Déconnecter"
        texteAnnuler="Annuler"
        variant="danger"
        enCours={enCours}
      />
    </section>
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
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70 sm:p-10">
        <header className="mb-8 flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">Modifier le mot de passe</h3>
            <p className="mt-1 text-sm text-slate-600">Choisissez un mot de passe fort et unique.</p>
          </div>
        </header>

        <form onSubmit={soumettre} className="space-y-6">
          <ChampMdp
            id="mot_de_passe_actuel"
            label="Mot de passe actuel"
            value={motDePasseActuel}
            onChange={setMotDePasseActuel}
            erreur={erreurDe('mot_de_passe_actuel')}
            voir={voir}
            setVoir={setVoir}
            autoComplete="current-password"
          />

          <div className="h-px bg-slate-200/70" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ChampMdp
              id="nouveau_mot_de_passe"
              label="Nouveau mot de passe"
              value={nouveau}
              onChange={setNouveau}
              erreur={erreurDe('nouveau_mot_de_passe')}
              voir={voir}
              setVoir={setVoir}
              placeholder="Min. 8 caractères"
              aide="Un mélange de lettres, chiffres et symboles."
            />

            <ChampMdp
              id="nouveau_mot_de_passe_confirmation"
              label="Confirmer le mot de passe"
              value={confirmation}
              onChange={setConfirmation}
              erreur={erreurDe('nouveau_mot_de_passe_confirmation')}
              voir={voir}
              setVoir={setVoir}
              valide={confirmation.length > 0 && nouveau === confirmation && nouveau.length >= 8}
            />
          </div>

          {erreur && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" aria-hidden="true" />
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}
          {succes && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
              <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <p className="text-sm text-emerald-800">{succes}</p>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200/70 pt-6">
            <Bouton
              type="submit"
              variante="primaire"
              disabled={envoi || !motDePasseActuel || !nouveau || !confirmation}
              className="px-6 py-3 font-semibold"
            >
              <KeyRound className="size-4" aria-hidden="true" />
              {envoi ? 'Modification…' : 'Changer le mot de passe'}
            </Bouton>
          </div>
        </form>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="size-5 shrink-0 text-slate-600" aria-hidden="true" />
            <h4 className="font-display text-base font-bold text-slate-900">Solidité du mot de passe</h4>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${i < nbValides ? niveau.couleur : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-600" aria-live="polite">{niveau.label}</p>
          </div>

          <ul className="space-y-3">
            {exigences.map((e) => (
              <li key={e.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                    e.valide ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className={e.valide ? 'font-semibold text-slate-800' : 'text-slate-600'}>{e.label}</span>
                <span className="sr-only">{e.valide ? '(validé)' : '(non validé)'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-start gap-3 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
            <Info className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-slate-900">Bon réflexe</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              Après avoir changé votre mot de passe, pensez à vous déconnecter des autres appareils
              si votre compte a été compromis.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function ChampMdp({
  id, label, value, onChange, erreur, voir, setVoir, placeholder, valide, aide,
  autoComplete = 'new-password',
}) {
  const bordure = erreur
    ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
    : valide
      ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-500/15'
      : 'border-slate-200 focus:border-[#C2410C] focus:ring-[#C2410C]/15'

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={voir ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          aria-invalid={Boolean(erreur)}
          aria-describedby={erreur || aide ? `${id}-aide` : undefined}
          className={`w-full rounded-xl border bg-white py-3.5 pl-4 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${bordure}`}
        />
        <button
          type="button"
          onClick={() => setVoir(!voir)}
          className={`absolute inset-y-0 right-0 flex items-center rounded-r-xl pr-4 text-slate-500 transition-colors hover:text-slate-800 ${FOCUS}`}
          aria-label={voir ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
          title={voir ? 'Masquer' : 'Afficher'}
        >
          {voir ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {erreur ? (
        <p id={`${id}-aide`} className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="size-3" aria-hidden="true" />
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="mt-2 text-xs text-slate-600">{aide}</p>
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
        <p className="mt-1 text-sm text-slate-600">
          Choisissez l'ambiance de l'interface. Le changement est appliqué immédiatement.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
      className={`group relative overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm transition-shadow duration-300 ${FOCUS} ${
        selectionne
          ? 'shadow-xl ring-2 ring-[#C2410C]'
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

      <div className="flex items-start gap-3 px-2 pb-1">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: c.sidebar, color: '#fff' }}
        >
          <Icone className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{theme.nom}</p>
          <p className="mt-0.5 text-xs text-slate-600">{theme.description}</p>
        </div>
      </div>

      {selectionne && (
        <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-[#C2410C] px-3 py-1 text-xs font-semibold text-white shadow-lg">
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          Actif
        </span>
      )}
    </button>
  )
}

function ApercuMockup({ couleurs }) {
  const c = couleurs
  return (
    <div className="flex size-full" style={{ backgroundColor: c.fond }}>
      <div className="flex w-1/4 flex-col gap-2 p-2" style={{ backgroundColor: c.sidebar }}>
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

      <div className="flex flex-1 flex-col justify-end gap-1.5 p-2.5">
        <div className="h-3 w-3/5 self-start rounded-full" style={{ backgroundColor: c.bulleRecue }} />
        <div className="h-3 w-2/5 self-start rounded-full" style={{ backgroundColor: c.bulleRecue }} />
        <div className="h-3 w-2/5 self-end rounded-full" style={{ backgroundColor: c.bulleEnvoyee }} />
        <div className="h-3 w-1/2 self-end rounded-full" style={{ backgroundColor: c.bulleEnvoyee }} />
      </div>
    </div>
  )
}
