import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import API_URL from '../config/api';

const EmployeeDetails = () => {
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [typeFilter, setTypeFilter] = useState("All");

    // Fetch employees from backend (Flask + Supabase)
    useEffect(() => {
        fetch(`${API_URL}/employees`)
            .then(res => res.json())
            .then(data => {
                const STATUS_MAP = {
                    WT: "Waiting",
                    TRN: "Training",
                    FLW: "Follow RTW",
                    LV: "On Leave",
                    IN: "Busy",
                    OUT: "Available",
                    OFR: "Offer Sent"
                };

                const enhancedData = (data || []).map(emp => {
                    const rawStatus = emp.status?.label || "WT";

                    return {
                        ...emp,
                        status_label: STATUS_MAP[rawStatus] || "Available",

                        weekly_capacity:
                            emp.employmee_type === "Full Time"
                                ? 40
                                : emp.employmee_type === "Part Time"
                                    ? 25
                                    : 15,

                        hours_worked: Math.floor(Math.random() * 40),
                        cross_training: emp.department || ["WP"],
                        offer_status: emp.offer_status || null,
                        employee_type: emp.employmee_type || "Full Time"
                    };
                });

                setEmployees(enhancedData);
                setFilteredEmployees(enhancedData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching employees:", err);
                setLoading(false);
            });
    }, []);


    // Filter employees based on search
    useEffect(() => {
        let result = employees;

        if (search.trim() !== "") {
            const q = search.toLowerCase();
            result = result.filter(
                emp =>
                    emp.first_name?.toLowerCase().includes(q) ||
                    emp.last_name?.toLowerCase().includes(q) ||
                    emp.emp_id?.toString().includes(q)
            );
        }

        if (typeFilter !== "All") {
            result = result.filter(
                emp => emp.employee_type === typeFilter
            );
        }

        setFilteredEmployees(result);
    }, [search, typeFilter, employees]);


    const navigate = useNavigate();

    const handleView = (emp_id) => {
        navigate(`/employee/${emp_id}`);
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
                            <select
                                className="input-modern"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="All">All Employees</option>
                                <option value="Full Time">Full Time</option>
                                <option value="Part Time">Part Time</option>
                                <option value="Casual">Casual</option>
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
                                    <th>Status</th>
                                    <th>Availability</th>
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
                                            {getStatusBadge(emp.status_label, emp.offer_status)}
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
                    employees={employees}
                    onClose={() => setShowLeaveModal(false)}
                />
            )}
        </div>
    );
};

