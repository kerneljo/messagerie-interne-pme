import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Register() {
  const { utilisateur, inscription } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [voirMdp, setVoirMdp] = useState(false)

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')

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
      await inscription(name, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      // Laravel renvoie { message, errors: { email: [...] } }
      const data = err.response?.data
      const premiereErreur =
        data?.errors && Object.values(data.errors)[0]?.[0]
      setErreur(premiereErreur || data?.message || 'Erreur lors de l’inscription.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f5f7fb] font-sans">

      {/* ===== Colonne gauche ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>

          <p className="mt-10 text-xs font-bold tracking-[0.2em] text-indigo-500 uppercase">
            Nouveau ici ?
          </p>

          <h1 className="mt-4 text-5xl xl:text-6xl font-bold text-slate-900 leading-[1.05] tracking-tight">
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

        <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full border border-indigo-100/70"></div>
        <div className="pointer-events-none absolute -bottom-60 -left-60 w-[700px] h-[700px] rounded-full border border-indigo-100/50"></div>
      </div>

      {/* ===== Colonne droite ===== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 sm:p-10">

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

          <p className="text-[11px] font-bold tracking-[0.15em] text-indigo-500 uppercase">
            Première visite
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Créer un compte</h2>
          <p className="mt-2 text-sm text-slate-500">
            Remplissez les informations ci-dessous pour commencer.
          </p>

          <form onSubmit={soumettre} className="mt-8 space-y-4">

            {/* Nom */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Jean Dupont"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50
                             text-slate-900 placeholder-slate-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white
                             transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Adresse e-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="vous@exemple.fr"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50
                             text-slate-900 placeholder-slate-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white
                             transition"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={voirMdp ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50
                             text-slate-900 placeholder-slate-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white
                             transition"
                />
                <button
                  type="button"
                  onClick={() => setVoirMdp(!voirMdp)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
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
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-semibold text-slate-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  id="password_confirmation"
                  type={voirMdp ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Répétez le mot de passe"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50
                             text-slate-900 placeholder-slate-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white
                             transition"
                />
              </div>
            </div>

            {/* Erreur */}
            {erreur && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p className="text-sm text-red-700">{erreur}</p>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={envoi}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-indigo-500 to-violet-600
                         hover:from-indigo-600 hover:to-violet-700
                         shadow-lg shadow-indigo-500/30
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all"
            >
              {envoi ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Création...
                </>
              ) : (
                <>
                  Créer mon compte
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
