import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Briefcase, Building2, Shield,
  AlertTriangle, User as UserIcon,
  Copy, Check, Clock,
  MessageSquare, ExternalLink, MapPin, Phone,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { Chargement } from '../components/ui'

export default function ProfilUtilisateur() {
  const { matricule } = useParams()
  const navigate = useNavigate()
  const { utilisateur: moi } = useAuth()
  const [profil, setProfil] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)
  const [ouvertureEnCours, setOuvertureEnCours] = useState(false)

  useEffect(() => {
    if (moi?.matricule && String(moi.matricule) === String(matricule)) {
      navigate('/profil', { replace: true })
    }
  }, [moi, matricule, navigate])

  useEffect(() => {
    setChargement(true)
    setErreur('')
    api.get(`/api/utilisateurs/${matricule}/profil`)
      .then((r) => setProfil(r.data))
      .catch((err) => {
        setErreur(err.response?.data?.message || 'Impossible de charger ce profil.')
        setProfil(null)
      })
      .finally(() => setChargement(false))
  }, [matricule])

  function copierEmail() {
    if (!profil?.email) return
    navigator.clipboard.writeText(profil.email)
    setCopie(true)
    setTimeout(() => setCopie(false), 1500)
  }

  async function ouvrirDansMessenger() {
    setOuvertureEnCours(true)
    try {
      const r = await api.post(`/api/conversations/ouvrir/${profil.matricule}`)
      navigate(`/conversations/${r.data.reference_conversation}`)
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible d’ouvrir la conversation.')
    } finally {
      setOuvertureEnCours(false)
    }
  }

  if (chargement) return <Chargement />

  if (erreur || !profil) {
    return (
      <div className="w-full p-6">
        <BoutonRetour onClick={() => navigate(-1)} />
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/15">
          <AlertTriangle className="mb-3 size-10 text-red-500 dark:text-red-400" />
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">Profil introuvable</h2>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{erreur}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-50">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6">

        {/* Barre supérieure */}
        <div className="mb-4 flex items-center justify-between">
          <BoutonRetour onClick={() => navigate(-1)} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Profil collaborateur
          </span>
        </div>

        {/* Carte principale — SANS les actions (déplacées en bas) */}
        <div className="rounded-2xl border border-slate-200 bg-papier p-5">
          <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center">

            {/* Avatar */}
            <div className="relative shrink-0">
              {profil.photo_url ? (
                <img
                  src={profil.photo_url}
                  alt={`${profil.prenom} ${profil.nom}`}
                  className="size-20 rounded-2xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  <span className="text-2xl font-semibold text-slate-600">
                    {profil.prenom?.[0]}{profil.nom?.[0]}
                  </span>
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-action-600 ring-2 ring-papier">
                <Check className="size-2.5 text-white" strokeWidth={3} />
              </span>
            </div>

            {/* Infos */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {profil.prenom} {profil.nom}
              </h1>

              <div className="mt-1 flex items-center gap-2 text-slate-500">
                <Mail className="size-3.5 shrink-0" />
                <span className="text-sm">{profil.email}</span>
                <button
                  onClick={copierEmail}
                  className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Copier"
                  title="Copier l'e-mail"
                >
                  {copie ? <Check className="size-3 text-blue-600" /> : <Copy className="size-3" />}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {profil.role && <Badge icone={Shield} texte={profil.role.libelle} />}
                {profil.poste && <Badge icone={Briefcase} texte={profil.poste.libelle} />}
                {profil.service && <Badge icone={Building2} texte={profil.service.nom_service} />}
              </div>
            </div>
          </div>
        </div>

        {/* 2 cartes côte à côte (Identité + Poste) */}
        <div className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          <Carte icone={UserIcon} titre="Identité">
            <Ligne label="Prénom" valeur={profil.prenom} />
            <Ligne label="Nom" valeur={profil.nom} />
            <Ligne label="Adresse e-mail" valeur={profil.email} />
          </Carte>

          <Carte icone={Briefcase} titre="Poste">
            <Ligne label="Intitulé" valeur={profil.poste?.libelle || '—'} />
            <Ligne label="Service" valeur={profil.service?.nom_service || '—'} />
            <Ligne label="Rôle" valeur={profil.role?.libelle || '—'} />
          </Carte>
        </div>

        {/* 2 cartes côte à côte (Coordonnées + Actions rapides) */}
        <div className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          <Carte icone={MapPin} titre="Coordonnées">
            <LigneContact icone={MapPin} label="Bureau" valeur={profil.service?.nom_service ? `Service ${profil.service.nom_service}` : '—'} />
            <LigneContact icone={Phone} label="Poste interne" valeur="—" />
            <LigneContact icone={Clock} label="Vu" valeur={formaterDateRelative(profil.derniere_connexion)} />
          </Carte>

          <Carte icone={MessageSquare} titre="Actions rapides">
            <div className="flex flex-col gap-2 py-1">
              <button
                onClick={ouvrirDansMessenger}
                disabled={ouvertureEnCours}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-action-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-action-700 disabled:opacity-60"
              >
                <MessageSquare className="size-4" />
                {ouvertureEnCours ? 'Ouverture…' : 'Envoyer un message'}
              </button>
              <a
                href={`mailto:${profil.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-papier px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-300 dark:hover:bg-slate-100"
              >
                <Mail className="size-4" />
                Envoyer un e-mail
              </a>
            </div>
          </Carte>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Bouton Retour
   ============================================================ */
function BoutonRetour({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-papier px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-300 dark:hover:bg-slate-100"
    >
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      Retour
    </button>
  )
}

/* ============================================================
   Badge
   ============================================================ */
function Badge({ icone: Icone, texte }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-200 dark:text-slate-800">
      <Icone className="size-3" />
      {texte}
    </span>
  )
}

/* ============================================================
   Carte
   ============================================================ */
function Carte({ icone: Icone, titre, children }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-papier p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-200 dark:text-slate-700">
          <Icone className="size-4" />
        </span>
        <h3 className="text-base font-bold text-slate-900">{titre}</h3>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

/* ============================================================
   Ligne
   ============================================================ */
function Ligne({ label, valeur, mono }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-200">
      <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
      <span className={`truncate text-sm font-semibold text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {valeur}
      </span>
    </div>
  )
}

/* ============================================================
   Ligne contact
   ============================================================ */
function LigneContact({ icone: Icone, label, valeur }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-200">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-200 dark:text-slate-600">
        <Icone className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{valeur}</p>
      </div>
    </div>
  )
}

/* ============================================================
   Utilitaires
   ============================================================ */
function formaterDateRelative(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  const maintenant = new Date()
  const diff = maintenant - d
  const minutes = Math.floor(diff / 60000)
  const heures = Math.floor(diff / 3600000)
  const jours = Math.floor(diff / 86400000)

  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  if (heures < 24) return `il y a ${heures} h`
  if (jours < 7) return `il y a ${jours} j`
  if (jours < 30) return `il y a ${Math.floor(jours / 7)} sem.`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}