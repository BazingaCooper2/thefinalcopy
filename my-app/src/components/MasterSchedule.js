import React, { useState, useEffect } from "react";
import ServiceSidebar from "./ServiceSidebar";
import ScheduleGrid from "./ScheduleGrid";
import { fetchServiceSchedule } from "../services/api";
import ShiftEditModal from "./ShiftEditModal";

export default function MasterSchedule() {
    const [service, setService] = useState("85 Neeve");

    // ✅ data must be an object, not an array
    const [data, setData] = useState({
        weeks: [],
        employees: []
    });

    const [selectedShift, setSelectedShift] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!service) return;

        console.log("SERVICE RECEIVED IN APP:", service);

        fetchServiceSchedule(service)
            .then(res => {
                console.log("API RESPONSE:", res);
                setData(res);
            })
            .catch(err => console.error("FETCH ERROR:", err));
    }, [service]);

    const handleShiftClick = (shift) => {
        // console.log("Shift clicked:", shift);
        setSelectedShift(shift);
        setIsModalOpen(true);
    };

    const handleShiftSave = async (updatedShift) => {
        try {
            console.log("Saving shift:", updatedShift);

            // We need to determine if we are updating `daily_shift` (for master schedule usually)
            // The table key might vary but let's assume we send to a new endpoint
            const res = await fetch("http://127.0.0.1:5000/update_master_shift", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedShift)
            });

            if (!res.ok) {
                const err = await res.json();
                alert("Failed to save shift: " + err.error);
                return;
            }

            console.log("Shift saved successfully");
            setIsModalOpen(false);

            // Refresh data
            fetchServiceSchedule(service)
                .then(res => setData(res))
                .catch(err => console.error("FETCH ERROR:", err));

        } catch (error) {
            console.error("Error saving shift:", error);
            alert("Error saving shift");
        }
    };

    return (
        <div className="app">
            <ServiceSidebar onSelect={setService} />

            {/* ✅ clean render */}
            <ScheduleGrid
                service={service}
                data={data}
                onShiftClick={handleShiftClick}
            />

            <div className="schedule-legend">
                <div className="legend-item"><span className="legend-color vacation">Vacation</span></div>
                <div className="legend-item"><span className="legend-color float">Float</span></div>
                <div className="legend-item"><span className="legend-color unavailable">Unavailable</span></div>
                <div className="legend-item"><span className="legend-color flw-training">FLW Training</span></div>
                <div className="legend-item"><span className="legend-color flw-rtw">FLW RTW</span></div>
                <div className="legend-item"><span className="legend-color gil">GIL</span></div>
                <div className="legend-item"><span className="legend-color open">Open</span></div>
                <div className="legend-item"><span className="legend-color sick">Sick</span></div>
                <div className="legend-item"><span className="legend-color leave">Leave</span></div>
                <div className="legend-item"><span className="legend-color bereavement">Bereavement</span></div>
            </div>

            <ShiftEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                shift={selectedShift}
                onSave={handleShiftSave}
            />
        </div>
    );
}
