import { useRef, useState } from 'react'
import {
  Bold, Italic, Link as LinkIcon, List, ListOrdered,
  Paperclip, Smile, AtSign, Image as ImageIcon, Code,
} from 'lucide-react'
import EmojiPicker from './EmojiPicker'

export default function EditeurRiche({ value, onChange, placeholder = 'Écrivez votre message…' }) {
  const textareaRef = useRef(null)
  const [emojiOuvert, setEmojiOuvert] = useState(false)

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

  function insererMention() {
    insererTexte('@', ' ')
  }

  function insererLien() {
    const url = prompt('URL du lien :')
    if (!url) return
    insererTexte('[', `](${url})`)
  }

  return (
    <div className="relative">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        maxLength={5000}
        className="w-full resize-none border-0 bg-transparent px-1 py-2 text-sm
                   text-slate-900 placeholder-slate-400
                   focus:outline-none"
      />

      {/* Barre d'outils en bas (comme Facebook) */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
        {/* Groupe gauche : formatage */}
        <div className="flex items-center gap-0.5">
          <BoutonOutil icone={Bold} label="Gras" onClick={() => insererTexte('**', '**')} />
          <BoutonOutil icone={Italic} label="Italique" onClick={() => insererTexte('*', '*')} />
          <BoutonOutil icone={Code} label="Code" onClick={() => insererTexte('`', '`')} />
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <BoutonOutil icone={List} label="Liste" onClick={() => insererTexte('- ', '\n')} />
          <BoutonOutil icone={ListOrdered} label="Liste numérotée" onClick={() => insererTexte('1. ', '\n')} />
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <BoutonOutil icone={LinkIcon} label="Lien" onClick={insererLien} />
          <BoutonOutil icone={ImageIcon} label="Image" onClick={() => insererTexte('![alt](', ')')} />
          <BoutonOutil icone={AtSign} label="Mention" onClick={insererMention} />
        </div>

        {/* Groupe droite : pièce jointe + emoji */}
        <div className="flex items-center gap-0.5">
          <BoutonOutil icone={Paperclip} label="Pièce jointe" onClick={() => {}} />
          <BoutonOutil
            icone={Smile}
            label="Emoji"
            actif={emojiOuvert}
            onClick={() => setEmojiOuvert(!emojiOuvert)}
          />
        </div>
      </div>

      {/* Sélecteur d'emojis ancré en bas à droite */}
      {emojiOuvert && (
        <div className="absolute bottom-12 right-0 z-50">
          <EmojiPicker
            onSelection={(emoji) => {
              insererEmoji(emoji)
              // On garde le picker ouvert pour permettre plusieurs emojis (comme Facebook)
            }}
            onFermer={() => setEmojiOuvert(false)}
          />
        </div>
      )}
    </div>
  )
}

function BoutonOutil({ icone: Icone, label, onClick, actif }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-2 transition ${
        actif
          ? 'bg-indigo-50 text-indigo-600'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
      aria-label={label}
      title={label}
    >
      <Icone className="size-4" />
    </button>
  )
}
