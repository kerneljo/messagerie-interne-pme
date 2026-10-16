import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MessagerieProvider } from '../MessagerieContext'
import { EnteteContext } from '../EnteteContext'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const { pathname } = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [slotEntete, setSlotEntete] = useState(null)

  // Sur /conversations, la page gère ses propres en-têtes (liste + discussion)
  const pleinePage = pathname.startsWith('/conversations')

  // Persistance du choix "sidebar repliée" dans localStorage
  const [sidebarRepliee, setSidebarRepliee] = useState(
    () => localStorage.getItem('sidebarRepliee') === 'true'
  )

  function basculerRepli() {
    setSidebarRepliee((v) => {
      const nouveau = !v
      localStorage.setItem('sidebarRepliee', String(nouveau))
      return nouveau
    })
  }

  return (
    <MessagerieProvider>
      <EnteteContext.Provider value={slotEntete}>
        <div className="flex h-dvh bg-creme text-slate-800">
          <Sidebar
            ouvert={menuOuvert}
            onFermer={() => setMenuOuvert(false)}
            replie={sidebarRepliee}
            onBasculerRepli={basculerRepli}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            {!pleinePage && (
              <Header onMenu={() => setMenuOuvert(true)} refEmplacement={setSlotEntete} />
            )}
            <main
              className={`min-h-0 flex-1 bg-creme ${
                pleinePage ? 'overflow-hidden' : 'overflow-y-auto'
              }`}
            >
              <Outlet context={{ ouvrirMenu: () => setMenuOuvert(true) }} />
            </main>
          </div>
        </div>
      </EnteteContext.Provider>
    </MessagerieProvider>
  )
}
