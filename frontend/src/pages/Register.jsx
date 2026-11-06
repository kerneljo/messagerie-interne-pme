import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'
import {
  AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon,
  ChevronDownIcon, CircleIcon, ClockIcon, EyeIcon, EyeOffIcon,
  LockIcon, MailCheckIcon, MailIcon, ShieldCheckIcon,
  UserCheckIcon, UserIcon, BriefcaseIcon, CheckCircle2
} from '../components/icons'

const LONGUEUR_CODE = 6
const DELAI_RENVOI = 30
const MIN_MDP = 10
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const AVANTAGES = [
  { icone: MailCheckIcon, titre: 'E-mail vérifié', desc: 'Chaque compte est validé par un code.' },
  { icone: ShieldCheckIcon, titre: '100% sécurisé', desc: 'Échanges chiffrés de bout en bout.' },
  { icone: UserCheckIcon, titre: 'Contrôlé par admin', desc: 'Activation manuelle pour plus de sûreté.' },
]

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

/* ---------- Styles partagés avec le Login ---------- */
const AUTOFILL = '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#F4F9F7] [&:autofill]:shadow-[inset_0_0_0_1000px_#F4F9F7]'
const CLASSE_CHAMP = `h-15 w-full rounded-full border-2 text-base text-[#0C2A22] outline-none transition-all duration-200 placeholder:text-[#4F7468] ${AUTOFILL}`

function bordureChamp(erreur, valide) {
  if (erreur) return 'border-red-300 bg-red-50/40 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10'
  if (valide) return 'border-[#0C7A5A]/50 bg-[#F4F9F7] focus:border-[#0C7A5A] focus:bg-white focus:ring-4 focus:ring-[#0C7A5A]/10 focus:shadow-md'
  return 'border-[#C3DDD2] bg-[#F4F9F7] hover:border-[#8FC2AE] focus:border-[#0C7A5A] focus:bg-white focus:ring-4 focus:ring-[#0C7A5A]/10 focus:shadow-md'
}

/* Logo : public/assets/fulmar-logo.png */
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

