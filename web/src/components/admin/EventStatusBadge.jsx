const styles = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REGISTRATION_CLOSED: 'bg-amber-50 text-amber-700 ring-amber-200',
  COMPLETED: 'bg-blue-50 text-blue-700 ring-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
}

export default function EventStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${styles[status] || styles.DRAFT}`}>
      {status?.replaceAll('_', ' ') || 'DRAFT'}
    </span>
  )
}
