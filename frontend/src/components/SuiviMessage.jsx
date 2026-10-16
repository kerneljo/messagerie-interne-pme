import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, Check, CheckCheck, ChevronDown, ClipboardCheck, Clock,
  Eye, History, Info, Loader2, MessageSquare, X,
} from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'
import { Avatar } from './ui'

/* ============================================================
   Types de message
   ============================================================ */
export const CATEGORIES = [
  {
    valeur: 'NORMAL', libelle: 'Message', icone: MessageSquare, classes: '',
    aide: 'Message ordinaire, sans accusé de réception.',
  },
  {
    valeur: 'INFORMATION', libelle: 'Information', icone: Info,
    classes: 'bg-sky-50 text-sky-800 ring-sky-200',
    aide: 'Pour information : la lecture suffit.',
  },
  {
    valeur: 'ACTION_REQUISE', libelle: 'Action requise', icone: ClipboardCheck,
    classes: 'bg-amber-50 text-amber-900 ring-amber-200',
    aide: 'À prendre en compte, puis à marquer comme fait.',
  },
  {
    valeur: 'URGENT', libelle: 'Urgent', icone: AlertTriangle,
    classes: 'bg-red-50 text-red-800 ring-red-200',
    aide: 'Accusé de réception demandé sans délai.',
  },
]

const PAR_VALEUR = Object.fromEntries(CATEGORIES.map((c) => [c.valeur, c]))

/** Les types qui attendent un accusé de chaque destinataire (même règle que le serveur). */
export function avecAccuse(categorie) {
  return categorie === 'ACTION_REQUISE' || categorie === 'URGENT'
}

