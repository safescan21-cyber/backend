// Serial numbers for sold machines: FPM-<MODEL>-<YYMM>-<0001>, e.g. FPM-ZP35D-2610-0007.
// The running number counts per year (India time) over all machines and is never reused.
//   assignSerials(order)   when an order is marked shipped / delivered (once per unit)
//   cancelSerials(order)   when it is cancelled or refunded (rows stay, marked cancelled)
//   recordSale({...})      a sale entered by hand in admin
const Products = require('../products/productsmodel');
const Order = require('../orders/ordersmodel');
const { SoldMachine, SerialCounter } = require('./SoldMachine');

const PREFIX = process.env.SERIAL_PREFIX || 'FPM';
const SOLD_STATUSES = ['shipped', 'delivered'];
const CANCEL_STATUSES = ['cancelled', 'refunded'];

// "ZP-35D" -> "ZP35D"; no model number -> letters of the category ("tablet-press" -> "TP")
const modelCode = (model, category) => {
  const m = String(model || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (m) return m;
  const c = String(category || '').split(/[^a-z0-9]+/i).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  return c || 'GEN';
};

const istParts = (date) => {
  const d = new Date(new Date(date).getTime() + 5.5 * 3600 * 1000); // India time
  return { yy: String(d.getUTCFullYear()).slice(2), mm: String(d.getUTCMonth() + 1).padStart(2, '0'), year: d.getUTCFullYear() };
};

const nextSerial = async ({ modelNumber, category, soldAt = new Date() }) => {
  const { yy, mm, year } = istParts(soldAt);
  const { seq } = await SerialCounter.findOneAndUpdate({ _id: `serial-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return `${PREFIX}-${modelCode(modelNumber, category)}-${yy}${mm}-${String(seq).padStart(4, '0')}`;
};

const customerOf = (order) => ({
  name: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim(),
  email: order.customerInfo?.email || order.email || '',
  phone: order.customerInfo?.phone || '',
  city: order.shippingAddress?.city || '',
  state: order.shippingAddress?.state || '',
});

// Makes the missing serial numbers for every machine unit in the order; returns the new rows
const assignSerials = async (order) => {
  const created = [];
  const items = order.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'api') continue; // pharma APIs (bulk drugs) have no serial numbers
    const product = await Products.findById(item.productId).select('modelNumber category name').lean().catch(() => null);
    const existing = await SoldMachine.find({ order: order._id, productId: String(item.productId) }).sort({ unit: 1 }).lean();
    const have = new Set(existing.map((r) => r.unit));
    for (let unit = 1; unit <= Number(item.quantity || 1); unit++) {
      if (have.has(unit)) continue;
      const soldAt = order.dispatchedAt || new Date();
      const row = {
        serialNumber: await nextSerial({ modelNumber: product?.modelNumber, category: product?.category || item.category, soldAt }),
        productId: String(item.productId),
        productName: item.name || product?.name || 'Machine',
        modelNumber: product?.modelNumber || '',
        category: product?.category || item.category || '',
        unitPrice: Number(item.price || 0),
        source: 'order',
        order: order._id,
        orderNumber: order.orderId || '',
        unit,
        customer: customerOf(order),
        userId: order.userId || null,
        soldAt,
      };
      try {
        created.push((await SoldMachine.create(row)).toObject());
      } catch (err) {
        if (err.code !== 11000) throw err; // made at the same moment by another request: fine
      }
    }
    // Show them on the order (customer's order page, invoice)
    const all = await SoldMachine.find({ order: order._id, productId: String(item.productId), status: 'active' }).sort({ unit: 1 }).select('serialNumber').lean();
    await Order.updateOne({ _id: order._id }, { $set: { [`items.${i}.serialNumbers`]: all.map((r) => r.serialNumber) } });
  }
  if (created.length) console.log(`[serials] ${created.length} serial number(s) for order ${order.orderId}`);
  return created;
};

const cancelSerials = (order) => SoldMachine.updateMany({ order: order._id, status: 'active' }, { $set: { status: 'cancelled' } });

// Called after an admin status change
const onOrderStatus = async (order) => {
  if (SOLD_STATUSES.includes(order.orderStatus)) return assignSerials(order);
  if (CANCEL_STATUSES.includes(order.orderStatus)) await cancelSerials(order);
  return [];
};

// A sale entered by hand (outside the website): one row and serial per unit
const recordSale = async ({ productId, productName, modelNumber, category, unitPrice, quantity, customer, soldAt, notes, createdBy }) => {
  let product = null;
  if (productId) product = await Products.findById(productId).select('name modelNumber category price').lean().catch(() => null);
  const name = String(productName || product?.name || '').trim();
  if (!name) throw Object.assign(new Error('Choose a machine or type its name.'), { status: 400 });
  const when = soldAt ? new Date(soldAt) : new Date();
  if (Number.isNaN(when.getTime())) throw Object.assign(new Error('The sale date is not valid.'), { status: 400 });
  const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 50);
  const model = String(modelNumber || product?.modelNumber || '').trim().slice(0, 60);
  const cat = category || product?.category || '';
  const rows = [];
  for (let unit = 1; unit <= qty; unit++) {
    rows.push(await SoldMachine.create({
      serialNumber: await nextSerial({ modelNumber: model, category: cat, soldAt: when }),
      productId: product ? String(product._id) : '',
      productName: name.slice(0, 200),
      modelNumber: model,
      category: cat,
      unitPrice: Number(unitPrice ?? product?.price ?? 0) || 0,
      source: 'manual',
      unit,
      customer: customer || {},
      soldAt: when,
      notes: notes || '',
      createdBy: createdBy || '',
    }));
  }
  return rows.map((r) => r.toObject());
};

module.exports = { assignSerials, cancelSerials, onOrderStatus, recordSale, modelCode, nextSerial };
