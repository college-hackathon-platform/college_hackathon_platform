import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import AdminSidebar from './AdminSidebar'
import '../../admin.css'

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={() => {
          if (window.innerWidth <= 860) setMobileOpen(false)
          else setCollapsed((value) => !value)
        }}
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
