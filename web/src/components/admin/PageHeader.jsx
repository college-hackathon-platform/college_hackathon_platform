export default function PageHeader({ title, description, actions }) {
  return (
    <div className="admin-page-header">
      <div>
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  )
}
