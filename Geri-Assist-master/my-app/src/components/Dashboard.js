import React from 'react';
import DashboardCard from './DashboardCard';
import DashboardGraphs from './DashboardGraphs';
import MapSection from './MapSection';
import CalendarSchedule from './CalendarSchedule';

export default function Dashboard() {
  const kpiData = [
    { label: 'Clocked-in via Mobile', value: '03', color: 'card-cyan' },
    { label: 'Scheduled Visits', value: '30', color: 'card-green' },
    { label: 'Accepted Visit Offers', value: '03', color: 'card-green' },
    { label: 'Available', value: '00', color: 'card-cyan' },
    { label: 'Sick Leaves', value: '00', color: 'card-orange' },
    { label: 'Unavailable', value: '00', color: 'card-purple' },
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

      {/* Main Dashboard Layout with Sidebar */}
      <div className="row g-4">
        {/* Main Content Column */}
        <div className="col-12 col-xl-8">
          {/* KPI Cards Grid */}
          <div className="row g-3 mb-4">
            {kpiData.map((item, index) => (
              <div
                key={index}
                className="col-12 col-sm-6 col-lg-4 animate-slideUp"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <DashboardCard {...item} />
              </div>
            ))}
          </div>

          {/* Graphs Section */}
          <DashboardGraphs />

          {/* Map Section */}
          <div className="content-card animate-slideUp" style={{ animationDelay: '200ms' }}>
            <h3 className="mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--gray-800)' }}>
              <i className="bi bi-geo-alt-fill" style={{ color: 'var(--primary-purple)' }}></i>
              Live Employee Locations
            </h3>
            <MapSection />
          </div>
        </div>

        {/* Calendar & Schedule Sidebar */}
        <div className="col-12 col-xl-4">
          <CalendarSchedule />
        </div>
      </div>
    </div>
  );
}
