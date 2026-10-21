// Visitor analytics and Customer Insights keep 7 days of data. Older records are
// removed automatically, whether or not an admin presses "Delete all":
//  1. MongoDB TTL indexes delete expired records by themselves (checked about once a
//     minute). Existing indexes are switched to 7 days here with collMod.
//  2. As a safety net, anything older than 7 days is also deleted at start-up and
//     every 6 hours.
// Accounts, orders, products and everything else are not affected.
const Visit = require('../visitor/Visitmodel');
const ActivityEvent = require('../insights/ActivityEvent');

const RETENTION_DAYS = 7;
const TTL_SECONDS = RETENTION_DAYS * 24 * 60 * 60;
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;

const TARGETS = [
  { model: Visit, field: 'timestamp', label: 'visitor records' },
  { model: ActivityEvent, field: 'createdAt', label: 'insights activity' },
];

// Make the field's index a 7-day TTL index (create it, or change an existing one)
const ensureTtl = async ({ model, field, label }) => {
  const coll = model.collection;
  const indexes = await coll.indexes().catch(() => []);
  const existing = indexes.find((i) => Object.keys(i.key).length === 1 && i.key[field] === 1);
  if (!existing) {
    await coll.createIndex({ [field]: 1 }, { expireAfterSeconds: TTL_SECONDS });
    console.log(`Retention: ${label} expire after ${RETENTION_DAYS} days (new index)`);
  } else if (existing.expireAfterSeconds !== TTL_SECONDS) {
    // Also turns a plain index into a TTL index (MongoDB 5.1+)
    await model.db.db.command({ collMod: coll.collectionName, index: { keyPattern: { [field]: 1 }, expireAfterSeconds: TTL_SECONDS } });
    console.log(`Retention: ${label} expire after ${RETENTION_DAYS} days (index updated)`);
  }
};

const sweep = async () => {
  const cutoff = new Date(Date.now() - TTL_SECONDS * 1000);
  for (const { model, field, label } of TARGETS) {
    const { deletedCount } = await model.deleteMany({ [field]: { $lt: cutoff } });
    if (deletedCount) console.log(`Retention: removed ${deletedCount} ${label} older than ${RETENTION_DAYS} days`);
  }
};

let timer = null;

// Call once after MongoDB is connected
const startDataRetention = async () => {
  for (const t of TARGETS) {
    try {
      await ensureTtl(t);
    } catch (err) {
      console.error(`Retention: could not set the ${t.label} index (the 6-hourly cleanup still runs):`, err.message);
    }
  }
  const run = () => sweep().catch((err) => console.error('Retention cleanup failed:', err.message));
  await run();
  if (!timer) {
    timer = setInterval(run, SWEEP_EVERY_MS);
    timer.unref?.();
  }
};

module.exports = { startDataRetention, sweep, ensureTtl, RETENTION_DAYS, TTL_SECONDS };
