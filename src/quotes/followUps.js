// Automatic follow-ups for quote requests, checked every hour:
//  1. The business gets one reminder listing enquiries still "new" after 24 hours.
//  2. Two days after a quotation is emailed, the customer gets one short
//     "any questions?" note (only while the request is still "quoted").
// Each is sent once per request (reminders.adminSentAt / quotation.followUpSentAt).
const BulkQuote = require("./BulkQuote");
const { sendLeadReminder, sendQuotationFollowUp } = require("../users/email");

const HOUR = 60 * 60 * 1000;
const REMIND_AFTER = 24 * HOUR;
const FOLLOW_UP_AFTER = 48 * HOUR;
const SITE = (process.env.FRONTEND_URL || "https://www.foodpharmamachinery.com").replace(/\/$/, "");
const PUBLIC_API = (process.env.PUBLIC_API_URL || "https://api.foodpharmamachinery.com").replace(/\/$/, "");

const runFollowUps = async (now = Date.now()) => {
  const result = { reminded: 0, followedUp: 0 };

  // 1. Unanswered enquiries (a week back at most, so old data isn't mailed out)
  const waiting = await BulkQuote.find({
    status: "new",
    createdAt: { $lt: new Date(now - REMIND_AFTER), $gt: new Date(now - 7 * 24 * HOUR) },
    "reminders.adminSentAt": { $exists: false },
    quoteNumber: { $ne: "BQ-RECEIVED" },
  }).sort({ createdAt: 1 }).limit(50).lean();
  if (waiting.length) {
    await sendLeadReminder(waiting, `${SITE}/dashboard/bulk-quotes`);
    await BulkQuote.updateMany({ _id: { $in: waiting.map((q) => q._id) } }, { $set: { "reminders.adminSentAt": new Date(now) } });
    result.reminded = waiting.length;
  }

  // 2. Quotations emailed two days ago with no decision yet
  const quoted = await BulkQuote.find({
    status: "quoted",
    "quotation.sentAt": { $lt: new Date(now - FOLLOW_UP_AFTER), $gt: new Date(now - 14 * 24 * HOUR) },
    "quotation.sentTo": { $nin: ["", null] },
    "quotation.followUpSentAt": { $exists: false },
  }).limit(50).lean();
  for (const q of quoted) {
    try {
      const link = q.quotation.publicToken ? `${PUBLIC_API}/api/bulk-quotes/q/${q.quotation.publicToken}.pdf` : "";
      await sendQuotationFollowUp(q, link);
      await BulkQuote.updateOne({ _id: q._id }, { $set: { "quotation.followUpSentAt": new Date(now) } });
      result.followedUp++;
    } catch (err) {
      console.error(`Follow-up for ${q.quotation?.number} failed:`, err.message);
    }
  }
  if (result.reminded || result.followedUp) console.log(`Follow-ups: ${result.reminded} enquiries in the reminder, ${result.followedUp} quotation follow-ups`);
  return result;
};

let timer = null;
// Call once after MongoDB is connected (live server only: test copies send nothing)
const startFollowUps = () => {
  if (process.env.NODE_ENV !== "production" || timer) return;
  const run = () => runFollowUps().catch((err) => console.error("Follow-ups failed:", err.message));
  setTimeout(run, 60 * 1000); // a minute after start-up
  timer = setInterval(run, HOUR);
  timer.unref?.();
};

module.exports = { startFollowUps, runFollowUps };
