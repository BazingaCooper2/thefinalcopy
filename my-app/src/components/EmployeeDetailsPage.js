import React, { useState, useEffect } from "react";

const EmployeeDetails = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch employees from backend (Flask + Supabase)
  useEffect(() => {
    fetch("http://127.0.0.1:5000/employees")
      .then((res) => res.json())
      .then((data) => {
        // Enhance employee data with mock capacity info
        const enhancedData = (data || []).map(emp => ({
          ...emp,
          weekly_capacity: emp.employee_type === 'Full-time' ? 40 : emp.employee_type === 'Part-time' ? 25 : 15,
          hours_worked: Math.floor(Math.random() * 40),
          cross_training: emp.cross_training || ['WP'], // Mock data
          offer_status: emp.offer_status || null,
          employee_type: emp.employee_type || 'Full-time'
        }));
        setEmployees(enhancedData);
        setFilteredEmployees(enhancedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching employees:", err);
        setLoading(false);
      });
  }, []);

  // Filter employees based on search
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            (emp.first_name &&
              emp.first_name.toLowerCase().includes(search.toLowerCase())) ||
            (emp.last_name &&
              emp.last_name.toLowerCase().includes(search.toLowerCase())) ||
            (emp.emp_id && emp.emp_id.toString().includes(search))
        )
      );
    }
  }, [search, employees]);

  const handleView = (emp_id) => {
    window.open(`/employee/${emp_id}`, "_blank");
  };

  const handleLeaveRequest = (emp) => {
    setSelectedEmployee(emp);
    setShowLeaveModal(true);
  };

  const getStatusBadge = (status, offerStatus) => {
    if (offerStatus === 'sent') {
      return {
        bg: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        icon: 'bi-envelope-check',
        label: 'Offer Sent'
      };
    }

    const statusConfig = {
      'Available': { bg: 'var(--success-gradient)', icon: 'bi-check-circle-fill', label: 'Available' },
      'Busy': { bg: 'var(--info-gradient)', icon: 'bi-clock-fill', label: 'Busy' },
      'On Leave': { bg: 'var(--warning-gradient)', icon: 'bi-calendar-x', label: 'On Leave' },
      'Sick': { bg: 'var(--danger-gradient)', icon: 'bi-bandaid-fill', label: 'Sick' },
      'On Call': { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', icon: 'bi-telephone-fill', label: 'On Call' },
    };
    const config = statusConfig[status] || statusConfig['Available'];

    return (
      <span className="badge d-inline-flex align-items-center gap-1 px-3 py-2" style={{ background: config.bg, color: 'white' }}>
        <i className={`bi ${config.icon}`}></i>
        {config.label}
      </span>
    );
  };

  const getCapacityBar = (worked, capacity) => {
    const percentage = (worked / capacity) * 100;
    let color = 'var(--success-gradient)';
    if (percentage >= 100) color = 'var(--danger-gradient)';
    else if (percentage >= 80) color = 'var(--warning-gradient)';

    return (
      <div className="d-flex align-items-center gap-2" style={{ minWidth: '150px' }}>
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
            <span className="fw-semibold">{worked}/{capacity} hrs</span>
            <span className="text-muted">{percentage.toFixed(0)}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--gray-200)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(percentage, 100)}%`,
                height: '100%',
                background: color,
                transition: 'width var(--transition-base)'
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const getCrossTrainingBadges = (programs) => {
    const programColors = {
      'WP': { bg: '#8b5cf6', label: 'WP' },  // Purple
      '87NV': { bg: '#3b82f6', label: '87NV' },  // Blue
      '85NV': { bg: '#10b981', label: '85NV' },  // Green
      'Outreach': { bg: '#f59e0b', label: 'Outreach' }  // Orange
    };

    return (
      <div className="d-flex gap-1 flex-wrap">
        {programs.map((prog, idx) => (
          <span
            key={idx}
            className="badge"
            style={{
              background: programColors[prog]?.bg || 'var(--gray-400)',
              color: 'white',
              fontSize: '0.7rem',
              padding: '0.2rem 0.5rem'
            }}
          >
            {programColors[prog]?.label || prog}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="text-center">
          <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: 'var(--primary-purple)' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title mb-0">
              <i className="bi bi-people-fill me-3"></i>
              Employee Directory
            </h1>
            <p className="page-subtitle mb-0">Manage team, schedules, and leave requests</p>
          </div>
          <button
            className="btn-modern btn-primary"
            onClick={() => handleLeaveRequest(null)}
          >
            <i className="bi bi-calendar-x me-2"></i>
            Request Leave
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="dashboard-card card-purple">
            <div className="dashboard-card-value">{employees.length}</div>
            <div className="dashboard-card-label">Total Employees</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="dashboard-card card-green">
            <div className="dashboard-card-value">{employees.filter(e => (e.status_label || e.status) === 'Available').length}</div>
            <div className="dashboard-card-label">Available Now</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="dashboard-card card-orange">
            <div className="dashboard-card-value">{employees.filter(e => e.offer_status === 'sent').length}</div>
            <div className="dashboard-card-label">Offers Sent</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="dashboard-card card-cyan">
            <div className="dashboard-card-value">{employees.filter(e => (e.status_label || e.status) === 'On Leave' || (e.status_label || e.status) === 'Sick').length}</div>
            <div className="dashboard-card-label">On Leave</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="content-card mb-4">
        <div className="row align-items-end g-3">
          <div className="col-md-8">
            <div className="input-group-modern mb-0">
              <label className="input-label-modern">
                <i className="bi bi-search me-2"></i>
                Search Employee
              </label>
              <div className="position-relative">
                <input
                  type="text"
                  className="input-modern"
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="btn position-absolute end-0 top-50 translate-middle-y me-2"
                    onClick={() => setSearch("")}
                    style={{ background: 'transparent', border: 'none', color: 'var(--gray-400)' }}
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex gap-2">
              <select className="input-modern">
                <option>All Employees</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Casual</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="content-card">
        {filteredEmployees.length > 0 ? (
          <div className="table-responsive">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Cross-Training</th>
                  <th>Status</th>
                  <th>Capacity</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.emp_id}>
                    <td>
                      <span className="badge" style={{ background: 'var(--gray-200)', color: 'var(--gray-700)', fontWeight: '600' }}>
                        #{emp.emp_id}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', color: 'white', fontWeight: '600', flexShrink: 0 }}>
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div>
                          <div className="fw-semibold">{emp.first_name} {emp.last_name || ""}</div>
                          <div className="text-muted small">{emp.designation || "Staff"}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: emp.employee_type === 'Full-time' ? 'var(--success-gradient)' :
                          emp.employee_type === 'Part-time' ? 'var(--info-gradient)' :
                            'var(--gray-400)',
                        color: 'white'
                      }}>
                        {emp.employee_type || 'Full-time'}
                      </span>
                    </td>
                    <td>
                      <div className="small">
                        {emp.phone && (
                          <div>
                            <i className="bi bi-telephone me-2 text-muted"></i>
                            {emp.phone}
                          </div>
                        )}
                        {emp.email && (
                          <div className="text-muted text-truncate" style={{ maxWidth: '200px' }}>
                            <i className="bi bi-envelope me-2"></i>
                            {emp.email}
                          </div>
                        )}
                        {!emp.phone && !emp.email && <span className="text-muted">-</span>}
                      </div>
                    </td>
                    <td>
                      {getCrossTrainingBadges(emp.cross_training || ['WP'])}
                    </td>
                    <td>
                      {getStatusBadge(emp.status_label || emp.status, emp.offer_status)}
                    </td>
                    <td>
                      {getCapacityBar(emp.hours_worked || 0, emp.weekly_capacity || 40)}
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        <button
                          className="btn btn-sm"
                          onClick={() => handleView(emp.emp_id)}
                          style={{ color: 'var(--primary-purple)' }}
                          title="View Details"
                        >
                          <i className="bi bi-eye-fill"></i>
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleLeaveRequest(emp)}
                          style={{ color: 'var(--accent-orange)' }}
                          title="Request Leave"
                        >
                          <i className="bi bi-calendar-x-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="bi bi-people" style={{ fontSize: '4rem', color: 'var(--gray-300)' }}></i>
            <h5 className="mt-3 text-muted">No employees found</h5>
            <p className="text-muted">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <LeaveRequestModal
          employee={selectedEmployee}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  );
};

// Leave Request Modal Component
function LeaveRequestModal({ employee, onClose }) {
  const [formData, setFormData] = useState({
    leaveType: 'Sick Leave',
    startDate: '',
    endDate: '',
    reason: '',
    notifySupervisor: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would send the leave request to the backend
    console.log('Leave request submitted:', formData);
    alert('Leave request submitted successfully! Notification sent to supervisor.');
    onClose();
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
      onClick={onClose}>
      <div className="content-card animate-slideUp"
        style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0">
            <i className="bi bi-calendar-x me-2" style={{ color: 'var(--primary-purple)' }}></i>
            Request Leave
          </h4>
          <button onClick={onClose} className="btn btn-sm" style={{ color: 'var(--gray-400)' }}>
            <i className="bi bi-x-lg fs-5"></i>
          </button>
        </div>

        {employee && (
          <div className="p-3 rounded mb-4" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', color: 'white', fontWeight: '600' }}>
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </div>
              <div>
                <div className="fw-semibold">{employee.first_name} {employee.last_name}</div>
                <div className="text-muted small">ID: #{employee.emp_id}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group-modern">
            <label className="input-label-modern">Leave Type</label>
            <select
              className="input-modern"
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              required
            >
              <option>Sick Leave</option>
              <option>Vacation</option>
              <option>Personal Day</option>
              <option>Unpaid Leave</option>
            </select>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group-modern">
                <label className="input-label-modern">Start Date</label>
                <input
                  type="date"
                  className="input-modern"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="input-group-modern">
                <label className="input-label-modern">End Date</label>
                <input
                  type="date"
                  className="input-modern"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="input-group-modern">
            <label className="input-label-modern">Reason</label>
            <textarea
              className="input-modern"
              rows="4"
              placeholder="Please provide a brief reason for your leave request..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>

          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="notifySupervisor"
              checked={formData.notifySupervisor}
              onChange={(e) => setFormData({ ...formData, notifySupervisor: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="notifySupervisor">
              Send email notification to supervisor and common mail ID
            </label>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn-modern btn-primary flex-grow-1">
              <i className="bi bi-send me-2"></i>
              Submit Request
            </button>
            <button type="button" onClick={onClose} className="btn-modern btn-outline">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeDetails;
