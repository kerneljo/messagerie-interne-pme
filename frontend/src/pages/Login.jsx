import { useEffect, useId, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import {
  AlertCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  MailCheckIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from '../components/icons'

/* ---------- Mémorisation de l'e-mail (UI uniquement) ---------- */
const CLE_EMAIL = 'fulmar:dernier-email'

function lireEmailMemorise() {
  try { return localStorage.getItem(CLE_EMAIL) || '' } catch { return '' }
}

function ecrireEmailMemorise(valeur) {
  try {
    if (valeur) localStorage.setItem(CLE_EMAIL, valeur)
    else localStorage.removeItem(CLE_EMAIL)
  } catch {}
}

/* ---------- Styles ----------
   Les couleurs passent par les tokens du CSS (slate, blue, action, creme,
   papier) : elles changent automatiquement selon [data-theme].
   Les variantes dark: ne servent que pour le mode sombre ; le mode clair
   n'est pas modifié. */
const stylesErreur = {
  attente:
    'border-amber-200 bg-amber-50 text-amber-900 [&_svg]:text-amber-500 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:[&_svg]:text-amber-300',
  desactive:
    'border-orange-200 bg-orange-50 text-orange-900 [&_svg]:text-orange-500 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200 dark:[&_svg]:text-orange-300',
  normal:
    'border-red-200 bg-red-50 text-red-900 [&_svg]:text-red-500 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200 dark:[&_svg]:text-red-300',
}

const classeChamp = (invalide) =>
  `h-15 w-full rounded-full border-2 pl-[52px] text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 ${
    invalide
      ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:bg-papier focus:ring-4 focus:ring-red-500/10 dark:border-red-400/50 dark:bg-red-400/10'
      : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-action-600 focus:bg-papier focus:ring-4 focus:ring-action-600/15 focus:shadow-md dark:border-slate-300 dark:hover:border-slate-400'
  }`

/* Icône dans un champ : devient bleue quand le champ a le focus */
const classeIconeChamp =
  'pointer-events-none absolute left-6 top-1/2 size-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/champ:text-blue-600'

/* Fond du panneau (desktop) et de l'en-tête (mobile).
   Clair  : inchangé (bleu pâle).
   Sombre : gris-bleu à peine plus clair que la page, sans bleu saturé. */
const degradeHero =
  'bg-gradient-to-b from-blue-100 via-blue-50 to-creme dark:from-papier dark:via-creme dark:to-creme'

/* ---------- Logo ---------- */
function Logo({ taille = 'grand' }) {
  const grand = taille === 'grand'
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-white shadow-xl shadow-action-600/10 ring-1 ring-action-600/15 ${
        grand ? 'size-[96px] p-4' : 'size-12 p-2'
      }`}
    >
      <img src="/assets/fulmar-logo.png" alt="Fulmar" className="size-full object-contain" />
    </span>
  )
}

/* ---------- Avantages clés ---------- */
const AVANTAGES = [
  { icone: MailCheckIcon, titre: 'E-mail vérifié', desc: 'Chaque compte est validé par un code.' },
  { icone: ShieldCheckIcon, titre: '100% sécurisé', desc: 'Échanges chiffrés de bout en bout.' },
  { icone: UserCheckIcon, titre: 'Contrôlé par admin', desc: 'Activation manuelle pour plus de sûreté.' },
]

export default function Login() {
  const { utilisateur, connexion } = useAuth()
  const navigate = useNavigate()

  const idEmail = useId()
  const idMdp = useId()
  const idErreur = useId()

  const emailMemorise = lireEmailMemorise()
  const [email, setEmail] = useState(emailMemorise)
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [typeErreur, setTypeErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [voirMdp, setVoirMdp] = useState(false)
  const [souvenir, setSouvenir] = useState(Boolean(emailMemorise))
  const [majActive, setMajActive] = useState(false)
  const detecterMaj = (e) => setMajActive(e.getModifierState?.('CapsLock') ?? false)

  const inputEmailRef = useRef(null)
  const inputMdpRef = useRef(null)

  useEffect(() => {
    ;(emailMemorise ? inputMdpRef : inputEmailRef).current?.focus()
  }, [])

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setTypeErreur('')
    setEnvoi(true)

    try {
      await connexion(email, motDePasse)
      ecrireEmailMemorise(souvenir ? email : '')
      navigate('/', { replace: true })
    } catch (err) {
      const statut = err.response?.status
      const message = err.response?.data?.message

      if (statut === 403 && message?.includes('attente')) {
        setTypeErreur('attente')
        setErreur('Votre compte est en attente de validation par un administrateur.')
      } else if (statut === 403 && (message?.includes('désactivé') || message?.includes('desactive'))) {
        setTypeErreur('desactive')
        setErreur('Votre compte a été désactivé. Contactez un administrateur.')
      } else {
        setTypeErreur('normal')
        setErreur(message || 'Adresse e-mail ou mot de passe incorrect.')
        inputMdpRef.current?.focus()
      }
    } finally {
      setEnvoi(false)
    }
  }

  const champInvalide = typeErreur === 'normal'

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-creme font-sans text-slate-900">

      {/* ===== Panneau gauche (desktop) ===== */}
      <aside
        className={`relative z-10 hidden w-[45%] shrink-0 flex-col overflow-hidden rounded-r-[300px] px-14 py-12 text-slate-800 lg:flex ${degradeHero}`}
      >
        {/* Effet Mesh Gradient (en sombre : une seule lueur discrète) */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-[400px] rounded-full bg-white/40 blur-3xl mix-blend-overlay dark:bg-action-600/10 dark:mix-blend-normal" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 size-[400px] rounded-full bg-action-600/20 blur-3xl mix-blend-multiply dark:hidden" />
        <div className="pointer-events-none absolute -right-10 top-1/3 size-64 rounded-full bg-blue-300/30 blur-3xl dark:hidden" />
        <div className="pointer-events-none absolute -left-32 top-1/4 size-[500px] rounded-full border border-white/20 dark:border-white/5" />
        <div className="pointer-events-none absolute -left-24 top-1/4 size-[400px] rounded-full border border-white/20 dark:border-white/5" />

        {/* LOGO EN HAUT À GAUCHE */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo taille="petit" />
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">
            Fulmar
          </span>
        </div>

        {/* PRÉSENTATION */}
        <div className="relative z-10 flex flex-1 flex-col pt-20">

          {/* Slogan */}
          <div>
            <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 xl:text-5xl dark:text-slate-800">
              La messagerie interne <br />
              <span className="text-blue-600">sécurisée de votre équipe.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Collaborez, échangez et partagez vos fichiers en toute confidentialité, sur une plateforme unique et centralisée.
            </p>
          </div>

          {/* Avantages clés */}
          <div className="mt-10 space-y-4">
            {AVANTAGES.map(({ icone: Icone, titre, desc }) => (
              <div key={titre} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-papier shadow-sm ring-1 ring-action-600/15">
                  <Icone className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{titre}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COPYRIGHT EN BAS */}
        <p className="relative z-10 text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} Fulmar · Tous droits réservés
        </p>
      </aside>

      {/* ===== Colonne formulaire ===== */}
      <main className="relative flex flex-1 flex-col">

        {/* Bouton mode clair / sombre */}
        <ThemeToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />

        {/* En-tête mobile */}
        <header
          className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-bl-[140px] px-6 pb-12 pt-14 text-center text-slate-900 lg:hidden ${degradeHero}`}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/40 blur-2xl dark:hidden" />
          <Logo taille="petit" />
          <p className="font-display text-xl font-bold">Fulmar</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Bon retour</h2>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

          {/* CARTE FORMULAIRE
              Clair  : verre dépoli translucide (inchangé).
              Sombre : opaque, bordure nette et ombre noire pour ressortir. */}
          <div className="w-full max-w-[580px] rounded-[40px] border border-white/80 bg-papier/70 p-10 shadow-[0_8px_32px_rgba(59,91,219,0.06)] backdrop-blur-xl motion-safe:animate-fade-in-up dark:border-white/15 dark:bg-papier dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] sm:p-14">

            <div className="mb-10">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 lg:text-[44px] lg:leading-tight">
                Connexion
              </h1>
              <p className="mt-3 text-[16px] text-slate-600">
                Connectez-vous à votre compte pour continuer.
              </p>
            </div>

            <form onSubmit={soumettre} noValidate className="space-y-6">

              {/* E-mail */}
              <div className="space-y-2">
                <label htmlFor={idEmail} className="block text-sm font-semibold text-slate-900">
                  Adresse e-mail
                </label>
                <div className="group/champ relative">
                  <MailIcon className={classeIconeChamp} />
                  <input
                    ref={inputEmailRef}
                    id={idEmail}
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="prenom.nom@entreprise.fr"
                    aria-invalid={champInvalide || undefined}
                    aria-describedby={erreur ? idErreur : undefined}
                    className={`${classeChamp(champInvalide)} pr-6`}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <label htmlFor={idMdp} className="block text-sm font-semibold text-slate-900">
                  Mot de passe
                </label>
                <div className="group/champ relative">
                  <LockIcon className={classeIconeChamp} />
                  <input
                    ref={inputMdpRef}
                    id={idMdp}
                    type={voirMdp ? 'text' : 'password'}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                    autoComplete="current-password"
                    onKeyDown={detecterMaj}
                    onKeyUp={detecterMaj}
                    onBlur={() => setMajActive(false)}
                    placeholder="Votre mot de passe"
                    aria-invalid={champInvalide || undefined}
                    aria-describedby={erreur ? idErreur : undefined}
                    className={`${classeChamp(champInvalide)} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMdp((v) => !v)}
                    aria-label={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={voirMdp}
                    className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-action-600/10 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600/40"
                  >
                    {voirMdp ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                  </button>
                </div>
              </div>

              {majActive && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 motion-safe:animate-fade-in-up dark:text-amber-300">
                  <AlertCircleIcon className="size-3.5" />
                  Verr. Maj est activé.
                </p>
              )}

              {/* Se souvenir + mot de passe oublié */}
              <div className="flex items-center justify-between gap-3 pt-2 text-sm">
                <label className="flex min-h-9 cursor-pointer select-none items-center gap-2.5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={souvenir}
                    onChange={(e) => setSouvenir(e.target.checked)}
                    className="size-[18px] rounded border-slate-300 accent-action-600 focus:ring-action-600/40 focus:ring-offset-0"
                  />
                  Se souvenir de moi
                </label>
                <a
                  href="mailto:admin@fulmar.fr"
                  className="rounded font-semibold text-blue-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600/40"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Erreur */}
              <div id={idErreur} role="alert" aria-live="assertive">
                {erreur && (
                  <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-sm motion-safe:animate-fade-in-up ${stylesErreur[typeErreur] || stylesErreur.normal}`}>
                    {typeErreur === 'attente' ? <ClockIcon className="mt-0.5 size-4 shrink-0" /> : <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />}
                    <p className="font-medium">{erreur}</p>
                  </div>
                )}
              </div>

              {/* Bouton principal : plus d'effet de lumière ni de lueur au survol.
                  Texte blanc sur action-700 → action-600 pour le contraste. */}
              <button
                type="submit"
                disabled={envoi}
                aria-busy={envoi}
                className="flex h-15 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-action-700 to-action-600 px-6 text-[18px] font-semibold text-white shadow-lg shadow-action-600/25 transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {envoi ? (
                  <><span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" /> Connexion…</>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Lien "Créer un compte" */}
            <div className="mt-10 border-t border-slate-200 pt-8 text-start">
              <p className="text-[15px] text-slate-600">
                Pas encore de compte ?{' '}
                <Link to="/register" className="ml-1 rounded font-bold text-blue-600 underline-offset-4 transition-colors hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600/40">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}