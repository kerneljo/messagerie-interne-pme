import { useEffect, useRef, useState } from 'react'
import {
  Mail, Briefcase, Building2, Shield, KeyRound,
  Eye, EyeOff, Check, AlertTriangle, Calendar, Clock,
  User as UserIcon, Camera, Trash2, Upload, Copy,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { Chargement } from '../components/ui'

const ONGLETS = [
  { id: 'profil', libelle: 'Profil', icone: UserIcon },
  { id: 'securite', libelle: 'Sécurité', icone: KeyRound },
]

export default function Profil() {
  const { rafraichir } = useAuth()
  const [chargement, setChargement] = useState(true)
  const [profil, setProfil] = useState(null)
  const [onglet, setOnglet] = useState('profil')
  const [copie, setCopie] = useState(false)

  async function charger() {
    setChargement(true)
    try {
      const r = await api.get('/api/profil')
      setProfil(r.data)
      await rafraichir?.()
    } catch {
      setProfil(null)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [])

  function copierEmail() {
    if (!profil?.email) return
    navigator.clipboard.writeText(profil.email)
    setCopie(true)
    setTimeout(() => setCopie(false), 1500)
  }

  if (chargement) return <Chargement />

  if (!profil) {
    return (
      <div className="w-full p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="size-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700">Impossible de charger le profil.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="w-full px-6 py-6">

        {/* Barre supérieure */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mon profil</h1>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Espace personnel
          </span>
        </div>

        {/* Carte principale (identique à ProfilUtilisateur) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">

            {/* Avatar avec upload au survol */}
            <BlocPhoto profil={profil} onChange={charger} />

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {profil.prenom} {profil.nom}
              </h2>

              <div className="mt-1 flex items-center gap-2 text-slate-500">
                <Mail className="size-3.5 shrink-0" />
                <span className="text-sm">{profil.email}</span>
                <button
                  onClick={copierEmail}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  aria-label="Copier"
                  title="Copier l’e-mail"
                >
                  {copie ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {profil.role && (
                  <Badge icone={Shield} texte={profil.role.libelle} />
                )}
                {profil.poste && (
                  <Badge icone={Briefcase} texte={profil.poste.libelle} />
                )}
                {profil.service && (
                  <Badge icone={Building2} texte={profil.service.nom_service} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mt-5 border-b border-slate-200">
          <nav className="flex gap-1 -mb-px" aria-label="Sections du profil">
            {ONGLETS.map(({ id, libelle, icone: Icone }) => {
              const actif = onglet === id
              return (
                <button
                  key={id}
                  onClick={() => setOnglet(id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    actif
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icone className="size-4" />
                  {libelle}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="mt-5">
          {onglet === 'profil' && <OngletProfil profil={profil} />}
          {onglet === 'securite' && <OngletSecurite />}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Bloc photo avec upload au survol
   ============================================================ */
function BlocPhoto({ profil, onChange }) {
  const [uploadEnCours, setUploadEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const inputRef = useRef(null)

  async function choisirFichier(e) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreur('')

    if (fichier.size > 2 * 1024 * 1024) {
      setErreur('L’image ne doit pas dépasser 2 Mo.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type)) {
      setErreur('Formats acceptés : JPG, PNG, WEBP.')
      return
    }

    setUploadEnCours(true)
    const formData = new FormData()
    formData.append('photo', fichier)

    try {
      await api.post('/api/profil/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange()
    } catch (err) {
      const data = err.response?.data
      setErreur(data?.errors?.photo?.[0] || data?.message || 'Erreur d’upload.')
    } finally {
      setUploadEnCours(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function supprimer() {
    if (!confirm('Supprimer votre photo de profil ?')) return
    setErreur('')
    try {
      await api.delete('/api/profil/photo')
      onChange()
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur.')
    }
  }

  return (
    <div className="shrink-0 relative">
      <div className="relative group">
        {/* Avatar */}
        {profil.photo_url ? (
          <img
            src={profil.photo_url}
            alt={`${profil.prenom} ${profil.nom}`}
            className="size-20 rounded-2xl object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="size-20 rounded-2xl ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center">
            <span className="text-2xl font-semibold text-slate-600">
              {profil.prenom?.[0]}{profil.nom?.[0]}
            </span>
          </div>
        )}

        {/* Pastille statut */}
        <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
          <Check className="size-2.5 text-white" strokeWidth={3} />
        </span>

        {/* Overlay au survol */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadEnCours}
          className="absolute inset-0 rounded-2xl bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity
                     flex items-center justify-center text-white disabled:opacity-100"
          aria-label="Changer la photo"
          title="Changer la photo"
        >
          {uploadEnCours ? (
            <span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera className="size-5" />
          )}
        </button>
      </div>

      {/* Bouton supprimer discret (si photo) */}
      {profil.photo_url && (
        <button
          type="button"
          onClick={supprimer}
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm transition"
          aria-label="Supprimer la photo"
          title="Supprimer la photo"
        >
          <Trash2 className="size-2.5" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={choisirFichier}
      />

      {erreur && (
        <p className="absolute top-full left-0 mt-1 w-40 text-[10px] text-red-600">{erreur}</p>
      )}
    </div>
  )
}

/* ============================================================
   Badge
   ============================================================ */
function Badge({ icone: Icone, texte }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      <Icone className="size-3" />
      {texte}
    </span>
  )
}

/* ============================================================
   Onglet PROFIL — Informations personnelles
   ============================================================ */
function OngletProfil({ profil }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
      <Carte icone={UserIcon} titre="Identité">
        <Ligne label="Prénom" valeur={profil.prenom} />
        <Ligne label="Nom" valeur={profil.nom} />
        <Ligne label="Adresse e-mail" valeur={profil.email} />
        <Ligne label="Matricule" valeur={profil.matricule} mono />
      </Carte>

      <Carte icone={Briefcase} titre="Poste">
        <Ligne label="Intitulé" valeur={profil.poste?.libelle || '—'} />
        <Ligne label="Service" valeur={profil.service?.nom_service || '—'} />
        <Ligne label="Rôle" valeur={profil.role?.libelle || '—'} />
        <Ligne label="Statut" valeur="Actif" pastilleVerte />
      </Carte>

      <Carte icone={Calendar} titre="Compte">
        <LigneContact icone={Calendar} label="Créé le" valeur={formaterDate(profil.date_creation)} />
        <LigneContact icone={Clock} label="Dernière connexion" valeur={formaterDate(profil.derniere_connexion)} />
      </Carte>
    </div>
  )
}

/* ============================================================
   Onglet SÉCURITÉ — Changement de mot de passe
   ============================================================ */
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

  // Calcul de la force du mot de passe
  const exigences = [
    { label: '8 caractères minimum', valide: nouveau.length >= 8 },
    { label: 'Une lettre majuscule', valide: /[A-Z]/.test(nouveau) },
    { label: 'Une lettre minuscule', valide: /[a-z]/.test(nouveau) },
    { label: 'Un chiffre', valide: /[0-9]/.test(nouveau) },
  ]
  const nbValides = exigences.filter((e) => e.valide).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

      {/* ========== Colonne principale (formulaire) ========== */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
          {/* En-tête */}
          <div className="flex items-start gap-3 mb-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Modifier le mot de passe</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choisissez un mot de passe fort et unique.
              </p>
            </div>
          </div>

          <form onSubmit={soumettre} className="space-y-4">
            {/* Mot de passe actuel */}
            <ChampMdp
              id="mot_de_passe_actuel"
              label="Mot de passe actuel"
              value={motDePasseActuel}
              onChange={setMotDePasseActuel}
              erreur={erreurDe('mot_de_passe_actuel')}
              voir={voir}
              setVoir={setVoir}
            />

            <div className="h-px bg-slate-100 my-1"></div>

            {/* Nouveau mot de passe */}
            <ChampMdp
              id="nouveau_mot_de_passe"
              label="Nouveau mot de passe"
              value={nouveau}
              onChange={setNouveau}
              erreur={erreurDe('nouveau_mot_de_passe')}
              voir={voir}
              setVoir={setVoir}
              placeholder="8 caractères minimum"
              aide="Utilisez un mélange de lettres, chiffres et symboles."
            />

            {/* Confirmation */}
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

            {/* Messages */}
            {erreur && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{erreur}</p>
              </div>
            )}
            {succes && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Check className="size-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700">{succes}</p>
              </div>
            )}

            {/* Bouton aligné à droite */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={envoi || !motDePasseActuel || !nouveau || !confirmation}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                           hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20
                           disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <KeyRound className="size-4" />
                {envoi ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========== Colonne latérale ========== */}
      <div className="space-y-5">

        {/* Carte : Exigences du mot de passe */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="size-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-900">
              Sécurité du mot de passe
            </h4>
          </div>

          {/* Barre de progression */}
          <div className="mb-4">
            <div className="flex gap-1 mb-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < nbValides
                      ? nbValides === 4 ? 'bg-emerald-500'
                        : nbValides === 3 ? 'bg-blue-500'
                        : nbValides === 2 ? 'bg-amber-500'
                        : 'bg-red-500'
                      : 'bg-slate-200'
                  }`}
                ></span>
              ))}
            </div>
            <p className="text-xs font-medium text-slate-600">
              {nbValides === 0 ? 'En attente…'
                : nbValides === 4 ? 'Excellent'
                : nbValides === 3 ? 'Bon'
                : nbValides === 2 ? 'Moyen'
                : 'Faible'}
            </p>
          </div>

          {/* Liste des exigences */}
          <ul className="space-y-2.5">
            {exigences.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                  e.valide ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <span className={e.valide ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                  {e.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Carte : Conseil de sécurité */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Bon réflexe
              </h4>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Après avoir changé votre mot de passe, pensez à vous déconnecter
                des autres appareils si votre compte a été compromis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ============================================================
   Carte (hauteur 100%)
   ============================================================ */
function Carte({ icone: Icone, titre, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icone className="size-4" />
        </span>
        <h3 className="text-base font-bold text-slate-900">{titre}</h3>
      </div>
      <div className="space-y-0 flex-1">{children}</div>
    </div>
  )
}

/* ============================================================
   Ligne (label gauche / valeur gauche alignée)
   ============================================================ */
function Ligne({ label, valeur, mono, pastilleVerte }) {
  if (pastilleVerte) {
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
        <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500"></span>
          {valeur}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 truncate ${mono ? 'font-mono' : ''}`}>
        {valeur}
      </span>
    </div>
  )
}

function LigneContact({ icone: Icone, label, valeur }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icone className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900 truncate">{valeur}</p>
      </div>
    </div>
  )
}

/* ============================================================
   Champ mot de passe
   ============================================================ */
function ChampMdp({ id, label, value, onChange, erreur, voir, setVoir, placeholder, valide, aide }) {
  return (
    <div>
      {/* Label rapproché du champ */}
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
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
          className={`w-full pl-4 pr-11 py-2.5 rounded-lg border bg-white text-sm text-slate-900 placeholder-slate-400
                     focus:outline-none focus:ring-4 transition-all
                     ${erreur
                       ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
                       : valide
                         ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-500/15'
                         : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/15'}`}
        />
        <button
          type="button"
          onClick={() => setVoir(!voir)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
          aria-label={voir ? 'Masquer' : 'Afficher'}
          title={voir ? 'Masquer' : 'Afficher'}
        >
          {voir ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {/* Texte d'aide ou d'erreur */}
      {erreur ? (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          {erreur}
        </p>
      ) : aide ? (
        <p className="mt-1.5 text-xs text-slate-500">{aide}</p>
      ) : null}
    </div>
  )
}

/* ============================================================
   Utilitaires
   ============================================================ */
function formaterDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
