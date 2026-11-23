import { useState, useEffect, useRef } from 'react'
import SectionCard from './SectionCard'
import { getReportPreview, exportReport } from '../../services/analyticsService'
import { getApiErrorMessage } from '../../services/api'

const REPORT_TYPE_OPTIONS = [
  { value: 'PLATFORM_OVERVIEW', label: 'Platform Overview Report' },
  { value: 'USER_ANALYTICS', label: 'User Analytics Report' },
  { value: 'EVENT_ANALYTICS', label: 'Event Analytics Report' },
  { value: 'TEAM_ANALYTICS', label: 'Team Analytics Report' },
  { value: 'REGISTRATION_ANALYTICS', label: 'Registration Analytics Report' },
  { value: 'PARTICIPATION_ANALYTICS', label: 'Participation Analytics Report' },
]

const FORMAT_OPTIONS = [
  { value: 'CSV', label: 'CSV (Spreadsheet / UTF-8)' },
  { value: 'XLSX', label: 'Excel (XLSX Workbook)' },
  { value: 'PDF', label: 'PDF Document' },
]

export default function ReportsExportSection({
  appliedFilters = {},
  events = [],
}) {
  const [reportType, setReportType] = useState('PLATFORM_OVERVIEW')
  const [format, setFormat] = useState('CSV')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportSuccess, setExportSuccess] = useState('')
  const [exportError, setExportError] = useState('')

  const requestIdRef = useRef(0)

  // Load preview whenever filters or reportType change
  useEffect(() => {
    let ignore = false
    const currentReq = ++requestIdRef.current

    // Trigger async fetch without calling setState synchronously in the effect
    const params = {
      reportType,
      ...(appliedFilters.startDate ? { startDate: appliedFilters.startDate } : {}),
      ...(appliedFilters.endDate ? { endDate: appliedFilters.endDate } : {}),
      ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
      interval: appliedFilters.interval || 'MONTH',
    }

    getReportPreview(params)
      .then((res) => {
        if (!ignore && currentReq === requestIdRef.current) {
          setPreviewData(res.data?.data || null)
          setPreviewError('')
          setPreviewLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore && currentReq === requestIdRef.current) {
          setPreviewData(null)
          setPreviewError(getApiErrorMessage(err, 'Failed to generate report preview.'))
          setPreviewLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [reportType, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.eventId, appliedFilters.interval])

  const handleManualRefresh = () => {
    const currentReq = ++requestIdRef.current
    setPreviewLoading(true)
    setPreviewError('')
    setExportSuccess('')
    setExportError('')

    const params = {
      reportType,
      ...(appliedFilters.startDate ? { startDate: appliedFilters.startDate } : {}),
      ...(appliedFilters.endDate ? { endDate: appliedFilters.endDate } : {}),
      ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
      interval: appliedFilters.interval || 'MONTH',
    }

    getReportPreview(params)
      .then((res) => {
        if (currentReq === requestIdRef.current) {
          setPreviewData(res.data?.data || null)
          setPreviewError('')
        }
      })
      .catch((err) => {
        if (currentReq === requestIdRef.current) {
          setPreviewData(null)
          setPreviewError(getApiErrorMessage(err, 'Failed to generate report preview.'))
        }
      })
      .finally(() => {
        if (currentReq === requestIdRef.current) {
          setPreviewLoading(false)
        }
      })
  }

  const handleDownload = async () => {
    setExportLoading(true)
    setExportSuccess('')
    setExportError('')
    try {
      const params = {
        reportType,
        format,
        ...(appliedFilters.startDate ? { startDate: appliedFilters.startDate } : {}),
        ...(appliedFilters.endDate ? { endDate: appliedFilters.endDate } : {}),
        ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
        interval: appliedFilters.interval || 'MONTH',
      }
      const response = await exportReport(params)

      let filename = `${reportType.toLowerCase().replace(/_/g, '-')}.${format.toLowerCase()}`
      const disposition = response.headers?.['content-disposition']
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/i)
        if (match && match[1]) filename = match[1]
      }

      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/octet-stream',
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setExportSuccess(`Report downloaded successfully as ${filename}`)
    } catch (err) {
      setExportError(getApiErrorMessage(err, 'Failed to download report.'))
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div id="reports" className="admin-reports-export-container">
      <SectionCard
        title="Reports Generation & Export"
        description="Generate official reports and export structured analytics datasets in CSV, Excel or PDF formats using real-time database metrics."
      >
        <div className="admin-reports-controls">
          <div className="admin-reports-form-row">
            <div className="admin-reports-field">
              <label htmlFor="reportTypeSelect">Report Type</label>
              <select
                id="reportTypeSelect"
                value={reportType}
                onChange={(e) => {
                  setPreviewLoading(true)
                  setReportType(e.target.value)
                }}
                disabled={previewLoading || exportLoading}
                className="admin-reports-select"
              >
                {REPORT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-reports-field">
              <label htmlFor="formatSelect">Export Format</label>
              <select
                id="formatSelect"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={exportLoading}
                className="admin-reports-select"
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-reports-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={handleManualRefresh}
                disabled={previewLoading || exportLoading}
              >
                {previewLoading ? 'Refreshing Preview...' : 'Refresh Preview'}
              </button>
              <button
                type="button"
                className="admin-primary-button"
                onClick={handleDownload}
                disabled={exportLoading || previewLoading}
              >
                {exportLoading ? 'Generating Export...' : `Export as ${format}`}
              </button>
            </div>
          </div>

          <div className="admin-reports-scope-badge">
            <span>
              Applied Scope:{' '}
              <strong>
                {appliedFilters.eventId
                  ? `Event (${events.find((e) => e.id === appliedFilters.eventId)?.title || appliedFilters.eventId})`
                  : 'Platform-Wide'}
              </strong>
            </span>
            <span>
              Date Range:{' '}
              <strong>
                {appliedFilters.startDate || 'All-time start'} → {appliedFilters.endDate || 'Current'}
              </strong>
            </span>
            <span>
              Interval: <strong>{appliedFilters.interval || 'MONTH'}</strong>
            </span>
          </div>

          {exportSuccess && (
            <div className="admin-reports-feedback success" role="alert">
              <span>✓</span> {exportSuccess}
            </div>
          )}

          {exportError && (
            <div className="admin-reports-feedback error" role="alert">
              <span>⚠</span> {exportError}
            </div>
          )}
        </div>

        {/* Report Preview */}
        <div className="admin-reports-preview-box">
          <div className="admin-reports-preview-header">
            <h4>Report Data Preview</h4>
            {previewData?.metadata && (
              <span className="admin-reports-timestamp">
                Data generated at: {new Date(previewData.metadata.generatedAt).toLocaleString()} (UTC)
              </span>
            )}
          </div>

          {previewLoading ? (
            <div className="analytics-team-empty">Generating report preview...</div>
          ) : previewError ? (
            <div className="analytics-error" role="alert">
              <p>{previewError}</p>
              <button type="button" onClick={handleManualRefresh}>
                Retry
              </button>
            </div>
          ) : previewData ? (
            <div className="admin-reports-preview-content">
              {/* Preview KPI Grid */}
              <div className="admin-reports-kpi-grid">
                {previewData.previewMetrics.map((m, idx) => (
                  <div key={idx} className="admin-reports-kpi-item">
                    <span className="admin-reports-kpi-label">{m.label}</span>
                    <strong className="admin-reports-kpi-value">{m.value ?? 0}</strong>
                  </div>
                ))}
              </div>

              {/* Worksheets / Sections summary table */}
              <div className="admin-reports-sections-list">
                <h5 className="admin-reports-sections-title">Included Worksheets & Data Tables</h5>
                <div className="admin-reports-sheets-accordion">
                  {previewData.sections.map((section, sIdx) => (
                    <div key={sIdx} className="admin-reports-section-card">
                      <div className="admin-reports-section-card-header">
                        <strong>{section.sheetName}</strong>
                        <span className="admin-reports-row-badge">{section.rowCount} rows</span>
                      </div>
                      <div className="admin-reports-table-preview">
                        <table className="admin-users-table">
                          <thead>
                            <tr>
                              {section.columns.map((col, cIdx) => (
                                <th key={cIdx}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.previewRows.length ? (
                              section.previewRows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx}>{cell === null || cell === undefined ? '—' : String(cell)}</td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={section.columns.length} style={{ textAlign: 'center' }}>
                                  No records available for the selected filters.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {section.rowCount > 5 && (
                          <div className="admin-reports-more-rows">
                            + {section.rowCount - 5} more rows included in exported file
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="analytics-team-empty">No preview data available.</div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
