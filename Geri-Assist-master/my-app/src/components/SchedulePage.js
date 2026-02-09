import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState({ shift: [], daily_shift: [], client: [], employee: [] });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('matrix');
  const [selectedLocation, setSelectedLocation] = useState('85 Neeve');
  const [timelineDays, setTimelineDays] = useState(14);

  const locations = ['85 Neeve', '87 Neeve', 'Willow Place', 'Outreach', 'Assisted Living', 'Seniors Assisted Living'];

  // ========== HELPER FUNCTIONS ==========
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const parts = timeStr.split(/[T ]/);
    return parts[1]?.slice(0, 5) || '--:--';
  };

  const getClient = (clientId) => {
    return scheduleData.client?.find(c => c.client_id === clientId);
  };

  const getEmployee = (empId) => {
    return employees.find(e => e.emp_id === empId);
  };

  const getShiftForDay = (empId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return scheduleData.shift?.find(s =>
      Number(s.emp_id) === Number(empId) &&
      (s.date === dateStr || s.shift_start_time?.startsWith(dateStr))
    );
  };

  const isStartingSoon = (shift) => {
    if (!shift?.shift_start_time) return false;
    const now = new Date();
    const shiftStart = new Date(shift.shift_start_time.replace(' ', 'T'));
    const hoursUntil = (shiftStart - now) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 24;
  };

  // ========== ELIGIBILITY LOGIC ==========
  const isEmployeeEligible = (employee, selectedLocation) => {
    if (!employee?.department || !selectedLocation) return false;

    const department = employee.department;
    const location = selectedLocation;

    // NV → 85 / 87 Neeve
    if (department.includes("NV") && (location.includes("85 Neeve") || location.includes("87 Neeve"))) {
      return true;
    }

    // WP → Willow Place
    if (department.includes("WP") && location.includes("Willow Place")) {
      return true;
    }

    // OR / Outreach → Outreach
    if ((department.includes("OR") || department.includes("Outreach")) && location.includes("Outreach")) {
      return true;
    }

    // Assisted Living / Supported Living / ALS
    if (["Assisted Living", "Supported Living", "ALS"].includes(department) && 
        (location.includes("Assisted Living") || location.includes("Supported Living"))) {
      return true;
    }

    return false;
  };

  // ========== DATA FETCHING ==========
  useEffect(() => {
    fetchScheduleData();
  }, [selectedLocation]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/scheduled`, {
        params: { service: selectedLocation }
      });

      // Store FULL response with all data
      setScheduleData(response.data || { shift: [], daily_shift: [], client: [], employee: [] });

      // Filter employees by location eligibility
      const filteredEmployees = (response.data.employee || []).filter(emp =>
        isEmployeeEligible(emp, selectedLocation)
      );
      setEmployees(filteredEmployees);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setLoading(false);
    }
  };

  // ========== DATE NAVIGATION ==========
  const getDays = () => {
    const days = [];
    const startObj = new Date(currentDate);
    for (let i = 0; i < timelineDays; i++) {
      const d = new Date(startObj);
      d.setDate(startObj.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const days = getDays();

  const navigateWeek = (direction) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (direction * 7));
    setCurrentDate(d);
  };

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold text-dark">Service Types</h2>
        <p className="text-muted small">Select a location to view coverage.</p>
      </div>

      {/* Location Filter Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {locations.map(loc => (
          <button
            key={loc}
            onClick={() => setSelectedLocation(loc)}
            className={`btn rounded-pill px-4 fw-bold border-0 ${
              selectedLocation === loc ? 'text-white' : 'text-secondary bg-light'
            }`}
            style={{
              backgroundColor: selectedLocation === loc ? '#6366f1' : '#f3f4f6',
              transition: 'all 0.2s',
              minWidth: '120px',
              paddingTop: '10px',
              paddingBottom: '10px'
            }}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Date Navigation & Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <button 
            className="btn btn-outline-secondary btn-sm rounded-circle" 
            onClick={() => navigateWeek(-1)}
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          <span className="fw-bold text-dark fs-5">
            {days[0].toLocaleString('default', { month: 'short' })} {days[0].getDate()} - {' '}
            {days[days.length - 1].toLocaleString('default', { month: 'short' })} {days[days.length - 1].getDate()}
          </span>

          <button 
            className="btn btn-outline-secondary btn-sm rounded-circle" 
            onClick={() => navigateWeek(1)}
          >
            <i className="bi bi-chevron-right"></i>
          </button>

          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
        </div>

        <div className="btn-group">
          <button 
            className={`btn btn-sm ${viewMode === 'matrix' ? 'btn-dark' : 'btn-outline-dark'}`} 
            onClick={() => setViewMode('matrix')}
          >
            Matrix View
          </button>
          <button 
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-dark' : 'btn-outline-dark'}`} 
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {viewMode === 'matrix' ? (
        <div className="card border shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table mb-0" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-light">
                <tr>
                  <th 
                    className="py-3 ps-4 border-end border-bottom bg-white" 
                    style={{ position: 'sticky', left: 0, zIndex: 10, width: '200px' }}
                  >
                    Employee
                  </th>
                  {days.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <th 
                        key={i} 
                        className="text-center py-3 border-end border-bottom text-secondary small fw-bold"
                        style={{ 
                          minWidth: '100px',
                          backgroundColor: isToday ? '#fef3c7' : '#ffffff'
                        }}
                      >
                        <div className={isToday ? 'text-dark fw-bold' : 'text-dark'}>
                          {day.getDate()}-{day.toLocaleString('default', { month: 'short' })}
                        </div>
                        <div className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}>
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.emp_id}>
                    <td 
                      className="py-3 ps-4 border-end border-bottom bg-white" 
                      style={{ position: 'sticky', left: 0, zIndex: 5 }}
                    >
                      <div className="fw-bold text-dark">
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div className="text-muted small">
                        {emp.department || emp.service_type || 'Staff'}
                      </div>
                    </td>
                    {days.map((day, i) => {
                      const shift = getShiftForDay(emp.emp_id, day);
                      const hasShift = !!shift;
                      const client = shift ? getClient(shift.client_id) : null;
                      const startingSoon = shift ? isStartingSoon(shift) : false;
                      const isToday = day.toDateString() === new Date().toDateString();

                      return (
                        <td 
                          key={i} 
                          className="p-2 border-end border-bottom text-center align-middle" 
                          style={{ 
                            height: '80px',
                            backgroundColor: isToday ? '#fef3c7' : '#fff7ed',
                            cursor: hasShift ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (hasShift) {
                              setSelectedShift(shift);
                              setShowShiftModal(true);
                            }
                          }}
                        >
                          {hasShift ? (
                            <div
                              className={`shift-cell ${startingSoon ? 'pulse-animation' : ''}`}
                              style={{
                                background: startingSoon 
                                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                                  : shift.is_leave
                                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                padding: '10px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                              }}
                            >
                              {startingSoon && (
                                <div 
                                  className="position-absolute top-0 end-0 me-1 mt-1"
                                  style={{ fontSize: '0.6rem' }}
                                >
                                  🔔
                                </div>
                              )}
                              {shift.is_leave && (
                                <div 
                                  className="position-absolute top-0 end-0 me-1 mt-1"
                                  style={{ fontSize: '0.6rem' }}
                                >
                                  ⚠️
                                </div>
                              )}
                              <div className="fw-bold mb-1">
                                {formatTime(shift.shift_start_time)} - {formatTime(shift.shift_end_time)}
                              </div>
                              <div 
                                className="small" 
                                style={{ 
                                  opacity: 0.9,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                <i className="bi bi-person me-1"></i>
                                {client?.first_name || client?.name || 'Client'}
                              </div>
                              {shift.shift_status && (
                                <div 
                                  className="mt-1"
                                  style={{ 
                                    fontSize: '0.65rem',
                                    opacity: 0.8,
                                    fontStyle: 'italic'
                                  }}
                                >
                                  {shift.shift_status}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div 
                              className="text-muted" 
                              style={{ fontSize: '0.7rem', opacity: 0.5 }}
                            >
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <RosterListView 
          days={days} 
          scheduleData={scheduleData} 
          employees={employees} 
          selectedLocation={selectedLocation}
          onShiftClick={(shift) => {
            setSelectedShift(shift);
            setShowShiftModal(true);
          }}
          getClient={getClient}
          formatTime={formatTime}
        />
      )}

      {/* Shift Modal Placeholder */}
      {showShiftModal && selectedShift && (
        <ShiftModal
          shift={selectedShift}
          onClose={() => setShowShiftModal(false)}
          client={getClient(selectedShift.client_id)}
          employee={getEmployee(selectedShift.emp_id)}
        />
      )}

      {/* Add pulsing animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
        .shift-cell {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function RosterListView({ days, scheduleData, employees, selectedLocation, onShiftClick, getClient, formatTime }) {
  return (
    <div className="bg-white rounded border shadow-sm p-4">
      {days.slice(0, 7).map((day, dayIdx) => {
        const dateStr = day.toISOString().split('T')[0];
        const shifts = (scheduleData.shift || [])
          .filter(s => (s.date === dateStr || s.shift_start_time?.startsWith(dateStr)))
          .sort((a, b) => (a.shift_start_time > b.shift_start_time ? 1 : -1));

        const isToday = day.toDateString() === new Date().toDateString();

        return (
          <div key={dayIdx} className="mb-4">
            <h6 
              className="border-bottom pb-2 mb-3 fw-bold"
              style={{ 
                color: isToday ? '#f97316' : '#1f2937',
                backgroundColor: isToday ? '#fff7ed' : 'transparent',
                padding: '8px 12px',
                borderRadius: '6px',
                marginLeft: '-12px',
                marginRight: '-12px'
              }}
            >
              {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {isToday && <span className="badge bg-warning text-dark ms-2">Today</span>}
            </h6>
            
            {shifts.length === 0 ? (
              <p className="text-muted small ps-3">No shifts scheduled.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <tbody>
                    {shifts.map((s, idx) => {
                      const emp = employees.find(e => e.emp_id === s.emp_id);
                      const client = getClient(s.client_id);
                      const clientName = client?.name || client?.first_name || "Unknown Client";

                      return (
                        <tr
                          key={idx}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onShiftClick(s)}
                        >
                          {/* Time */}
                          <td width="100" className="fw-bold small">
                            {formatTime(s.shift_start_time)}
                          </td>

                          {/* Status Badge */}
                          <td width="120">
                            <span 
                              className="badge"
                              style={{
                                backgroundColor: s.shift_status === 'Scheduled' ? '#10b981' :
                                               s.shift_status === 'Clocked in' ? '#f59e0b' :
                                               s.shift_status === 'Offer Sent' ? '#8b5cf6' :
                                               '#6b7280',
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            >
                              {s.shift_status || 'Pending'}
                            </span>
                          </td>

                          {/* Client */}
                          <td>
                            <span className="small">
                              <i className="bi bi-person me-1"></i>
                              {clientName}
                            </span>
                            {s.is_leave && (
                              <span className="badge bg-danger ms-2" style={{ fontSize: '0.65rem' }}>
                                On Leave
                              </span>
                            )}
                          </td>

                          {/* Employee */}
                          <td>
                            {emp ? (
                              <span className="small fw-bold">
                                {emp.first_name} {emp.last_name}
                              </span>
                            ) : (
                              <span className="small text-danger">Unassigned</span>
                            )}
                          </td>

                          {/* Duration */}
                          <td className="text-muted small" width="100">
                            {formatTime(s.shift_start_time)} - {formatTime(s.shift_end_time)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Simple Shift Modal Component
function ShiftModal({ shift, onClose, client, employee }) {
  return (
    <div 
      className="modal show d-block" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Shift Details</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <strong>Date:</strong> {shift.date || 'N/A'}
            </div>
            <div className="mb-3">
              <strong>Time:</strong> {shift.shift_start_time?.split(/[T ]/)[1]?.slice(0, 5)} - {shift.shift_end_time?.split(/[T ]/)[1]?.slice(0, 5)}
            </div>
            <div className="mb-3">
              <strong>Client:</strong> {client?.name || client?.first_name || 'Unknown'}
            </div>
            <div className="mb-3">
              <strong>Employee:</strong> {employee ? `${employee.first_name} ${employee.last_name}` : 'Unassigned'}
            </div>
            <div className="mb-3">
              <strong>Status:</strong>{' '}
              <span 
                className="badge"
                style={{
                  backgroundColor: shift.shift_status === 'Scheduled' ? '#10b981' :
                                 shift.shift_status === 'Clocked in' ? '#f59e0b' :
                                 '#6b7280',
                  color: 'white'
                }}
              >
                {shift.shift_status || 'Pending'}
              </span>
            </div>
            {shift.is_leave && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Employee is on leave during this shift
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}