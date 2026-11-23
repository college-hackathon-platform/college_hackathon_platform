const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const analyticsService = require('./analytics.service');

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvString(sheets) {
  // sheets is an array of { sheetName, columns: [headers], rows: [[values]] }
  // For single sheet or merged CSV with clear section separators
  const parts = [];
  for (const sheet of sheets) {
    if (sheets.length > 1) {
      parts.push(`=== ${sheet.sheetName.toUpperCase()} ===`);
    }
    parts.push(sheet.columns.map(escapeCsvField).join(','));
    for (const row of sheet.rows) {
      parts.push(row.map(escapeCsvField).join(','));
    }
    parts.push(''); // blank line between sections
  }
  // Return UTF-8 with BOM for Excel compatibility
  return '\uFEFF' + parts.join('\r\n');
}

async function buildExcelBuffer(sheets, reportMetadata) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College Hackathon Platform';
  workbook.created = new Date();

  // Summary Sheet first
  const summarySheet = workbook.addWorksheet('Report Information');
  summarySheet.columns = [
    { header: 'Property', key: 'prop', width: 28 },
    { header: 'Value', key: 'val', width: 45 },
  ];
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  summarySheet.addRow({ prop: 'Platform', val: reportMetadata.platformName || 'College Hackathon Platform' });
  summarySheet.addRow({ prop: 'Report Type', val: reportMetadata.reportTitle });
  summarySheet.addRow({ prop: 'Generated At (UTC)', val: reportMetadata.generatedAt });
  summarySheet.addRow({ prop: 'Scope', val: reportMetadata.appliedFilters.eventId ? `Event: ${reportMetadata.appliedFilters.eventId}` : 'Platform-Wide' });
  summarySheet.addRow({ prop: 'Date Range Start', val: reportMetadata.appliedFilters.startDate || 'All-time start' });
  summarySheet.addRow({ prop: 'Date Range End', val: reportMetadata.appliedFilters.endDate || 'Current time' });
  summarySheet.addRow({ prop: 'Interval', val: reportMetadata.appliedFilters.interval });

  // Add data worksheets
  for (const sheet of sheets) {
    // Sanitize sheet name (max 31 chars, no invalid chars)
    const safeTitle = sheet.sheetName.replace(/[\\/?*[\]]/g, '').slice(0, 31);
    const ws = workbook.addWorksheet(safeTitle);

    ws.columns = sheet.columns.map((col, idx) => {
      // Find max width among header and rows
      let maxLen = col.length;
      for (const row of sheet.rows) {
        const cellVal = String(row[idx] ?? '');
        if (cellVal.length > maxLen) maxLen = cellVal.length;
      }
      return {
        header: col,
        key: `col_${idx}`,
        width: Math.min(Math.max(maxLen + 4, 14), 50),
      };
    });

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    for (const row of sheet.rows) {
      ws.addRow(row);
    }
  }

  return await workbook.xlsx.writeBuffer();
}

