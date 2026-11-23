const {
  analyticsDateRangeSchema,
  reportPreviewSchema,
  reportExportSchema,
} = require('./analytics.validation');
const analyticsService = require('./analytics.service');
const analyticsReportService = require('./analyticsReport.service');
const { successResponse } = require('./analytics.response');

function zodError(res, error) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || 'Invalid analytics filters.',
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function getMetadata(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getMetadata(payload);
    return successResponse(res, 'Analytics metadata retrieved successfully.', result.metadata, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getOverview(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getOverview(payload);
    return successResponse(res, 'Analytics overview retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getUsers(payload);
    return successResponse(res, 'User analytics retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getEvents(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getEvents(payload);
    return successResponse(res, 'Event analytics retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getTeamsRegistrations(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getTeamsRegistrations(payload);
    return successResponse(res, 'Team and registration analytics retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getReportPreview(req, res, next) {
  try {
    const payload = reportPreviewSchema.parse(req.query);
    const filters = {
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      eventId: payload.eventId || null,
      interval: payload.interval || 'MONTH',
    };
    const report = await analyticsReportService.generateReportData(payload.reportType, filters);
    return res.status(200).json({
      success: true,
      message: 'Report preview generated successfully.',
      data: {
        reportType: payload.reportType,
        metadata: report.reportMetadata,
        previewMetrics: report.previewMetrics,
        sections: report.sheets.map((s) => ({
          sheetName: s.sheetName,
          columns: s.columns,
          rowCount: s.rows.length,
          previewRows: s.rows.slice(0, 5),
        })),
      },
      filters,
    });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function exportReport(req, res, next) {
  try {
    const payload = reportExportSchema.parse(req.query);
    const filters = {
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      eventId: payload.eventId || null,
      interval: payload.interval || 'MONTH',
    };
    const report = await analyticsReportService.generateReportData(payload.reportType, filters);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const baseName = payload.reportType.toLowerCase().replace(/_/g, '-');

    if (payload.format === 'CSV') {
      const csvData = analyticsReportService.buildCsvString(report.sheets);
      const filename = `${baseName}-${dateStamp}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    }

    if (payload.format === 'XLSX') {
      const excelBuffer = await analyticsReportService.buildExcelBuffer(report.sheets, report.reportMetadata);
      const filename = `${baseName}-${dateStamp}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(excelBuffer);
    }

    if (payload.format === 'PDF') {
      const pdfBuffer = await analyticsReportService.buildPdfBuffer(report.sheets, report.reportMetadata);
      const filename = `${baseName}-${dateStamp}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(pdfBuffer);
    }

    return res.status(400).json({ success: false, message: 'Invalid export format requested.' });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

module.exports = {
  getMetadata,
  getOverview,
  getUsers,
  getEvents,
  getTeamsRegistrations,
  getReportPreview,
  exportReport,
};
