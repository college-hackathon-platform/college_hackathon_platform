import { NavLink } from 'react-router-dom'
import { adminNavigation } from '../../config/adminNavigation'
import AdminIcon from './AdminIcon'

export default function AdminSidebar({ collapsed, mobileOpen, onClose, onToggle }) {
  return (
    <>
      {mobileOpen && (
        <button className="admin-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={onClose} />
      )}
      <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <span className="admin-brand-mark">C</span>
          {!collapsed && (
            <span className="admin-brand-name">
              <strong>Campus</strong>
              <small>Admin Console</small>
            </span>
          )}
          <button className="admin-mobile-close" type="button" onClick={onClose} aria-label="Close sidebar">
            <AdminIcon name="close" />
          </button>
        </div>

        <nav className="admin-navigation" aria-label="Admin navigation">
          {adminNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
              title={collapsed ? item.label : undefined}
              onClick={onClose}
            >
              <AdminIcon name={item.icon} size={19} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button className="admin-collapse-button" type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span className={collapsed ? '' : 'is-flipped'}><AdminIcon name="chevron" size={17} /></span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    </>
  )
}
