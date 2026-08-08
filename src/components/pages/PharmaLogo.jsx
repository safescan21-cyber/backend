import React from 'react';

const PharmaLogo = ({ className = "w-10 h-10", iconColor = "#f59e0b" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="6" y="18" width="36" height="16" rx="8" fill={iconColor} />
    <path d="M24 18 L24 34" stroke="#0f172a" strokeWidth="1.5" />
    <rect x="6" y="18" width="18" height="16" rx="8" fill="#ffffff" fillOpacity="0.25" />
    <circle cx="24" cy="10" r="6" fill={iconColor} fillOpacity="0.15" stroke={iconColor} strokeWidth="1.5" />
    <path d="M24 7v6M21 10h6" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default PharmaLogo;