// Leave Request Modal Component
function LeaveRequestModal({ employee, employees, onClose }) {
    const [formData, setFormData] = useState({
        emp_id: employee?.emp_id || "",
        type: "",
        start_date: "",
        end_date: "",
        all_day: false,
        frequency_type: "none",
        repeat_every: "",
        start_time: "",
        end_time: "",
        description: "",
        notifySupervisor: true
    });

    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");

    const UNAVAILABILITY_TYPES = [
        "Unavailability",
        "Vacation FT Hourly - pay only",
        "Float Day",
        "Sick paid",
        "Sick unpaid",
        "Vacation PT and Casual - Seniority only",
        "Lieu day for Stat worked (unpaid)",
        "Unpaid leave + no seniority",
        "ESA leave + seniority",
        "Moved",
        "WSIB Leave (with seniority)",
        "Union",
        "Domestic Violence Leave",
        "Bereavement paid",
        "Bereavement unpaid",
        "Jury Duty",
        "Vacation FT - seniority only",
        "JHSC",
        "Unavailable - First Aid CPR",
        "No Show",
        "Maternity/Paternity Leave"
    ];

    const filteredTypes = UNAVAILABILITY_TYPES.filter(t =>
        t.toLowerCase().includes(filter.toLowerCase())
    );

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.emp_id) {
            alert("Please select an employee");
            return;
        }

        if (!formData.type) {
            alert("Please select a leave type");
            return;
        }

        try {
            const body = {
                ...formData, // includes emp_id
                start_time: formData.all_day ? "00:00:00" : formData.start_time,
                end_time: formData.all_day ? "23:59:00" : formData.end_time
            };

            const response = await fetch(`${API_URL}/add_unavailability`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                alert('Leave request submitted successfully!');
                onClose();
            } else {
                alert('Failed to submit leave request');
            }
        } catch (error) {
            console.error("Error submitting request:", error);
            alert("An error occurred while submitting the request");
        }
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
                        <i className="bi bi-calendar-plus me-2" style={{ color: 'var(--primary-purple)' }}></i>
                        Add Unavailability / Leave
                    </h4>
                    <button onClick={onClose} className="btn btn-sm" style={{ color: 'var(--gray-400)' }}>
                        <i className="bi bi-x-lg fs-5"></i>
                    </button>
                </div>

                {!employee && employees && (
                    <div className="input-group-modern mb-3">
                        <label className="input-label-modern">Select Employee</label>
                        <select
                            className="input-modern"
                            name="emp_id"
                            value={formData.emp_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => (
                                <option key={emp.emp_id} value={emp.emp_id}>
                                    {emp.first_name} {emp.last_name} (#{emp.emp_id})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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
                    <div className="input-group-modern position-relative">
                        <label className="input-label-modern">Type</label>
                        <input
                            type="text"
                            className="input-modern"
                            placeholder="Search or select type..."
                            name="type"
                            value={open ? filter : formData.type}
                            onFocus={() => setOpen(true)}
                            onChange={(e) => {
                                setFilter(e.target.value);
                                handleChange(e);
                                setOpen(true);
                            }}
                            autoComplete="off"
                        />
                        {open && (
                            <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 10, maxHeight: '200px', overflowY: 'auto', top: '100%' }}>
                                {filteredTypes.map((t, idx) => (
                                    <li key={idx}
                                        className="list-group-item list-group-item-action"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, type: t }));
                                            setFilter("");
                                            setOpen(false);
                                        }}>
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="input-group-modern">
                                <label className="input-label-modern">Start Date</label>
                                <input
                                    type="date"
                                    className="input-modern"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
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
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-check mb-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="allDayCheck"
                            name="all_day"
                            checked={formData.all_day}
                            onChange={(e) => {
                                handleChange(e);
                                if (e.target.checked) {
                                    setFormData(prev => ({ ...prev, start_time: "", end_time: "" }));
                                }
                            }}
                        />
                        <label className="form-check-label" htmlFor="allDayCheck">
                            All Day
                        </label>
                    </div>

                    {!formData.all_day && (
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <div className="input-group-modern">
                                    <label className="input-label-modern">Start Time</label>
                                    <input
                                        type="time"
                                        className="input-modern"
                                        name="start_time"
                                        value={formData.start_time}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="input-group-modern">
                                    <label className="input-label-modern">End Time</label>
                                    <input
                                        type="time"
                                        className="input-modern"
                                        name="end_time"
                                        value={formData.end_time}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="input-group-modern">
                        <label className="input-label-modern">Frequency</label>
                        <select
                            className="input-modern"
                            name="frequency_type"
                            value={formData.frequency_type}
                            onChange={handleChange}
                        >
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {formData.frequency_type !== "none" && (
                        <div className="input-group-modern">
                            <label className="input-label-modern">
                                Repeat every ({formData.frequency_type === "daily" ? "days" : formData.frequency_type === "weekly" ? "weeks" : "months"})
                            </label>
                            <input
                                type="number"
                                min="1"
                                className="input-modern"
                                name="repeat_every"
                                value={formData.repeat_every}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div className="input-group-modern">
                        <label className="input-label-modern">Description / Reason</label>
                        <textarea
                            className="input-modern"
                            rows="3"
                            placeholder="Additional details..."
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-check mb-4">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="notifySupervisor"
                            name="notifySupervisor"
                            checked={formData.notifySupervisor}
                            onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="notifySupervisor">
                            Send email notification
                        </label>
                    </div>

                    <div className="d-flex gap-2">
                        <button type="submit" className="btn-modern btn-primary flex-grow-1">
                            <i className="bi bi-send me-2"></i>
                            Submit
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
