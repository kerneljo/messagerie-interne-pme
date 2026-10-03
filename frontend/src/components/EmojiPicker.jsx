import { useEffect, useRef } from 'react'

const CATEGORIES = [
  {
    id: 'frequents',
    nom: 'Fréquents',
    emojis: ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅', '🎉', '👏', '😊', '🤔', '😍', '🥳', '😅', '🙌', '💪', '👀', '💡', '⚡', '⭐', '🚀', '💯', '🎯'],
  },
  {
    id: 'emotions',
    nom: 'Émotions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
  },
  {
    id: 'gestes',
    nom: 'Gestes',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🦾', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲'],
  },
  {
    id: 'animaux',
    nom: 'Animaux',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄'],
  },
  {
    id: 'nourriture',
    nom: 'Nourriture',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🌽', '🥕', '🌶️', '🥒', '🥬', '🍞', '🥐', '🥖', '🍔', '🍕', '🍟'],
  },
  {
    id: 'activites',
    nom: 'Activités',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘'],
  },
  {
    id: 'objets',
    nom: 'Objets',
    emojis: ['📎', '📁', '📂', '📅', '📆', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔑', '🔨', '🔧', '🔩', '⚙️', '💼', '📞', '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '💡', '🔔', '📢', '📣', '⏰', '⏱️'],
  },
  {
    id: 'symboles',
    nom: 'Symboles',
    emojis: ['✅', '❌', '⚠️', '❗', '❓', '💯', '🔥', '⭐', '✨', '💫', '⚡', '💥', '💢', '💤', '💬', '💭', '🗯️', '♻️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔺', '🔻', '🔸', '🔹'],
  },
]

export const HAUTEUR_PICKER = 380
export const LARGEUR_PICKER = 340

export default function EmojiPicker({ onSelection, onFermer }) {
  const ref = useRef(null)

  // Fermeture avec Échap
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onFermer])

  return (
    <div
      ref={ref}
      className="flex flex-col overflow-hidden rounded-2xl bg-white"
      style={{
        width: LARGEUR_PICKER,
        height: HAUTEUR_PICKER,
        boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      }}
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50 px-3.5 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Emojis
        </span>
        <button
          type="button"
          onClick={onFermer}
          className="flex size-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
          aria-label="Fermer"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto bg-white px-3 py-2" style={{ overscrollBehavior: 'contain' }}>
        {CATEGORIES.map((cat, idx) => (
          <div key={cat.id} className={idx > 0 ? 'mt-4' : ''}>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {cat.nom}
            </h4>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji, i) => (
                <button
                  key={`${cat.id}-${emoji}-${i}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelection(emoji)
                    onFermer()
                  }}
                  className="flex size-9 items-center justify-center rounded-lg text-xl
                             transition-all hover:scale-110 hover:bg-slate-100 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
