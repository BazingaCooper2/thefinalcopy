import React, { useState, useEffect } from "react";
import Modal from "./editModal";

export default function ShiftEditModal({ isOpen, onClose, shift, onSave }) {
    const [formData, setFormData] = useState({
        shift_date: "",
        start_time: "",
        end_time: "",
        shift_type: ""
    });

    // Helper to format full datetime string to YYYY-MM-DD
    function getDateDate(dt) {
        if (!dt) return "";
        return dt.split(" ")[0];
    };

    // Helper to format full datetime string to HH:MM
    function getDateTime(dt) {
        if (!dt) return "";
        if (dt.includes("T")) {
            return dt.split("T")[1].substring(0, 5);
        }
        const parts = dt.split(" ");
        if (parts.length > 1) return parts[1].substring(0, 5);
        // Fallback if it's already HH:MM or similar
        return dt.substring(0, 5);
    };

    useEffect(() => {
        if (shift) {
            setFormData({
                shift_date: getDateDate(shift.shift_date || shift.date),
                start_time: getDateTime(shift.start_time),
                end_time: getDateTime(shift.end_time),
                shift_type: shift.shift_type_raw || shift.type || ""
            });
        }
    }, [shift]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        // Construct partial payload to send back
        // We need to reconstruct full datetime strings for the backend
        const fullStart = `${formData.shift_date} ${formData.start_time}:00`;
        const fullEnd = `${formData.shift_date} ${formData.end_time}:00`;

        const payload = {
            ...shift,
            shift_start_time: fullStart,
            shift_end_time: fullEnd,
            shift_type: formData.shift_type,
            shift_date: formData.shift_date
        };

        onSave(payload);
    };

    if (!shift) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-4" style={{ minWidth: "400px" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Edit Shift</h3>

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

                <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
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
                        <option value="flw-rtw">Floater/Return to Work</option>
                        <option value="training">Training</option>
                        <option value="regular">Regular</option>
                        <option value="">Other</option>
                    </select>
                </div>

                {shift.is_leave && (
                    <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #fecaca" }}>
                        <span style={{ fontWeight: "bold" }}>⚠️ This is a Leave:</span> {shift.leave_reason}
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
                    <button
                        onClick={onClose}
                        style={{ padding: "8px 16px", cursor: "pointer", background: "white", border: "1px solid #ccc", borderRadius: "4px" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ padding: "8px 16px", background: "#7c3aed", color: "white", cursor: "pointer", border: "none", borderRadius: "4px", fontWeight: "bold" }}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>
    );
}
