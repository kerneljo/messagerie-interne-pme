import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Briefcase, Building2, Shield,
  AlertTriangle, User as UserIcon,
  Copy, Check, Clock,
  MessagesSquare, Send, Inbox, Paperclip,
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
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="size-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-900">Profil introuvable</h2>
          <p className="mt-1 text-sm text-red-700">{erreur}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="w-full px-6 py-6">

        {/* Barre supérieure */}
        <div className="flex items-center justify-between mb-4">
          <BoutonRetour onClick={() => navigate(-1)} />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Profil collaborateur
          </span>
        </div>

        {/* Carte principale compacte */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">

            {/* Avatar */}
            <div className="shrink-0 relative">
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
              <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <Check className="size-2.5 text-white" strokeWidth={3} />
              </span>
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {profil.prenom} {profil.nom}
              </h1>

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
                {profil.role && <Badge icone={Shield} texte={profil.role.libelle} />}
                {profil.poste && <Badge icone={Briefcase} texte={profil.poste.libelle} />}
                {profil.service && <Badge icone={Building2} texte={profil.service.nom_service} />}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
              <button
                onClick={ouvrirDansMessenger}
                disabled={ouvertureEnCours}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
              >
                <MessageSquare className="size-4" />
                {ouvertureEnCours ? 'Ouverture…' : 'Ouvrir dans Messenger'}
                <ExternalLink className="size-3.5 opacity-80" />
              </button>

              <a
                href={`mailto:${profil.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <Mail className="size-4" />
                Envoyer un e-mail
              </a>
            </div>
          </div>
        </div>

        {/* 3 cartes égales en pleine largeur */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
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

          <Carte icone={MapPin} titre="Coordonnées">
            <LigneContact icone={MapPin} label="Bureau" valeur={profil.service?.nom_service ? `Service ${profil.service.nom_service}` : '—'} />
            <LigneContact icone={Phone} label="Poste interne" valeur="—" />
            <LigneContact icone={Clock} label="Vu" valeur={formaterDateRelative(profil.derniere_connexion)} />
          </Carte>
        </div>

        {/* Statistiques de collaboration */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <MessagesSquare className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Collaboration</h3>
                <p className="text-xs text-slate-500">
                  Vos échanges avec {profil.prenom}
                </p>
              </div>
            </div>

            {profil.stats?.derniere_interaction && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="size-3.5" />
                <span>Dernière interaction {formaterDateRelative(profil.stats.derniere_interaction)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
            <Stat icone={MessagesSquare} label="Conversations communes" valeur={profil.stats?.conversations ?? 0} />
            <Stat icone={Send} label="Messages envoyés" valeur={profil.stats?.messages_envoyes ?? 0} />
            <Stat icone={Inbox} label="Messages reçus" valeur={profil.stats?.messages_recus ?? 0} />
            <Stat icone={Paperclip} label="Fichiers échangés" valeur={profil.stats?.fichiers_echanges ?? 0} />
          </div>

          {profil.stats?.conversations === 0 && (
            <div className="border-t border-slate-100 px-6 py-5 text-center text-sm text-slate-500">
              Vous n’avez pas encore échangé avec {profil.prenom}.
              <button
                onClick={ouvrirDansMessenger}
                disabled={ouvertureEnCours}
                className="ml-1 font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
              >
                Démarrer la conversation →
              </button>
            </div>
          )}
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
      className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition"
    >
      <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
      Retour
    </button>
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
   Carte (hauteur 100% pour alignement parfait)
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
   Ligne : label gauche (largeur fixe) / valeur gauche alignée
   ============================================================ */
function Ligne({ label, valeur, mono, pastilleVerte }) {
  // Pastille verte (statut Actif)
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

  // Ligne standard
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 truncate ${mono ? 'font-mono' : ''}`}>
        {valeur}
      </span>
    </div>
  )
}

/* ============================================================
   Ligne contact (icône + label + valeur)
   ============================================================ */
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
   Statistique
   ============================================================ */
function Stat({ icone: Icone, label, valeur }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icone className="size-5" />
        </span>
        <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
          {valeur}
        </p>
      </div>
      <p className="text-xs font-medium text-slate-500 leading-tight">
        {label}
      </p>
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
