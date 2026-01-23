import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import './DailySchedule.css';
import API_URL from '../config/api';

export default function DailySchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState({ shift: [], daily_shift: [], client: [], employee: [] });
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editFormData, setEditFormData] = useState({
        shift_start_time: '',
        shift_end_time: ''
    });
    const [expandedEmployees, setExpandedEmployees] = useState({});
    const locations = ['All Locations', '85 Neeve', '87 Neeve', 'Willow Place', 'Outreach', 'Assisted Living', 'Seniors Assisted Living'];
    // Generate array of time slots for a single day (24 hours)
    const getTimeSlots = () => {
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            slots.push({
                hour: hour,
                label: `${hour.toString().padStart(2, '0')}:00`
            });
        }
        return slots;
    };

    const timeSlots = getTimeSlots();

    useEffect(() => {
        fetchScheduleData();
    }, [currentDate, selectedLocation]);

    const fetchScheduleData = async () => {
        try {
            setLoading(true);
            const params = {};

            // Only add service filter if not "All Locations"
            if (selectedLocation !== 'All Locations') {
                params.service = selectedLocation;
            }

            const response = await axios.get(`${API_URL}/scheduled`, { params });
            setScheduleData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            setLoading(false);
        }
    };

    const handleEditClick = (shift, isClientShift = true) => {
        setEditingShift({ ...shift, isClientShift });

        const startTime = new Date(`${shift.date}T${shift.shift_start_time}`);
        const endTime = new Date(`${shift.date}T${shift.shift_end_time}`);

        setEditFormData({
            shift_start_time: startTime.toISOString(),
            shift_end_time: endTime.toISOString()
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async () => {
        try {
            if (editingShift.isClientShift) {
                await axios.post(`${API_URL}/submit`, {
                    shift_id: editingShift.shift_id,
                    client_id: editingShift.client_id,
                    shift_start_time: new Date(editFormData.shift_start_time).toISOString().replace(' ', 'T').slice(0, 19),
                    shift_end_time: new Date(editFormData.shift_end_time).toISOString().replace(' ', 'T').slice(0, 19)
                });
            }

            setShowEditModal(false);
            fetchScheduleData();
        } catch (error) {
            console.error('Error updating shift:', error);
            alert('Failed to update shift');
        }
    };

    const formatTime = (dateTimeStr) => {
        if (!dateTimeStr) return '';
        const date = new Date(dateTimeStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getClientName = (clientId) => {
        const client = scheduleData.client.find(c => c.client_id === clientId);
        return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
    };

    const getEmployeeName = (empId) => {
        const employee = scheduleData.employee.find(e => e.emp_id === empId);
        return employee ? `${employee.first_name} ${employee.last_name}` : 'Unassigned';
    };

    const getClient = (clientId) => {
        return scheduleData.client.find(c => c.client_id === clientId);
    };

    const getEmployee = (empId) => {
        return scheduleData.employee.find(e => e.emp_id === empId);
    };

    // Get all unique employees
    const allEmployees = scheduleData.employee || [];

    // Toggle expand/collapse for employee client shifts
    const toggleEmployeeExpanded = (empId) => {
        setExpandedEmployees(prev => ({
            ...prev,
            [empId]: !prev[empId]
        }));
    };

    // Get employee's daily shift (their working hours) for a specific date
    const getEmployeeDailyShift = (empId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        const dailyShift = scheduleData.daily_shift.find(s => {
            return s.emp_id === empId && s.shift_date === dateStr;
        });
        return dailyShift;
    };

    // Get client shifts for a specific employee on a specific date
    const getEmployeeShiftsForDate = (empId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        const clientShifts = scheduleData.shift.filter(s => {
            if (!s.emp_id || s.emp_id !== empId) return false;
            const shiftDate = s.date || new Date(s.shift_start_time).toISOString().split('T')[0];
            return shiftDate === dateStr || (s.shift_start_time && s.shift_start_time.startsWith(dateStr));
        });

        return clientShifts;
    };

    if (loading) {
        return (
            <div className="daily-schedule-wrapper">
                <div className="loading-spinner">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="daily-schedule-wrapper">
            {/* Top Bar */}
            <div className="schedule-top-bar">
                <div className="top-bar-left">
                    <button className="today-btn-small" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </button>
                    <button
                        className="nav-btn-small"
                        onClick={() => {
                            const newDate = new Date(currentDate);
                            newDate.setDate(newDate.getDate() - 1);
                            setCurrentDate(newDate);
                        }}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <button
                        className="nav-btn-small"
                        onClick={() => {
                            const newDate = new Date(currentDate);
                            newDate.setDate(newDate.getDate() + 1);
                            setCurrentDate(newDate);
                        }}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                    <span className="current-date-label">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>

                <div className="top-bar-center">
                    <div className="view-toggle">
                        <button className="view-btn">Daily</button>
                        <button className="view-btn active">15 minutes</button>
                    </div>
                </div>

                <div className="top-bar-right">
                    <div className="location-filter-compact">
                        <i className="bi bi-funnel me-2"></i>
                        <select
                            className="location-select"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                            {locations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                    <button className="visit-btn">
                        <i className="bi bi-plus-lg me-2"></i>
                        Visit
                    </button>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="timeline-container">
                <div className="timeline-grid">
                    {/* Header Row - Time Slots */}
                    <div className="timeline-header">
                        <div className="employee-column-header">Employee</div>
                        <div className="time-slots-header">
                            {timeSlots.map((slot, index) => (
                                <div key={index} className="time-slot-header">
                                    <div className="time-label">{slot.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Employee Rows */}
                    <div className="timeline-body">
                        {allEmployees.map((employee) => {
                            const dailyShift = getEmployeeDailyShift(employee.emp_id, currentDate);
                            const clientShifts = getEmployeeShiftsForDate(employee.emp_id, currentDate);
                            const isExpanded = expandedEmployees[employee.emp_id];
                            const hasClientShifts = clientShifts && clientShifts.length > 0;

                            return (
                                <React.Fragment key={employee.emp_id}>
                                    {/* Main Employee Row - Shows Daily Shift (Orange) */}
                                    <div className="employee-row">
                                        <div className="employee-name-cell">
                                            <div className="employee-name">{employee.first_name} {employee.last_name}</div>
                                            <div className="employee-role">{employee.service_type || 'Staff'}</div>
                                            {hasClientShifts && (
                                                <button
                                                    className="toggle-client-shifts-btn"
                                                    onClick={() => toggleEmployeeExpanded(employee.emp_id)}
                                                >
                                                    <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                    {isExpanded ? 'Hide' : 'Show'} Client Shifts ({clientShifts.length})
                                                </button>
                                            )}
                                        </div>
                                        <div className="employee-time-slots">
                                            {dailyShift && dailyShift.shift_start_time && dailyShift.shift_end_time && (() => {
                                                // Parse time strings (format: "HH:MM")
                                                const [startHour, startMin, startSec] = dailyShift.shift_start_time.split(' ')[1].split(':').map(Number);
                                                const [endHour, endMin, endSec] = dailyShift.shift_end_time.split(' ')[1].split(':').map(Number);

                                                const startTime = startHour + (startMin / 60);
                                                const endTime = endHour + (endMin / 60);

                                                // Calculate grid column positions (1-indexed)
                                                const gridStart = Math.floor(startTime) + 1;
                                                const gridEnd = Math.ceil(endTime) + 1;

                                                return (
                                                    <div
                                                        className="shift-block employee-daily-shift"
                                                        style={{
                                                            gridColumnStart: gridStart,
                                                            gridColumnEnd: gridEnd
                                                        }}
                                                    >
                                                        <div className="shift-block-content">
                                                            <div className="shift-time-range">
                                                                <i className="bi bi-clock"></i>
                                                                {dailyShift.shift_start_time.toString().split(' ')[1].slice(0, 6)} - {dailyShift.shift_end_time.toString().split(' ')[1].slice(0, 6)}
                                                            </div>
                                                            <div className="shift-location-info">
                                                                <i className="bi bi-geo-alt"></i> {employee.service_type || 'Staff'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            {timeSlots.map((slot, slotIndex) => (
                                                <div key={slotIndex} className="time-slot-cell-placeholder"></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Expanded Client Shifts Row - Shows Client Shifts (Green) */}
                                    {isExpanded && hasClientShifts && (
                                        <div className="client-shifts-row">
                                            <div className="client-shifts-label-cell">
                                                <div className="client-shifts-label">
                                                    <i className="bi bi-people-fill"></i> Client Shifts
                                                </div>
                                            </div>
                                            <div className="employee-time-slots">
                                                {clientShifts.map((shift, shiftIndex) => {
                                                    const client = getClient(shift.client_id);
                                                    const shiftStart = new Date(`${shift.date}T${shift.shift_start_time}`);
                                                    const shiftEnd = new Date(`${shift.date}T${shift.shift_end_time}`);

                                                    // Calculate grid positions based on hours
                                                    const startHour = shiftStart.getHours() + (shiftStart.getMinutes() / 60);
                                                    const endHour = shiftEnd.getHours() + (shiftEnd.getMinutes() / 60);

                                                    const gridStart = Math.floor(startHour) + 1;
                                                    const gridEnd = Math.ceil(endHour) + 1;

                                                    return (
                                                        <div
                                                            key={shiftIndex}
                                                            className="shift-block client-shift"
                                                            style={{
                                                                gridColumnStart: gridStart,
                                                                gridColumnEnd: gridEnd
                                                            }}
                                                            onClick={() => handleEditClick(shift, true)}
                                                        >
                                                            <div className="shift-block-content">
                                                                <div className="shift-time-range">
                                                                    <i className="bi bi-clock"></i>
                                                                    {formatTime(`${shift.date}T${shift.shift_start_time}`)} - {formatTime(`${shift.date}T${shift.shift_end_time}`)}
                                                                </div>
                                                                <div className="shift-client-info">
                                                                    <i className="bi bi-person"></i> {client ? `${client.first_name} ${client.last_name}` : 'Client'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {timeSlots.map((slot, slotIndex) => (
                                                    <div key={slotIndex} className="time-slot-cell-placeholder"></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-pencil-square me-2"></i>
                        Edit Shift
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editingShift && (
                        <div className="edit-form">
                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-person-fill me-2"></i>
                                    {editingShift.isClientShift
                                        ? `Client: ${getClientName(editingShift.client_id)}`
                                        : `Employee: ${getEmployeeName(editingShift.emp_id)}`
                                    }
                                </label>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-clock-fill me-2"></i>
                                    Start Time
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editFormData.shift_start_time}
                                    onChange={(e) => setEditFormData({
                                        ...editFormData,
                                        shift_start_time: e.target.value
                                    })}
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-clock-history me-2"></i>
                                    End Time
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editFormData.shift_end_time}
                                    onChange={(e) => setEditFormData({
                                        ...editFormData,
                                        shift_end_time: e.target.value
                                    })}
                                />
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleEditSubmit}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
