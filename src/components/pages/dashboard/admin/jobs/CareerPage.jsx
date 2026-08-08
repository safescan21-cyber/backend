import React, { useState } from 'react';
import { useGetJobsQuery } from '../jobs/jobsApi';       // adjust import path
import { formatDate } from '../../../../../utlis/formatDate';

const CareerPage = () => {
  const [filters, setFilters] = useState({ department: 'all', type: 'all' });
  const { data: jobs = [], isLoading, error } = useGetJobsQuery(filters);

  // Build department filter options dynamically from fetched jobs
  const departments = ['all', ...new Set(jobs.map(j => j.department))];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading career opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-semibold">Failed to load jobs</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-gray-50 min-h-screen pt-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800">Career Opportunities</h1>
          <p className="text-gray-600 mt-2">Join our team and build the future of industrial engineering</p>
        </div>

        {/* ─── Filters ─── */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <div>
            <label className="text-sm font-medium mr-2">Department:</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="border rounded px-3 py-1"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mr-2">Type:</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="border rounded px-3 py-1"
            >
              <option value="all">All Types</option>
              <option value="full-time">Full‑Time</option>
              <option value="part-time">Part‑Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="remote">Remote</option>
            </select>
          </div>
        </div>

        {/* ─── Job List ─── */}
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No job openings at the moment. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div key={job._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-800">{job.title}</h2>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    job.employmentType === 'full-time' ? 'bg-green-100 text-green-700' :
                    job.employmentType === 'remote' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {job.employmentType.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{job.department} • {job.location}</p>
                <p className="text-gray-600 mt-3 text-sm line-clamp-3">{job.description}</p>
                {job.salaryRange.max > 0 && (
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    ₹{job.salaryRange.min.toLocaleString()} – ₹{job.salaryRange.max.toLocaleString()}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.requirements.slice(0, 3).map((req, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {req}
                    </span>
                  ))}
                  {job.requirements.length > 3 && (
                    <span className="text-xs text-gray-400">+{job.requirements.length - 3} more</span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Posted {formatDate(job.createdAt)}</span>
                  <button className="text-blue-600 hover:underline text-sm font-medium">
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CareerPage;