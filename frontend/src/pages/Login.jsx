import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../AuthContext'

const AVANTAGES = [
  { icone: MailCheck, texte: 'Adresse e-mail vérifiée par un code' },
  { icone: ShieldCheck, texte: 'Des échanges privés et sécurisés' },
  { icone: UserCheck, texte: 'Compte activé après validation par un administrateur' },
]

// ✅ Nouvelle classe pour le conteneur du champ
const CONTENEUR_CHAMP = 
  'flex h-[52px] w-full items-center gap-3 rounded-xl border bg-white px-4 transition focus-within:bg-white focus-within:ring-4 disabled:opacity-60'

function bordureConteneur(erreur) {
  if (erreur) return 'border-red-300 focus-within:border-red-400 focus-within:ring-red-500/15'
  return 'border-slate-300 focus-within:border-[#16877D] focus-within:ring-[#16877D]/15'
}

export default function Login() {
  const { utilisateur, connexion } = useAuth()
  const navigate = useNavigate()
  const reduit = useReducedMotion()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [typeErreur, setTypeErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [voirMdp, setVoirMdp] = useState(false)

  const inputEmailRef = useRef(null)

  useEffect(() => {
    inputEmailRef.current?.focus()
  }, [])

  if (utilisateur) {
    return <Navigate to="/" replace />
  }

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setTypeErreur('')
    setEnvoi(true)

    try {
      await connexion(email, motDePasse)
      navigate('/', { replace: true })
    } catch (err) {
      const statut = err.response?.status
      const message = err.response?.data?.message

      if (statut === 403 && message?.includes('attente')) {
        setTypeErreur('attente')
        setErreur(
          'Votre compte est en attente de validation par un administrateur. Vous pourrez vous connecter dès qu’il sera activé.'
        )
      } else if (
        statut === 403 &&
        (message?.includes('désactivé') || message?.includes('desactive'))
      ) {
        setTypeErreur('desactive')
        setErreur(
          'Votre compte a été désactivé. Contactez un administrateur pour plus d’informations.'
        )
      } else {
        setTypeErreur('normal')
        setErreur(message || 'Adresse e-mail ou mot de passe incorrect.')
      }
    } finally {
      setEnvoi(false)
    }
  }

  const stylesErreur = {
    attente: {
      conteneur: 'border-amber-200 bg-amber-50',
      icone: 'text-amber-600',
      texte: 'text-amber-800',
    },
    desactive: {
      conteneur: 'border-orange-200 bg-orange-50',
      icone: 'text-orange-600',
      texte: 'text-orange-800',
    },
    normal: {
      conteneur: 'border-red-200 bg-red-50',
      icone: 'text-red-500',
      texte: 'text-red-700',
    },
  }

  const style = stylesErreur[typeErreur] || stylesErreur.normal

  return (
    <div className="flex min-h-screen bg-[#F0F5F2] font-sans lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* ===== Colonne gauche : présentation ===== */}
      <aside className="relative hidden flex-col overflow-hidden px-12 py-10 lg:flex lg:w-5/12 xl:px-16 xl:py-12">
        <div className="relative z-10 my-auto max-w-lg shrink-0">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[#1B4440] xl:text-5xl">
            Bienvenue sur
            <br />
            Fulmar.
          </h1>

          <p className="mt-6 text-base leading-relaxed text-slate-600 xl:text-lg">
            Fulmar est la messagerie interne sécurisée de votre entreprise.
            Conçue pour les équipes modernes, elle vous permet de collaborer,
            partager des fichiers et échanger en toute confidentialité,
            le tout sur une plateforme unique et centralisée.
          </p>

          <ul className="mt-8 space-y-4">
            {AVANTAGES.map(({ icone: Icone, texte }) => (
              <li key={texte} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#C8EAE5]">
                  <Icone className="size-4 text-[#16877D]" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="text-sm text-slate-600 xl:text-base">{texte}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 mt-auto shrink-0 text-xs text-slate-500">
          © {new Date().getFullYear()} — Fulmar
        </p>

        <div className="pointer-events-none absolute -bottom-40 -left-40 size-[500px] rounded-full border border-[#C8EAE5]/70" />
        <div className="pointer-events-none absolute -bottom-60 -left-60 size-[700px] rounded-full border border-[#C8EAE5]/50" />
      </aside>

      {/* ===== Colonne droite : formulaire ===== */}
      <main className="flex w-full p-6 sm:p-10 lg:w-7/12 lg:overflow-y-auto">
        <motion.div
          initial={reduit ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="m-auto w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10 xl:max-w-3xl xl:p-12 2xl:max-w-4xl 2xl:p-14"
        >
          <h2 className="text-3xl font-bold text-[#1B4440] xl:text-4xl">Se connecter</h2>
          <p className="mt-2 text-sm text-slate-600 xl:text-base">
            Entrez vos identifiants pour accéder à votre espace.
          </p>

          <form onSubmit={soumettre} className="mt-8 space-y-5 xl:mt-10 xl:space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-800 xl:mb-2 xl:text-base"
              >
                Adresse e-mail
              </label>
              {/* ✅ L'icône est maintenant en dehors de l'input, dans le conteneur flex */}
              <div className={`${CONTENEUR_CHAMP} ${bordureConteneur(typeErreur === 'normal')}`}>
                <Mail className="size-[18px] shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  ref={inputEmailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between xl:mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-800 xl:text-base"
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-[#16877D] transition hover:text-[#0C6B63]"
                  title="Contactez un administrateur pour réinitialiser votre mot de passe"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* ✅ Même principe pour le mot de passe */}
              <div className={`${CONTENEUR_CHAMP} ${bordureConteneur(typeErreur === 'normal')}`}>
                <Lock className="size-[18px] shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  id="password"
                  type={voirMdp ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setVoirMdp(!voirMdp)}
                  className="shrink-0 text-slate-400 transition hover:text-[#16877D]"
                  aria-label={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {voirMdp ? (
                    <EyeOff className="size-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="size-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {erreur && (
              <div
                role="alert"
                className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${style.conteneur}`}
              >
                {typeErreur === 'attente' ? (
                  <Clock className={`mt-0.5 size-4 shrink-0 ${style.icone}`} aria-hidden="true" />
                ) : (
                  <AlertCircle className={`mt-0.5 size-4 shrink-0 ${style.icone}`} aria-hidden="true" />
                )}
                <div className="flex-1">
                  <p className={style.texte}>{erreur}</p>
                  {typeErreur === 'attente' && (
                    <p className="mt-1 text-xs text-amber-700">
                      Contactez un administrateur pour accélérer la validation.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-sm text-slate-600 sm:text-left">
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#16877D] transition hover:text-[#0C6B63]"
                >
                  Créer un compte
                </Link>
              </p>
              <button
                type="submit"
                disabled={envoi}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16877D] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#16877D]/20 transition hover:bg-[#0C6B63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16877D] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[160px] xl:text-base"
              >
                {envoi ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Connexion…
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
