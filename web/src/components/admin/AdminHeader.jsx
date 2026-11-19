import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import AdminIcon from './AdminIcon'

const pageTitles = {
  '/admin': ['Overview', 'Overview'],
  '/admin/users': ['User Management', 'Users'],
  '/admin/events': ['Hackathons / Events', 'Events'],
  '/admin/registrations': ['Teams & Registrations', 'Registrations'],
  '/admin/faculty': ['Faculty Management', 'Faculty'],
  '/admin/evaluators': ['Evaluators', 'Evaluators'],
  '/admin/analytics': ['Reports & Analytics', 'Analytics'],
  '/admin/settings': ['Platform Settings', 'Settings'],
}

export default function AdminHeader({ onMenuToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef(null)
  const [title, breadcrumb] = pageTitles[location.pathname] || ['Admin', 'Administration']

  useEffect(() => {
    function closeMenu(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    const result = await logout()
    navigate('/login', {
      replace: true,
      state: result.errorMessage
        ? { noticeError: `You were signed out locally, but the server could not confirm logout: ${result.errorMessage}` }
        : { notice: 'You have been signed out.' },
    })
  }

  return (
    <header className="admin-header">
      <div className="admin-header-context">
        <button className="admin-menu-button" type="button" onClick={onMenuToggle} aria-label="Toggle sidebar">
          <AdminIcon name="menu" size={21} />
        </button>
        <div>
          <div className="admin-breadcrumb"><span>Admin</span><b>/</b><span>{breadcrumb}</span></div>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="admin-profile" ref={menuRef}>
        <button
          className="admin-profile-button"
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="admin-avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
          <span className="admin-profile-copy">
            <strong>{user?.name || 'Admin'}</strong>
            <small>{user?.email || 'Administrator'}</small>
          </span>
          <span className="admin-profile-caret" aria-hidden="true">⌄</span>
        </button>
        {menuOpen && (
          <div className="admin-profile-menu" role="menu">
            <div className="admin-profile-summary">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
              <small>{user?.role}</small>
            </div>
            <button type="button" role="menuitem" onClick={() => void handleLogout()} disabled={isLoggingOut}>
              <AdminIcon name="logout" size={17} />
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
