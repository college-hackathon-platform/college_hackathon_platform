import { Link } from 'react-router-dom'
import PageHeader from './PageHeader'
import SectionCard from './SectionCard'

export default function PlaceholderPage({ title, description, moduleName }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Link className="admin-secondary-button" to="/admin">Back to overview</Link>}
      />
      <SectionCard>
        <div className="admin-placeholder">
          <span className="admin-placeholder-mark">—</span>
          <h2>{moduleName} is not implemented yet</h2>
          <p>This module is reserved for a future task. No data has been added or simulated here.</p>
          <Link className="admin-primary-button" to="/admin">Return to overview</Link>
        </div>
      </SectionCard>
    </>
  )
}
