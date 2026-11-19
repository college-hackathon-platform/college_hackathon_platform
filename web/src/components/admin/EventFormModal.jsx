import { useState } from 'react'

const emptyForm = {
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  mode: 'ONLINE',
  startDate: '',
  endDate: '',
  registrationStartDate: '',
  registrationEndDate: '',
  venue: '',
  registrationCapacity: '',
  minTeamSize: '1',
  maxTeamSize: '1',
  eligibility: '',
  rules: '',
}

function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function numberOrNull(value) {
  if (value === '') return null
  const number = Number(value)
  return Number.isInteger(number) ? number : value
}

export default function EventFormModal({ event, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(() => event ? {
      title: event.title || '',
      slug: event.slug || '',
      shortDescription: event.shortDescription || '',
      description: event.description || '',
      mode: event.mode || 'ONLINE',
      startDate: toInputDate(event.startDate),
      endDate: toInputDate(event.endDate),
      registrationStartDate: toInputDate(event.registrationStartDate),
      registrationEndDate: toInputDate(event.registrationEndDate),
      venue: event.venue || '',
      registrationCapacity: event.registrationCapacity?.toString() || '',
      minTeamSize: event.minTeamSize?.toString() || '1',
      maxTeamSize: event.maxTeamSize?.toString() || '1',
      eligibility: event.eligibility || '',
      rules: event.rules || '',
    } : emptyForm)

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function submit(eventObject) {
    eventObject.preventDefault()
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      mode: form.mode,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      registrationStartDate: form.registrationStartDate ? new Date(form.registrationStartDate).toISOString() : null,
      registrationEndDate: form.registrationEndDate ? new Date(form.registrationEndDate).toISOString() : null,
      venue: form.venue.trim() || null,
      registrationCapacity: numberOrNull(form.registrationCapacity),
      minTeamSize: Number(form.minTeamSize),
      maxTeamSize: Number(form.maxTeamSize),
      eligibility: form.eligibility.trim() || null,
      rules: form.rules.trim() || null,
    }
    onSubmit(payload)
  }

  const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
  const labelClass = 'block text-sm font-semibold text-slate-700'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" role="presentation" onMouseDown={(mouseEvent) => {
      if (mouseEvent.target === mouseEvent.currentTarget && !submitting) onClose()
    }}>
      <section className="max-h-[calc(100svh-24px)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{event ? 'Update event' : 'New event'}</p>
            <h2 id="event-form-title" className="mt-1 text-lg font-bold text-slate-900">{event ? 'Edit event' : 'Create new event'}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-blue-100" aria-label="Close event form">×</button>
        </header>

        <form onSubmit={submit}>
          <div className="grid gap-7 p-5 sm:p-6">
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}

            <fieldset className="grid gap-4">
              <legend className="mb-1 text-sm font-bold text-slate-900">Basic Information</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>Event title<input className={inputClass} value={form.title} onChange={(e) => setField('title', e.target.value)} minLength={3} maxLength={180} required /></label>
                <label className={labelClass}>URL slug<input className={`${inputClass} font-mono`} value={form.slug} onChange={(e) => setField('slug', e.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="campus-hackathon-2026" /></label>
              </div>
              <label className={labelClass}>Short description<input className={inputClass} value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} maxLength={300} /></label>
              <label className={labelClass}>Description<textarea className={`${inputClass} min-h-28 py-3`} value={form.description} onChange={(e) => setField('description', e.target.value)} maxLength={10000} /></label>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-slate-100 pt-5">
              <legend className="text-sm font-bold text-slate-900">Event Schedule</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Event start<input type="datetime-local" className={inputClass} value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} /></label>
                <label className={labelClass}>Event end<input type="datetime-local" className={inputClass} value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} /></label>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-slate-100 pt-5">
              <legend className="text-sm font-bold text-slate-900">Registration Configuration</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Registration opens<input type="datetime-local" className={inputClass} value={form.registrationStartDate} onChange={(e) => setField('registrationStartDate', e.target.value)} /></label>
                <label className={labelClass}>Registration closes<input type="datetime-local" className={inputClass} value={form.registrationEndDate} onChange={(e) => setField('registrationEndDate', e.target.value)} /></label>
              </div>
              <label className={labelClass}>Registration capacity<input type="number" min="1" className={inputClass} value={form.registrationCapacity} onChange={(e) => setField('registrationCapacity', e.target.value)} placeholder="Leave empty for unlimited" /></label>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-slate-100 pt-5">
              <legend className="text-sm font-bold text-slate-900">Team Configuration</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Minimum team size<input type="number" min="1" className={inputClass} value={form.minTeamSize} onChange={(e) => setField('minTeamSize', e.target.value)} required /></label>
                <label className={labelClass}>Maximum team size<input type="number" min="1" className={inputClass} value={form.maxTeamSize} onChange={(e) => setField('maxTeamSize', e.target.value)} required /></label>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-slate-100 pt-5">
              <legend className="text-sm font-bold text-slate-900">Event Mode and Venue</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Event mode<select className={inputClass} value={form.mode} onChange={(e) => setField('mode', e.target.value)}><option value="ONLINE">Online</option><option value="OFFLINE">Offline</option><option value="HYBRID">Hybrid</option></select></label>
                <label className={labelClass}>Venue{(form.mode === 'OFFLINE' || form.mode === 'HYBRID') && <span className="text-red-600"> *</span>}<input className={inputClass} value={form.venue} onChange={(e) => setField('venue', e.target.value)} required={form.mode !== 'ONLINE'} /></label>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-slate-100 pt-5">
              <legend className="text-sm font-bold text-slate-900">Eligibility and Rules</legend>
              <label className={labelClass}>Eligibility<textarea className={`${inputClass} min-h-20 py-3`} value={form.eligibility} onChange={(e) => setField('eligibility', e.target.value)} maxLength={1000} /></label>
              <label className={labelClass}>Rules<textarea className={`${inputClass} min-h-24 py-3`} value={form.rules} onChange={(e) => setField('rules', e.target.value)} maxLength={10000} /></label>
            </fieldset>
          </div>

          <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Saving…' : event ? 'Save changes' : 'Create draft'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
