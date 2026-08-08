import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getBaseUrl from '../../../../../utlis/baseURL';

const MAX_IMAGES = 5;

const UploadImage = ({ name, setImages }) => {
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState([]);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // Generate preview URLs when selectedFiles changes
  useEffect(() => {
    // Cleanup old object URLs
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);

    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const uploadImages = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    if (files.length > MAX_IMAGES) {
      setError(`You can only upload up to ${MAX_IMAGES} images at once`);
      event.target.value = '';
      return;
    }

    setSelectedFiles(files);
    setError('');
    setLoading(true);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await axios.post(`${getBaseUrl()}/uploadImages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrls = response.data.urls;
      setUrls(imageUrls);
      if (typeof setImages === 'function') {
        setImages(imageUrls);
      }

      // Clear selected files after successful upload
      setSelectedFiles([]);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Upload failed';
      setError(message);
      console.error('Upload error:', message);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (newFiles.length === 0) {
      document.getElementById(name).value = '';
    }
  };

  return (
    <div>
      <label htmlFor={name}>Upload Images (max {MAX_IMAGES})</label>
      <input
        type="file"
        name={name}
        id={name}
        multiple
        accept="image/*"
        onChange={uploadImages}
        className="add-product-InputCSS"
        disabled={loading}
      />

      {loading && <div className="mt-2 text-sm text-blue-600">Uploading images...</div>}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      {/* Preview of selected files (before upload) */}
      {selectedFiles.length > 0 && !loading && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">{selectedFiles.length} image(s) selected</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="relative w-20 h-20 group">
                <img
                  src={previewUrls[idx]}
                  alt={`preview-${idx}`}
                  className="w-full h-full object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded images (after success) */}
      {urls.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-green-600">{urls.length} image(s) uploaded successfully!</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {urls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`uploaded-${idx}`}
                className="w-20 h-20 object-cover rounded border"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadImage;