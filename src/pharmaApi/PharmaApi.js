// Active Pharmaceutical Ingredients (APIs / bulk drugs) listed for enquiry.
// Separate from machinery Products: no cart or stock, buyers ask for a quote.
const mongoose = require('mongoose');

const SpecSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 80 },
  value: { type: String, required: true, trim: true, maxlength: 300 },
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  file: { type: String, required: true, match: /^[a-f0-9]{32}\.[a-z]{3,4}$/ },
  size: { type: Number, default: 0 },
  type: { type: String, trim: true },
}, { _id: false });

const PharmaApiSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },          // e.g. Paracetamol
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    chemicalName: { type: String, trim: true, maxlength: 400 },                   // IUPAC name
    casNumber: { type: String, trim: true, maxlength: 20, match: [/^$|^\d{2,7}-\d{2}-\d$/, 'CAS number looks wrong (format 103-90-2)'] },
    molecularFormula: { type: String, trim: true, maxlength: 80 },
    molecularWeight: { type: String, trim: true, maxlength: 40 },
    composition: { type: String, trim: true, maxlength: 2000 },                   // assay / content / salt form
    category: { type: String, required: true, trim: true, maxlength: 60 },       // therapeutic class
    grades: { type: [String], default: [] },                                       // IP, BP, USP, EP, JP, In-house
    form: { type: String, trim: true, maxlength: 60 },                            // powder, granules, crystals…
    appearance: { type: String, trim: true, maxlength: 200 },
    solubility: { type: String, trim: true, maxlength: 300 },
    storage: { type: String, trim: true, maxlength: 200 },
    shelfLife: { type: String, trim: true, maxlength: 60 },
    packaging: { type: String, trim: true, maxlength: 200 },
    moq: { type: String, trim: true, maxlength: 60 },                             // minimum order quantity
    price: { type: String, trim: true, maxlength: 60 },                           // optional text, e.g. "₹2,400/kg"
    // Online buying (cart + checkout like machines). unitPrice is ₹ per unit.
    sellOnline: { type: Boolean, default: false },
    unitPrice: { type: Number, min: 0, default: 0 },
    unit: { type: String, enum: ['kg', 'g', 'L'], default: 'kg' },
    minOrderQty: { type: Number, min: 1, default: 1 },
    description: { type: String, trim: true, maxlength: 10000 },
    images: { type: [String], default: [] },
    specifications: { type: [SpecSchema], default: [] },
    documents: { type: [DocumentSchema], default: [] },                           // COA, MSDS, DMF…
    active: { type: Boolean, default: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PharmaApiSchema.index({ active: 1, category: 1, updatedAt: -1 });

module.exports = mongoose.model('PharmaApi', PharmaApiSchema);
