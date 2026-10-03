import { useEffect, useRef, useState } from 'react'

const CATEGORIES = {
  'Fréquents': ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅', '🎉', '👏', '😊', '🤔', '😍', '🥳', '😅', '🙌', '💪', '👀', '💡', '⚡', '⭐', '🚀', '💯', '🎯'],
  'Émotions': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
  'Gestes': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🦾', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲'],
  'Objets': ['📎', '📁', '📂', '📅', '📆', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔑', '🔨', '🔧', '🔩', '⚙️', '💼', '📞', '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '💡', '🔔', '📢', '📣', '⏰', '⏱️'],
  'Symboles': ['✅', '❌', '⚠️', '❗', '❓', '💯', '🔥', '⭐', '✨', '💫', '⚡', '💥', '💢', '💤', '💬', '💭', '🗯️', '♻️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔺', '🔻', '🔸', '🔹'],
}

export default function EmojiPicker({ onSelection, onFermer }) {
  const [categorie, setCategorie] = useState('Fréquents')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onFermer()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onFermer])

  const emojis = CATEGORIES[categorie] || []

  return (
    <div
      ref={ref}
      className="w-80 rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/15 ring-1 ring-black/5 overflow-hidden"
    >
      {/* Onglets catégories */}
      <div className="flex items-center gap-1 border-b border-slate-100 p-2 overflow-x-auto">
        {Object.keys(CATEGORIES).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategorie(cat)}
            className={`rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap transition ${
              categorie === cat
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille d'emojis */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-64 overflow-y-auto">
        {emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => onSelection(emoji)}
            className="flex size-9 items-center justify-center rounded-md text-xl hover:bg-slate-100 active:scale-90 transition"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
