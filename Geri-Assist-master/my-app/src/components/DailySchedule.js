import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './DailySchedule.css';
import API_URL from '../config/api';
import { getEmpId } from '../utils/emp';
import ShiftEditModal from './ShiftEditModal'; 

/**
 * DailySchedule Component - WITH INTEGRATED CONFLICT RESOLUTION & LEAVE DETECTION
 * - Shows conflict indicator banner at top
 * - Opens modal with recommendations when clicked
 * - Detects employees on leave and prevents shift editing
 * - Provides reschedule button for employees on leave
 */
export default function DailySchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState({ shift: [], daily_shift: [], client: [], employee: [], leaves: [] });
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [dragCreate, setDragCreate] = useState(null);
    const [resizing, setResizing] = useState(null);
    const [draggingShift, setDraggingShift] = useState(null);
    
    // NEW: Conflict resolution states
    const [conflicts, setConflicts] = useState([]);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [conflictProcessing, setConflictProcessing] = useState(false);
    
    // NEW: Leave tracking states
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedEmployeeForReschedule, setSelectedEmployeeForReschedule] = useState(null);
    const [shiftsToReschedule, setShiftsToReschedule] = useState([]);
    
    const timelineRef = useRef(null);
    const locations = ['All Locations', '85 Neeve', '87 Neeve', 'Willow Place', 'Outreach', 'Assisted Living', 'Seniors Assisted Living'];

    const PIXELS_PER_HOUR = 60;
    const timeSlots = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`
    }));

    // ========== CHECK IF EMPLOYEE IS ON LEAVE ==========
    // ========== CHECK IF EMPLOYEE IS ON LEAVE ==========
    const isEmployeeOnLeave = useCallback((empId, date) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return (scheduleData.leaves || []).some(lv =>
            lv.emp_id === empId &&
            lv.leave_start_date <= dateStr && dateStr <= lv.leave_end_date
        );
    }, [scheduleData.leaves]);

    // ========== GET EMPLOYEE LEAVE INFO ==========
    const getEmployeeLeaveInfo = useCallback((empId, date) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return (scheduleData.leaves || []).find(lv =>
            lv.emp_id === empId &&
            lv.leave_start_date <= dateStr && dateStr <= lv.leave_end_date
        ) || null;
    }, [scheduleData.leaves]);

    // ========== FETCH LEAVES ==========

    // ========== OPEN RESCHEDULE MODAL ==========
    const openRescheduleModal = (empId) => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const employeeShifts = scheduleData.shift.filter(s => 
            Number(s.emp_id) === Number(empId) && 
            (s.date === dateStr || s.shift_start_time?.startsWith(dateStr))
        );
        
        const employee = scheduleData.employee.find(e => e.emp_id === empId);
        
        setSelectedEmployeeForReschedule(employee);
        setShiftsToReschedule(employeeShifts);
        setShowRescheduleModal(true);
    };

    // ========== RESCHEDULE SHIFT ==========
    const rescheduleShift = async (shiftId) => {
        try {
            // Open conflict resolution for this specific shift
            await openConflictResolution(shiftId);
            
            // Remove from reschedule list
            setShiftsToReschedule(prev => prev.filter(s => s.shift_id !== shiftId));
            
            // If no more shifts, close modal
            if (shiftsToReschedule.length <= 1) {
                setShowRescheduleModal(false);
            }
        } catch (error) {
            console.error('Error rescheduling shift:', error);
            alert('Error: ' + (error.response?.data?.error || 'Failed to reschedule'));
        }
    };

    // ========== FETCH CONFLICTS ==========
    const fetchConflicts = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/reassignments/pending`);
            setConflicts(response.data.conflicts || []);
        } catch (error) {
            console.error('Error fetching conflicts:', error);
        }
    }, []);

    // ========== OPEN CONFLICT RESOLUTION MODAL ==========
    const openConflictResolution = async (shiftId) => {
        try {
            setConflictProcessing(true);
            const response = await axios.get(`${API_URL}/shift/${shiftId}/recommendations`);
            setSelectedConflict(response.data.shift);
            setRecommendations(response.data.recommendations || []);
            setShowConflictModal(true);
            setConflictProcessing(false);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            setConflictProcessing(false);
            alert('Error loading recommendations');
        }
    };

    // ========== APPROVE REASSIGNMENT ==========
    const approveReassignment = async (empId) => {
        if (!selectedConflict) return;
        
        try {
            setConflictProcessing(true);
            await axios.post(`${API_URL}/reassignment/approve`, {
                shift_id: selectedConflict.shift_id,
                recommended_emp_id: empId
            });
            
            setShowConflictModal(false);
            fetchScheduleData();
            fetchConflicts();
            setConflictProcessing(false);
            
            showSuccessToast('✅ Shift successfully reassigned!');
        } catch (error) {
            console.error('Error approving reassignment:', error);
            alert('Error: ' + (error.response?.data?.error || 'Failed to approve'));
            setConflictProcessing(false);
        }
    };

    // ========== REJECT ALL ==========
    const rejectAllRecommendations = async () => {
        if (!selectedConflict) return;
        
        if (!window.confirm('Reject all recommendations? Shift will be marked for manual assignment.')) {
            return;
        }
        
        try {
            setConflictProcessing(true);
            await axios.post(`${API_URL}/reassignment/reject-all`, {
                shift_id: selectedConflict.shift_id
            });
            
            setShowConflictModal(false);
            fetchScheduleData();
            fetchConflicts();
            setConflictProcessing(false);
            
            showSuccessToast('Shift marked for manual assignment');
        } catch (error) {
            console.error('Error rejecting recommendations:', error);
            setConflictProcessing(false);
        }
    };

    // ========== SUCCESS TOAST ==========
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    const showSuccessToast = (message) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const fetchScheduleData = useCallback(async () => {
        const empId = getEmpId();
        if (!empId) return;
        try {
            setLoading(true);
            const params = {
                date: currentDate.toISOString().split('T')[0],
                ...(selectedLocation !== 'All Locations' ? { service: selectedLocation } : {})
            };
            const response = await axios.get(`${API_URL}/scheduled`, { params });
            setScheduleData(response.data);
        } catch (error) {
            console.error('Error fetching schedule:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedLocation, currentDate]);

    useEffect(() => {
        fetchScheduleData();
        fetchConflicts();
    }, [currentDate, fetchScheduleData, fetchConflicts]);

    // Separate effect for leaves - runs after schedule data is loaded
    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            fetchScheduleData();
            fetchConflicts();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchScheduleData, fetchConflicts]);
    // ========== TIME CONVERSION HELPERS ==========
    const parseTimeToMinutes = (timeStr) => {
        const timePart = timeStr?.split(/[T ]/)[1] || "00:00:00";
        const [hours, minutes] = timePart.split(':').map(Number);
        return hours * 60 + (minutes || 0);
    };

    const minutesToTimeString = (minutes, dateStr) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${dateStr}T${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    };

    const formatTimeDisplay = (timeStr) => {
        const timePart = timeStr?.split(/[T ]/)[1] || "00:00:00";
        return timePart.slice(0, 5);
    };

    const checkCapacity = (empId, dateStr, shiftId, newStartMins, newEndMins, allShifts) => {
        const MAX_MINUTES = 15 * 60;
        const newDuration = newEndMins - newStartMins;

        const otherShiftsMinutes = allShifts
            .filter(s => 
                Number(s.emp_id) === Number(empId) && 
                (s.date === dateStr || s.shift_start_time?.startsWith(dateStr)) &&
                String(s.shift_id) !== String(shiftId) 
            )
            .reduce((sum, s) => {
                const start = parseTimeToMinutes(s.shift_start_time);
                const end = parseTimeToMinutes(s.shift_end_time);
                return sum + (end - start);
            }, 0);

        return (otherShiftsMinutes + newDuration) <= MAX_MINUTES;
    };

    const getPositionFromEvent = (e, empId) => {
        const row = e.currentTarget.closest('.employee-time-slots');
        if (!row) return null;
        
        const rect = row.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const minutes = Math.round((x / rect.width) * 24 * 60 / 15) * 15;
        return { empId, minutes: Math.max(0, Math.min(minutes, 24 * 60 - 15)) };
    };

    // ========== DRAG-TO-CREATE SHIFT ==========
    const handleMouseDown = (e, empId) => {
        // PREVENT if employee is on leave
        if (isEmployeeOnLeave(empId, currentDate)) {
            e.preventDefault();
            const leaveInfo = getEmployeeLeaveInfo(empId, currentDate);
            alert(`Cannot add shifts - Employee is on ${leaveInfo?.leave_type || 'leave'}`);
            return;
        }
        
        if (e.target.classList.contains('shift-block') || e.target.closest('.shift-block')) return;
        
        const pos = getPositionFromEvent(e, empId);
        if (!pos) return;

        setDragCreate({
            empId,
            startMinutes: pos.minutes,
            endMinutes: pos.minutes + 60,
            isCreating: true
        });
    };

    const handleMouseMove = (e) => {
        if (dragCreate?.isCreating) {
            const row = e.target.closest('.employee-time-slots');
            if (!row) return;
            
            const rect = row.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const minutes = Math.round((x / rect.width) * 24 * 60 / 15) * 15;
            
            setDragCreate(prev => ({
                ...prev,
                endMinutes: Math.max(prev.startMinutes + 15, Math.min(minutes, 24 * 60))
            }));
        } else if (resizing) {
            handleResizeMove(e);
        } else if (draggingShift) {
            handleDragMove(e);
        }
    };

    const handleMouseUp = () => {
        if (dragCreate?.isCreating && dragCreate.endMinutes > dragCreate.startMinutes) {
            const dateStr = currentDate.toISOString().split('T')[0];
            setSelectedShift({
                isNew: true,
                emp_id: dragCreate.empId,
                client_id: "",
                shift_date: dateStr,
                shift_start_time: minutesToTimeString(dragCreate.startMinutes, dateStr),
                shift_end_time: minutesToTimeString(dragCreate.endMinutes, dateStr),
                shift_type: 'regular',
                shift_status: "Scheduled"
            });
            setShowShiftModal(true);
        }
        setDragCreate(null);
        setResizing(null);
        setDraggingShift(null);
    };

    useEffect(() => {
        if (dragCreate?.isCreating || resizing || draggingShift) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragCreate, resizing, draggingShift]);

    // ========== RESIZE SHIFT ==========
    const handleResizeStart = (e, shift, edge) => {
        e.stopPropagation();
        
        // PREVENT if employee is on leave
        if (isEmployeeOnLeave(shift.emp_id, currentDate)) {
            const leaveInfo = getEmployeeLeaveInfo(shift.emp_id, currentDate);
            alert(`Cannot edit shifts - Employee is on ${leaveInfo?.leave_type || 'leave'}`);
            return;
        }
        
        setResizing({
            shift,
            edge,
            startMinutes: parseTimeToMinutes(shift.shift_start_time),
            endMinutes: parseTimeToMinutes(shift.shift_end_time)
        });
    };

    const handleResizeMove = (e) => {
        if (!resizing) return;
        
        const row = e.target.closest('.employee-row')?.querySelector('.employee-time-slots');
        if (!row) return;
        
        const rect = row.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const minutes = Math.round((x / rect.width) * 24 * 60 / 15) * 15;
        
        setResizing(prev => {
            if (prev.edge === 'start') {
                return { ...prev, startMinutes: Math.max(0, Math.min(minutes, prev.endMinutes - 15)) };
            } else {
                return { ...prev, endMinutes: Math.max(prev.startMinutes + 15, Math.min(minutes, 24 * 60)) };
            }
        });
    };

    const saveResize = async () => {
        if (!resizing) return;
        
        const dateStr = currentDate.toISOString().split('T')[0];

        const isValid = checkCapacity(
            resizing.shift.emp_id, 
            dateStr, 
            resizing.shift.shift_id, 
            resizing.startMinutes, 
            resizing.endMinutes, 
            scheduleData.shift
        );

        if (!isValid) {
            alert("Maximum shifts allocated: This employee cannot exceed 15 hours per day.");
            setResizing(null);
            fetchScheduleData();
            return;
        }

        try {
            await axios.post(`${API_URL}/submit`, {
                shift_id: resizing.shift.shift_id,
                emp_id: resizing.shift.emp_id,
                shift_start_time: minutesToTimeString(resizing.startMinutes, dateStr),
                shift_end_time: minutesToTimeString(resizing.endMinutes, dateStr),
                shift_date: dateStr,
                shift_status: resizing.shift.shift_status || "Scheduled"
            });
            fetchScheduleData();
        } catch (err) {
            console.error("Resize failed:", err);
        }
    };

    useEffect(() => {
        if (resizing === null) return;
        const timeout = setTimeout(() => {
            if (resizing && !resizing.shift) return;
            saveResize();
        }, 500);
        return () => clearTimeout(timeout);
    }, [resizing]);

    // ========== DRAG SHIFT ==========
    const handleShiftDragStart = (e, shift) => {
        e.stopPropagation();
        
        // PREVENT if employee is on leave
        if (isEmployeeOnLeave(shift.emp_id, currentDate)) {
            const leaveInfo = getEmployeeLeaveInfo(shift.emp_id, currentDate);
            alert(`Cannot move shifts - Employee is on ${leaveInfo?.leave_type || 'leave'}`);
            return;
        }
        
        setDraggingShift({
            shift,
            startMinutes: parseTimeToMinutes(shift.shift_start_time),
            endMinutes: parseTimeToMinutes(shift.shift_end_time),
            duration: parseTimeToMinutes(shift.shift_end_time) - parseTimeToMinutes(shift.shift_start_time),
            offsetX: 0
        });
    };

    const handleDragMove = (e) => {
        if (!draggingShift) return;
        
        const row = document.elementFromPoint(e.clientX, e.clientY)?.closest('.employee-row');
        if (!row) return;
        
        const empId = row.getAttribute('data-emp-id');
        const timeSlots = row.querySelector('.employee-time-slots');
        if (!timeSlots) return;
        
        const rect = timeSlots.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const minutes = Math.round((x / rect.width) * 24 * 60 / 15) * 15;
        
        setDraggingShift(prev => ({
            ...prev,
            empId: Number(empId),
            startMinutes: Math.max(0, Math.min(minutes, 24 * 60 - prev.duration)),
            endMinutes: Math.max(prev.duration, Math.min(minutes + prev.duration, 24 * 60))
        }));
    };

    const saveDrag = async () => {
        if (!draggingShift?.empId) return;
        
        const dateStr = currentDate.toISOString().split('T')[0];

        const isValid = checkCapacity(
            draggingShift.empId, 
            dateStr, 
            draggingShift.shift.shift_id, 
            draggingShift.startMinutes, 
            draggingShift.endMinutes, 
            scheduleData.shift
        );

        if (!isValid) {
            alert("Maximum shifts allocated: This employee cannot exceed 15 hours per day.");
            setDraggingShift(null);
            fetchScheduleData();
            return;
        }

        try {
            await axios.post(`${API_URL}/submit`, {
                shift_id: draggingShift.shift.shift_id,
                emp_id: draggingShift.empId,
                shift_start_time: minutesToTimeString(draggingShift.startMinutes, dateStr),
                shift_end_time: minutesToTimeString(draggingShift.endMinutes, dateStr),
                shift_date: dateStr,
                shift_status: draggingShift.shift.shift_status || "Scheduled"
            });
            fetchScheduleData();
        } catch (err) {
            console.error("Drag failed:", err);
        }
    };

    useEffect(() => {
        if (draggingShift === null) return;
        const timeout = setTimeout(() => {
            if (draggingShift && !draggingShift.empId) return;
            saveDrag();
        }, 500);
        return () => clearTimeout(timeout);
    }, [draggingShift]);

    // ========== SHIFT MODAL ==========
    const handleShiftClick = (e, shift) => {
        e.stopPropagation();
        
        // If shift has conflict, open conflict resolution
        if (shift.shift_status === "⚠️ Conflicting Leave") {
            openConflictResolution(shift.shift_id);
            return;
        }
        
        // If employee is on leave, open reschedule for this specific shift
        if (isEmployeeOnLeave(shift.emp_id, currentDate)) {
            openConflictResolution(shift.shift_id);
            return;
        }
        
        setSelectedShift({ ...shift, isNew: false });
        setShowShiftModal(true);
    };

    const handleSaveShift = async (payload) => {
        try {
            const endpoint = payload.isNew ? `${API_URL}/add_client_shift` : `${API_URL}/submit`;
            await axios.post(endpoint, payload);
            setShowShiftModal(false);
            fetchScheduleData();
        } catch (error) {
            console.error("Error saving shift:", error);
            alert("Error: " + (error.response?.data?.error || "Failed to save shift"));
        }
    };

    const handleDeleteShift = async (shiftId) => {
        if (!window.confirm("Are you sure you want to delete this shift?")) return;
        try {
            await axios.post(`${API_URL}/delete_shift`, { shift_id: shiftId });
            setShowShiftModal(false);
            fetchScheduleData();
        } catch (error) {
            console.error("Error deleting shift:", error);
        }
    };

    // ========== HELPERS ==========
    const getEmployeeTotalHours = (empId) => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const shifts = scheduleData.shift.filter(s => 
            Number(s.emp_id) === Number(empId) && 
            (s.date === dateStr || s.shift_start_time?.startsWith(dateStr))
        );
        const totalMinutes = shifts.reduce((acc, s) => {
            const start = parseTimeToMinutes(s.shift_start_time);
            const end = parseTimeToMinutes(s.shift_end_time);
            return acc + (end - start);
        }, 0);
        return (totalMinutes / 60).toFixed(1);
    };

    const getClient = (clientId) => scheduleData.client.find(c => c.client_id === clientId);
    
    const getEmployeeDailyShift = (empId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduleData.daily_shift.find(s => s.emp_id === empId && s.shift_date === dateStr);
    };

    const getEmployeeShiftsForDate = (empId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduleData.shift.filter(s => 
            Number(s.emp_id) === Number(empId) && 
            (s.date === dateStr || s.shift_start_time?.startsWith(dateStr))
        );
    };

    const calculateOverlaps = (shifts) => {
        const sorted = [...shifts].sort((a, b) => 
            parseTimeToMinutes(a.shift_start_time) - parseTimeToMinutes(b.shift_start_time)
        );
        
        const columns = [];
        sorted.forEach(shift => {
            const start = parseTimeToMinutes(shift.shift_start_time);
            const end = parseTimeToMinutes(shift.shift_end_time);
            
            let placed = false;
            for (let col of columns) {
                const hasOverlap = col.some(s => {
                    const sStart = parseTimeToMinutes(s.shift_start_time);
                    const sEnd = parseTimeToMinutes(s.shift_end_time);
                    return start < sEnd && end > sStart;
                });
                
                if (!hasOverlap) {
                    col.push(shift);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                columns.push([shift]);
            }
        });
        
        const result = {};
        columns.forEach((col, colIndex) => {
            col.forEach(shift => {
                result[shift.shift_id] = {
                    column: colIndex,
                    totalColumns: columns.length
                };
            });
        });
        
        return result;
    };

    if (loading && scheduleData.employee.length === 0) {
        return <div className="loading-spinner"><div className="spinner-border text-primary"></div></div>;
    }

    return (
        <div className="daily-schedule-wrapper">
            {/* Success Toast */}
            {showToast && (
                <div 
                    className="position-fixed top-0 start-50 translate-middle-x mt-3 alert alert-success shadow-lg"
                    style={{ zIndex: 9999, minWidth: '300px' }}
                >
                    {toastMessage}
                </div>
            )}

            {/* Conflict Warning Banner */}
            {conflicts.length > 0 && (
                <div className="alert alert-warning mb-3 shadow-sm" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center flex-grow-1">
                            <i className="bi bi-exclamation-triangle-fill me-3" style={{ fontSize: '1.5rem' }}></i>
                            <div>
                                <h6 className="mb-1 fw-bold">
                                    {conflicts.length} Shift Conflict{conflicts.length > 1 ? 's' : ''} Detected
                                </h6>
                                <p className="mb-0 small">
                                    Shifts affected by employee leaves - click conflicting shifts to review recommendations
                                </p>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            {conflicts.slice(0, 3).map(conflict => (
                                <button 
                                    key={conflict.shift_id}
                                    className="btn btn-sm btn-warning"
                                    onClick={() => openConflictResolution(conflict.shift_id)}
                                    disabled={conflictProcessing}
                                >
                                    <i className="bi bi-exclamation-circle me-1"></i>
                                    Shift #{conflict.shift_id}
                                </button>
                            ))}
                            {conflicts.length > 3 && (
                                <span className="badge bg-warning text-dark align-self-center">
                                    +{conflicts.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="schedule-top-bar">
                <div className="top-bar-left">
                    <button 
                        className="btn btn-outline-secondary btn-sm rounded-circle me-1"
                        onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <button className="today-btn-small" onClick={() => setCurrentDate(new Date())}>Today</button>
                    <button 
                        className="btn btn-outline-secondary btn-sm rounded-circle ms-1"
                        onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                <button className="btn btn-sm btn-primary ms-2" onClick={() => {
                        const dateStr = currentDate.toISOString().split('T')[0];
                        setSelectedShift({
                            isNew: true,
                            emp_id: scheduleData.employee[0]?.emp_id || null,
                            client_id: "",
                            shift_date: dateStr,
                            shift_start_time: `${dateStr}T08:00:00`,
                            shift_end_time: `${dateStr}T09:00:00`,
                            shift_type: 'regular',
                            shift_status: "Scheduled"
                        });
                        setShowShiftModal(true);
                    }}>
                        <i className="bi bi-plus-circle me-1"></i> Add Shift
                    </button>
                    <span className="current-date-label">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    {conflicts.length > 0 && (
                        <span className="badge bg-danger ms-2">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="top-bar-right">
                    <select className="location-select" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                        {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                </div>
            </div>

            <div className="timeline-container">
                <div className="timeline-grid">
                    <div className="timeline-header">
                        <div className="employee-column-header">Employee</div>
                        <div className="hours-column-header">Hrs</div>
                        <div className="time-slots-header">
                            {timeSlots.map((slot, i) => (
                                <div key={i} className="time-slot-header">
                                    <div className="time-label">{slot.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="timeline-body">
                        {scheduleData.employee.map((employee) => {
                            const dailyShift = getEmployeeDailyShift(employee.emp_id, currentDate);
                            const clientShifts = getEmployeeShiftsForDate(employee.emp_id, currentDate);
                            const overlaps = calculateOverlaps(clientShifts);
                            const onLeave = isEmployeeOnLeave(employee.emp_id, currentDate);
                            const leaveInfo = getEmployeeLeaveInfo(employee.emp_id, currentDate);

                            return (
                                <div 
                                    className={`employee-row ${onLeave ? 'employee-on-leave' : ''}`} 
                                    key={employee.emp_id} 
                                    data-emp-id={employee.emp_id}
                                    style={{
                                        opacity: onLeave ? 0.7 : 1,
                                        background: onLeave ? '#fff3cd' : 'transparent'
                                    }}
                                >
                                    <div className="employee-name-cell">
                                        <div className="d-flex align-items-center justify-content-between w-100">
                                            <div className="flex-grow-1">
                                                <div className="employee-name">{employee.first_name} {employee.last_name}</div>
                                                <div className="employee-role" style={{ fontSize: '0.75rem', color: '#666' }}>
                                                    {employee.service_type || 'Staff'}
                                                </div>

                                                {/* ── Capacity bars (hidden when on leave) ── */}
                                                {employee.capacity && !onLeave && (() => {
                                                    const cap = employee.capacity;
                                                    const dailyColor  = cap.is_over_daily  ? '#ef4444' : cap.daily_pct  >= 80 ? '#f59e0b' : '#22c55e';
                                                    const weeklyColor = cap.is_over_weekly ? '#ef4444' : cap.is_ot      ? '#f59e0b' : '#22c55e';
                                                    const bar = (used, total, color) => (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.67rem', color: '#555' }}>
                                                            <span style={{ width: 24, textAlign: 'right', fontWeight: 600 }}>{used.toFixed(1)}</span>
                                                            <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 2, minWidth: 36 }}>
                                                                <div style={{ width: `${Math.min(used / total * 100, 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .3s' }} />
                                                            </div>
                                                            <span style={{ width: 20 }}>{total}h</span>
                                                        </div>
                                                    );
                                                    return (
                                                        <div style={{ marginTop: 3 }}>
                                                            {bar(cap.daily_used,  cap.daily_cap,  dailyColor)}
                                                            {bar(cap.weekly_used, cap.weekly_cap, weeklyColor)}
                                                            <div style={{ fontSize: '0.63rem', marginTop: 2,
                                                                color: cap.is_over_daily ? '#dc2626' : cap.is_ot ? '#d97706' : '#15803d',
                                                                fontWeight: cap.is_over_daily || cap.is_ot ? 700 : 400 }}>
                                                                {cap.is_over_daily  ? '⚠ Over daily cap'
                                                                : cap.is_ot         ? 'OT this week'
                                                                : `${cap.daily_remain.toFixed(1)}h today · ${cap.weekly_remain.toFixed(1)}h wk`}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {onLeave && (
                                                    <div className="mt-1">
                                                        <span className="badge bg-danger">
                                                            <i className="bi bi-calendar-x me-1"></i>
                                                            {leaveInfo?.leave_type || 'On Leave'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {onLeave && clientShifts.length > 0 && (
                                                <button
                                                    className="btn btn-sm btn-warning fw-bold ms-2"
                                                    onClick={() => openRescheduleModal(employee.emp_id)}
                                                    title="View all shifts to reschedule"
                                                    style={{
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                        border: '1px solid #d97706'
                                                    }}
                                                >
                                                    <i className="bi bi-calendar-event me-1"></i>
                                                    Reschedule ({clientShifts.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hours-cell" style={{
                                        color: employee.capacity?.is_over_daily ? '#ef4444'
                                             : employee.capacity?.daily_pct >= 80 ? '#f59e0b'
                                             : undefined,
                                        fontWeight: employee.capacity?.is_over_daily ? 700 : 400
                                    }}>
                                        {employee.capacity ? `${employee.capacity.daily_used.toFixed(1)}h` : `${getEmployeeTotalHours(employee.emp_id)}h`}
                                    </div>
                                    <div 
                                        className="employee-time-slots"
                                        onMouseDown={(e) => !onLeave && handleMouseDown(e, employee.emp_id)}
                                        style={{ 
                                            position: 'relative', 
                                            cursor: onLeave ? 'not-allowed' : 'crosshair',
                                            pointerEvents: 'auto' // Changed from conditional to always allow
                                        }}
                                    >
                                        {timeSlots.map((slot, i) => (
                                            <div 
                                                key={i} 
                                                className="time-slot-cell-placeholder"
                                                style={{ 
                                                    gridColumnStart: i + 1,
                                                    pointerEvents: 'none'
                                                }}
                                            />
                                        ))}

                                        {/* LEAVE DURATION BLOCK - Show full leave period */}
                                        {onLeave && leaveInfo && (() => {
                                            // Parse leave times
                                            const leaveStartTime = leaveInfo.leave_start_time || "00:00:00";
                                            const leaveEndTime = leaveInfo.leave_end_time || "23:59:59";
                                            
                                            const startMins = parseTimeToMinutes(leaveStartTime);
                                            const endMins = parseTimeToMinutes(leaveEndTime);
                                            
                                            const leftPercent = (startMins / (24 * 60)) * 100;
                                            const widthPercent = ((endMins - startMins) / (24 * 60)) * 100;

                                            return (
                                                <div
                                                    className="leave-duration-block"
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        top: 0,
                                                        bottom: 0,
                                                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                                                        opacity: 0.85,
                                                        zIndex: 100,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'column',
                                                        gap: '4px',
                                                        borderRadius: '4px',
                                                        border: '2px solid #c92a2a',
                                                        boxShadow: '0 2px 8px rgba(201, 42, 42, 0.3)',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    <div style={{
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.9rem',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <i className="bi bi-calendar-x" style={{ fontSize: '1.2rem' }}></i>
                                                        {leaveInfo.leave_type || 'On Leave'}
                                                    </div>
                                                    {clientShifts.length > 0 && (
                                                        <div style={{
                                                            color: 'white',
                                                            fontSize: '0.75rem',
                                                            background: 'rgba(0,0,0,0.2)',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {clientShifts.length} shift{clientShifts.length > 1 ? 's' : ''} to reschedule
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Daily availability background */}
                                        {dailyShift && dailyShift.shift_start_time && !onLeave && (() => {
                                            const startMins = parseTimeToMinutes(dailyShift.shift_start_time);
                                            const endMins = parseTimeToMinutes(dailyShift.shift_end_time);
                                            const leftPercent = (startMins / (24 * 60)) * 100;
                                            const widthPercent = ((endMins - startMins) / (24 * 60)) * 100;

                                            return (
                                                <div 
                                                    className="shift-block employee-daily-shift"
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        top: 0,
                                                        height: '100%',
                                                        zIndex: 1,
                                                        opacity: 0.6,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    <div className="shift-block-content" style={{ color: '#854d0e', fontSize: '0.75rem' }}>
                                                        <div className="shift-time-range">
                                                            <i className="bi bi-clock"></i> {formatTimeDisplay(dailyShift.shift_start_time)} - {formatTimeDisplay(dailyShift.shift_end_time)}
                                                        </div>
                                                        <div className="shift-location-info">
                                                            <i className="bi bi-geo-alt"></i> {employee.service_type || 'Staff'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Client shifts with conflict indicators */}
                                        {clientShifts.map((shift) => {
                                            const client = getClient(shift.client_id);
                                            const startMins = parseTimeToMinutes(shift.shift_start_time);
                                            const endMins = parseTimeToMinutes(shift.shift_end_time);
                                            const leftPercent = (startMins / (24 * 60)) * 100;
                                            const widthPercent = ((endMins - startMins) / (24 * 60)) * 100;
                                            
                                            const overlap = overlaps[shift.shift_id] || { column: 0, totalColumns: 1 };
                                            const columnWidth = 100 / overlap.totalColumns;
                                            const columnLeft = overlap.column * columnWidth;

                                            const isDragging = draggingShift?.shift.shift_id === shift.shift_id;
                                            const isResizing = resizing?.shift.shift_id === shift.shift_id;
                                            const hasConflict = shift.shift_status === "⚠️ Conflicting Leave";
                                            
                                            let displayLeft = leftPercent;
                                            let displayWidth = widthPercent;
                                            
                                            if (isResizing) {
                                                displayLeft = (resizing.startMinutes / (24 * 60)) * 100;
                                                displayWidth = ((resizing.endMinutes - resizing.startMinutes) / (24 * 60)) * 100;
                                            } else if (isDragging) {
                                                displayLeft = (draggingShift.startMinutes / (24 * 60)) * 100;
                                                displayWidth = ((draggingShift.endMinutes - draggingShift.startMinutes) / (24 * 60)) * 100;
                                            }

                                            return (
                                                <div 
                                                    key={`client-${shift.shift_id}`} 
                                                    className={`shift-block client-shift ${
                                                        hasConflict ? 'conflict-shift' : ''
                                                    } ${shift.is_leave ? 'leave-alert-border' : ''} ${
                                                        isDragging || isResizing ? 'dragging' : ''
                                                    }`}
                                                    onMouseDown={(e) => !onLeave && !hasConflict && handleShiftDragStart(e, shift)}
                                                    onClick={(e) => handleShiftClick(e, shift)}
                                                    style={{ 
                                                        position: 'absolute',
                                                        left: `calc(${displayLeft}% + ${columnLeft}%)`,
                                                        width: `calc(${displayWidth}% * ${1 / overlap.totalColumns})`,
                                                        top: '2px',
                                                        height: 'calc(100% - 4px)',
                                                        zIndex: isDragging || isResizing ? 100 : (hasConflict ? 150 : (onLeave ? 110 : 20)),
                                                        cursor: onLeave ? 'pointer' : (hasConflict ? 'pointer' : 'move'),
                                                        opacity: isDragging ? 0.7 : 1,
                                                        background: hasConflict 
                                                            ? 'repeating-linear-gradient(45deg, #ff6b6b, #ff6b6b 10px, #ff8787 10px, #ff8787 20px)'
                                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        border: hasConflict ? '2px solid #c92a2a' : (onLeave ? '2px solid #ffc107' : 'none'),
                                                        boxShadow: hasConflict 
                                                            ? '0 0 0 3px rgba(201, 42, 42, 0.2), 0 4px 12px rgba(0,0,0,0.3)'
                                                            : (onLeave ? '0 0 0 2px rgba(255, 193, 7, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'),
                                                        animation: hasConflict ? 'pulse-warning 2s ease-in-out infinite' : 'none',
                                                        pointerEvents: 'auto'
                                                    }}
                                                >
                                                    {hasConflict && (
                                                        <div 
                                                            className="position-absolute top-0 end-0"
                                                            style={{
                                                                background: '#c92a2a',
                                                                color: 'white',
                                                                borderRadius: '0 4px 0 8px',
                                                                padding: '2px 6px',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 'bold',
                                                                zIndex: 10
                                                            }}
                                                        >
                                                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                                            CONFLICT
                                                        </div>
                                                    )}

                                                    {!hasConflict && !onLeave && (
                                                        <>
                                                            <div 
                                                                className="resize-handle resize-left"
                                                                onMouseDown={(e) => handleResizeStart(e, shift, 'start')}
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: 0,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    width: '6px',
                                                                    cursor: 'ew-resize',
                                                                    zIndex: 150
                                                                }}
                                                            />
                                                            <div 
                                                                className="resize-handle resize-right"
                                                                onMouseDown={(e) => handleResizeStart(e, shift, 'end')}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    width: '6px',
                                                                    cursor: 'ew-resize',
                                                                    zIndex: 150
                                                                }}
                                                            />
                                                        </>
                                                    )}
                                                    
                                                    <div className="shift-block-content" style={{ 
                                                        marginTop: hasConflict ? '20px' : '0'
                                                    }}>
                                                        <div className="shift-time-range">
                                                            {formatTimeDisplay(shift.shift_start_time)} - {formatTimeDisplay(shift.shift_end_time)}
                                                        </div>
                                                        <div className="shift-client-info">
                                                            <i className="bi bi-person"></i> {client?.first_name || 'Client'}
                                                            
                                                            {/* --- ACTION BUTTONS FOR RED CONFLICT SHIFTS --- */}
                                                            {hasConflict && (
                                                                <div className="d-flex gap-1 mt-2 justify-content-center">
                                                                    <button 
                                                                        className="btn btn-dark btn-sm p-0 px-2 shadow-sm" 
                                                                        style={{ 
                                                                            fontSize: '0.65rem', 
                                                                            height: '20px', 
                                                                            border: '1px solid rgba(255,255,255,0.4)',
                                                                            fontWeight: '700',
                                                                            zIndex: 200 
                                                                        }}
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            openConflictResolution(shift.shift_id); 
                                                                        }}
                                                                    >
                                                                        TRANSFER
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-light btn-sm p-0 px-2 shadow-sm" 
                                                                        style={{ 
                                                                            fontSize: '0.65rem', 
                                                                            height: '20px',
                                                                            fontWeight: '700',
                                                                            zIndex: 200
                                                                        }}
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            handleShiftClick(e, shift); 
                                                                        }}
                                                                    >
                                                                        EDIT
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Fallback for regular leave rows that aren't specific conflicts yet */}
                                                            {!hasConflict && onLeave && (
                                                                <div className="small mt-1" style={{ opacity: 0.9 }}>
                                                                    <i className="bi bi-arrow-repeat me-1"></i>
                                                                    Click to reschedule
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Drag-to-create preview */}
                                        {dragCreate?.empId === employee.emp_id && dragCreate.isCreating && !onLeave && (
                                            <div 
                                                className="shift-block client-shift"
                                                style={{
                                                    position: 'absolute',
                                                    left: `${(dragCreate.startMinutes / (24 * 60)) * 100}%`,
                                                    width: `${((dragCreate.endMinutes - dragCreate.startMinutes) / (24 * 60)) * 100}%`,
                                                    top: '2px',
                                                    height: 'calc(100% - 4px)',
                                                    zIndex: 50,
                                                    opacity: 0.5,
                                                    border: '2px dashed #3b82f6',
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                <div className="shift-block-content">
                                                    <div className="shift-time-range">
                                                        {formatTimeDisplay(minutesToTimeString(dragCreate.startMinutes, currentDate.toISOString().split('T')[0]))} - {formatTimeDisplay(minutesToTimeString(dragCreate.endMinutes, currentDate.toISOString().split('T')[0]))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Regular Shift Edit Modal */}
            <ShiftEditModal 
                isOpen={showShiftModal} 
                onClose={() => setShowShiftModal(false)} 
                shift={selectedShift} 
                onSave={handleSaveShift}
                onDelete={handleDeleteShift}
                employees={scheduleData.employee}
                clients={scheduleData.client}
                allShifts={scheduleData.shift}
            />

            {/* RESCHEDULE MODAL */}
            {showRescheduleModal && selectedEmployeeForReschedule && (
                <div 
                    className="modal show d-block" 
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000 }}
                    onClick={() => setShowRescheduleModal(false)}
                >
                    <div 
                        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content shadow-lg border-warning" style={{ borderWidth: '3px' }}>
                            <div className="modal-header bg-warning bg-opacity-10">
                                <div>
                                    <h5 className="modal-title fw-bold">
                                        <i className="bi bi-calendar-x me-2"></i>
                                        Reschedule Shifts - {selectedEmployeeForReschedule.first_name} {selectedEmployeeForReschedule.last_name}
                                    </h5>
                                    <div className="text-muted small mt-1">
                                        Employee is on leave - these shifts need to be reassigned
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowRescheduleModal(false)}
                                ></button>
                            </div>
                            
                            <div className="modal-body">
                                {shiftsToReschedule.length === 0 ? (
                                    <div className="alert alert-info">
                                        <i className="bi bi-check-circle me-2"></i>
                                        All shifts have been rescheduled!
                                    </div>
                                ) : (
                                    <div className="list-group">
                                        {shiftsToReschedule.map((shift) => {
                                            const client = getClient(shift.client_id);
                                            return (
                                                <div 
                                                    key={shift.shift_id}
                                                    className="list-group-item"
                                                >
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-2">
                                                                <i className="bi bi-person me-2"></i>
                                                                {client?.first_name || 'Client'} {client?.last_name || ''}
                                                            </h6>
                                                            <div className="small text-muted">
                                                                <i className="bi bi-clock me-1"></i>
                                                                {formatTimeDisplay(shift.shift_start_time)} - {formatTimeDisplay(shift.shift_end_time)}
                                                            </div>
                                                            <div className="small text-muted">
                                                                <i className="bi bi-calendar me-1"></i>
                                                                {new Date(shift.date).toLocaleDateString('en-US', { 
                                                                    weekday: 'long',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                        </div>
                                                        
                                                        <button 
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => rescheduleShift(shift.shift_id)}
                                                        >
                                                            <i className="bi bi-arrow-repeat me-1"></i>
                                                            Reschedule
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="modal-footer bg-light">
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setShowRescheduleModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFLICT RESOLUTION MODAL */}
            {showConflictModal && selectedConflict && (
                <div 
                    className="modal show d-block" 
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000 }}
                    onClick={() => !conflictProcessing && setShowConflictModal(false)}
                >
                    <div 
                        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content shadow-lg border-warning" style={{ borderWidth: '3px' }}>
                            <div className="modal-header bg-warning bg-opacity-10">
                                <div>
                                    <h5 className="modal-title fw-bold">
                                        <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                                        Shift Conflict - Reassignment Needed
                                    </h5>
                                    <div className="text-muted small mt-1">
                                        AI-ranked recommendations based on availability, seniority & type
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowConflictModal(false)}
                                    disabled={conflictProcessing}
                                ></button>
                            </div>
                            
                            <div className="modal-body">
                                {/* Shift Info Card */}
                                <div className="card mb-4 border-0 bg-light">
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-md-6 mb-3 mb-md-0">
                                                <div className="small text-muted mb-1">Date & Time</div>
                                                <div className="fw-bold">
                                                    {new Date(selectedConflict.date).toLocaleDateString('en-US', { 
                                                        weekday: 'long',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-muted">
                                                    {formatTimeDisplay(selectedConflict.start_time)} - {formatTimeDisplay(selectedConflict.end_time)}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="small text-muted mb-1">Client</div>
                                                <div className="fw-bold">
                                                    {selectedConflict.client?.name || 
                                                     `${selectedConflict.client?.first_name} ${selectedConflict.client?.last_name}` ||
                                                     'Unknown Client'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {recommendations.length === 0 ? (
                                    <div className="alert alert-warning">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        No suitable employees found. Manual assignment required.
                                    </div>
                                ) : (
                                    <div className="list-group">
                                        {recommendations.map((rec, index) => (
                                            <div 
                                                key={rec.recommendation_id}
                                                className="list-group-item list-group-item-action"
                                                style={{ 
                                                    cursor: 'pointer',
                                                    borderLeft: index === 0 ? '4px solid #28a745' : 
                                                               index === 1 ? '4px solid #ffc107' : 
                                                               '4px solid #6c757d'
                                                }}
                                                onClick={() => !conflictProcessing && approveReassignment(rec.employee.emp_id)}
                                            >
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex align-items-center mb-2">
                                                            <h6 className="mb-0 fw-bold">
                                                                {index === 0 && (
                                                                    <i className="bi bi-star-fill text-warning me-2"></i>
                                                                )}
                                                                {rec.employee.name}
                                                            </h6>
                                                            <span 
                                                                className={`badge ms-2 ${
                                                                    index === 0 ? 'bg-success' :
                                                                    index === 1 ? 'bg-warning text-dark' :
                                                                    'bg-secondary'
                                                                }`}
                                                            >
                                                                Rank #{rec.rank}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="small text-muted mb-2">
                                                            <i className="bi bi-briefcase me-1"></i>
                                                            {rec.employee.employee_type}
                                                            <span className="mx-2">•</span>
                                                            <i className="bi bi-geo-alt me-1"></i>
                                                            {rec.employee.service_type}
                                                            <span className="mx-2">•</span>
                                                            <i className="bi bi-award me-1"></i>
                                                            Seniority: {rec.employee.seniority}
                                                        </div>
                                                        
                                                        <div className="small">
                                                            <i className="bi bi-clock-history me-1"></i>
                                                            {rec.reason}
                                                        </div>
                                                        
                                                        <div className="mt-2">
                                                            <div className="progress" style={{ height: '6px' }}>
                                                                <div 
                                                                    className={`progress-bar ${
                                                                        rec.score >= 70 ? 'bg-success' :
                                                                        rec.score >= 50 ? 'bg-warning' :
                                                                        'bg-secondary'
                                                                    }`}
                                                                    style={{ width: `${rec.score}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="small text-muted mt-1">
                                                                Match Score: {rec.score}/100
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <button 
                                                        className={`btn btn-sm ms-3 ${
                                                            index === 0 ? 'btn-success' : 'btn-outline-success'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            approveReassignment(rec.employee.emp_id);
                                                        }}
                                                        disabled={conflictProcessing}
                                                    >
                                                        {conflictProcessing ? (
                                                            <span className="spinner-border spinner-border-sm"></span>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-check-circle me-1"></i>
                                                                Approve
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="modal-footer bg-light">
                                <button 
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowConflictModal(false)}
                                    disabled={conflictProcessing}
                                >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-outline-danger"
                                    onClick={rejectAllRecommendations}
                                    disabled={conflictProcessing}
                                >
                                    <i className="bi bi-trash me-1"></i>
                                    Reject & Assign Manually
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add pulse animation CSS */}
            <style>{`
                @keyframes pulse-warning {
                    0%, 100% {
                        box-shadow: 0 0 0 3px rgba(201, 42, 42, 0.2), 0 4px 12px rgba(0,0,0,0.3);
                    }
                    50% {
                        box-shadow: 0 0 0 6px rgba(201, 42, 42, 0.4), 0 6px 16px rgba(0,0,0,0.4);
                    }
                }

                .conflict-shift {
                    position: relative;
                    overflow: visible !important;
                }

                .conflict-shift:hover {
                    transform: scale(1.02);
                    z-index: 999 !important;
                }

                .conflict-shift .shift-block-content {
                    color: white !important;
                    font-weight: 600;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }

                .employee-on-leave .employee-time-slots {
                    position: relative;
                }

                .employee-on-leave .shift-block {
                    filter: grayscale(0.3);
                }
            `}</style>
        </div>
    );
}