export default function Register() {
  const { utilisateur } = useAuth()

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
    api.get('/api/postes')
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

  const erreursLocales = validerChamps({ prenom, nom, email, codePoste, password, passwordConfirmation })
  const erreurDe = (champ) => erreursChamps[champ]?.[0] ?? ((touche[champ] || tentative) ? erreursLocales[champ] : undefined)
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
      nom: nom.trim(), prenom: prenom.trim(), email: email.trim(),
      code_poste: codePoste, password, password_confirmation: passwordConfirmation,
    })
  }

  async function demanderCode(e) {
    e.preventDefault()
    setErreur(''); setInfo(''); setErreursChamps({}); setTentative(true)
    const premierChampInvalide = Object.keys(erreursLocales)[0]
    if (premierChampInvalide) {
      document.getElementById(premierChampInvalide)?.focus()
      return
    }
    setCodeOtp(''); setSecousse(false); setAttente(DELAI_RENVOI); setSens(1); setEtape('otp'); setEnvoi(true)
    try {
      await envoyerCode()
    } catch (err) {
      const data = err.response?.data
      setSens(-1); setEtape('formulaire')
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
    setErreur(''); setInfo(''); setEnvoi(true)
    try {
      await api.post('/api/inscription/verifier-code', { email: email.trim(), code: codeOtp })
      setSens(1); setEtape('succes')
    } catch (err) {
      setErreur(err.response?.data?.message || 'Code invalide ou expiré.')
      setCodeOtp(''); setCleSaisie((k) => k + 1); setSecousse(true)
    } finally {
      setEnvoi(false)
    }
  }

  function verifierCode(e) { e.preventDefault(); verifier() }
  function changerCode(valeur) { setCodeOtp(valeur); setSecousse(false); if (erreur) setErreur('') }

  async function renvoyerCode() {
    setErreur(''); setInfo(''); setEnvoi(true)
    try {
      await envoyerCode()
      setCodeOtp(''); setCleSaisie((k) => k + 1); setSecousse(false); setAttente(DELAI_RENVOI); setInfo('Un nouveau code vient d’être envoyé.')
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de renvoyer le code.')
    } finally {
      setEnvoi(false)
    }
  }

  function modifierEmail() { setSens(-1); setEtape('formulaire'); setErreur(''); setInfo(''); setCodeOtp('') }

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

        {/* PRÉSENTATION CENTRALE */}
        <div className="relative z-10 flex flex-1 flex-col pt-16">
          
          <div>
            <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-[#0E4F3C] xl:text-5xl">
              Rejoignez <br />
              <span className="text-[#0C7A5A]">votre équipe.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#2F5C4E]">
              Créez votre compte en quelques minutes. Une fois validé par un administrateur, vous accédez à votre messagerie sécurisée.
            </p>
          </div>

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
      <main className="relative flex flex-1 flex-col lg:overflow-y-auto">
        
        {/* En-tête mobile */}
        <header className="relative flex flex-col items-center gap-3 overflow-hidden rounded-bl-[140px] bg-gradient-to-b from-[#D3EBE1] via-[#E0F0E9] to-[#EDF6F2] px-6 pb-12 pt-14 text-center text-[#0E4F3C] lg:hidden">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/40 blur-2xl pointer-events-none" />
          <Logo taille="petit" />
          <p className="font-display text-xl font-bold">Fulmar</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Rejoignez votre équipe</h2>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          
          {/* CARTE FORMULAIRE */}
          <div className="w-full max-w-[720px] rounded-[40px] border border-white/80 bg-white/60 p-10 shadow-[0_8px_32px_rgba(12,122,90,0.04)] backdrop-blur-xl motion-safe:animate-fade-in-up sm:p-14">
            
            <Progression etape={etape} />

            {/* ============ ÉTAPE 1 : FORMULAIRE ============ */}
            {etape === 'formulaire' && (
              <div className="motion-safe:animate-fade-in-up">
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0E4F3C] lg:text-[44px] lg:leading-tight">
                  Créer un compte
                </h1>
                <p className="mt-3 text-[16px] text-[#3C5B50]">
                  Renseignez vos informations professionnelles. Tous les champs sont obligatoires.
                </p>

                <form onSubmit={demanderCode} noValidate className="mt-8">
                  {/* On utilise un grid avec un gap un peu plus grand pour compenser les erreurs absolues */}
                  <div className="grid grid-cols-1 items-start gap-x-5 gap-y-2 sm:grid-cols-2">
                    <Champ
                      id="prenom" label="Prénom" icone={UserIcon} value={prenom}
                      onChange={modifier('prenom', setPrenom)} onBlur={() => marquer('prenom')}
                      placeholder="Jean" autoComplete="given-name" autoFocus
                      erreur={erreurDe('prenom')} valide={!erreursLocales.prenom && !erreurDe('prenom') && prenom !== ''}
                      disabled={envoi}
                    />
                    <Champ
                      id="nom" label="Nom" icone={UserIcon} value={nom}
                      onChange={modifier('nom', setNom)} onBlur={() => marquer('nom')}
                      placeholder="Dupont" autoComplete="family-name"
                      erreur={erreurDe('nom')} valide={!erreursLocales.nom && !erreurDe('nom') && nom !== ''}
                      disabled={envoi}
                    />

                    <div className="sm:col-span-2">
                      <Champ
                        id="email" label="Adresse e-mail" type="email" icone={MailIcon} value={email}
                        onChange={modifier('email', setEmail)} onBlur={() => marquer('email')}
                        placeholder="prenom.nom@entreprise.fr" autoComplete="email"
                        erreur={erreurDe('email')} valide={!erreursLocales.email && !erreurDe('email') && email !== ''}
                        disabled={envoi}
                      />
                    </div>

                    <div className="sm:col-span-2 pb-5"> {/* pb-5 ici pour le Poste */}
                      <label htmlFor="code_poste" className="mb-2 block pl-5 text-sm font-semibold text-[#0C2A22]">Poste</label>
                      <div className="relative">
                        <BriefcaseIcon className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#8FC2AE]" />
                        <select
                          id="code_poste" value={codePoste}
                          onChange={modifier('code_poste', setCodePoste)} onBlur={() => marquer('code_poste')}
                          required disabled={chargementPostes || envoi}
                          aria-invalid={!!erreurDe('code_poste')}
                          aria-describedby={erreurDe('code_poste') ? 'code_poste-erreur' : undefined}
                          className={`${CLASSE_CHAMP} appearance-none pl-[52px] pr-12 ${bordureChamp(erreurDe('code_poste'))} ${codePoste ? 'text-[#0C2A22]' : 'text-[#4F7468]'}`}
                        >
                          <option value="">{chargementPostes ? 'Chargement…' : 'Choisir un poste'}</option>
                          {postes.map((p) => (
                            <option key={p.code_poste} value={p.code_poste} className="text-slate-900">{p.libelle}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-5 top-1/2 size-4 -translate-y-1/2 text-[#4F7468]" />
                      </div>
                      
                      {/* Erreur du poste en absolu */}
                      {erreurDe('code_poste') && (
                        <p id="code_poste-erreur" className="absolute mt-1 pl-5 text-xs font-medium text-red-600 motion-safe:animate-fade-in-up">
                          {erreurDe('code_poste')}
                        </p>
                      )}
                    </div>

                    <div className="pb-5"> {/* pb-5 pour le mot de passe */}
                      <Champ
                        id="password" label="Mot de passe" type={voirMdp ? 'text' : 'password'} icone={LockIcon}
                        value={password} onChange={modifier('password', setPassword)}
                        onBlur={() => { marquer('password'); setCapsLock(false) }}
                        onKeyDown={majCaps} onKeyUp={majCaps}
                        placeholder="Votre mot de passe" autoComplete="new-password"
                        erreur={erreurDe('password')} disabled={envoi}
                        droite={
                          <button
                            type="button" onClick={() => setVoirMdp((v) => !v)}
                            aria-label={voirMdp ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                            aria-pressed={voirMdp}
                            className="flex size-10 items-center justify-center rounded-full text-[#4F7468] transition hover:bg-[#0C7A5A]/10 hover:text-[#0C7A5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C7A5A]/40"
                          >
                            {voirMdp ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                          </button>
                        }
                      />
                      
                      {/* Caps Lock en absolu */}
                      {capsLock && (
                        <p className="absolute mt-1 pl-5 flex items-center gap-1.5 text-xs font-medium text-amber-700 motion-safe:animate-fade-in-up">
                          <AlertCircleIcon className="size-3.5 shrink-0" /> Verrouillage majuscules activé
                        </p>
                      )}
                      
                      <IndiceMotDePasse mdp={password} />
                    </div>

                    <Champ
                      id="password_confirmation" label="Confirmer le mot de passe"
                      type={voirMdp ? 'text' : 'password'} icone={LockIcon}
                      value={passwordConfirmation}
                      onChange={modifier('password_confirmation', setPasswordConfirmation)}
                      onBlur={() => marquer('password_confirmation')}
                      placeholder="Confirmez-le" autoComplete="new-password"
                      erreur={erreurDe('password_confirmation')} disabled={envoi}
                      valide={passwordConfirmation.length > 0 && password === passwordConfirmation}
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-center text-sm text-[#3C5B50] sm:text-left">
                      Déjà un compte ?{' '}
                      <Link to="/login" className="font-semibold text-[#0C7A5A] underline-offset-4 hover:underline">
                        Se connecter
                      </Link>
                    </p>
                    <BoutonPrincipal type="submit" disabled={envoi} className="w-full sm:w-auto sm:min-w-[200px]">
                      Continuer <ArrowRightIcon className="size-4" />
                    </BoutonPrincipal>
                  </div>
                </form>
              </div>
            )}

            {/* ============ ÉTAPE 2 : CODE DE VÉRIFICATION ============ */}
            {etape === 'otp' && (
              <div className="motion-safe:animate-fade-in-up">
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0E4F3C] lg:text-[44px] lg:leading-tight">
                  Vérifiez votre e-mail
                </h1>
                <p className="mt-3 text-[16px] text-[#3C5B50]">
                  Nous avons envoyé un code à 6 chiffres à <strong className="font-semibold text-[#0C2A22]">{email.trim()}</strong>.
                </p>

                <form onSubmit={verifierCode} noValidate className="mt-8 space-y-6">
                  <div>
                    <p id="libelle-code" className="mb-3 text-center text-sm font-semibold text-[#0C2A22]">
                      Code de vérification
                    </p>
                    <div className={secousse ? 'motion-safe:animate-shake' : ''} key={cleSaisie}>
                      <SaisieCode valeur={codeOtp} onChange={changerCode} disabled={envoi} erreur={!!erreur} />
                    </div>
                    <p className="mt-3 text-center text-xs text-[#3C5B50]">
                      La vérification démarre dès que les 6 chiffres sont saisis.
                    </p>
                  </div>

                  {info && <Alerte type="info">{info}</Alerte>}
                  {erreur && <Alerte>{erreur}</Alerte>}
                </form>

                <div className="mt-6 flex flex-col items-center gap-3 text-sm">
                  <p className="text-[#3C5B50]">
                    Vous n’avez rien reçu ?{' '}
                    {attente > 0 ? (
                      <span className="tabular-nums text-[#4F7468]">Renvoyer dans {mmss(attente)}</span>
                    ) : (
                      <button
                        type="button" onClick={renvoyerCode} disabled={envoi}
                        className="rounded font-semibold text-[#0C7A5A] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C7A5A]/40"
                      >
                        Renvoyer le code
                      </button>
                    )}
                  </p>
                  <button
                    type="button" onClick={modifierEmail}
                    className="flex items-center gap-1.5 rounded text-[#3C5B50] transition hover:text-[#0C2A22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C7A5A]/40"
                  >
                    <ArrowLeftIcon className="size-4" /> Modifier mes informations
                  </button>
                </div>
              </div>
            )}

            {/* ============ ÉTAPE 3 : SUCCÈS ============ */}
            {etape === 'succes' && (
              <div className="text-center motion-safe:animate-fade-in-up">
                <div className="mx-auto flex size-16 items-center justify-center">
                  <CocheAnimee />
                </div>
                <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-[#0E4F3C] lg:text-[44px] lg:leading-tight">
                  Compte créé
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#3C5B50] lg:text-base">
                  Votre adresse e-mail est confirmée. Il reste une étape : un administrateur doit activer votre compte.
                </p>

                <ol className="mx-auto mt-8 max-w-sm text-left">
                  <EtapeSuite etat="fait" titre="Adresse e-mail confirmée" detail={email.trim()} />
                  <EtapeSuite etat="encours" titre="Validation par un administrateur" detail="Votre demande est en attente." />
                  <EtapeSuite etat="attente" titre="Accès à la messagerie" detail="Vous pourrez vous connecter dès l’activation." dernier />
                </ol>

                <Link
                  to="/login"
                  className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0C7A5A] px-8 text-base font-semibold text-white shadow-lg shadow-[#0C7A5A]/30 transition hover:bg-[#095F46] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0C7A5A]/30 sm:w-auto sm:min-w-[260px]"
                >
                  Retour à la connexion <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ============================================================
   Composants utilitaires
   ============================================================ */

function Champ({ id, label, icone: Icone, droite, erreur, valide, ...props }) {
  return (
    // pb-5 réserve l'espace sous le champ pour que l'erreur (position: absolute) ne pousse pas le champ suivant
    <div className="relative pb-5">
      <label htmlFor={id} className="mb-2 block pl-5 text-sm font-semibold text-[#0C2A22]">{label}</label>
      <div className="relative">
        {Icone && (
          <Icone className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#8FC2AE] transition-colors peer-focus:text-[#0C7A5A]" />
        )}
        <input
          id={id} required aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-erreur` : undefined}
          className={`${CLASSE_CHAMP} ${Icone ? 'pl-[52px]' : 'pl-5'} ${droite || valide ? 'pr-14' : 'pr-5'} ${bordureChamp(erreur, valide)}`}
          {...props}
        />
        {droite && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{droite}</div>}
        {valide && !droite && !erreur && (
          <CheckIcon className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-[#0C7A5A]" />
        )}
      </div>
      
      {/* Erreur en absolu : ne pousse jamais le champ suivant */}
      {erreur && (
        <p id={`${id}-erreur`} className="absolute mt-1 pl-5 text-xs font-medium text-red-600 motion-safe:animate-fade-in-up">
          {erreur}
        </p>
      )}
    </div>
  )
}

const TITRES_ETAPES = { formulaire: 'Vos informations', otp: 'Vérification' }

function Progression({ etape }) {
  if (etape === 'succes') return null
  const numero = etape === 'formulaire' ? 1 : 2
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-medium text-[#3C5B50]">
        Étape {numero} sur 2 · {TITRES_ETAPES[etape]}
      </p>
      <div className="flex gap-1.5">
        {[1, 2].map((i) => (
          <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#DCE9E4]">
            <span
              className="absolute inset-0 origin-left rounded-full bg-[#0C7A5A] transition-transform duration-500"
              style={{ transform: `scaleX(${i <= numero ? 1 : 0})` }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

function IndiceMotDePasse({ mdp }) {
  const { score, libelle } = forceMotDePasse(mdp)
  const couleurs = ['', 'bg-red-500', 'bg-amber-500', 'bg-[#3FA586]', 'bg-[#0C7A5A]']
  
  if (!mdp) return null

  return (
    <div className="mt-1 pl-5 pr-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? couleurs[score] : 'bg-[#DCE9E4]'}`} 
            />
          ))}
        </div>
        <span className="text-xs font-medium text-[#3C5B50]">{libelle}</span>
      </div>
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
      if (valeur[i]) onChange(valeur.slice(0, i) + valeur.slice(i + 1))
      else if (i > 0) { onChange(valeur.slice(0, i - 1) + valeur.slice(i)); aller(i - 1) }
    } else if (e.key === 'ArrowLeft') aller(i - 1)
    else if (e.key === 'ArrowRight') aller(i + 1)
  }

  function surColler(e) {
    e.preventDefault()
    const chiffres = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LONGUEUR_CODE)
    onChange(chiffres); aller(chiffres.length)
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length: LONGUEUR_CODE }, (_, i) => (
        <input
          key={i} ref={(el) => (refs.current[i] = el)}
          type="text" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Chiffre ${i + 1} sur ${LONGUEUR_CODE}`}
          autoFocus={i === 0} disabled={disabled} value={valeur[i] ?? ''}
          onChange={(e) => surSaisie(i, e)} onKeyDown={(e) => surTouche(i, e)} onPaste={surColler}
          onFocus={(e) => e.target.select()}
          className={`size-12 rounded-2xl border-2 text-center font-mono text-xl font-semibold text-[#0C2A22] outline-none transition focus:bg-white focus:ring-4 disabled:opacity-60 sm:size-14 ${
            erreur
              ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-500/10'
              : 'border-[#C3DDD2] bg-[#F4F9F7] focus:border-[#0C7A5A] focus:ring-[#0C7A5A]/15'
          }`}
        />
      ))}
    </div>
  )
}

function Alerte({ type = 'erreur', children }) {
  const erreur = type === 'erreur'
  const Icone = erreur ? AlertCircleIcon : CheckCircle2
  return (
    <div
      role={erreur ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm ${
        erreur ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#BFE0D3] bg-[#EAF4F0] text-[#0E4F3C]'
      }`}
    >
      <Icone className="mt-0.5 size-4 shrink-0" />
      <p className="font-medium">{children}</p>
    </div>
  )
}

function BoutonPrincipal({ disabled, className = '', children, ...props }) {
  return (
    <button
      {...props} disabled={disabled}
      className={`group relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#0C7A5A] to-[#0F9B73] px-8 text-base font-semibold text-white shadow-lg shadow-[#0C7A5A]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0C7A5A]/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0C7A5A]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
        <div className="relative h-full w-8 bg-white/20" />
      </div>
      {children}
    </button>
  )
}

function CocheAnimee() {
  return (
    <svg viewBox="0 0 52 52" className="size-16" aria-hidden="true">
      <circle cx="26" cy="26" r="24" fill="none" stroke="#0C7A5A" strokeWidth="3" className="animate-draw" strokeDasharray="150" strokeDashoffset="150" />
      <path d="M15 27l8 8 14-16" fill="none" stroke="#0C7A5A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" strokeDashoffset="50" className="animate-draw-delayed" />
    </svg>
  )
}

function EtapeSuite({ etat, titre, detail, dernier = false }) {
  const fait = etat === 'fait'
  const encours = etat === 'encours'
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!dernier && (
        <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px ${fait ? 'bg-[#0C7A5A]' : 'bg-[#DCE9E4]'}`} />
      )}
      <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${
        fait
          ? 'bg-[#0C7A5A] text-white'
          : encours
            ? 'bg-amber-100 text-amber-700 ring-4 ring-amber-50 motion-safe:animate-pulse'
            : 'bg-[#EAF4F0] text-[#4F7468]'
      }`}>
        {fait ? <CheckIcon className="size-4" strokeWidth={3} /> : encours ? <ClockIcon className="size-4" /> : <CircleIcon className="size-3.5" />}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={`text-sm font-semibold ${etat === 'attente' ? 'text-[#4F7468]' : 'text-[#0C2A22]'}`}>{titre}</p>
        <p className="mt-0.5 break-words text-xs text-[#3C5B50]">{detail}</p>
      </div>
    </li>
  )
}