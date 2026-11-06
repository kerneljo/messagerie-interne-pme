import { useEffect, useId, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
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

/* ---------- Styles ---------- */
const stylesErreur = {
  attente: 'border-amber-200 bg-amber-50 text-amber-900 [&_svg]:text-amber-500',
  desactive: 'border-orange-200 bg-orange-50 text-orange-900 [&_svg]:text-orange-500',
  normal: 'border-red-200 bg-red-50 text-red-900 [&_svg]:text-red-500',
}

const classeChamp = (invalide) =>
  `peer h-15 w-full rounded-full border-2 pl-[52px] text-base text-[#0C2A22] outline-none transition-all duration-200 placeholder:text-[#4F7468] ${
    invalide
      ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10'
      : 'border-[#C3DDD2] bg-[#F4F9F7] hover:border-[#8FC2AE] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#F4F9F7] [&:autofill]:shadow-[inset_0_0_0_1000px_#F4F9F7] focus:border-[#0C7A5A] focus:bg-white focus:ring-4 focus:ring-[#0C7A5A]/10 focus:shadow-md'
  }`

/* ---------- Logo ---------- */
function Logo({ taille = 'grand' }) {
  const grand = taille === 'grand'
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-white shadow-xl shadow-[#0C7A5A]/10 ring-1 ring-[#0C7A5A]/10 ${
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
    <div className="relative flex min-h-dvh overflow-hidden bg-[#F8FBF9] font-sans text-[#0C2A22]">
      
      {/* ===== Panneau gauche (desktop) ===== */}
      <aside className="relative z-10 hidden w-[45%] shrink-0 flex-col overflow-hidden rounded-r-[300px] bg-gradient-to-b from-[#D3EBE1] via-[#E0F0E9] to-[#EDF6F2] px-14 py-12 text-[#0E4F3C] lg:flex">
        
        {/* Effet Mesh Gradient */}
        <div className="absolute -left-20 -top-20 size-[400px] rounded-full bg-white/40 blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute -bottom-20 -right-20 size-[400px] rounded-full bg-[#0C7A5A]/20 blur-3xl pointer-events-none mix-blend-multiply" />
        <div className="absolute top-1/3 -right-10 size-64 rounded-full bg-[#8FC2AE]/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 top-1/4 size-[500px] rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute -left-24 top-1/4 size-[400px] rounded-full border border-white/20 pointer-events-none" />
        
        {/* LOGO EN HAUT À GAUCHE */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo taille="petit" />
          <span className="font-display text-xl font-bold tracking-tight text-[#0E4F3C]">
            Fulmar
          </span>
        </div>

        {/* PRÉSENTATION (remontée pour s'aligner avec le formulaire) */}
        {/* J'ai ajouté un pt-16 (64px) pour caler le titre au même niveau que "Connexion" */}
        <div className="relative z-10 flex flex-1 flex-col pt-20">
          
          {/* Slogan */}
          <div>
            <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-[#0E4F3C] xl:text-5xl">
              La messagerie interne <br />
              <span className="text-[#0C7A5A]">sécurisée de votre équipe.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#2F5C4E]">
              Collaborez, échangez et partagez vos fichiers en toute confidentialité, sur une plateforme unique et centralisée.
            </p>
          </div>

          {/* Avantages clés */}
          <div className="mt-10 space-y-4">
            {AVANTAGES.map(({ icone: Icone, titre, desc }) => (
              <div key={titre} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#0C7A5A]/10">
                  <Icone className="size-5 text-[#0C7A5A]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0E4F3C]">{titre}</p>
                  <p className="text-xs text-[#4F7468]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COPYRIGHT EN BAS */}
        <p className="relative z-10 text-xs font-medium text-[#4F7468]">
          © {new Date().getFullYear()} Fulmar · Tous droits réservés
        </p>
      </aside>

      {/* ===== Colonne formulaire ===== */}
      <main className="relative flex flex-1 flex-col">
        
        {/* En-tête mobile */}
        <header className="relative flex flex-col items-center gap-3 overflow-hidden rounded-bl-[140px] bg-gradient-to-b from-[#D3EBE1] via-[#E0F0E9] to-[#EDF6F2] px-6 pb-12 pt-14 text-center text-[#0E4F3C] lg:hidden">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/40 blur-2xl pointer-events-none" />
          <Logo taille="petit" />
          <p className="font-display text-xl font-bold">Fulmar</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Bon retour</h2>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          
          {/* CARTE FORMULAIRE */}
          <div className="w-full max-w-[580px] rounded-[40px] border border-white/80 bg-white/60 p-10 shadow-[0_8px_32px_rgba(12,122,90,0.04)] backdrop-blur-xl motion-safe:animate-fade-in-up sm:p-14">
            
            <div className="mb-10">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0E4F3C] lg:text-[44px] lg:leading-tight">
                Connexion
              </h1>
              <p className="mt-3 text-[16px] text-[#3C5B50]">
                Connectez-vous à votre compte pour continuer.
              </p>
            </div>

            <form onSubmit={soumettre} noValidate className="space-y-6">
              
              {/* E-mail */}
              <div className="space-y-2">
                <label htmlFor={idEmail} className="block text-sm font-semibold text-[#0C2A22]">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#8FC2AE] transition-colors peer-focus:text-[#0C7A5A]" />
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
                <label htmlFor={idMdp} className="block text-sm font-semibold text-[#0C2A22]">
                  Mot de passe
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#8FC2AE] transition-colors peer-focus:text-[#0C7A5A]" />
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
                    className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-[#4F7468] transition hover:bg-[#0C7A5A]/10 hover:text-[#0C7A5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C7A5A]/40"
                  >
                    {voirMdp ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                  </button>
                </div>
              </div>

              {majActive && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 motion-safe:animate-fade-in-up">
                  <AlertCircleIcon className="size-3.5" />
                  Verr. Maj est activé.
                </p>
              )}

              {/* Se souvenir + mot de passe oublié */}
              <div className="flex items-center justify-between gap-3 pt-2 text-sm">
                <label className="flex min-h-9 cursor-pointer select-none items-center gap-2.5 text-[#2F4A41]">
                  <input
                    type="checkbox"
                    checked={souvenir}
                    onChange={(e) => setSouvenir(e.target.checked)}
                    className="size-[18px] rounded border-[#C3DDD2] text-[#0C7A5A] accent-[#0C7A5A] focus:ring-[#0C7A5A]/40 focus:ring-offset-0"
                  />
                  Se souvenir de moi
                </label>
                <a
                  href="mailto:admin@fulmar.fr"
                  className="rounded font-semibold text-[#0C7A5A] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C7A5A]/40"
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

              {/* Bouton principal */}
              <button
                type="submit"
                disabled={envoi}
                aria-busy={envoi}
                className="group relative flex h-15 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-[#0C7A5A] to-[#0F9B73] px-6 text-[18px] font-semibold text-white shadow-lg shadow-[#0C7A5A]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0C7A5A]/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0C7A5A]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                  <div className="relative h-full w-8 bg-white/20" />
                </div>
                {envoi ? (
                  <><span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" /> Connexion…</>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Lien "Créer un compte" */}
            <div className="mt-10 border-t border-[#0C7A5A]/10 pt-8 text-start">
              <p className="text-[15px] text-[#3C5B50]">
                Pas encore de compte ?{' '}
                <Link to="/register" className="ml-1 rounded font-bold text-[#0C7A5A] underline-offset-4 transition-colors hover:text-[#095F46] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C7A5A]/40">
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