import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Smile } from 'lucide-react'
import EmojiPicker from './EmojiPicker'

export default function EditeurRiche({ value, onChange, placeholder = 'Écrivez votre message…' }) {
  const textareaRef = useRef(null)
  const emojiRef = useRef(null)
  const [emojiOuvert, setEmojiOuvert] = useState(false)

  // Fermeture du picker au clic extérieur (le bouton emoji est exclu pour éviter la réouverture)
  useEffect(() => {
    if (!emojiOuvert) return
    function surClic(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOuvert(false)
    }
    document.addEventListener('mousedown', surClic)
    return () => document.removeEventListener('mousedown', surClic)
  }, [emojiOuvert])

  function insererTexte(avant, apres = '') {
    const ta = textareaRef.current
    if (!ta) return
    const debut = ta.selectionStart
    const fin = ta.selectionEnd
    const selection = value.substring(debut, fin) || 'texte'
    const nouveau = value.substring(0, debut) + avant + selection + apres + value.substring(fin)
    onChange(nouveau)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(debut + avant.length, debut + avant.length + selection.length)
    })
  }

  function insererEmoji(emoji) {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart ?? value.length
    const nouveau = value.substring(0, pos) + emoji + value.substring(pos)
    onChange(nouveau)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(pos + emoji.length, pos + emoji.length)
    })
  }

  function insererLien() {
    const saisie = window.prompt('Adresse du lien (https://…) :')
    if (!saisie) return
    const url = /^https?:\/\//i.test(saisie.trim()) ? saisie.trim() : `https://${saisie.trim()}`
    // Seuls http et https sont acceptés
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return
    insererTexte('[', `](${url})`)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Corps du message"
        rows={8}
        maxLength={5000}
        className="w-full resize-none border-0 bg-transparent px-1 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
      />

      {/* Barre d'outils : uniquement ce qui fonctionne */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
          <BoutonOutil icone={Bold} label="Gras" onClick={() => insererTexte('**', '**')} />
          <BoutonOutil icone={Italic} label="Italique" onClick={() => insererTexte('*', '*')} />
          <div className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
          <BoutonOutil icone={List} label="Liste à puces" onClick={() => insererTexte('- ', '\n')} />
          <BoutonOutil icone={ListOrdered} label="Liste numérotée" onClick={() => insererTexte('1. ', '\n')} />
          <div className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
          <BoutonOutil icone={LinkIcon} label="Lien" onClick={insererLien} />
        </div>

        {/* Emoji : le picker s'ouvre au-dessus du bouton */}
        <div className="relative" ref={emojiRef}>
          <BoutonOutil
            icone={Smile}
            label="Emoji"
            actif={emojiOuvert}
            onClick={() => setEmojiOuvert(!emojiOuvert)}
          />
          {emojiOuvert && (
            <div className="absolute bottom-full right-0 z-50 mb-2">
              <EmojiPicker
                onSelection={insererEmoji}
                onFermer={() => setEmojiOuvert(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BoutonOutil({ icone: Icone, label, onClick, actif }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={actif === undefined ? undefined : actif}
      title={label}
      className={`rounded-md p-2 transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
        actif
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icone className="size-4" />
    </button>
  )
}
