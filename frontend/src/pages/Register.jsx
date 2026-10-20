import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertCircle, ArrowLeft, ArrowRight, Briefcase, Check, CheckCircle2, ChevronDown,
  Circle, Clock, Eye, EyeOff, Lock, Mail, MailCheck, ShieldCheck, User, UserCheck,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import api from '../api'

const LONGUEUR_CODE = 6
const DELAI_RENVOI = 30
const MIN_MDP = 10
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const AVANTAGES = [
  { icone: MailCheck, texte: 'Adresse e-mail vérifiée par un code' },
  { icone: ShieldCheck, texte: 'Des échanges privés et sécurisés' },
  { icone: UserCheck, texte: 'Compte activé après validation par un administrateur' },
]

/* Contrôles faits dans le navigateur : ils améliorent l'expérience, le serveur revérifie tout */
function validerChamps({ prenom, nom, email, codePoste, password, passwordConfirmation }) {
  const e = {}
  if (prenom.trim().length < 2) e.prenom = 'Saisissez votre prénom.'
  if (nom.trim().length < 2) e.nom = 'Saisissez votre nom.'
  if (!REGEX_EMAIL.test(email.trim())) e.email = 'Saisissez une adresse e-mail valide.'
  if (!codePoste) e.code_poste = 'Choisissez votre poste.'
  if (!(password.length >= MIN_MDP && /[A-Za-z]/.test(password) && /\d/.test(password))) {
    e.password = `Au moins ${MIN_MDP} caractères, avec des lettres et des chiffres.`
  }
  if (passwordConfirmation === '') e.password_confirmation = 'Confirmez votre mot de passe.'
  else if (passwordConfirmation !== password) e.password_confirmation = 'Les mots de passe ne correspondent pas.'
  return e
}

