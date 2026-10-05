import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import { useAuth } from '../AuthContext'
import api from '../api'

export default function Register() {
  const { utilisateur, inscription } = useAuth()
  const navigate = useNavigate()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [codePoste, setCodePoste] = useState('')
  const [postes, setPostes] = useState([])
  const [chargementPostes, setChargementPostes] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [erreursChamps, setErreursChamps] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [voirMdp, setVoirMdp] = useState(false)
  const [succes, setSucces] = useState(false)
  const [messageAttente, setMessageAttente] = useState('')

  // Charge la liste des postes disponibles
  useEffect(() => {
    api
      .get('/api/postes')
      .then((r) => setPostes(r.data))
      .catch(() => setPostes([]))
      .finally(() => setChargementPostes(false))
  }, [])

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setErreursChamps({})
    setSucces(false)

    if (password !== passwordConfirmation) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setEnvoi(true)
    try {
      await inscription({ nom, prenom, email, codePoste, password, passwordConfirmation })
      setSucces(true)
      setMessageAttente(
        'Votre compte a été créé avec succès. Il est en attente de validation par un administrateur. Vous pourrez vous connecter dès que votre compte sera activé.'
      )
      // ⚠️ PAS de redirection — l'utilisateur n'est PAS connecté
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErreursChamps(data.errors)
      setErreur(data?.message || 'Erreur lors de l’inscription.')
    } finally {
      setEnvoi(false)
    }
  }

  const erreurDe = (champ) => erreursChamps[champ]?.[0]

  return (
    <div className="relative min-h-screen flex font-sans overflow-hidden bg-[#eef3fb]">

      {/* ===== Cercles concentriques en bas à gauche ===== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-[420px] -left-[420px] w-[900px] h-[900px] rounded-full border border-blue-200/60"></div>
        <div className="absolute -bottom-[320px] -left-[320px] w-[700px] h-[700px] rounded-full border border-blue-200/50"></div>
        <div className="absolute -bottom-[220px] -left-[220px] w-[500px] h-[500px] rounded-full border border-blue-200/40"></div>
        <div className="absolute -bottom-[120px] -left-[120px] w-[300px] h-[300px] rounded-full border border-blue-200/30"></div>
      </div>

      {/* ===== Colonne gauche : présentation ===== */}
      <div className="relative z-10 hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16">
        <div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>

          <p className="mt-12 text-xs font-bold tracking-[0.2em] text-indigo-500 uppercase">
            Nouveau ici ?
          </p>

          <h1 className="mt-5 text-5xl xl:text-6xl font-bold text-slate-900 leading-[1.05] tracking-tight">
            Créez votre<br />espace en 1 minute.
          </h1>

          <p className="mt-6 text-lg text-slate-500 max-w-md leading-relaxed">
            Rejoignez votre équipe, organisez vos projets et suivez votre activité au même endroit.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              'Inscription gratuite et immédiate',
              'Vos données protégées à chaque instant',
              'Aucune carte bancaire requise',
            ].map((texte) => (
              <li key={texte} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span className="text-slate-600">{texte}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} — Votre espace de travail
        </p>
      </div>

      {/* ===== Colonne droite : formulaire ===== */}
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-300/40 p-8 sm:p-10">

          {/* En-tête de la carte */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-bold tracking-[0.15em] text-slate-500 uppercase">
                Inscription sécurisée
              </span>
            </div>
            <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>

          <hr className="my-6 border-slate-100" />

          {/* Titre */}
          <p className="text-[11px] font-bold tracking-[0.15em] text-indigo-500 uppercase">
            Première visite
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Créer un compte</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tous les champs sont obligatoires.
          </p>

          {/* Formulaire */}
          <form onSubmit={soumettre} className="mt-8 space-y-4">

            {/* Prénom + Nom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ChampInput
                id="prenom"
                label="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Jean"
                autoComplete="given-name"
                erreur={erreurDe('prenom')}
                disabled={succes}
              />
              <ChampInput
                id="nom"
                label="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                autoComplete="family-name"
                erreur={erreurDe('nom')}
                disabled={succes}
              />
            </div>

            {/* Email */}
            <ChampInput
              id="email"
              label="Adresse e-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              autoComplete="email"
              erreur={erreurDe('email')}
              disabled={succes}
              icone={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
              }
            />

            {/* Poste */}
            <div>
              <label htmlFor="code_poste" className="block text-sm font-semibold text-slate-700 mb-2">
                Poste
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                  </svg>
                </span>
                <select
                  id="code_poste"
                  value={codePoste}
                  onChange={(e) => setCodePoste(e.target.value)}
                  required
                  disabled={chargementPostes || succes}
                  className={`w-full pl-12 pr-10 py-3.5 rounded-xl border bg-slate-50/60
                             text-slate-900 text-sm appearance-none cursor-pointer
                             focus:outline-none focus:ring-4 focus:bg-white
                             transition-all duration-150 disabled:opacity-60
                             ${erreurDe('code_poste')
                               ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
                               : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/15'}`}
                >
                  <option value="">
                    {chargementPostes ? 'Chargement…' : '— Choisir un poste —'}
                  </option>
                  {postes.map((p) => (
                    <option key={p.code_poste} value={p.code_poste}>
                      {p.libelle}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
              {erreurDe('code_poste') && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {erreurDe('code_poste')}
                </p>
              )}
              {!chargementPostes && postes.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  Aucun poste disponible. Contactez un administrateur.
                </p>
              )}
            </div>

            {/* Mot de passe */}
            <ChampInput
              id="password"
              label="Mot de passe"
              type={voirMdp ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
              erreur={erreurDe('password')}
              disabled={succes}
              icone={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              actionDroite={
                <button
                  type="button"
                  onClick={() => setVoirMdp(!voirMdp)}
                  className="text-slate-400 hover:text-slate-600 transition"
                  aria-label={voirMdp ? 'Masquer' : 'Afficher'}
                >
                  {voirMdp ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* Confirmation */}
            <ChampInput
              id="password_confirmation"
              label="Confirmer le mot de passe"
              type={voirMdp ? 'text' : 'password'}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
              erreur={erreurDe('password_confirmation')}
              disabled={succes}
              icone={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              valide={
                passwordConfirmation.length > 0 &&
                password === passwordConfirmation
              }
            />

            {/* Force du mot de passe */}
            {password.length > 0 && !succes && <IndicateurForce password={password} />}

            {/* Erreur globale */}
            {erreur && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p className="text-sm text-red-700">{erreur}</p>
              </div>
            )}

            {/* ✅ Message "En attente de validation" */}
            {succes && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <Clock className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Compte en attente de validation
                  </p>
                  <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    {messageAttente}
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-900 hover:underline"
                  >
                    Retour à la connexion
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={envoi || succes}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-indigo-500 to-violet-600
                         hover:from-indigo-600 hover:to-violet-700
                         active:scale-[0.99]
                         shadow-lg shadow-indigo-500/30
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              {envoi ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Création du compte…
                </>
              ) : succes ? (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Compte créé
                </>
              ) : (
                <>
                  Créer mon compte
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Lien bas de carte */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Champ de saisie réutilisable
   ============================================================ */
function ChampInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  erreur,
  icone,
  actionDroite,
  valide,
  disabled,
}) {
  const bordure = erreur
    ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
    : valide
      ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-500/15'
      : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/15'

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        {icone && (
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            {icone}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          className={`w-full ${icone ? 'pl-12' : 'pl-4'} ${actionDroite ? 'pr-12' : 'pr-4'} py-3.5
                     rounded-xl border bg-slate-50/60 text-slate-900 placeholder-slate-400 text-sm
                     focus:outline-none focus:ring-4 focus:bg-white
                     transition-all duration-150 disabled:opacity-60 ${bordure}`}
        />
        {actionDroite && (
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {actionDroite}
          </span>
        )}
        {valide && !actionDroite && (
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        )}
      </div>
      {erreur && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {erreur}
        </p>
      )}
    </div>
  )
}

/* ============================================================
   Indicateur de force du mot de passe
   ============================================================ */
function IndicateurForce({ password }) {
  const score = calculerScore(password)

  const niveaux = [
    { label: 'Faible', couleur: 'bg-red-500', texte: 'text-red-600' },
    { label: 'Moyen', couleur: 'bg-amber-500', texte: 'text-amber-600' },
    { label: 'Bon', couleur: 'bg-blue-500', texte: 'text-blue-600' },
    { label: 'Excellent', couleur: 'bg-emerald-500', texte: 'text-emerald-600' },
  ]

  const niveau = niveaux[score]

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? niveau.couleur : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${niveau.texte}`}>
        Force : {niveau.label}
      </p>
    </div>
  )
}

function calculerScore(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 3)
}