/** Valeur minimale du champ « échéance » : dans une minute, à l'heure locale. */
export function minEcheanceLocale() {
  return new Date(Date.now() + 60000 - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function dateHeure(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function dateLongue(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/* L'échéance est dépassée et le message n'est pas encore traité */
function estEnRetard(m, moi) {
  if (!m.echeance || new Date(m.echeance) > new Date()) return false

  if (moi) {
    if (!m.suivi) return false
    const traites = m.categorie === 'URGENT' ? m.suivi.pris_en_compte : m.suivi.fait
    return traites < m.suivi.attendus
  }

  return m.categorie === 'URGENT'
    ? !m.ma_prise_en_compte
    : m.ma_prise_en_compte?.statut !== 'FAIT'
}

/* ============================================================
   Étiquette affichée au-dessus de la bulle
   ============================================================ */
export function EtiquetteCategorie({ message, moi }) {
  const c = PAR_VALEUR[message.categorie]
  if (!c || c.valeur === 'NORMAL') return null

  const Icone = c.icone
  const retard = estEnRetard(message, moi)

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${c.classes}`}>
      <Icone className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{c.libelle}</span>
      {message.echeance && (
        <span className="inline-flex items-center gap-1 font-medium">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          {retard ? 'Échéance dépassée : ' : 'Avant le '}
          {dateHeure(message.echeance)}
        </span>
      )}
    </span>
  )
}

/* ============================================================
   Bandeau sous la bulle : accusé du destinataire, suivi de l'expéditeur,
   lien vers l'historique des modifications
   ============================================================ */
export function BandeauEngagement({ message: m, moi, enCours, onAccuser, onSuivre, onVersions }) {
  const accuse = avecAccuse(m.categorie)
  const montrerAccuse = accuse && !moi
  const montrerSuivi = accuse && moi && Boolean(m.suivi)
  const montrerVersions = Boolean(m.date_modification)

  if (!montrerAccuse && !montrerSuivi && !montrerVersions) return null

  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-2 ${moi ? 'justify-end' : 'justify-start'}`}>
      {montrerAccuse && <ActionsDestinataire message={m} enCours={enCours} onAccuser={onAccuser} />}
      {montrerSuivi && <ResumeSuivi message={m} onSuivre={onSuivre} />}
      {montrerVersions && (
        <button
          type="button"
          onClick={onVersions}
          className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur-sm transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          <History className="size-3" aria-hidden="true" />
          Modifié · voir l’original
        </button>
      )}
    </div>
  )
}

function BoutonAccuse({ principal = false, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 ${
        principal
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function ActionsDestinataire({ message: m, enCours, onAccuser }) {
  const pc = m.ma_prise_en_compte
  const action = m.categorie === 'ACTION_REQUISE'

  if (pc?.statut === 'FAIT') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCheck className="size-3.5" aria-hidden="true" />
        Fait · {dateHeure(pc.date_statut)}
      </span>
    )
  }

  return (
    <>
      {pc?.statut === 'PRIS_EN_COMPTE' ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 shadow-sm backdrop-blur-sm">
          <Check className="size-3.5" aria-hidden="true" />
          Pris en compte · {dateHeure(pc.date_statut)}
        </span>
      ) : (
        <BoutonAccuse principal disabled={enCours} onClick={() => onAccuser('PRIS_EN_COMPTE')}>
          <Check className="size-3.5" aria-hidden="true" />
          Pris en compte
        </BoutonAccuse>
      )}

      {action && (
        <BoutonAccuse disabled={enCours} onClick={() => onAccuser('FAIT')}>
          <CheckCheck className="size-3.5" aria-hidden="true" />
          {pc ? 'Marquer comme fait' : 'Fait'}
        </BoutonAccuse>
      )}
    </>
  )
}

function ResumeSuivi({ message: m, onSuivre }) {
  const s = m.suivi
  const action = m.categorie === 'ACTION_REQUISE'
  const traites = m.categorie === 'URGENT' ? s.pris_en_compte : s.fait
  const complet = s.attendus > 0 && traites >= s.attendus

  const texte =
    `Pris en compte ${s.pris_en_compte}/${s.attendus}` +
    (action ? ` · Fait ${s.fait}/${s.attendus}` : '')

  return (
    <button
      type="button"
      onClick={onSuivre}
      aria-label={`Voir le suivi : ${texte}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-indigo-600 ${
        complet
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100'
          : 'bg-white/85 text-slate-700 backdrop-blur-sm hover:bg-white'
      }`}
    >
      <Eye className="size-3.5" aria-hidden="true" />
      {texte}
    </button>
  )
}

/* ============================================================
   Fenêtre modale commune
   ============================================================ */
function Modale({ titre, idTitre, onFermer, children }) {
  const boite = useRef(null)

  useEffect(() => {
    boite.current?.focus()
  }, [])

  useEffect(() => {
    function surTouche(e) {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [onFermer])

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex overflow-y-auto bg-lagon-950/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer()
      }}
    >
      <div
        ref={boite}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        className="m-auto w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-lagon-950/30 ring-1 ring-black/5 outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
          <h2 id={idTitre} className="text-base font-bold text-slate-900">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

function Chargement() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Chargement…
    </div>
  )
}

/* ============================================================
   Suivi nominatif (réservé à l'expéditeur)
   ============================================================ */
const ORDRE_ETAT = { EN_ATTENTE: 0, LU: 1, PRIS_EN_COMPTE: 2, FAIT: 3 }

const ETATS = {
  EN_ATTENTE: { libelle: 'Pas encore lu', icone: Clock, classes: 'text-slate-600' },
  LU: { libelle: 'Lu', icone: Eye, classes: 'text-sky-700' },
  PRIS_EN_COMPTE: { libelle: 'Pris en compte', icone: Check, classes: 'text-indigo-700' },
  FAIT: { libelle: 'Fait', icone: CheckCheck, classes: 'text-emerald-700' },
}

export function PanneauSuivi({ message, onFermer, onActualise }) {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    api
      .get(`/api/messages/${message.reference_message}/suivi`)
      .then(({ data }) => {
        if (annule) return
        setDonnees(data)
        onActualise?.(message.reference_message, data.resume)
      })
      .catch((e) => {
        if (!annule) setErreur(messageErreur(e))
      })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.reference_message])

  // Ceux qui n'ont pas encore réagi en premier : ce sont eux qu'il faut relancer
  const destinataires = donnees
    ? [...donnees.destinataires].sort(
        (a, b) => (ORDRE_ETAT[a.etat] ?? 0) - (ORDRE_ETAT[b.etat] ?? 0)
      )
    : []

  const r = donnees?.resume
  const resume = r
    ? [
        ['Destinataires', r.attendus],
        ['Lus', r.lus],
        ['Pris en compte', r.pris_en_compte],
        ...(donnees.categorie === 'ACTION_REQUISE' ? [['Fait', r.fait]] : []),
      ]
    : []

  return (
    <Modale titre="Suivi du message" idTitre="titre-suivi" onFermer={onFermer}>
      <div className="px-5 py-4">
        {erreur ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800" role="alert">
            {erreur}
          </p>
        ) : !donnees ? (
          <Chargement />
        ) : (
          <>
            <p className="text-xs text-slate-600">
              {PAR_VALEUR[donnees.categorie]?.libelle ?? 'Message'}
              {donnees.echeance && ` · échéance : ${dateHeure(donnees.echeance)}`}
            </p>

            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {resume.map(([libelle, valeur]) => (
                <div key={libelle} className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] text-slate-600">{libelle}</dt>
                  <dd className="text-lg font-bold text-slate-900">{valeur}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {destinataires.map((d) => {
                const etat = ETATS[d.etat] ?? ETATS.EN_ATTENTE
                const Icone = etat.icone
                return (
                  <li key={d.matricule} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar prenom={d.prenom} nom={d.nom} photoUrl={d.photo_url} taille="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                      {d.prenom} {d.nom}
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold ${etat.classes}`}>
                      <Icone className="size-3.5" aria-hidden="true" />
                      {etat.libelle}
                      {d.date && <span className="font-normal text-slate-500">· {dateHeure(d.date)}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </Modale>
  )
}

/* ============================================================
   Historique des modifications d'un message
   ============================================================ */
export function PanneauVersions({ message, onFermer }) {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    api
      .get(`/api/messages/${message.reference_message}/versions`)
      .then(({ data }) => {
        if (!annule) setDonnees(data)
      })
      .catch((e) => {
        if (!annule) setErreur(messageErreur(e))
      })
    return () => { annule = true }
  }, [message.reference_message])

  return (
    <Modale titre="Historique des modifications" idTitre="titre-versions" onFermer={onFermer}>
      <div className="space-y-4 px-5 py-4">
        {erreur ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800" role="alert">
            {erreur}
          </p>
        ) : !donnees ? (
          <Chargement />
        ) : (
          <>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Version actuelle</h3>
              {donnees.actuelle.modifie_le && (
                <p className="mt-0.5 text-xs text-slate-600">Modifiée le {dateLongue(donnees.actuelle.modifie_le)}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-900">
                {donnees.actuelle.contenu || 'Aucun texte'}
              </p>
            </section>

            {donnees.anciennes.length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-600">
                Aucune version antérieure n’est conservée pour ce message. L’historique n’existe que pour les
                modifications faites après sa mise en service.
              </p>
            ) : (
              donnees.anciennes.map((v, i) => {
                const origine = i === donnees.anciennes.length - 1
                return (
                  <section key={v.reference_version}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {origine ? 'Version d’origine' : 'Version précédente'}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {origine && donnees.date_envoi && `Envoyée le ${dateLongue(donnees.date_envoi)} · `}
                      Remplacée le {dateLongue(v.remplace_le)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      {v.contenu || 'Aucun texte'}
                    </p>
                  </section>
                )
              })
            )}
          </>
        )}
      </div>
    </Modale>
  )
}

/* ============================================================
   Sélecteur du type de message, dans la zone de saisie
   ============================================================ */
export function SelecteurCategorie({ categorie, onChange }) {
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef(null)

  const courante = PAR_VALEUR[categorie] ?? PAR_VALEUR.NORMAL
  const Icone = courante.icone

  useEffect(() => {
    if (!ouvert) return
    function surClic(e) {
      if (racine.current && !racine.current.contains(e.target)) setOuvert(false)
    }
    function surTouche(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', surClic)
    document.addEventListener('keydown', surTouche)
    return () => {
      document.removeEventListener('mousedown', surClic)
      document.removeEventListener('keydown', surTouche)
    }
  }, [ouvert])

  return (
    <div ref={racine} className="relative">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        title="Type de message"
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
          categorie === 'NORMAL'
            ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            : `${courante.classes} ring-1`
        }`}
      >
        <Icone className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{courante.libelle}</span>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>

      {ouvert && (
        <div
          role="menu"
          aria-label="Type de message"
          className="absolute bottom-full left-0 z-40 mb-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/15"
        >
          {CATEGORIES.map((c) => {
            const IconeItem = c.icone
            const actif = c.valeur === categorie
            return (
              <button
                key={c.valeur}
                type="button"
                role="menuitemradio"
                aria-checked={actif}
                onClick={() => {
                  onChange(c.valeur)
                  setOuvert(false)
                }}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 ${
                  actif ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <IconeItem className="mt-0.5 size-4 shrink-0 text-slate-700" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{c.libelle}</span>
                  <span className="block text-xs leading-snug text-slate-600">{c.aide}</span>
                </span>
                {actif && <Check className="mt-0.5 size-4 shrink-0 text-indigo-700" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
