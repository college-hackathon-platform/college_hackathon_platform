import AdminIcon from './AdminIcon'

export default function StatCard({ label, value, description, icon }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-icon"><AdminIcon name={icon} size={20} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {description && <small>{description}</small>}
      </div>
    </article>
  )
}
