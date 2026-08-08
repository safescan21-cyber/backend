import React, { useState } from 'react';
import { useCreateJobMutation } from '../../admin/jobs/jobsApi';
import toast from 'react-hot-toast';

const AddJob = () => {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'full-time',
    description: '',
    requirements: '',
    responsibilities: '',
    salaryMin: '',
    salaryMax: '',
    applicationDeadline: '',
  });

  const [createJob, { isLoading }] = useCreateJobMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert comma-separated strings to arrays
    const requirements = formData.requirements
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const responsibilities = formData.responsibilities
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title,
      department: formData.department,
      location: formData.location,
      employmentType: formData.employmentType,
      description: formData.description,
      requirements,
      responsibilities,
      salaryRange: {
        min: parseFloat(formData.salaryMin) || 0,
        max: parseFloat(formData.salaryMax) || 0,
      },
      applicationDeadline: formData.applicationDeadline || null,
    };

    try {
      await createJob(payload).unwrap();
      toast.success('Job posted successfully!');
      // Reset form
      setFormData({
        title: '',
        department: '',
        location: '',
        employmentType: 'full-time',
        description: '',
        requirements: '',
        responsibilities: '',
        salaryMin: '',
        salaryMax: '',
        applicationDeadline: '',
      });
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to post job');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Post a New Job Opening</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Department *</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Employment Type</label>
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="full-time">Full‑Time</option>
              <option value="part-time">Part‑Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="remote">Remote</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Job Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Requirements (comma‑separated) *</label>
          <input
            type="text"
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            placeholder="e.g. Bachelor's degree, 3+ years experience"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Responsibilities (comma‑separated)</label>
          <input
            type="text"
            name="responsibilities"
            value={formData.responsibilities}
            onChange={handleChange}
            placeholder="e.g. Manage teams, Oversee production"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Salary Min (₹)</label>
            <input
              type="number"
              name="salaryMin"
              value={formData.salaryMin}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Salary Max (₹)</label>
            <input
              type="number"
              name="salaryMax"
              value={formData.salaryMax}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Application Deadline</label>
          <input
            type="date"
            name="applicationDeadline"
            value={formData.applicationDeadline}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  );
};

export default AddJob;