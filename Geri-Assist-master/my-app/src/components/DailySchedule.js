import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import './DailySchedule.css';
import API_URL from '../config/api';
import { getEmpId } from '../utils/emp';

export default function DailySchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState({ shift: [], daily_shift: [], client: [], employee: [] });
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [modalMode, setModalMode] = useState('detail'); // 'detail' | 'edit' | 'create'
    const [selectedShift, setSelectedShift] = useState(null);
    const [editFormData, setEditFormData] = useState({
        shift_start_time: '',
        shift_end_time: '',
        emp_id: null,
        client_id: null
    });
    const [expandedEmployees, setExpandedEmployees] = useState({});
    
    const locations = ['All Locations', '85 Neeve', '87 Neeve', 'Willow Place', 'Outreach', 'Assisted Living', 'Seniors Assisted Living'];

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
        const empId = getEmpId();
        if (!empId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const params = {};
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

    // ========== MODAL HANDLERS ==========
    
    const handleShiftClick = (shift, isClientShift = true) => {
        setSelectedShift({ ...shift, isClientShift });
        setModalMode('detail');
        setEditFormData({
            shift_start_time: shift.shift_start_time?.split('T')[1]?.slice(0, 5) || '',
            shift_end_time: shift.shift_end_time?.split('T')[1]?.slice(0, 5) || '',
            emp_id: shift.emp_id || null,
            client_id: shift.client_id || null
        });
        setShowShiftModal(true);
    };

    const handleAddShift = () => {
        setSelectedShift({
            isNew: true,
            date: currentDate.toISOString().split('T')[0],
            isClientShift: true
        });
        setModalMode('create');
        setEditFormData({
            shift_start_time: '08:00',
            shift_end_time: '12:00',
            emp_id: null,
            client_id: null
        });
        setShowShiftModal(true);
    };

    const handleSaveShift = async (assignEmployee = false) => {
        try {
            if (modalMode === 'create') {
                // Create new shift
                await axios.post(`${API_URL}/admin/shift`, {
                    date: selectedShift.date,
                    shift_start_time: editFormData.shift_start_time,
                    shift_end_time: editFormData.shift_end_time,
                    client_id: editFormData.client_id,
                    ...(assignEmployee && editFormData.emp_id && { emp_id: editFormData.emp_id })
                });
            } else {
                // Update existing shift
                await axios.post(`${API_URL}/submit`, {
                    shift_id: selectedShift.shift_id,
                    client_id: selectedShift.client_id,
                    shift_start_time: editFormData.shift_start_time,
                    shift_end_time: editFormData.shift_end_time,
                    ...(assignEmployee && editFormData.emp_id && { emp_id: editFormData.emp_id })
                });
            }
            setShowShiftModal(false);
            fetchScheduleData();
        } catch (error) {
            console.error("Error saving shift:", error);
            alert("Failed to save shift");
        }
    };

    // ========== HELPER FUNCTIONS ==========
    
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

    const getShiftStatus = (shift) => {
        if (!shift || shift.emp_id === undefined || shift.emp_id === null) return 'unassigned';
        if (shift.clock_in_time) return 'clocked-in';
        if (shift.offer_sent) return 'offer-sent';
        return 'scheduled';
    };

    const getStatusBadge = (status) => {
        const badges = {
            'unassigned': { text: 'Unassigned', class: 'bg-danger' },
            'scheduled': { text: 'Scheduled', class: 'bg-success' },
            'offer-sent': { text: 'Offer Sent', class: 'bg-warning' },
            'clocked-in': { text: 'Clocked In', class: 'bg-info' }
        };
        const badge = badges[status] || badges['unassigned'];
        return <span className={`badge ${badge.class} ms-2`}>{badge.text}</span>;
    };

    const allEmployees = scheduleData.employee || [];

    const toggleEmployeeExpanded = (empId) => {
        setExpandedEmployees(prev => ({
            ...prev,
            [empId]: !prev[empId]
        }));
    };

    const getEmployeeDailyShift = (empId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduleData.daily_shift.find(s => {
            return s.emp_id === empId && s.shift_date === dateStr;
        });
    };

    const getEmployeeShiftsForDate = (empId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduleData.shift.filter(s => {
            if (!s.emp_id || s.emp_id !== empId) return false;
            const shiftDate = s.date || new Date(s.shift_start_time).toISOString().split('T')[0];
            return shiftDate === dateStr || (s.shift_start_time && s.shift_start_time.startsWith(dateStr));
        });
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
                    <button className="btn btn-sm btn-primary ms-2" onClick={handleAddShift}>
                        <i className="bi bi-plus-circle me-1"></i>
                        Add Shift
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
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="timeline-container">
                <div className="timeline-grid">
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

                    <div className="timeline-body">
                        {allEmployees.map((employee) => {
                            const dailyShift = getEmployeeDailyShift(employee.emp_id, currentDate);
                            const clientShifts = getEmployeeShiftsForDate(employee.emp_id, currentDate);
                            const isExpanded = expandedEmployees[employee.emp_id];
                            const hasClientShifts = clientShifts && clientShifts.length > 0;

                            return (
                                <React.Fragment key={employee.emp_id}>
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
                                                const [startHour, startMin] = dailyShift.shift_start_time.split('T')[1].split(':').map(Number);
                                                const [endHour, endMin] = dailyShift.shift_end_time.split('T')[1].split(':').map(Number);

                                                const gridColumn = startHour + 1;
                                                const startFraction = startMin / 60;
                                                const endFraction = (endHour + endMin / 60) - (startHour + startFraction);

                                                return (
                                                    <div
                                                        className="shift-block employee-daily-shift"
                                                        style={{
                                                            gridColumnStart: gridColumn,
                                                            position: 'relative',
                                                            left: `${startFraction * 100}%`,
                                                            width: `${endFraction * 100}%`
                                                        }}
                                                    >
                                                        <div className="shift-block-content">
                                                            <div className="shift-time-range">
                                                                <i className="bi bi-clock"></i>
                                                                {dailyShift.shift_start_time.split('T')[1].slice(0, 5)} - {dailyShift.shift_end_time.split('T')[1].slice(0, 5)}
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
                                                    const [startHour, startMin] = shift.shift_start_time.split('T')[1].split(':').map(Number);
                                                    const [endHour, endMin] = shift.shift_end_time.split('T')[1].split(':').map(Number);

                                                    const gridColumn = startHour + 1;
                                                    const startFraction = startMin / 60;
                                                    const endFraction = (endHour + endMin / 60) - (startHour + startFraction);

                                                    return (
                                                        <div
                                                            key={shiftIndex}
                                                            className="shift-block client-shift"
                                                            style={{
                                                                gridColumnStart: gridColumn,
                                                                position: 'relative',
                                                                left: `${startFraction * 100}%`,
                                                                width: `${endFraction * 100}%`,
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => handleShiftClick(shift, true)}
                                                        >
                                                            <div className="shift-block-content">
                                                                <div className="shift-time-range">
                                                                    <i className="bi bi-clock"></i>
                                                                    {shift.shift_start_time.split('T')[1].slice(0, 5)} - {shift.shift_end_time.split('T')[1].slice(0, 5)}
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

            {/* SHIFT MODAL - Production Grade */}
            <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-calendar-check me-2"></i>
                        Shift – {selectedShift?.date || currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {selectedShift && !selectedShift.isNew && selectedShift.emp_id !== undefined && getStatusBadge(getShiftStatus(selectedShift))}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedShift && (
                        <>
                            {/* SHIFT CONTEXT - Always Visible */}
                            <div className="shift-context-card p-3 mb-3 bg-light rounded">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-2">
                                            <small className="text-muted">Client</small>
                                            <div className="fw-bold">
                                                <i className="bi bi-person-circle me-2"></i>
                                                {modalMode === 'create' ? (
                                                    <select 
                                                        className="form-select form-select-sm d-inline-block w-auto"
                                                        value={editFormData.client_id || ''}
                                                        onChange={(e) => setEditFormData({...editFormData, client_id: parseInt(e.target.value)})}
                                                    >
                                                        <option value="">Select Client</option>
                                                        {scheduleData.client.map(c => (
                                                            <option key={c.client_id} value={c.client_id}>
                                                                {c.first_name} {c.last_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    getClientName(selectedShift.client_id)
                                                )}
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <small className="text-muted">Service</small>
                                            <div className="fw-bold">
                                                <i className="bi bi-geo-alt me-2"></i>
                                                {getClient(selectedShift.client_id)?.service_type || selectedLocation}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-2">
                                            <small className="text-muted">Date</small>
                                            <div className="fw-bold">
                                                <i className="bi bi-calendar3 me-2"></i>
                                                {new Date(selectedShift.date || currentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* EMPLOYEE SECTION */}
                            {modalMode === 'detail' && (
                                <div className="employee-section mb-3">
                                    {selectedShift.emp_id ? (
                                        <>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <div>
                                                    <small className="text-muted d-block">Assigned Employee</small>
                                                    <div className="fw-bold fs-5">
                                                        <i className="bi bi-person-badge me-2"></i>
                                                        {getEmployeeName(selectedShift.emp_id)}
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm"
                                                    onClick={() => setModalMode('edit')}
                                                >
                                                    <i className="bi bi-arrow-left-right me-1"></i>
                                                    Change Employee
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="alert alert-warning">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            No employee assigned yet
                                            <Button 
                                                variant="warning" 
                                                size="sm" 
                                                className="ms-3"
                                                onClick={() => setModalMode('edit')}
                                            >
                                                Assign Now
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalMode !== 'detail' && (
                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="bi bi-person-badge me-2"></i>
                                        {editFormData.emp_id ? 'Reassign to' : 'Assign Employee'}
                                    </label>
                                    <select
                                        className="form-select"
                                        value={editFormData.emp_id || ''}
                                        onChange={(e) => setEditFormData({...editFormData, emp_id: e.target.value ? parseInt(e.target.value) : null})}
                                    >
                                        <option value="">Select Employee</option>
                                        {allEmployees.map(emp => (
                                            <option key={emp.emp_id} value={emp.emp_id}>
                                                {emp.first_name} {emp.last_name} ({emp.service_type || 'Staff'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* TIME EDITOR */}
                            {modalMode !== 'detail' && (
                                <>
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="bi bi-clock me-2"></i>
                                                Start Time
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={editFormData.shift_start_time}
                                                onChange={(e) => setEditFormData({...editFormData, shift_start_time: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="bi bi-clock-history me-2"></i>
                                                End Time
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={editFormData.shift_end_time}
                                                onChange={(e) => setEditFormData({...editFormData, shift_end_time: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* DETAIL VIEW - Time Display */}
                            {modalMode === 'detail' && (
                                <div className="time-display p-3 bg-light rounded mb-3">
                                    <small className="text-muted d-block mb-1">Shift Time</small>
                                    <div className="fs-4 fw-bold">
                                        <i className="bi bi-clock me-2"></i>
                                        {editFormData.shift_start_time} – {editFormData.shift_end_time}
                                    </div>
                                    <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="p-0 mt-1"
                                        onClick={() => setModalMode('edit')}
                                    >
                                        Edit Times
                                    </Button>
                                </div>
                            )}

                            {/* META INFO - Detail Mode Only */}
                            {modalMode === 'detail' && !selectedShift.isNew && (
                                <div className="meta-info mt-3 pt-3 border-top">
                                    <small className="text-muted d-block mb-1">
                                        <i className="bi bi-info-circle me-1"></i>
                                        Created by System · Last updated 2h ago
                                    </small>
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
                        Cancel
                    </Button>
                    <div>
                        {modalMode === 'detail' ? (
                            <>
                                {selectedShift && getShiftStatus(selectedShift) === 'unassigned' && (
                                    <Button variant="warning" className="me-2">
                                        <i className="bi bi-magic me-1"></i>
                                        Auto-Fix
                                    </Button>
                                )}
                                <Button variant="primary" onClick={() => setModalMode('edit')}>
                                    <i className="bi bi-pencil me-1"></i>
                                    Edit Shift
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button 
                                    variant="outline-primary" 
                                    className="me-2"
                                    onClick={() => handleSaveShift(false)}
                                >
                                    Save Only
                                </Button>
                                <Button 
                                    variant="primary"
                                    onClick={() => handleSaveShift(true)}
                                >
                                    <i className="bi bi-check-circle me-1"></i>
                                    Save & Assign
                                </Button>
                            </>
                        )}
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
}