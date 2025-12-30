import React, { useState, useEffect } from "react";
import ServiceSidebar from "./ServiceSidebar";
import ScheduleGrid from "./ScheduleGrid";
import { fetchServiceSchedule } from "../services/api";

export default function MasterSchedule() {
    const [service, setService] = useState("87 Neeve");

    // ✅ data must be an object, not an array
    const [data, setData] = useState({
        weeks: [],
        employees: []
    });

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

    return (
        <div className="app">
            <ServiceSidebar onSelect={setService} />

            {/* ✅ clean render */}
            <ScheduleGrid service={service} data={data} />
        </div>
    );
}
