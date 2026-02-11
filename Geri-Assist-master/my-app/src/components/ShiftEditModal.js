import React, { useState, useEffect } from "react";
import Modal from "./editModal";

/**
 * ShiftEditModal Component
 * Features:
 * 1. Numeric ID Extraction: Prevents 500 errors.
 * 2. Duplicate Prevention: Validates overlaps.
 * 3. Capacity Counter: Limits employee to 15 hours per day.
 * 4. Schema Compliance: Handles identity columns.
 */
export default function ShiftEditModal({ 
    isOpen, 
    onClose, 
    shift, 
    employees, 
    clients, 
    onSave, 
    onDelete, 
    allShifts 
}) {
    const [formData, setFormData] = useState({
        emp_id: "",
        client_id: "",
        shift_date: "",
        start_time: "",
        end_time: "",
        shift_type: "regular",
    });

    // ========== HELPERS ==========
    const getDateString = (dt) => {
        if (!dt) return "";
        return dt.split(/[T ]/)[0];
    };

    const getTimeString = (dt) => {
        if (!dt) return "";
        const parts = dt.split(/[T ]/);
        const time = parts.length > 1 ? parts[1] : parts[0];
        return time.substring(0, 5);
    };

    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // ========== INITIALIZATION ==========
    useEffect(() => {
        if (shift && isOpen) {
            if (shift.isNew) {
                setFormData({
                    emp_id: shift.emp_id || "",
                    client_id: "",
                    shift_date: getDateString(shift.shift_date),
                    start_time: getTimeString(shift.shift_start_time) || "08:00",
                    end_time: getTimeString(shift.shift_end_time) || "09:00",
                    shift_type: "regular"
                });
            } else {
                setFormData({
                    emp_id: shift.emp_id || "",
                    client_id: shift.client_id || "",
                    shift_date: getDateString(shift.shift_date || shift.date || shift.shift_start_time),
                    start_time: getTimeString(shift.shift_start_time),
                    end_time: getTimeString(shift.shift_end_time),
                    shift_type: shift.shift_type || "regular"
                });
            }
        }
    }, [shift, isOpen]);

    // ========== VALIDATION LOGIC ==========
    const getValidationError = () => {
        if (!formData.emp_id || !formData.shift_date || !formData.start_time || !formData.end_time) return null;

        const currentStartMins = parseTimeToMinutes(formData.start_time);
        const currentEndMins = parseTimeToMinutes(formData.end_time);
        const currentDuration = currentEndMins - currentStartMins;

        // 1. Capacity Check (15 Hours / 900 Minutes)
        const MAX_MINUTES = 15 * 60;
        const existingDailyMinutes = allShifts?.reduce((acc, s) => {
            // Check if same employee, same date, and not the current shift being edited
            const sameEmp = Number(s.emp_id) === Number(formData.emp_id);
            const sameDate = getDateString(s.date || s.shift_start_time) === formData.shift_date;
            const isNotSelf = !shift.isNew ? s.shift_id !== shift.shift_id : true;

            if (sameEmp && sameDate && isNotSelf) {
                const sStart = parseTimeToMinutes(getTimeString(s.shift_start_time));
                const sEnd = parseTimeToMinutes(getTimeString(s.shift_end_time));
                return acc + (sEnd - sStart);
            }
            return acc;
        }, 0) || 0;

        if ((existingDailyMinutes + currentDuration) > MAX_MINUTES) {
            return "Maximum shifts allocated: This employee cannot exceed 15 hours per day.";
        }

        // 2. Overlap Check
        const isOverlapping = allShifts?.some(existingShift => {
            if (!shift.isNew && existingShift.shift_id === shift.shift_id) return false;

            const sameEmployee = Number(existingShift.emp_id) === Number(formData.emp_id);
            const sameDate = getDateString(existingShift.date || existingShift.shift_start_time) === formData.shift_date;

            if (sameEmployee && sameDate) {
                const existStart = parseTimeToMinutes(getTimeString(existingShift.shift_start_time));
                const existEnd = parseTimeToMinutes(getTimeString(existingShift.shift_end_time));
                return currentStartMins < existEnd && currentEndMins > existStart;
            }
            return false;
        });

        if (isOverlapping) return "This employee is already scheduled for another shift during this time.";

        return null;
    };

    const validationError = getValidationError();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const selectedClientId = Number(formData.client_id);
        const selectedEmpId = Number(formData.emp_id);

        if (!selectedClientId) return alert("Please select a Client.");
        if (!selectedEmpId) return alert("Please select an Employee.");

        const payload = {
            shift_id: shift.shift_id,
            client_id: selectedClientId,
            emp_id: selectedEmpId,
            shift_start_time: `${formData.shift_date}T${formData.start_time}:00`,
            shift_end_time: `${formData.shift_date}T${formData.end_time}:00`,
            shift_type: formData.shift_type,
            shift_date: formData.shift_date,
            shift_status: "Scheduled",
            isNew: shift.isNew 
        };

        if (shift.isNew) {
            delete payload.shift_id;
        }

        onSave(payload);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-4" style={{ minWidth: "400px", fontFamily: "sans-serif" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.25rem" }}>
                    {shift?.isNew ? "Add New Shift" : "Edit Shift"}
                </h3>

                {/* Unified Validation Alert */}
                {validationError && (
                    <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid #fecaca" }}>
                        <strong>Validation Error:</strong> {validationError}
                    </div>
                )}

                {/* Leave Warning Alert */}
                {shift?.is_leave && (
                    <div style={{ background: "#fffbeb", color: "#92400e", padding: "10px", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid #fef3c7" }}>
                        <strong>Note:</strong> This employee is on leave: {shift.leave_reason}
                    </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Client</label>
                    <select
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleChange}
                        style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    >
                        <option value="">-- Select Client --</option>
                        {clients?.map((client) => (
                            <option key={client.client_id} value={client.client_id}>
                                {client.first_name} {client.last_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Employee</label>
                    <select
                        name="emp_id"
                        value={formData.emp_id}
                        onChange={handleChange}
                        style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    >
                        <option value="">-- Select Employee --</option>
                        {employees?.map((emp) => (
                            <option key={emp.emp_id} value={emp.emp_id}>
                                {emp.first_name} {emp.last_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Shift Date</label>
                    <input
                        type="date"
                        name="shift_date"
                        value={formData.shift_date}
                        onChange={handleChange}
                        style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    />
                </div>

                <div style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Start Time</label>
                        <input
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleChange}
                            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.25rem" }}>End Time</label>
                        <input
                            type="time"
                            name="end_time"
                            value={formData.end_time}
                            onChange={handleChange}
                            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Shift Type</label>
                    <select
                        name="shift_type"
                        value={formData.shift_type}
                        onChange={handleChange}
                        style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    >
                        <option value="regular">Regular</option>
                        <option value="vacation">Vacation</option>
                        <option value="sick">Sick</option>
                        <option value="float">Float</option>
                        <option value="unavailable">Unavailable</option>
                        <option value="flw-training">FLW Training</option>
                        <option value="leave">Leave</option>
                        <option value="bereavement">Bereavement</option>
                    </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
                    {!shift?.isNew && (
                        <button
                            type="button"
                            onClick={() => onDelete(shift.shift_id)}
                            style={{ padding: "8px 15px", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "4px", cursor: "pointer", marginRight: "auto", fontWeight: "500" }}
                        >
                            Delete Shift
                        </button>
                    )}
                    
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ padding: "8px 20px", background: "#fff", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!!validationError}
                        style={{ 
                            padding: "8px 20px", 
                            background: validationError ? "#a78bfa" : "#7c3aed", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: "4px", 
                            cursor: validationError ? "not-allowed" : "pointer", 
                            fontWeight: "bold" 
                        }}
                    >
                        {shift?.isNew ? "Create Shift" : "Save Changes"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}