/* Indicateur de robustesse */
function forceMotDePasse(mdp) {
  if (!mdp) return { score: 0, libelle: '' }
  const minimumOk = mdp.length >= MIN_MDP && /[A-Za-z]/.test(mdp) && /\d/.test(mdp)
  if (!minimumOk) return { score: 1, libelle: 'Faible' }
  let score = 2
  if (mdp.length >= 14) score++
  if (/[^A-Za-z0-9]/.test(mdp) || (/[a-z]/.test(mdp) && /[A-Z]/.test(mdp))) score++
  return { score, libelle: ['', '', 'Correct', 'Bon', 'Excellent'][score] }
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Register() {
  const { utilisateur } = useAuth()
  const reduit = useReducedMotion()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [codePoste, setCodePoste] = useState('')
  const [postes, setPostes] = useState([])
  const [chargementPostes, setChargementPostes] = useState(true)

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [voirMdp, setVoirMdp] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const [touche, setTouche] = useState({})
  const [tentative, setTentative] = useState(false)

  const [etape, setEtape] = useState('formulaire')
  const [sens, setSens] = useState(1)
  const [codeOtp, setCodeOtp] = useState('')
  const [cleSaisie, setCleSaisie] = useState(0)
  const [secousse, setSecousse] = useState(false)
  const [attente, setAttente] = useState(0)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [erreursChamps, setErreursChamps] = useState({})
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    api
      .get('/api/postes')
      .then((r) => setPostes(r.data))
      .catch(() => setPostes([]))
      .finally(() => setChargementPostes(false))
  }, [])

  useEffect(() => {
    if (attente <= 0) return
    const minuteur = setTimeout(() => setAttente((s) => s - 1), 1000)
    return () => clearTimeout(minuteur)
  }, [attente])

  useEffect(() => {
    if (etape === 'otp' && codeOtp.length === LONGUEUR_CODE) verifier()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeOtp, etape])

  if (utilisateur) return <Navigate to="/" replace />

  const regles = [
    { ok: password.length >= MIN_MDP, texte: `${MIN_MDP} caractères minimum` },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), texte: 'Des lettres et des chiffres' },
  ]

  const erreursLocales = validerChamps({ prenom, nom, email, codePoste, password, passwordConfirmation })
  const erreurDe = (champ) =>
    erreursChamps[champ]?.[0] ?? ((touche[champ] || tentative) ? erreursLocales[champ] : undefined)
  const marquer = (champ) => setTouche((t) => ({ ...t, [champ]: true }))

  function modifier(champ, setter) {
    return (e) => {
      setter(e.target.value)
      if (erreursChamps[champ]) {
        setErreursChamps((actuelles) => {
          const reste = { ...actuelles }
          delete reste[champ]
          return reste
        })
      }
    }
  }

  const majCaps = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)

  async function envoyerCode() {
    await api.post('/api/inscription/envoyer-code', {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim(),
      code_poste: codePoste,
      password,
      password_confirmation: passwordConfirmation,
    })
  }

  async function demanderCode(e) {
    e.preventDefault()
    setErreur('')
    setInfo('')
    setErreursChamps({})
    setTentative(true)

    const premierChampInvalide = Object.keys(erreursLocales)[0]
    if (premierChampInvalide) {
      document.getElementById(premierChampInvalide)?.focus()
      return
    }

    // 1. Transition immédiate vers l'OTP (Optimistic UI)
    setCodeOtp('')
    setSecousse(false)
    setAttente(DELAI_RENVOI)
    setSens(1)
    setEtape('otp')
    setEnvoi(true)

    // 2. Envoi au serveur en arrière-plan
    try {
      await envoyerCode()
    } catch (err) {
      // 3. En cas d'erreur, retour au formulaire
      const data = err.response?.data
      setSens(-1)
      setEtape('formulaire')
      
      if (data?.errors) {
        setErreursChamps(data.errors)
        document.getElementById(Object.keys(data.errors)[0])?.focus()
      } else {
        setErreur(data?.message || 'Impossible d’envoyer le code. Réessayez.')
      }
    } finally {
      setEnvoi(false)
    }
  }

  async function verifier() {
    if (codeOtp.length !== LONGUEUR_CODE || envoi) return
    setErreur('')
    setInfo('')
    setEnvoi(true)
    try {
      await api.post('/api/inscription/verifier-code', { email: email.trim(), code: codeOtp })
      setSens(1)
      setEtape('succes')
    } catch (err) {
      setErreur(err.response?.data?.message || 'Code invalide ou expiré.')
      setCodeOtp('')
      setCleSaisie((k) => k + 1)
      setSecousse(true)
    } finally {
      setEnvoi(false)
    }
  }

  function verifierCode(e) {
    e.preventDefault()
    verifier()
  }

  function changerCode(valeur) {
    setCodeOtp(valeur)
    setSecousse(false)
    if (erreur) setErreur('')
  }

  async function renvoyerCode() {
    setErreur('')
    setInfo('')
    setEnvoi(true)
    try {
      await envoyerCode()
      setCodeOtp('')
      setCleSaisie((k) => k + 1)
      setSecousse(false)
      setAttente(DELAI_RENVOI)
      setInfo('Un nouveau code vient d’être envoyé.')
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de renvoyer le code.')
    } finally {
      setEnvoi(false)
    }
  }

  function modifierEmail() {
    setSens(-1)
    setEtape('formulaire')
    setErreur('')
    setInfo('')
    setCodeOtp('')
  }

  const variantes = {
    entree: (s) => ({ opacity: 0, x: reduit ? 0 : 28 * s }),
    centre: { opacity: 1, x: 0 },
    sortie: (s) => ({ opacity: 0, x: reduit ? 0 : -28 * s }),
  }
  const transitionEtape = { duration: reduit ? 0 : 0.25, ease: 'easeOut' }

  return (
    <div className="flex min-h-screen bg-[#F0F5F2] font-sans lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      
      {/* ===== Colonne gauche : présentation ===== */}
      <aside className="relative hidden flex-col overflow-hidden px-12 py-10 lg:flex lg:w-5/12 xl:px-16 xl:py-12">
        <div className="relative z-10 shrink-0 my-auto max-w-lg">
          
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[#1B4440] xl:text-5xl">
            Rejoignez votre<br />équipe sur Fulmar.
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

        <p className="relative z-10 shrink-0 text-xs text-slate-500 mt-auto">© {new Date().getFullYear()} — Fulmar</p>

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
          <Progression etape={etape} />

          <AnimatePresence mode="wait" initial={false} custom={sens}>
            {/* ============ ÉTAPE 1 : FORMULAIRE ============ */}
            {etape === 'formulaire' && (
              <motion.div
                key="formulaire"
                custom={sens}
                variants={variantes}
                initial="entree"
                animate="centre"
                exit="sortie"
                transition={transitionEtape}
              >
                <h2 className="text-3xl font-bold text-[#1B4440] xl:text-4xl">Créer un compte</h2>
                <p className="mt-2 text-sm text-slate-600 xl:text-base">
                  Renseignez vos informations professionnelles. Tous les champs sont obligatoires.
                </p>

                <form onSubmit={demanderCode} noValidate className="mt-8 space-y-5 xl:mt-10 xl:space-y-6">
                  <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 xl:gap-6">
                    <Champ
                      id="prenom" label="Prénom" icone={User} value={prenom}
                      onChange={modifier('prenom', setPrenom)} onBlur={() => marquer('prenom')}
                      placeholder="Jean" autoComplete="given-name" autoFocus
                      erreur={erreurDe('prenom')} valide={!erreursLocales.prenom && !erreurDe('prenom') && prenom !== ''}
                      disabled={envoi}
                    />
                    <Champ
                      id="nom" label="Nom" icone={User} value={nom}
                      onChange={modifier('nom', setNom)} onBlur={() => marquer('nom')}
                      placeholder="Dupont" autoComplete="family-name"
                      erreur={erreurDe('nom')} valide={!erreursLocales.nom && !erreurDe('nom') && nom !== ''}
                      disabled={envoi}
                    />

                    <Champ
                      id="email" label="Adresse e-mail" type="email" icone={Mail} value={email}
                      onChange={modifier('email', setEmail)} onBlur={() => marquer('email')}
                      placeholder="prenom.nom@entreprise.fr" autoComplete="email"
                      erreur={erreurDe('email')} valide={!erreursLocales.email && !erreurDe('email') && email !== ''}
                      disabled={envoi}
                    />

                    <div>
                      <label htmlFor="code_poste" className="mb-1.5 block text-sm font-medium text-slate-800 xl:mb-2 xl:text-base">
                        Poste
                      </label>
                      <div className="group relative">
                        <Briefcase
                          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#16877D]"
                          aria-hidden="true"
                        />
                        <select
                          id="code_poste" value={codePoste}
                          onChange={modifier('code_poste', setCodePoste)} onBlur={() => marquer('code_poste')}
                          required disabled={chargementPostes || envoi}
                          aria-invalid={!!erreurDe('code_poste')}
                          aria-describedby={erreurDe('code_poste') ? 'code_poste-erreur' : undefined}
                          className={`h-[52px] w-full appearance-none rounded-xl border bg-[#FCFBF8] py-3 pl-11 pr-10 text-sm transition focus:bg-white focus:outline-none focus:ring-4 disabled:opacity-60 xl:text-base ${bordureChamp(erreurDe('code_poste'))} ${codePoste ? 'text-slate-900' : 'text-slate-500'}`}
                        >
                          <option value="">{chargementPostes ? 'Chargement…' : 'Choisir un poste'}</option>
                          {postes.map((p) => (
                            <option key={p.code_poste} value={p.code_poste} className="text-slate-900">{p.libelle}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      </div>
                      {erreurDe('code_poste') && (
                        <p id="code_poste-erreur" className="mt-1.5 text-xs text-red-600">{erreurDe('code_poste')}</p>
                      )}
                    </div>

                    <div>
                      <Champ
                        id="password" label="Mot de passe" type={voirMdp ? 'text' : 'password'} icone={Lock}
                        value={password} onChange={modifier('password', setPassword)}
                        onBlur={() => { marquer('password'); setCapsLock(false) }}
                        onKeyDown={majCaps} onKeyUp={majCaps}
                        placeholder="Votre mot de passe" autoComplete="new-password"
                        erreur={erreurDe('password')} disabled={envoi}
                        droite={
                          <button
                            type="button" onClick={() => setVoirMdp((v) => !v)} aria-pressed={voirMdp}
                            aria-label={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            className="rounded-md p-1 text-slate-400 transition hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-[#16877D]"
                          >
                            {voirMdp ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                          </button>
                        }
                      />
                      {capsLock && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700" role="status">
                          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                          Verrouillage majuscules activé
                        </p>
                      )}
                      <IndiceMotDePasse regles={regles} mdp={password} />
                    </div>

                    <Champ
                      id="password_confirmation" label="Confirmer le mot de passe"
                      type={voirMdp ? 'text' : 'password'} icone={Lock}
                      value={passwordConfirmation}
                      onChange={modifier('password_confirmation', setPasswordConfirmation)}
                      onBlur={() => marquer('password_confirmation')}
                      placeholder="Répétez votre mot de passe" autoComplete="new-password"
                      erreur={erreurDe('password_confirmation')} disabled={envoi}
                      valide={passwordConfirmation.length > 0 && password === passwordConfirmation}
                    />
                  </div>

                  {erreur && <Alerte>{erreur}</Alerte>}

                  <div className="flex flex-col-reverse gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-center text-sm text-slate-600 sm:text-left">
                      Déjà un compte ?{' '}
                      <Link to="/login" className="font-semibold text-[#16877D] transition hover:text-[#0C6B63]">
                        Se connecter
                      </Link>
                    </p>
                    <BoutonPrincipal type="submit" disabled={envoi} className="w-full sm:w-auto sm:min-w-[160px]">
                      Continuer
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </BoutonPrincipal>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ============ ÉTAPE 2 : CODE DE VÉRIFICATION ============ */}
            {etape === 'otp' && (
              <motion.div
                key="otp"
                custom={sens}
                variants={variantes}
                initial="entree"
                animate="centre"
                exit="sortie"
                transition={transitionEtape}
              >
                <h2 className="text-3xl font-bold text-[#1B4440]">Vérifiez votre e-mail</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Nous avons envoyé un code à 6 chiffres à{' '}
                  <strong className="font-semibold text-slate-900">{email.trim()}</strong>.
                </p>

                <form onSubmit={verifierCode} noValidate className="mt-8 space-y-5 xl:mt-10 xl:space-y-6">
                  <div>
                    <p id="libelle-code" className="mb-3 text-center text-sm font-semibold text-slate-700">
                      Code de vérification
                    </p>
                    <motion.div
                      key={cleSaisie}
                      animate={secousse && !reduit ? { x: [0, -9, 9, -7, 7, 0] } : { x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <SaisieCode valeur={codeOtp} onChange={changerCode} disabled={envoi} erreur={!!erreur} />
                    </motion.div>
                    <p className="mt-3 text-center text-xs text-slate-500">
                      La vérification démarre dès que les 6 chiffres sont saisis. Vous pouvez aussi coller le code.
                    </p>
                  </div>

                  {info && <Alerte type="info">{info}</Alerte>}
                  {erreur && <Alerte>{erreur}</Alerte>}

                                   {/* Indicateur visuel uniquement, pas de bouton */}
                                    <div className="h-8"></div>
                </form>

                <div className="mt-6 flex flex-col items-center gap-3 text-sm">
                  <p className="text-slate-600">
                    Vous n’avez rien reçu ?{' '}
                    {attente > 0 ? (
                      <span className="tabular-nums text-slate-500">Renvoyer dans {mmss(attente)}</span>
                    ) : (
                      <button
                        type="button" onClick={renvoyerCode} disabled={envoi}
                        className="font-semibold text-[#16877D] transition hover:text-[#0C6B63] disabled:opacity-60"
                      >
                        Renvoyer le code
                      </button>
                    )}
                  </p>
                  <button
                    type="button" onClick={modifierEmail}
                    className="flex items-center gap-1.5 text-slate-600 transition hover:text-slate-900"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Modifier mes informations
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============ ÉTAPE 3 : SUCCÈS ============ */}
            {etape === 'succes' && (
              <motion.div
                key="succes"
                custom={sens}
                variants={variantes}
                initial="entree"
                animate="centre"
                exit="sortie"
                transition={transitionEtape}
                className="text-center"
              >
                <div className="mx-auto flex size-16 items-center justify-center">
                  <CocheAnimee reduit={!!reduit} />
                </div>
                <h2 className="mt-6 text-3xl font-bold text-[#1B4440]">Compte créé</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  Votre adresse e-mail est confirmée. Il reste une étape : un administrateur doit activer votre compte.
                </p>

                <ol className="mx-auto mt-8 max-w-sm text-left" aria-label="Avancement de votre inscription">
                  <EtapeSuite etat="fait" titre="Adresse e-mail confirmée" detail={email.trim()} />
                  <EtapeSuite
                    etat="encours" titre="Validation par un administrateur"
                    detail="Votre demande est en attente."
                  />
                  <EtapeSuite
                    etat="attente" titre="Accès à la messagerie"
                    detail="Vous pourrez vous connecter dès l’activation." dernier
                  />
                </ol>

                <Link
                  to="/login"
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16877D] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#0C6B63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16877D] sm:w-auto sm:min-w-56"
                >
                  Retour à la connexion
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
}

/* ============================================================
   Composants
   ============================================================ */
const CLASSE_CHAMP =
  'h-[52px] w-full rounded-xl border bg-[#FCFBF8] py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:bg-white focus:outline-none focus:ring-4 disabled:opacity-60 xl:text-base'

function bordureChamp(erreur, valide) {
  if (erreur) return 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
  if (valide) return 'border-[#16877D]/50 focus:border-[#16877D] focus:ring-[#16877D]/15'
  return 'border-[#E8D9C7] focus:border-[#16877D] focus:ring-[#16877D]/15'
}

function Champ({ id, label, icone: Icone, droite, erreur, valide, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800 xl:mb-2 xl:text-base">{label}</label>
      <div className="group relative">
        {Icone && (
          <Icone
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#16877D]"
            aria-hidden="true"
          />
        )}
        <input
          id={id} required aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-erreur` : undefined}
          className={`${CLASSE_CHAMP} ${Icone ? 'pl-11' : 'pl-4'} ${droite || valide ? 'pr-11' : 'pr-4'} ${bordureChamp(erreur, valide)}`}
          {...props}
        />
        {droite && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{droite}</div>}
        {valide && !droite && !erreur && (
          <Check className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#16877D]" aria-hidden="true" />
        )}
      </div>
      {erreur && <p id={`${id}-erreur`} className="mt-1.5 text-xs text-red-600">{erreur}</p>}
    </div>
  )
}

const TITRES_ETAPES = { formulaire: 'Vos informations', otp: 'Vérification' }

function Progression({ etape }) {
  if (etape === 'succes') return null
  const numero = etape === 'formulaire' ? 1 : 2
  return (
    <div className="mb-8" role="group" aria-label={`Étape ${numero} sur 2`}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-600">
        Étape {numero} sur 2 · {TITRES_ETAPES[etape]}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2].map((i) => (
          <span key={i} className="relative h-1 flex-1 overflow-hidden rounded-full bg-[#E8D9C7]">
            <motion.span
              className="absolute inset-0 origin-left rounded-full bg-[#16877D]"
              initial={false}
              animate={{ scaleX: i <= numero ? 1 : 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

function IndiceMotDePasse({ regles, mdp }) {
  const { score, libelle } = forceMotDePasse(mdp)
  const couleurs = ['', 'bg-red-500', 'bg-amber-500', 'bg-[#16877D]', 'bg-[#0C6B63]']

  return (
    <div className="mt-2.5">
      {mdp && (
        <div className="mb-2 flex items-center gap-3">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= score ? couleurs[score] : 'bg-[#E8D9C7]'}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-600" aria-live="polite">{libelle}</span>
        </div>
      )}
      <ul className="space-y-1">
        {regles.map((r) => (
          <li
            key={r.texte}
            className={`flex items-center gap-1.5 text-xs transition-colors ${r.ok ? 'text-[#0C6B63]' : 'text-slate-500'}`}
          >
            {r.ok
              ? <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />
              : <Circle className="size-3 shrink-0" aria-hidden="true" />}
            {r.texte}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SaisieCode({ valeur, onChange, disabled, erreur }) {
  const refs = useRef([])
  const aller = (i) => refs.current[Math.max(0, Math.min(i, LONGUEUR_CODE - 1))]?.focus()

  function surSaisie(i, e) {
    const chiffres = e.target.value.replace(/\D/g, '')
    if (!chiffres) return
    onChange((valeur.slice(0, i) + chiffres + valeur.slice(i + 1)).slice(0, LONGUEUR_CODE))
    aller(i + chiffres.length)
  }

  function surTouche(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (valeur[i]) {
        onChange(valeur.slice(0, i) + valeur.slice(i + 1))
      } else if (i > 0) {
        onChange(valeur.slice(0, i - 1) + valeur.slice(i))
        aller(i - 1)
      }
    } else if (e.key === 'ArrowLeft') aller(i - 1)
    else if (e.key === 'ArrowRight') aller(i + 1)
  }

  function surColler(e) {
    e.preventDefault()
    const chiffres = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LONGUEUR_CODE)
    onChange(chiffres)
    aller(chiffres.length)
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-labelledby="libelle-code">
      {Array.from({ length: LONGUEUR_CODE }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0} disabled={disabled}
          value={valeur[i] ?? ''}
          onChange={(e) => surSaisie(i, e)}
          onKeyDown={(e) => surTouche(i, e)}
          onPaste={surColler}
          onFocus={(e) => e.target.select()}
          aria-label={`Chiffre ${i + 1} sur ${LONGUEUR_CODE}`}
          aria-invalid={erreur}
          className={`size-14 rounded-xl border bg-[#FCFBF8] text-center font-mono text-xl font-semibold text-slate-900 transition focus:bg-white focus:outline-none focus:ring-4 disabled:opacity-60 ${
            erreur
              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
              : 'border-[#E8D9C7] focus:border-[#16877D] focus:ring-[#16877D]/15'
          }`}
        />
      ))}
    </div>
  )
}

function Alerte({ type = 'erreur', children }) {
  const erreur = type === 'erreur'
  const Icone = erreur ? AlertCircle : CheckCircle2
  return (
    <div
      role={erreur ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
        erreur ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#16877D]/30 bg-[#C8EAE5]/40 text-[#0C6B63]'
      }`}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function BoutonPrincipal({ disabled, className = '', children, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl bg-[#16877D] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#16877D]/20 transition hover:bg-[#0C6B63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16877D] disabled:cursor-not-allowed disabled:opacity-60 xl:text-base ${className}`}
    >
      {children}
    </button>
  )
}

function CocheAnimee({ reduit }) {
  return (
    <svg viewBox="0 0 52 52" className="size-16" aria-hidden="true">
      <motion.circle
        cx="26" cy="26" r="24" fill="none" stroke="#16877D" strokeWidth="3"
        initial={{ pathLength: reduit ? 1 : 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: reduit ? 0 : 0.6, ease: 'easeOut' }}
      />
      <motion.path
        d="M15 27l8 8 14-16" fill="none" stroke="#16877D" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: reduit ? 1 : 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: reduit ? 0 : 0.4, delay: reduit ? 0 : 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

function EtapeSuite({ etat, titre, detail, dernier = false }) {
  const fait = etat === 'fait'
  const encours = etat === 'encours'
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!dernier && (
        <span
          className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px ${fait ? 'bg-[#16877D]' : 'bg-[#E8D9C7]'}`}
          aria-hidden="true"
        />
      )}
      <span
        className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${
          fait
            ? 'bg-[#16877D] text-white'
            : encours
              ? 'bg-amber-100 text-amber-700 ring-4 ring-amber-50 motion-safe:animate-pulse'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {fait ? <Check className="size-4" strokeWidth={3} aria-hidden="true" />
          : encours ? <Clock className="size-4" aria-hidden="true" />
            : <Circle className="size-3.5" aria-hidden="true" />}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={`text-sm font-semibold ${etat === 'attente' ? 'text-slate-500' : 'text-slate-900'}`}>{titre}</p>
        <p className="mt-0.5 break-words text-xs text-slate-600">{detail}</p>
      </div>
    </li>
  )
}
