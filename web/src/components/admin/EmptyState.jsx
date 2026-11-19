import AdminIcon from './AdminIcon'

export default function EmptyState({ title, description, icon = 'clipboard', action }) {
  return (
    <div className="admin-empty-state">
      <span className="admin-empty-icon"><AdminIcon name={icon} size={22} /></span>
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