function buildPdfBuffer(sheets, reportMetadata) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(40, 40, 515, 65).fill('#0f172a');
      doc.fill('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text('College Hackathon Platform', 55, 52);
      doc.fontSize(12).font('Helvetica')
        .text(reportMetadata.reportTitle, 55, 74);
      doc.fontSize(8).fill('#94a3b8')
        .text(`Generated: ${reportMetadata.generatedAt} (UTC) | Scope: ${reportMetadata.appliedFilters.eventId ? 'Event Filtered' : 'Platform-Wide'}`, 55, 90);

      doc.y = 120;
      doc.fill('#0f172a');

      // Filter summary box
      doc.rect(40, 115, 515, 38).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fill('#475569').fontSize(9).font('Helvetica')
        .text(`Date Range: ${reportMetadata.appliedFilters.startDate || 'Start'} to ${reportMetadata.appliedFilters.endDate || 'Present'}   |   Interval: ${reportMetadata.appliedFilters.interval}   |   Timezone: UTC`, 50, 128);

      doc.y = 165;

      for (const sheet of sheets) {
        if (doc.y > 680) {
          doc.addPage();
          doc.y = 45;
        }

        // Section Title
        doc.fill('#0f172a').fontSize(11).font('Helvetica-Bold')
          .text(sheet.sheetName.toUpperCase(), 40, doc.y);
        doc.y += 4;
        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.y += 8;

        const colCount = sheet.columns.length;
        const availableWidth = 515;
        const colWidth = availableWidth / colCount;

        // Table Header
        const headerY = doc.y;
        doc.rect(40, headerY, 515, 18).fill('#f1f5f9');
        doc.fill('#1e293b').fontSize(8).font('Helvetica-Bold');
        sheet.columns.forEach((col, idx) => {
          doc.text(String(col), 44 + (idx * colWidth), headerY + 5, {
            width: colWidth - 8,
            align: idx === 0 ? 'left' : 'center',
            ellipsis: true,
          });
        });
        doc.y = headerY + 22;

        // Rows
        doc.font('Helvetica').fontSize(8);
        sheet.rows.forEach((row, rowIdx) => {
          if (doc.y > 750) {
            doc.addPage();
            doc.y = 45;
          }

          const rowY = doc.y;
          if (rowIdx % 2 === 1) {
            doc.rect(40, rowY - 2, 515, 16).fill('#f8fafc');
          }

          doc.fill('#334155');
          row.forEach((cell, idx) => {
            doc.text(String(cell ?? ''), 44 + (idx * colWidth), rowY + 2, {
              width: colWidth - 8,
              align: idx === 0 ? 'left' : 'center',
              ellipsis: true,
            });
          });
          doc.y = rowY + 16;
        });

        doc.y += 15;
      }

      // Add page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fill('#94a3b8').text(
          `Page ${i + 1} of ${range.count} - Confidential Platform Report`,
          40,
          800,
          { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Transforms underlying analytics into structured report datasets
 */
async function generateReportData(reportType, filters) {
  let reportTitle = '';
  let previewMetrics = [];
  let sheets = [];

  switch (reportType) {
    case 'PLATFORM_OVERVIEW': {
      reportTitle = 'Platform Overview Report';
      const overviewRes = await analyticsService.getOverview(filters);
      const kpis = overviewRes.data.kpis;
      const distributions = overviewRes.data.distributions;
      const growth = overviewRes.data.growth || [];

      previewMetrics = [
        { label: 'Total Users', value: kpis.totalUsers.value },
        { label: 'Total Students', value: kpis.totalStudents.value },
        { label: 'Total Faculty', value: kpis.totalFaculty.value },
        { label: 'Total Admins', value: kpis.totalAdmins.value },
        { label: 'Total Events', value: kpis.totalEvents.value },
        { label: 'Active Events', value: kpis.activeEvents.value },
        { label: 'Total Teams', value: kpis.totalTeams.value },
        { label: 'Total Registrations', value: kpis.totalRegistrations.value },
        { label: 'Confirmed Registrations', value: kpis.confirmedRegistrations.value },
        { label: 'Pending Registrations', value: kpis.pendingRegistrations.value },
      ];

      sheets = [
        {
          sheetName: 'Key Metrics',
          columns: ['Metric', 'Count', 'Scope'],
          rows: [
            ['Total Users', kpis.totalUsers.value, kpis.totalUsers.scope],
            ['Total Students', kpis.totalStudents.value, kpis.totalStudents.scope],
            ['Total Faculty', kpis.totalFaculty.value, kpis.totalFaculty.scope],
            ['Total Admins', kpis.totalAdmins.value, kpis.totalAdmins.scope],
            ['Total Events', kpis.totalEvents.value, kpis.totalEvents.scope],
            ['Active Events', kpis.activeEvents.value, kpis.activeEvents.scope],
            ['Total Teams', kpis.totalTeams.value, kpis.totalTeams.scope],
            ['Total Registrations', kpis.totalRegistrations.value, kpis.totalRegistrations.scope],
            ['Confirmed Registrations', kpis.confirmedRegistrations.value, kpis.confirmedRegistrations.scope],
            ['Pending Registrations', kpis.pendingRegistrations.value, kpis.pendingRegistrations.scope],
          ],
        },
        {
          sheetName: 'User Role Distribution',
          columns: ['Role', 'Count', 'Percentage (%)'],
          rows: distributions.userRoles.map((r) => [r.category, r.count, `${r.percentage}%`]),
        },
        {
          sheetName: 'Event Status Distribution',
          columns: ['Status', 'Count', 'Percentage (%)'],
          rows: distributions.eventStatuses.map((s) => [s.category, s.count, `${s.percentage}%`]),
        },
        {
          sheetName: 'Registration Status Distribution',
          columns: ['Status', 'Count', 'Percentage (%)'],
          rows: distributions.registrationStatuses.map((r) => [r.category, r.count, `${r.percentage}%`]),
        },
        {
          sheetName: 'Growth Trends',
          columns: ['Period', 'Users', 'Events', 'Teams', 'Registrations'],
          rows: growth.map((g) => [g.period, g.users, g.events, g.teams, g.registrations]),
        },
      ];
      break;
    }

    case 'USER_ANALYTICS': {
      reportTitle = 'User Analytics Report';
      const userRes = await analyticsService.getUsers(filters);
      const summary = userRes.data.summary;
      const roles = userRes.data.roles || [];
      const accountStatus = userRes.data.accountStatus || [];
      const participation = userRes.data.participation || {};
      const growth = userRes.data.growth || [];

      previewMetrics = [
        { label: 'Total Users', value: summary.totalUsers },
        { label: 'Students', value: summary.totalStudents },
        { label: 'Faculty', value: summary.totalFaculty },
        { label: 'Admins', value: summary.totalAdmins },
        { label: 'Active Accounts', value: summary.activeAccounts },
        { label: 'Inactive Accounts', value: summary.inactiveAccounts },
        { label: 'Participating Students', value: participation.participatingStudents || 0 },
        { label: 'Non-Participating Students', value: participation.nonParticipatingStudents || 0 },
        { label: 'Participation Rate (%)', value: `${participation.participationRate || 0}%` },
        { label: 'Avg Regs / Part. Student', value: participation.averageRegistrationsPerParticipatingStudent || 0 },
      ];

      sheets = [
        {
          sheetName: 'User Summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total Users', summary.totalUsers],
            ['Total Students', summary.totalStudents],
            ['Total Faculty', summary.totalFaculty],
            ['Total Administrators', summary.totalAdmins],
            ['New Users in Range', summary.newUsers],
            ['New Students in Range', summary.newStudents],
            ['Active Accounts', summary.activeAccounts],
            ['Inactive Accounts', summary.inactiveAccounts],
            ['Suspended Accounts', summary.suspendedAccounts],
            ['Participating Students', participation.participatingStudents || 0],
            ['Non-Participating Students', participation.nonParticipatingStudents || 0],
            ['Participation Rate (%)', `${participation.participationRate || 0}%`],
            ['Avg Registrations per Participating Student', participation.averageRegistrationsPerParticipatingStudent || 0],
          ],
        },
        {
          sheetName: 'Role Distribution',
          columns: ['Role', 'Count', 'Percentage (%)'],
          rows: roles.map((r) => [r.category, r.count, `${r.percentage}%`]),
        },
        {
          sheetName: 'Account Status Distribution',
          columns: ['Status', 'Count', 'Percentage (%)'],
          rows: accountStatus.map((s) => [s.category, s.count, `${s.percentage}%`]),
        },
        {
          sheetName: 'Top Events by Participation',
          columns: ['Event ID', 'Event Title', 'Participating Students'],
          rows: (participation.mostParticipatingEvents || []).map((e) => [e.eventId, e.eventTitle, e.participatingStudents]),
        },
        {
          sheetName: 'User Growth Trend',
          columns: ['Period', 'Total Users', 'Students', 'Faculty', 'Admins'],
          rows: growth.map((g) => [g.period, g.users, g.students, g.faculty, g.administrators]),
        },
      ];
      break;
    }

    case 'EVENT_ANALYTICS': {
      reportTitle = 'Event Analytics Report';
      const eventRes = await analyticsService.getEvents(filters);
      const summary = eventRes.data.summary;
      const lifecycle = eventRes.data.lifecycle || [];
      const popularity = eventRes.data.popularity || [];
      const eventGrowth = eventRes.data.eventGrowth || [];
      const registrationTrends = eventRes.data.registrationTrends || [];

      previewMetrics = [
        { label: 'Total Events', value: summary.totalEvents },
        { label: 'Published Events', value: summary.publishedEvents },
        { label: 'Draft Events', value: summary.draftEvents },
        { label: 'Active Events', value: summary.activeEvents },
        { label: 'Completed Events', value: summary.completedEvents },
        { label: 'Cancelled Events', value: summary.cancelledEvents },
        { label: 'Total Registrations', value: summary.totalRegistrations },
        { label: 'Confirmed Registrations', value: summary.confirmedRegistrations },
        { label: 'Pending Registrations', value: summary.pendingRegistrations },
        { label: 'Participating Teams', value: summary.participatingTeams },
      ];

      sheets = [
        {
          sheetName: 'Event Summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total Events', summary.totalEvents],
            ['Draft Events', summary.draftEvents],
            ['Published Events', summary.publishedEvents],
            ['Active Events', summary.activeEvents],
            ['Completed Events', summary.completedEvents],
            ['Cancelled Events', summary.cancelledEvents],
            ['Total Registrations', summary.totalRegistrations],
            ['Confirmed Registrations', summary.confirmedRegistrations],
            ['Pending Registrations', summary.pendingRegistrations],
            ['Participating Teams', summary.participatingTeams],
            ['Participating Students', summary.participatingStudents],
            ['Average Registrations per Event', summary.averageRegistrationsPerEvent],
          ],
        },
        {
          sheetName: 'Event Status Distribution',
          columns: ['Status', 'Count', 'Percentage (%)'],
          rows: lifecycle.map((l) => [l.category, l.count, `${l.percentage}%`]),
        },
        {
          sheetName: 'Event Ranking & Popularity',
          columns: ['Event ID', 'Title', 'Status', 'Confirmed Registrations', 'Participating Teams', 'Participating Students'],
          rows: popularity.map((p) => [p.eventId, p.title, p.status, p.confirmedRegistrations, p.participatingTeams, p.participatingStudents]),
        },
        {
          sheetName: 'Event Creation Trends',
          columns: ['Period', 'New Events', 'Published', 'Completed', 'Cancelled'],
          rows: eventGrowth.map((eg) => [eg.period, eg.events, eg.published, eg.completed, eg.cancelled]),
        },
        {
          sheetName: 'Registration Trends',
          columns: ['Period', 'Total Regs', 'Confirmed', 'Pending', 'Rejected', 'Waitlisted', 'Cancelled'],
          rows: registrationTrends.map((rt) => [rt.period, rt.registrations, rt.confirmed, rt.pending, rt.rejected, rt.waitlisted, rt.cancelled]),
        },
      ];

      if (eventRes.data.eventDetails) {
        const ed = eventRes.data.eventDetails;
        sheets.push({
          sheetName: 'Filtered Event Details',
          columns: ['Property', 'Value'],
          rows: [
            ['Event ID', ed.event.id],
            ['Title', ed.event.title],
            ['Status', ed.event.status],
            ['Mode', ed.event.mode],
            ['Registration Capacity', ed.event.registrationCapacity ?? 'Unlimited'],
            ['Total Registrations', ed.registrationSummary.total],
            ['Confirmed Registrations', ed.registrationSummary.confirmed],
            ['Pending Registrations', ed.registrationSummary.pending],
            ['Participating Teams', ed.participationSummary.participatingTeams],
            ['Participating Students', ed.participationSummary.participatingStudents],
            ['Faculty Assignments', ed.facultyAssignments],
            ['Evaluator Invitations Total', ed.evaluatorInvitations.total],
          ],
        });
      }
      break;
    }

    case 'TEAM_ANALYTICS': {
      reportTitle = 'Team Analytics Report';
      const teamRes = await analyticsService.getTeamsRegistrations(filters);
      const teamSummary = teamRes.data.teamSummary;
      const teamStatusDist = teamRes.data.teamStatusDistribution || [];
      const teamSizeDist = teamRes.data.teamSizeDistribution || [];
      const popularTeams = teamRes.data.popularTeams || [];
      const teamGrowth = teamRes.data.teamGrowth || [];

      previewMetrics = [
        { label: 'Total Teams', value: teamSummary.totalTeams },
        { label: 'Active Teams', value: teamSummary.activeTeams },
        { label: 'Archived Teams', value: teamSummary.archivedTeams },
        { label: 'Disbanded Teams', value: teamSummary.disbandedTeams },
        { label: 'Teams with Registrations', value: teamSummary.teamsWithRegistration },
        { label: 'Teams without Registrations', value: teamSummary.teamsWithoutRegistration },
        { label: 'Active Member Count', value: teamSummary.activeMemberCount },
        { label: 'Average Team Size', value: teamSummary.averageMembersPerTeam },
      ];

      sheets = [
        {
          sheetName: 'Team Summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total Teams', teamSummary.totalTeams],
            ['Active Teams', teamSummary.activeTeams],
            ['Archived Teams', teamSummary.archivedTeams],
            ['Disbanded Teams', teamSummary.disbandedTeams],
            ['Teams with Registrations', teamSummary.teamsWithRegistration],
            ['Teams without Registrations', teamSummary.teamsWithoutRegistration],
            ['Active Member Count', teamSummary.activeMemberCount],
            ['Average Members per Team', teamSummary.averageMembersPerTeam],
          ],
        },
        {
          sheetName: 'Team Status Distribution',
          columns: ['Status', 'Count', 'Percentage (%)'],
          rows: teamStatusDist.map((t) => [t.category, t.count, `${t.percentage}%`]),
        },
        {
          sheetName: 'Team Size Distribution',
          columns: ['Size Bucket', 'Team Count'],
          rows: teamSizeDist.map((s) => [s.bucket, s.count]),
        },
        {
          sheetName: 'Team Formation Trends',
          columns: ['Period', 'Total Teams', 'Active', 'Archived', 'Disbanded'],
          rows: teamGrowth.map((tg) => [tg.period, tg.teams, tg.active, tg.archived, tg.disbanded]),
        },
        {
          sheetName: 'Popular Teams',
          columns: ['Team ID', 'Team Name', 'Status', 'Event Title', 'Confirmed Regs', 'Active Members', 'Total Regs'],
          rows: popularTeams.map((pt) => [pt.teamId, pt.name, pt.status, pt.eventTitle, pt.confirmedRegistrations, pt.activeMembers, pt.totalRegistrations]),
        },
      ];
      break;
    }

    case 'REGISTRATION_ANALYTICS': {
      reportTitle = 'Registration Analytics Report';
      const teamRes = await analyticsService.getTeamsRegistrations(filters);
      const regSummary = teamRes.data.registrationSummary;
      const regStatusDist = teamRes.data.registrationStatusDistribution || [];
      const conversion = teamRes.data.conversion || {};
      const regTrend = teamRes.data.registrationTrend || [];
      const eventWise = teamRes.data.eventWise || [];

      previewMetrics = [
        { label: 'Total Registrations', value: regSummary.totalRegistrations },
        { label: 'Confirmed Registrations', value: regSummary.confirmedRegistrations },
        { label: 'Pending Registrations', value: regSummary.pendingRegistrations },
        { label: 'Submitted Registrations', value: regSummary.submittedRegistrations },
        { label: 'Waitlisted Registrations', value: regSummary.waitlistedRegistrations },
        { label: 'Rejected Registrations', value: regSummary.rejectedRegistrations },
        { label: 'Cancelled Registrations', value: regSummary.cancelledRegistrations },
        { label: 'Draft Registrations', value: regSummary.draftRegistrations },
        { label: 'Confirmation Rate (%)', value: `${conversion.currentConfirmationRate || 0}%` },
      ];

      sheets = [
        {
          sheetName: 'Registration Summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total Registrations', regSummary.totalRegistrations],
            ['Confirmed Registrations', regSummary.confirmedRegistrations],
            ['Pending Registrations', regSummary.pendingRegistrations],
            ['Submitted Registrations', regSummary.submittedRegistrations],
            ['Waitlisted Registrations', regSummary.waitlistedRegistrations],
            ['Rejected Registrations', regSummary.rejectedRegistrations],
            ['Cancelled Registrations', regSummary.cancelledRegistrations],
            ['Draft Registrations', regSummary.draftRegistrations],
            ['Current Confirmation Rate (%)', `${conversion.currentConfirmationRate || 0}%`],
          ],
        },
        {
          sheetName: 'Status Distribution',
          columns: ['Status', 'Count', 'Percentage (%)'],
          rows: regStatusDist.map((r) => [r.category, r.count, `${r.percentage}%`]),
        },
        {
          sheetName: 'Registration Trends',
          columns: ['Period', 'Total', 'Confirmed', 'Pending', 'Rejected', 'Waitlisted', 'Cancelled'],
          rows: regTrend.map((rt) => [rt.period, rt.registrations, rt.confirmed, rt.pending, rt.rejected, rt.waitlisted, rt.cancelled]),
        },
        {
          sheetName: 'Event-wise Comparison',
          columns: ['Event ID', 'Event Title', 'Event Status', 'Total Teams', 'Total Regs', 'Confirmed Regs', 'Pending Regs', 'Students', 'Confirmation Rate (%)'],
          rows: eventWise.map((ew) => [
            ew.eventId,
            ew.title,
            ew.eventStatus,
            ew.totalTeams,
            ew.totalRegistrations,
            ew.confirmedRegistrations,
            ew.pendingRegistrations,
            ew.participatingStudents,
            `${ew.confirmationRate}%`,
          ]),
        },
      ];
      break;
    }

    case 'PARTICIPATION_ANALYTICS': {
      reportTitle = 'Participation Analytics Report';
      const teamRes = await analyticsService.getTeamsRegistrations(filters);
      const participation = teamRes.data.participation || {};
      const eventWise = teamRes.data.eventWise || [];

      previewMetrics = [
        { label: 'Participating Students', value: participation.participatingStudents || 0 },
        { label: 'Confirmed Teams', value: participation.confirmedTeams || 0 },
        { label: 'Avg Members / Confirmed Team', value: participation.averageMembersPerConfirmedTeam || 0 },
      ];

      sheets = [
        {
          sheetName: 'Participation Overview',
          columns: ['Metric', 'Value'],
          rows: [
            ['Participating Students', participation.participatingStudents || 0],
            ['Confirmed Teams', participation.confirmedTeams || 0],
            ['Average Members per Confirmed Team', participation.averageMembersPerConfirmedTeam || 0],
            ['Metric Definition', participation.definition || 'Confirmed teams with distinct active student members.'],
          ],
        },
        {
          sheetName: 'Event-wise Participation',
          columns: ['Event ID', 'Event Title', 'Event Status', 'Confirmed Teams', 'Confirmed Regs', 'Participating Students', 'Confirmation Rate (%)'],
          rows: eventWise.map((ew) => [
            ew.eventId,
            ew.title,
            ew.eventStatus,
            ew.totalTeams,
            ew.confirmedRegistrations,
            ew.participatingStudents,
            `${ew.confirmationRate}%`,
          ]),
        },
      ];
      break;
    }

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }

  const generatedAt = new Date().toISOString();
  const reportMetadata = {
    platformName: 'College Hackathon Platform',
    reportType,
    reportTitle,
    generatedAt,
    appliedFilters: filters,
  };

  return {
    reportMetadata,
    previewMetrics,
    sheets,
  };
}

module.exports = {
  generateReportData,
  buildCsvString,
  buildExcelBuffer,
  buildPdfBuffer,
};
