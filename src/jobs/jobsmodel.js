const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
      default: 'full-time',
    },
    description: { type: String, required: true },
    requirements: { type: [String], required: true },
    responsibilities: { type: [String], default: [] },
    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicationDeadline: { type: Date, default: null },
  },
  { timestamps: true }
);

JobSchema.index({ isActive: 1, createdAt: -1 });
JobSchema.index({ department: 1 });

module.exports = mongoose.model('Job', JobSchema);