import React from 'react';

export default function DashboardCard({ label, value, icon, color }) {
  // Determine card variant based on color prop
  const getCardVariant = (colorClass) => {
    if (colorClass?.includes('purple')) return 'card-purple';
    if (colorClass?.includes('green')) return 'card-green';
    if (colorClass?.includes('orange')) return 'card-orange';
    return 'card-cyan';
  };

  // Get icon based on label or use default
  const getIcon = () => {
    if (label.toLowerCase().includes('visit')) return 'bi-calendar-check-fill';
    if (label.toLowerCase().includes('clock')) return 'bi-clock-fill';
    if (label.toLowerCase().includes('skill')) return 'bi-award-fill';
    if (label.toLowerCase().includes('form')) return 'bi-file-text-fill';
    if (label.toLowerCase().includes('ticket')) return 'bi-ticket-detailed-fill';
    if (label.toLowerCase().includes('task')) return 'bi-list-check';
    if (label.toLowerCase().includes('alert') || label.toLowerCase().includes('covid')) return 'bi-exclamation-triangle-fill';
    if (label.toLowerCase().includes('request')) return 'bi-chat-left-dots-fill';
    return 'bi-graph-up-arrow';
  };

  const cardVariant = getCardVariant(color);
  const iconClass = icon || getIcon();

  return (
    <div className={`dashboard-card ${cardVariant} mb-3`}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="dashboard-card-value">{value}</div>
          <div className="dashboard-card-label">{label}</div>
        </div>
        <i className={`bi ${iconClass} dashboard-card-icon`}></i>
      </div>
    </div>
  );
}
