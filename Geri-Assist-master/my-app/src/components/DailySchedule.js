import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './DailySchedule.css';
import API_URL from '../config/api';
import { getEmpId } from '../utils/emp';
import ShiftEditModal from './ShiftEditModal'; 

/**
 * DailySchedule Component
 * - Merges Employee Daily Hours and Client Visits into a single row.
 * - Handles robust time parsing for labels and grid positioning.
 * - Manages shift creation, updates, and deletion.
 */
export default function DailySchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState({ shift: [], daily_shift: [], client: [], employee: [] });
    const [loading, setLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    
    const locations = ['All Locations', '85 Neeve', '87 Neeve', 'Willow Place', 'Outreach', 'Assisted Living', 'Seniors Assisted Living'];

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

    // ========== DRAG AND DROP LOGIC ==========
    const handleDragStart = (e, shift) => {
        e.dataTransfer.setData("shift_id", shift.shift_id);
        e.target.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
    };

    const handleDrop = async (e, targetEmpId, targetHour) => {
        e.preventDefault();
        const shiftId = e.dataTransfer.getData("shift_id");
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const originalShift = scheduleData.shift.find(s => s.shift_id === parseInt(shiftId));
        let durationHours = 1; 
        if (originalShift) {
            const start = new Date(originalShift.shift_start_time.replace(' ', 'T'));
            const end = new Date(originalShift.shift_end_time.replace(' ', 'T'));
            durationHours = (end - start) / (1000 * 60 * 60);
        }

        const newStart = `${dateStr}T${targetHour.toString().padStart(2, '0')}:00:00`;
        const endHour = Math.min(targetHour + Math.round(durationHours), 23);
        const newEnd = `${dateStr}T${endHour.toString().padStart(2, '0')}:00:00`;

        try {
            await axios.post(`${API_URL}/submit`, {
                shift_id: shiftId,
                emp_id: targetEmpId,
                shift_start_time: newStart,
                shift_end_time: newEnd,
                shift_date: dateStr,
                shift_status: "Scheduled"
            });
            fetchScheduleData();
        } catch (err) {
            console.error("Drop migration failed:", err);
        }
    };

    // ========== GRID INTERACTIONS ==========
    const handleTileClick = (empId, hour) => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const formattedHour = hour.toString().padStart(2, '0');
        
        setSelectedShift({
            isNew: true,
            emp_id: empId,
            client_id: "", // Mandatory selection in Modal to prevent 500 errors
            shift_date: dateStr,
            shift_start_time: `${dateStr}T${formattedHour}:00:00`,
            shift_end_time: `${dateStr}T${(hour + 1).toString().padStart(2, '0')}:00:00`,
            shift_type: 'regular',
            shift_status: "Scheduled"
        });
        setShowShiftModal(true);
    };

    const handleShiftClick = (shift) => {
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
            const start = new Date(s.shift_start_time.replace(' ', 'T'));
            const end = new Date(s.shift_end_time.replace(' ', 'T'));
            return acc + (end - start) / (1000 * 60);
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
        return scheduleData.shift.filter(s => Number(s.emp_id) === Number(empId) && (s.date === dateStr || s.shift_start_time?.startsWith(dateStr)));
    };

    if (loading && scheduleData.employee.length === 0) {
        return <div className="loading-spinner"><div className="spinner-border text-primary"></div></div>;
    }

    return (
        <div className="daily-schedule-wrapper">
            <div className="schedule-top-bar">
                <div className="top-bar-left">
                    <button className="today-btn-small" onClick={() => setCurrentDate(new Date())}>Today</button>
                    <button className="btn btn-sm btn-primary ms-2" onClick={() => handleTileClick(null, 8)}>
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
                                <div key={i} className="time-slot-header"><div className="time-label">{slot.label}</div></div>
                            ))}
                        </div>
                    </div>

                    <div className="timeline-body">
                        {scheduleData.employee.map((employee) => {
                            const dailyShift = getEmployeeDailyShift(employee.emp_id, currentDate);
                            const clientShifts = getEmployeeShiftsForDate(employee.emp_id, currentDate);

                            return (
                                <div className="employee-row" key={employee.emp_id}>
                                    <div className="employee-name-cell">
                                        <div className="employee-name">{employee.first_name} {employee.last_name}</div>
                                        <div className="employee-role" style={{ fontSize: '0.75rem', color: '#666' }}>{employee.service_type || 'Staff'}</div>
                                    </div>

                                    <div className="hours-cell">{getEmployeeTotalHours(employee.emp_id)}h</div>

                                    <div className="employee-time-slots">
                                        {/* Grid Background */}
                                        {timeSlots.map((slot, i) => (
                                            <div 
                                                key={i} 
                                                className="time-slot-cell-placeholder"
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDrop(e, employee.emp_id, slot.hour)}
                                                onClick={() => handleTileClick(employee.emp_id, slot.hour)}
                                                style={{ gridColumnStart: i + 1 }}
                                            ></div>
                                        ))}

                                        {/* Client Shifts Layer (Top) */}
                                        {clientShifts.map((shift, i) => {
                                            const client = getClient(shift.client_id);
                                            // Handle space or 'T' time separation
                                            const timeDisplay = shift.shift_start_time?.split(/[T ]/)[1]?.slice(0, 5) || "00:00";
                                            const endDisplay = shift.shift_end_time?.split(/[T ]/)[1]?.slice(0, 5) || "00:00";
                                            const startHour = parseInt(timeDisplay.split(':')[0]);
                                            const endHour = parseInt(endDisplay.split(':')[0]);

                                            return (
                                                <div 
                                                    key={`client-${i}`} 
                                                    className={`shift-block client-shift ${shift.is_leave ? 'leave-alert-border' : ''}`} 
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, shift)}
                                                    onDragEnd={handleDragEnd}
                                                    style={{ 
                                                        gridColumnStart: startHour + 1, 
                                                        gridColumnEnd: (endHour === 0 ? 24 : endHour) + 1,
                                                        zIndex: 30 
                                                    }}
                                                    onClick={() => handleShiftClick(shift)}
                                                >
                                                    <div className="shift-block-content">
                                                        <div className="shift-time-range">{timeDisplay} - {endDisplay}</div>
                                                        <div className="shift-client-info"><i className="bi bi-person"></i> {client?.first_name || 'Client'} {shift.is_leave ? '⚠️' : ''}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Daily Availability Block (Background) */}
                                        {dailyShift && dailyShift.shift_start_time && (() => {
                                            const timeString = dailyShift.shift_start_time.split(/[T ]/)[1]?.slice(0, 5) || "00:00";
                                            const endString = dailyShift.shift_end_time.split(/[T ]/)[1]?.slice(0, 5) || "00:00";
                                            const startHour = parseInt(timeString.split(':')[0]);
                                            const endHour = parseInt(endString.split(':')[0]);

                                            return (
                                                <div 
                                                    className="shift-block employee-daily-shift"
                                                    style={{
                                                        gridColumnStart: startHour + 1,
                                                        gridColumnEnd: (endHour === 0 ? 24 : endHour) + 1,
                                                        zIndex: 10,
                                                        opacity: 0.8
                                                    }}
                                                >
                                                    <div className="shift-block-content" style={{ color: '#854d0e' }}>
                                                        <div className="shift-time-range"><i className="bi bi-clock"></i> {timeString} - {endString}</div>
                                                        <div className="shift-location-info"><i className="bi bi-geo-alt"></i> {employee.service_type || 'Staff'}</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
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