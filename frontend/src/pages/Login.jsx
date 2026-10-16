import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Clock,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  MessageSquare,
} from 'lucide-react'

import { useAuth } from '../AuthContext'
import illustration from '../assets/login.svg'

/* Pictogramme de l'application : utilisé sur mobile */
function Marque({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[#16877D] to-[#0C6B63] shadow-lg shadow-[#16877D]/30 ${className}`}
    >
      <MessageSquare className="h-6 w-6 text-white" aria-hidden="true" />
    </div>
  )
}

export default function Login() {
  const { utilisateur, connexion } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [typeErreur, setTypeErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [voirMdp, setVoirMdp] = useState(false)

  const inputEmailRef = useRef(null)

  // Focus automatique sur le champ email
  useEffect(() => {
    inputEmailRef.current?.focus()
  }, [])

  if (utilisateur) {
    return <Navigate to="/" replace />
  }

  /* Connexion */
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
        setErreur(message || 'Erreur de connexion.')
      }
    } finally {
      setEnvoi(false)
    }
  }

  /* Styles des messages d'erreur */
  const stylesErreur = {
    attente: {
      conteneur: 'bg-amber-50 border-amber-200',
      icone: 'text-amber-600',
      texte: 'text-amber-800',
    },
    desactive: {
      conteneur: 'bg-orange-50 border-orange-200',
      icone: 'text-orange-600',
      texte: 'text-orange-800',
    },
    normal: {
      conteneur: 'bg-red-50 border-red-200',
      icone: 'text-red-500',
      texte: 'text-red-700',
    },
  }

  const style = stylesErreur[typeErreur] || stylesErreur.normal

  return (
    <div className="flex min-h-screen bg-[#F0F5F2] font-sans lg:h-dvh lg:min-h-0 lg:overflow-hidden">

      {/* ==========================================
          COLONNE GAUCHE : TITRE, PRÉSENTATION, ILLUSTRATION
      ========================================== */}
      <div className="relative hidden flex-col overflow-hidden px-12 pt-20 pb-8 lg:flex lg:w-1/2 xl:px-16 xl:pt-28 xl:pb-12">

        {/* Cercles décoratifs — derrière tout le contenu */}
        <div className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#C8EAE5]/40 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full border border-[#C8EAE5]/70" />
        <div className="pointer-events-none absolute -bottom-60 -left-60 h-[700px] w-[700px] rounded-full border border-[#C8EAE5]/50" />

        {/* Grand titre sobre : tout en vert foncé */}
        <div className="relative z-10 shrink-0">
  <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-[#1B4440] xl:text-6xl">
            Bienvenue sur
            <br />
            la messagerie interne.
          </h1>
        </div>

        {/* Présentation à gauche, illustration à droite, sous le titre */}
        <div className="relative z-10 mt-10 flex flex-row-reverse items-center gap-8 xl:mt-12 xl:gap-12">

          {/* Texte de présentation */}
          <div className="min-w-0 flex-1">

            <p className="max-w-sm text-base leading-relaxed text-slate-600">
              Échangez avec vos collègues et partagez vos documents,
              en toute confidentialité.
            </p>

            {/* Avantages de la messagerie */}
            <ul className="mt-8 space-y-4">

              {/* Rapidité des échanges */}
              <li className="flex items-center gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8EAE5]">
                  <Zap
                    className="h-4 w-4 text-[#16877D]"
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm font-medium leading-relaxed text-slate-700">
                  Des échanges simples et rapides
                </span>
              </li>

              {/* Confidentialité */}
              <li className="flex items-center gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8EAE5]">
                  <ShieldCheck
                    className="h-4 w-4 text-[#16877D]"
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm font-medium leading-relaxed text-slate-700">
                  Vos données restent au sein de l’entreprise
                </span>
              </li>

            </ul>

          </div>

          {/* Illustration SVG avec halo derrière */}
          <div className="relative w-[46%] shrink-0">
            {/* Halo doux derrière l'illustration */}
            <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
              <div className="h-4/5 w-4/5 rounded-full bg-gradient-to-br from-[#C8EAE5]/60 via-[#C8EAE5]/30 to-transparent blur-2xl" />
            </div>

            <img
              src={illustration}
              alt=""
              aria-hidden="true"
              draggable="false"
              className="mx-auto h-auto max-h-[50vh] w-full select-none object-contain"
            />
          </div>

        </div>

        {/* Pied de page */}
        <p className="relative z-10 mt-16 text-xs text-slate-500 xl:mt-20">
          © {new Date().getFullYear()} — Messagerie interne
        </p>

      </div>

      {/* ==========================================
          COLONNE DROITE : FORMULAIRE DE CONNEXION
      ========================================== */}
      <div className="flex w-full p-6 pt-20 sm:p-10 sm:pt-20 lg:w-1/2 lg:overflow-y-auto lg:pt-28">

        <div className="mx-auto w-full max-w-md self-start rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/50 sm:p-10">

          {/* Logo et nom de l'application sur mobile uniquement */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Marque className="h-10 w-10" />
            <span className="font-display text-lg font-bold text-[#1B4440]">
              Messagerie interne
            </span>
          </div>

          {/* En-tête du formulaire */}
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#16877D]">
            Ravie de vous revoir
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1B4440]">
            Se connecter
          </h2>

          {/* Sous-titre : plus grand et plus contrasté */}
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Entrez votre adresse e-mail et votre mot de passe pour continuer.
          </p>

          {/* Formulaire */}
          <form onSubmit={soumettre} className="mt-8 space-y-5">

            {/* Adresse e-mail */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Adresse e-mail
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </span>

                <input
                  ref={inputEmailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="nom.prenom@entreprise.local"
                  className="w-full rounded-xl border border-[#E8D9C7] bg-[#FCFBF8] py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-[#16877D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#16877D]/15"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              {/* Label et "Mot de passe oublié ?" sur la même ligne */}
              <div className="mb-2 flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700"
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

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </span>

                <input
                  id="password"
                  type={voirMdp ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  className="w-full rounded-xl border border-[#E8D9C7] bg-[#FCFBF8] py-3 pl-11 pr-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-[#16877D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#16877D]/15"
                />

                {/* Afficher ou masquer le mot de passe */}
                <button
                  type="button"
                  onClick={() => setVoirMdp(!voirMdp)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition hover:text-[#16877D]"
                  aria-label={
                    voirMdp
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                >
                  {voirMdp ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Affichage des erreurs */}
            {erreur && (
              <div
                role="alert"
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${style.conteneur}`}
              >
                {typeErreur === 'attente' ? (
                  <Clock className={`mt-0.5 h-5 w-5 shrink-0 ${style.icone}`} aria-hidden="true" />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${style.icone}`} aria-hidden="true" />
                )}

                <div className="flex-1">
                  <p className={`text-sm ${style.texte}`}>{erreur}</p>

                  {typeErreur === 'attente' && (
                    <p className="mt-1 text-xs text-amber-700">
                      💡 Astuce : contactez un administrateur pour accélérer la validation.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={envoi}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E95420] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#E95420]/20 transition-all hover:bg-[#CF4518] focus:outline-none focus:ring-2 focus:ring-[#E95420] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {envoi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Connexion…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>

          </form>

          {/* Lien vers la création de compte */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#16877D] transition hover:text-[#0C6B63]"
            >
              Créer un compte
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
