import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import AdminSidebar from './AdminSidebar'
import '../../admin.css'

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

function readCollapsedPreference() {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  return false
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // localStorage may be unavailable
    }
  }, [collapsed])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [mobileOpen])

  const handleToggle = useCallback(() => {
    if (window.innerWidth <= 860) {
      setMobileOpen((open) => !open)
    } else {
      setCollapsed((value) => !value)
    }
  }, [])

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={handleToggle}
      />
      <div className="admin-workspace">
        <AdminHeader onMenuToggle={() => setMobileOpen((open) => !open)} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}