import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import StatCard from '../../components/admin/StatCard'
import EmptyState from '../../components/admin/EmptyState'
import AdminIcon from '../../components/admin/AdminIcon'
import {
  createFaculty,
  getAdminUserById,
  getAdminUserStatistics,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
} from '../../services/adminUsersService'
import { getApiErrorMessage } from '../../services/api'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function Modal({ title, onClose, children, size = '' }) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={`admin-modal ${size}`} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <header className="admin-modal-header">
          <h2 id="admin-modal-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"><AdminIcon name="close" size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function DetailsModal({ user, onClose, onEdit }) {
  return (
    <Modal title="User Details" onClose={onClose}>
      <dl className="admin-details-list">
        <div><dt>Name</dt><dd>{user.name}</dd></div>
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Role</dt><dd><span className="admin-role-badge">{user.role}</span></dd></div>
        <div><dt>Account Status</dt><dd><span className={`admin-status-badge status-${user.status.toLowerCase()}`}>{user.status}</span></dd></div>
        <div><dt>Created</dt><dd>{formatDate(user.createdAt)}</dd></div>
        <div><dt>Updated</dt><dd>{formatDate(user.updatedAt)}</dd></div>
      </dl>
      <footer className="admin-modal-actions">
        <button className="admin-secondary-button" type="button" onClick={onClose}>Close</button>
        <button className="admin-primary-button" type="button" onClick={() => onEdit(user)}>Edit profile</button>
      </footer>
    </Modal>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statistics, setStatistics] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [modalUser, setModalUser] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [editName, setEditName] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timeout)
  }, [search])

  const loadStatistics = useCallback(async () => {
    try {
      const response = await getAdminUserStatistics()
      setStatistics(response.data?.data?.statistics || null)
    } catch {
      setStatistics(null)
    }
  }, [])

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        limit: pagination.limit,
        search: debouncedSearch,
        role: role || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      }
      const response = await getAdminUsers(params)
      const data = response.data?.data
      setUsers(data?.users || [])
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (requestError) {
      setUsers([])
      setError(getApiErrorMessage(requestError, 'Unable to load users.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pagination.limit, role, sortBy, sortOrder, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatistics()
  }, [loadStatistics])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers(1)
  }, [debouncedSearch, role, status, sortBy, sortOrder, loadUsers])

  function openModal(type, user = null) {
    setActionError('')
    setActionSuccess('')
    setModalUser(user)
    setModal(type)
    setEditName(user?.name || '')
  }

  function closeModal() {
    setModal(null)
    setModalUser(null)
    setActionError('')
  }

  async function openDetails(user) {
    setActionError('')
    setModal('details-loading')
    setModalUser(user)
    try {
      const response = await getAdminUserById(user.id)
      setModalUser(response.data?.data?.user || user)
      setModal('details')
    } catch (requestError) {
      setModal(null)
      setActionError(getApiErrorMessage(requestError, 'Unable to load user details.'))
    }
  }

  async function submitEdit(event) {
    event.preventDefault()
    setActionError('')
    setSubmitting(true)
    try {
      await updateAdminUser(modalUser.id, { name: editName.trim() })
      setActionSuccess('User profile updated successfully.')
      closeModal()
      await Promise.all([loadUsers(pagination.page), loadStatistics()])
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Unable to update the user profile.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitStatusChange() {
    if (!modalUser) return
    setActionError('')
    setSubmitting(true)
    try {
      await updateAdminUserStatus(modalUser.id, modalUser.nextStatus)
      setActionSuccess(modalUser.nextStatus === 'ACTIVE'
        ? 'User account activated successfully.'
        : `User account changed to ${modalUser.nextStatus}.`)
      closeModal()
      await Promise.all([loadUsers(pagination.page), loadStatistics()])
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Unable to change account status.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitFaculty(event) {
    event.preventDefault()
    setActionError('')

    if (facultyForm.password !== facultyForm.confirmPassword) {
      setActionError('Password confirmation does not match.')
      return
    }

    setSubmitting(true)
    try {
      await createFaculty({
        name: facultyForm.name.trim(),
        email: facultyForm.email.trim(),
        password: facultyForm.password,
      })
      setActionSuccess('Faculty account created successfully.')
      setFacultyForm({ name: '', email: '', password: '', confirmPassword: '' })
      closeModal()
      await Promise.all([loadUsers(1), loadStatistics()])
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Unable to create the Faculty account.'))
    } finally {
      setSubmitting(false)
    }
  }

  function statusAction(user) {
    if (user.status === 'ACTIVE') {
      return (
        <>
          <button type="button" onClick={() => openModal('status', { ...user, nextStatus: 'INACTIVE', actionLabel: 'Deactivate Account' })}>Deactivate</button>
          <button type="button" onClick={() => openModal('status', { ...user, nextStatus: 'SUSPENDED', actionLabel: 'Suspend Account' })}>Suspend</button>
        </>
      )
    }
    return (
      <button type="button" onClick={() => openModal('status', { ...user, nextStatus: 'ACTIVE', actionLabel: 'Reactivate Account' })}>Activate</button>
    )
  }

  const statisticsCards = statistics ? [
    { label: 'Total Users', value: statistics.totalUsers, icon: 'users' },
    { label: 'Students', value: statistics.students, icon: 'users' },
    { label: 'Faculty', value: statistics.faculty, icon: 'faculty' },
    { label: 'Active Users', value: statistics.activeUsers, icon: 'clipboard' },
    { label: 'Suspended Users', value: statistics.suspendedUsers, icon: 'settings' },
  ] : null

  function changeSort(field) {
    if (sortBy === field) {
      setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage platform accounts, roles, and account access."
        actions={<button className="admin-primary-button" type="button" onClick={() => openModal('faculty')}><AdminIcon name="plus" size={17} />Add Faculty</button>}
      />

      {actionSuccess && <div className="admin-feedback success" role="status">{actionSuccess}</div>}
      {actionError && <div className="admin-feedback error" role="alert">{actionError}</div>}

      {statisticsCards ? (
        <div className="admin-user-stats" aria-label="User statistics">
          {statisticsCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      ) : (
        <div className="admin-stat-unavailable">User statistics are unavailable.</div>
      )}

      <section className="admin-section-card admin-users-card" aria-label="User accounts">
        <div className="admin-users-toolbar">
          <label className="admin-search-field">
            <span className="sr-only">Search users</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
            />
          </label>
          <label>
            <span className="sr-only">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="FACULTY">Faculty</option>
              <option value="STUDENT">Student</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Account status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="admin-table-loading" role="status">Loading users…</div>
        ) : error ? (
          <div className="admin-table-error" role="alert">
            <p>{error}</p>
            <button className="admin-secondary-button" type="button" onClick={() => void loadUsers(pagination.page)}>Retry</button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try changing the search or filters." icon="users" />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th><button type="button" onClick={() => changeSort('name')}>Name</button></th>
                  <th><button type="button" onClick={() => changeSort('email')}>Email</button></th>
                  <th><button type="button" onClick={() => changeSort('role')}>Role</button></th>
                  <th><button type="button" onClick={() => changeSort('status')}>Account Status</button></th>
                  <th><button type="button" onClick={() => changeSort('createdAt')}>Created</button></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td><span className="admin-role-badge">{user.role}</span></td>
                    <td><span className={`admin-status-badge status-${user.status.toLowerCase()}`}>{user.status}</span></td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => void openDetails(user)}>View</button>
                        <button type="button" onClick={() => openModal('edit', user)}>Edit</button>
                        {statusAction(user)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <footer className="admin-pagination">
            <span>{pagination.total} users</span>
            <div>
              <button type="button" disabled={pagination.page <= 1} onClick={() => void loadUsers(pagination.page - 1)}>Previous</button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadUsers(pagination.page + 1)}>Next</button>
            </div>
          </footer>
        )}
      </section>

      {modal === 'faculty' && (
        <Modal title="Add Faculty" onClose={closeModal}>
          <form className="admin-modal-form" onSubmit={submitFaculty}>
            {actionError && <p className="admin-form-error" role="alert">{actionError}</p>}
            <label>Full Name<input value={facultyForm.name} onChange={(event) => setFacultyForm((form) => ({ ...form, name: event.target.value }))} minLength={2} maxLength={100} required /></label>
            <label>Email<input type="email" value={facultyForm.email} onChange={(event) => setFacultyForm((form) => ({ ...form, email: event.target.value }))} maxLength={255} required /></label>
            <label>Initial Password<input type="password" value={facultyForm.password} onChange={(event) => setFacultyForm((form) => ({ ...form, password: event.target.value }))} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
            <label>Confirm Password<input type="password" value={facultyForm.confirmPassword} onChange={(event) => setFacultyForm((form) => ({ ...form, confirmPassword: event.target.value }))} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
            <footer className="admin-modal-actions">
              <button className="admin-secondary-button" type="button" onClick={closeModal}>Cancel</button>
              <button className="admin-primary-button" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Faculty'}</button>
            </footer>
          </form>
        </Modal>
      )}

      {modal === 'details-loading' && (
        <Modal title="User Details" onClose={closeModal}>
          <div className="admin-modal-loading">Loading user…</div>
        </Modal>
      )}

      {modal === 'details' && modalUser && (
        <DetailsModal
          user={modalUser}
          onClose={closeModal}
          onEdit={(user) => openModal('edit', user)}
        />
      )}

      {modal === 'edit' && modalUser && (
        <Modal title="Edit Profile" onClose={closeModal}>
          <form className="admin-modal-form" onSubmit={submitEdit}>
            {actionError && <p className="admin-form-error" role="alert">{actionError}</p>}
            <label>Full Name<input value={editName} onChange={(event) => setEditName(event.target.value)} minLength={2} maxLength={100} required /></label>
            <footer className="admin-modal-actions">
              <button className="admin-secondary-button" type="button" onClick={closeModal}>Cancel</button>
              <button className="admin-primary-button" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</button>
            </footer>
          </form>
        </Modal>
      )}

      {modal === 'status' && modalUser && (
        <Modal title={modalUser.actionLabel} onClose={closeModal}>
          <div className="admin-confirmation">
            <p>Change <strong>{modalUser.name}</strong> to <strong>{modalUser.nextStatus}</strong>?</p>
            {modalUser.nextStatus !== 'ACTIVE' && <p className="admin-confirmation-warning">Active refresh tokens for this account will be revoked.</p>}
            {actionError && <p className="admin-form-error" role="alert">{actionError}</p>}
          </div>
          <footer className="admin-modal-actions">
            <button className="admin-secondary-button" type="button" onClick={closeModal}>Cancel</button>
            <button className="admin-primary-button" type="button" onClick={() => void submitStatusChange()} disabled={submitting}>{submitting ? 'Applying…' : 'Confirm change'}</button>
          </footer>
        </Modal>
      )}
    </>
  )
}
