import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MessagerieProvider } from '../MessagerieContext'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [menuOuvert, setMenuOuvert] = useState(false)

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
      <div className="flex h-dvh bg-slate-100 text-slate-800">
        <Sidebar
          ouvert={menuOuvert}
          onFermer={() => setMenuOuvert(false)}
          replie={sidebarRepliee}
          onBasculerRepli={basculerRepli}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenu={() => setMenuOuvert(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </MessagerieProvider>
  )
}
