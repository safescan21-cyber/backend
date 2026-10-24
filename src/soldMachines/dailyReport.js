// Daily email at 9:00 India time to the admin (SOLD_REPORT_TO, default safescan21@gmail.com):
// machines sold since the last report, with the full history attached as Excel and PDF.
// Checked every 10 minutes; a marker in the database makes sure it goes out once a day,
// also after restarts. Live server only (NODE_ENV=production), like the quote follow-ups.
const { SoldMachine, JobMarker } = require('./SoldMachine');
const { buildXlsx, buildPdf } = require('./soldExports');
const { sendSoldMachinesReport } = require('../users/email');

const MARKER = 'sold-machines-daily-report';
const SEND_HOUR = Number(process.env.SOLD_REPORT_HOUR ?? 9); // India time

const istNow = () => new Date(Date.now() + 5.5 * 3600 * 1000);
const istDate = () => istNow().toISOString().slice(0, 10); // 2026-10-24

// Sends the report now. `since` = start of "new" sales (default: the last report)
const sendReport = async ({ since } = {}) => {
  const marker = await JobMarker.findById(MARKER).lean();
  const from = since || marker?.at || new Date(Date.now() - 24 * 3600 * 1000);
  const all = await SoldMachine.find().sort({ soldAt: -1, serialNumber: -1 }).lean();
  const fresh = all.filter((r) => new Date(r.createdAt) > new Date(from));
  const totals = { active: all.filter((r) => r.status !== 'cancelled').length, cancelled: all.filter((r) => r.status === 'cancelled').length };
  const [xlsx, pdf] = await Promise.all([buildXlsx(all), buildPdf(all)]);
  const id = await sendSoldMachinesReport({ fresh, totals, xlsx, pdf, dateLabel: istDate() });
  console.log(`[sold-report] sent (${fresh.length} new, ${totals.active} total)`);
  return { messageId: id, fresh: fresh.length, ...totals };
};

const runIfDue = async () => {
  if (istNow().getUTCHours() < SEND_HOUR) return null;
  const today = istDate();
  // Claim today's report (only one run can change the marker to today)
  const claimed = await JobMarker.findOneAndUpdate(
    { _id: MARKER, value: { $ne: today } },
    { $set: { value: today } },
    { returnDocument: 'before' }
  ).lean();
  if (!claimed) {
    const exists = await JobMarker.exists({ _id: MARKER });
    if (exists) return null; // already sent today
    try {
      await JobMarker.create({ _id: MARKER, value: today, at: new Date(Date.now() - 24 * 3600 * 1000) });
    } catch {
      return null; // created at the same moment elsewhere
    }
  }
  try {
    const since = claimed?.at;
    const result = await sendReport({ since });
    await JobMarker.updateOne({ _id: MARKER }, { $set: { at: new Date() } });
    return result;
  } catch (err) {
    // Give it back so the next check tries again
    await JobMarker.updateOne({ _id: MARKER }, { $set: { value: claimed?.value || '' } }).catch(() => {});
    throw err;
  }
};

let timer = null;
const startSoldReport = () => {
  if (process.env.NODE_ENV !== 'production' || timer) return;
  const run = () => runIfDue().catch((err) => console.error('[sold-report] failed:', err.message));
  setTimeout(run, 2 * 60 * 1000);
  timer = setInterval(run, 10 * 60 * 1000);
  timer.unref?.();
};

module.exports = { startSoldReport, sendReport, runIfDue };
