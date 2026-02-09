import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './DailySchedule.css';
import API_URL from '../config/api';
import { getEmpId } from '../utils/emp';
import ShiftEditModal from './ShiftEditModal'; 

/**
 * DailySchedule Component - Google Calendar Style
 * - Minute-level precision for shifts
 * - Click-and-drag to create shifts with custom duration
 * - Resize shifts by dragging edges
 * - Better overlap handling with side-by-side columns
 * - Smooth drag and drop with minute-level snapping
 */
export default function DailySchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState({ shift: [], daily_shift: [], client: [], employee: [] });
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [dragCreate, setDragCreate] = useState(null);
    const [resizing, setResizing] = useState(null);
    const [draggingShift, setDraggingShift] = useState(null);
    
    const timelineRef = useRef(null);
    const locations = ['All Locations', '85 Neeve', '87 Neeve', 'Willow Place', 'Outreach', 'Assisted Living', 'Seniors Assisted Living'];

    // Generate 15-minute intervals for precise positioning
    const PIXELS_PER_HOUR = 60;
    const timeSlots = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`
    }));

    const fetchScheduleData = useCallback(async () => {
        const empId = getEmpId();
        if (!empId) return;
        try {
            setLoading(true);
            const params = selectedLocation !== 'All Locations' ? { service: selectedLocation } : {};
            const response = await axios.get(`${API_URL}/scheduled`, { params });
            setScheduleData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            setLoading(false);
        }
    }, [selectedLocation]);

    useEffect(() => {
        fetchScheduleData();
    }, [currentDate, fetchScheduleData]);

    // ========== TIME CONVERSION HELPERS ==========
    const parseTimeToMinutes = (timeStr) => {
        // Handle both "2024-01-01T08:30:00" and "2024-01-01 08:30:00" formats
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
        return timePart.slice(0, 5); // HH:MM
    };

    const getPositionFromEvent = (e, empId) => {
        const row = e.currentTarget.closest('.employee-time-slots');
        if (!row) return null;
        
        const rect = row.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const minutes = Math.round((x / rect.width) * 24 * 60 / 15) * 15; // Snap to 15-min intervals
        return { empId, minutes: Math.max(0, Math.min(minutes, 24 * 60 - 15)) };
    };

    // ========== DRAG-TO-CREATE SHIFT ==========
    const handleMouseDown = (e, empId) => {
        if (e.target.classList.contains('shift-block') || e.target.closest('.shift-block')) return;
        
        const pos = getPositionFromEvent(e, empId);
        if (!pos) return;

        setDragCreate({
            empId,
            startMinutes: pos.minutes,
            endMinutes: pos.minutes + 60, // Default 1 hour
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

    // ========== OVERLAP DETECTION ==========
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
            <div className="schedule-top-bar">
                <div className="top-bar-left">
                    <button className="today-btn-small" onClick={() => setCurrentDate(new Date())}>Today</button>
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

                            return (
                                <div className="employee-row" key={employee.emp_id} data-emp-id={employee.emp_id}>
                                    <div className="employee-name-cell">
                                        <div className="employee-name">{employee.first_name} {employee.last_name}</div>
                                        <div className="employee-role" style={{ fontSize: '0.75rem', color: '#666' }}>
                                            {employee.service_type || 'Staff'}
                                        </div>
                                    </div>

                                    <div className="hours-cell">{getEmployeeTotalHours(employee.emp_id)}h</div>

                                    <div 
                                        className="employee-time-slots"
                                        onMouseDown={(e) => handleMouseDown(e, employee.emp_id)}
                                        style={{ position: 'relative', cursor: 'crosshair' }}
                                    >
                                        {/* Hour markers */}
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

                                        {/* Daily availability background */}
                                        {dailyShift && dailyShift.shift_start_time && (() => {
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

                                        {/* Client shifts with overlap handling */}
                                        {clientShifts.map((shift) => {
                                            const client = getClient(shift.client_id);
                                            const startMins = parseTimeToMinutes(shift.shift_start_time);
                                            const endMins = parseTimeToMinutes(shift.shift_end_time);
                                            const leftPercent = (startMins / (24 * 60)) * 100;
                                            const widthPercent = ((endMins - startMins) / (24 * 60)) * 100;
                                            
                                            const overlap = overlaps[shift.shift_id] || { column: 0, totalColumns: 1 };
                                            const columnWidth = 100 / overlap.totalColumns;
                                            const columnLeft = overlap.column * columnWidth;

                                            // Handle active dragging/resizing
                                            const isDragging = draggingShift?.shift.shift_id === shift.shift_id;
                                            const isResizing = resizing?.shift.shift_id === shift.shift_id;
                                            
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
                                                    className={`shift-block client-shift ${shift.is_leave ? 'leave-alert-border' : ''} ${isDragging || isResizing ? 'dragging' : ''}`}
                                                    onMouseDown={(e) => handleShiftDragStart(e, shift)}
                                                    onClick={(e) => handleShiftClick(e, shift)}
                                                    style={{ 
                                                        position: 'absolute',
                                                        left: `calc(${displayLeft}% + ${columnLeft}%)`,
                                                        width: `calc(${displayWidth}% * ${1 / overlap.totalColumns})`,
                                                        top: '2px',
                                                        height: 'calc(100% - 4px)',
                                                        zIndex: isDragging || isResizing ? 100 : 20,
                                                        cursor: 'move',
                                                        opacity: isDragging ? 0.7 : 1
                                                    }}
                                                >
                                                    {/* Resize handles */}
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
                                                    
                                                    <div className="shift-block-content">
                                                        <div className="shift-time-range">
                                                            {formatTimeDisplay(shift.shift_start_time)} - {formatTimeDisplay(shift.shift_end_time)}
                                                        </div>
                                                        <div className="shift-client-info">
                                                            <i className="bi bi-person"></i> {client?.first_name || 'Client'} {shift.is_leave ? '⚠️' : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Drag-to-create preview */}
                                        {dragCreate?.empId === employee.emp_id && dragCreate.isCreating && (
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
        </div>
    );
}