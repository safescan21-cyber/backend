// One machine unit that was sold, with the serial number made for it.
// Made when an order is marked shipped/delivered (soldMachines/serials.js) or entered
// by hand in admin for a sale outside the website. Never deleted: a cancelled sale
// keeps its row with status "cancelled", and its serial number is not used again.
const mongoose = require('mongoose');

const soldMachineSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, required: true, unique: true },
    productId: { type: String, default: '' },
    productName: { type: String, required: true, trim: true, maxlength: 200 },
    modelNumber: { type: String, trim: true, maxlength: 60, default: '' },
    category: { type: String, trim: true, maxlength: 80, default: '' },
    unitPrice: { type: Number, default: 0 },
    source: { type: String, enum: ['order', 'manual'], default: 'order' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    orderNumber: { type: String, default: '' },
    unit: { type: Number, default: 1 }, // 1, 2… when one order line has several units
    customer: {
      name: { type: String, trim: true, maxlength: 150, default: '' },
      company: { type: String, trim: true, maxlength: 150, default: '' },
      email: { type: String, trim: true, lowercase: true, maxlength: 150, default: '' },
      phone: { type: String, trim: true, maxlength: 30, default: '' },
      city: { type: String, trim: true, maxlength: 100, default: '' },
      state: { type: String, trim: true, maxlength: 100, default: '' },
    },
    userId: { type: String, default: null, index: true },
    soldAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);
soldMachineSchema.index({ 'customer.email': 1 });
// One row per unit of an order line, so running the order twice never makes extra serials
soldMachineSchema.index({ order: 1, productId: 1, unit: 1 }, { unique: true, partialFilterExpression: { order: { $type: 'objectId' } } });

// Running number per year for serial numbers (atomic, so two sales never get the same one)
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

// Remembers small things such as the day the last daily report went out
const markerSchema = new mongoose.Schema({ _id: String, value: String, at: Date });

module.exports = {
  SoldMachine: mongoose.models.SoldMachine || mongoose.model('SoldMachine', soldMachineSchema),
  SerialCounter: mongoose.models.SerialCounter || mongoose.model('SerialCounter', counterSchema),
  JobMarker: mongoose.models.JobMarker || mongoose.model('JobMarker', markerSchema),
};
