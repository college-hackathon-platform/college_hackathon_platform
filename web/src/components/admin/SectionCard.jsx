export default function SectionCard({ title, description, action, children, className = '' }) {
  return (
    <section className={`admin-section-card ${className}`}>
      {(title || action) && (
        <header className="admin-section-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
