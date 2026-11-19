import { Link } from 'react-router-dom'
import AdminIcon from './AdminIcon'

export default function QuickActionCard({ title, description, to, icon }) {
  return (
    <Link className="admin-quick-action" to={to}>
      <span className="admin-quick-icon"><AdminIcon name={icon} size={19} /></span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <AdminIcon name="chevron" size={16} />
    </Link>
  )
}
