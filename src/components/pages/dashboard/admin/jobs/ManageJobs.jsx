import React from 'react';
import { useGetJobsQuery, useDeleteJobMutation } from '../../admin/jobs/jobsApi';
import { formatDate } from '../../../../../utlis/formatDate';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const ManageJobs = () => {
  const { data: jobs = [], isLoading, error, refetch } = useGetJobsQuery({});
  const [deleteJob] = useDeleteJobMutation();

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await deleteJob(id).unwrap();
      toast.success('Job deleted');
      refetch();
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  if (isLoading) return <div className="p-6">Loading jobs...</div>;
  if (error) return <div className="p-6 text-red-500">Failed to load jobs.</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Job Postings</h2>
        <Link to="/dashboard/add-job" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Post New Job
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p className="text-gray-500">No job postings yet.</p>
      ) : (
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Title</th>
              <th className="p-2 border text-left">Department</th>
              <th className="p-2 border text-left">Location</th>
              <th className="p-2 border text-left">Type</th>
              <th className="p-2 border text-left">Posted</th>
              <th className="p-2 border text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job._id}>
                <td className="p-2 border">{job.title}</td>
                <td className="p-2 border">{job.department}</td>
                <td className="p-2 border">{job.location}</td>
                <td className="p-2 border">{job.employmentType}</td>
                <td className="p-2 border">{formatDate(job.createdAt)}</td>
                <td className="p-2 border">
                  <Link to={`/dashboard/edit-job/${job._id}`} className="text-blue-600 hover:underline mr-3">Edit</Link>
                  <button onClick={() => handleDelete(job._id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageJobs;