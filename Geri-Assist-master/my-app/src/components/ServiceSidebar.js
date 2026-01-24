import { useState } from "react";

const services = [
    "85 Neeve",
    "87 Neeve",
    "Willow Place",
    "Outreach"
];

export default function ServiceSidebar({ onSelect }) {
    const [active, setActive] = useState(services[0]);

    const handleClick = (service) => {
        setActive(service);
        onSelect(service);
    };

    return (
        <div className="sidebar-tabs">
            <h3 className="sidebar-title">Service Types</h3>

            {services.map((s) => (
                <button
                    key={s}
                    className={`service-tab ${active === s ? "active" : ""}`}
                    onClick={() => handleClick(s)}
                >
                    {s}
                </button>
            ))}
        </div>
    );
}
