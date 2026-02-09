import React, { useState, useEffect } from "react";
import Modal from "./editModal";

/**
 * ShiftEditModal Component
 * Features:
 * 1. Numeric ID Extraction: Prevents 500 errors by converting values to bigint-compatible numbers.
 * 2. Duplicate Prevention: Validates overlaps against all existing shifts.
 * 3. Schema Compliance: Handles "GENERATED ALWAYS AS IDENTITY" by excluding shift_id on new inserts.
 * 4. Client Selection: Mandatory dropdown for database foreign key requirements.
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

    // Helper to extract YYYY-MM-DD from various date string formats
    const getDateString = (dt) => {
        if (!dt) return "";
        return dt.split(/[T ]/)[0];
    };

    // Helper to extract HH:mm from various date/time string formats
    const getTimeString = (dt) => {
        if (!dt) return "";
        const parts = dt.split(/[T ]/);
        const time = parts.length > 1 ? parts[1] : parts[0];
        return time.substring(0, 5);
    };

    useEffect(() => {
    if (shift && isOpen) {
        if (shift.isNew) {
            // DEFAULTS FOR NEW SHIFT
            setFormData({
                emp_id: shift.emp_id || "",
                client_id: "", // Force user to select a client
                shift_date: getDateString(shift.shift_date),
                start_time: getTimeString(shift.shift_start_time) || "08:00",
                end_time: getTimeString(shift.shift_end_time) || "09:00",
            });
        } else {
            // VALUES FOR EXISTING SHIFT
            setFormData({
                emp_id: shift.emp_id || "",
                client_id: shift.client_id || "",
                shift_date: getDateString(shift.shift_date || shift.date || shift.shift_start_time),
                start_time: getTimeString(shift.shift_start_time),
                end_time: getTimeString(shift.shift_end_time),
            });
        }
    }
}, [shift, isOpen]);

    // ========== OVERLAP VALIDATION LOGIC ==========
    const getOverlapError = () => {
        if (!formData.emp_id || !formData.shift_date || !formData.start_time || !formData.end_time) return null;

        const isOverlapping = allShifts?.some(existingShift => {
            // 1. Skip if it's the same shift we are currently editing
            if (!shift.isNew && existingShift.shift_id === shift.shift_id) return false;

            // 2. Only check shifts for the same employee on the same date
            const sameEmployee = Number(existingShift.emp_id) === Number(formData.emp_id);
            const sameDate = getDateString(existingShift.date || existingShift.shift_start_time) === formData.shift_date;

            if (sameEmployee && sameDate) {
                const newStart = formData.start_time;
                const newEnd = formData.end_time;
                const existStart = getTimeString(existingShift.shift_start_time);
                const existEnd = getTimeString(existingShift.shift_end_time);

                // Overlap condition: (StartA < EndB) and (EndA > StartB)
                return newStart < existEnd && newEnd > existStart;
            }
            return false;
        });

        return isOverlapping ? "This employee is already scheduled for another shift during this time." : null;
    };

    const overlapError = getOverlapError();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
    const selectedClientId = Number(formData.client_id);
    const selectedEmpId = Number(formData.emp_id);

    if (!selectedClientId) return alert("Please select a Client.");
    if (!selectedEmpId) return alert("Please select an Employee.");

    // Define ONLY the keys your database schema expects
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
        delete payload.shift_id; // Identity column requirement
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

                {/* Overlap Warning Alert */}
                {overlapError && (
                    <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid #fecaca" }}>
                        <strong>Validation Error:</strong> {overlapError}
                    </div>
                )}

                {/* Leave Warning Alert */}
                {shift?.is_leave && (
                    <div style={{ background: "#fffbeb", color: "#92400e", padding: "10px", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid #fef3c7" }}>
                        <strong>Note:</strong> This employee is on leave: {shift.leave_reason}
                    </div>
                )}

                {/* Client Selection - Mandatory for foreign key bigint constraints */}
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

                {/* Employee Selection */}
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
                        disabled={!!overlapError}
                        style={{ 
                            padding: "8px 20px", 
                            background: overlapError ? "#a78bfa" : "#7c3aed", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: "4px", 
                            cursor: overlapError ? "not-allowed" : "pointer", 
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