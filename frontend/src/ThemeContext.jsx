import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const THEMES = ['laterite', 'dark', 'clair']
const STORAGE_KEY = 'app-theme'

function lireThemeInitial() {
  const stocke = localStorage.getItem(STORAGE_KEY)
  return THEMES.includes(stocke) ? stocke : 'laterite'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(lireThemeInitial)

  useEffect(() => {
    const racine = document.documentElement
    if (theme === 'laterite') {
      racine.removeAttribute('data-theme')
    } else {
      racine.setAttribute('data-theme', theme)
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider')
  return ctx
}
