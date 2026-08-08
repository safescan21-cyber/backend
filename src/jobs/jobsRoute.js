const express = require('express');
const router = express.Router();
const Job = require('./jobsmodel');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');

// ─── CREATE JOB (Admin only) ──────────────────────────────────
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const jobData = { ...req.body, postedBy: req.userId };
    const job = new Job(jobData);
    const savedJob = await job.save();
    res.status(201).json({ message: 'Job posted successfully', job: savedJob });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to post job' });
  }
});

// ─── GET ALL JOBS (Public – only active) ──────────────────────
router.get('/', async (req, res) => {
  try {
    const { department, type } = req.query;
    const filter = { isActive: true };
    if (department && department !== 'all') filter.department = { $regex: department, $options: 'i' };
    if (type && type !== 'all') filter.employmentType = type;

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .populate('postedBy', 'name email');

    res.status(200).json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// ─── GET SINGLE JOB (Public) ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// ─── UPDATE JOB (Admin only) ──────────────────────────────────
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json({ message: 'Job updated', job });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Failed to update job' });
  }
});

// ─── DELETE JOB (Admin only) ──────────────────────────────────
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Failed to delete job' });
  }
});

module.exports = router;