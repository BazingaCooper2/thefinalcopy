import React from 'react';
import DashboardCard from './DashboardCard';
import MapSection from './MapSection';

export default function Dashboard() {
  const kpiData = [
    { label: 'Expired End Dates', value: '00', color: 'card-purple' },
    { label: 'Clocked-in via Mobile', value: '03', color: 'card-cyan' },
    { label: 'Expiring Skills', value: '66', color: 'card-orange' },
    { label: 'Forms to Approve', value: '03', color: 'card-purple' },
    { label: 'Open Tickets', value: '00', color: 'card-cyan' },
    { label: 'Scheduled Visits', value: '30', color: 'card-green' },
    { label: 'Vacant Visits', value: '09', color: 'card-orange' },
    { label: 'Late Visits', value: '30', color: 'card-orange' },
    { label: 'Accepted Visit Offers', value: '03', color: 'card-green' },
    { label: 'Expired Visit Offers', value: '00', color: 'card-purple' },
    { label: 'COVID-19 Screener Alerts', value: '00', color: 'card-orange' },
    { label: 'Overdue First Visit', value: '00', color: 'card-purple' },
    { label: 'My Tasks Due Today', value: '00', color: 'card-cyan' },
    { label: 'Family Portal Open Requests', value: '00', color: 'card-purple' },
    { label: 'Tasks Due Today', value: '00', color: 'card-cyan' },
  ];

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-pie-chart-fill me-3" style={{ fontSize: '2.5rem' }}></i>
          Live Dashboard
        </h1>
        <p className="page-subtitle">Real-time overview of your healthcare operations</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="row g-3 mb-4">
        {kpiData.map((item, index) => (
          <div
            key={index}
            className="col-12 col-sm-6 col-md-4 col-lg-3 animate-slideUp"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <DashboardCard {...item} />
          </div>
        ))}
      </div>

      {/* Map Section */}
      <div className="content-card animate-slideUp" style={{ animationDelay: '200ms' }}>
        <h3 className="mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--gray-800)' }}>
          <i className="bi bi-geo-alt-fill" style={{ color: 'var(--primary-purple)' }}></i>
          Live Employee Locations
        </h3>
        <MapSection />
      </div>
    </div>
  );
}
