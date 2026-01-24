import ShiftCell from "./ShiftCell";

export default function EmployeeRow({ employee, id, service, onShiftClick }) {

    // Calculate total hours scheduled in this view
    const totalHours = employee.shifts.reduce((acc, shift) => {
        if (!shift.start_time || !shift.end_time) return acc;
        // Parse "YYYY-MM-DD HH:MM:SS"
        const start = new Date(shift.start_time.replace(" ", "T"));
        const end = new Date(shift.end_time.replace(" ", "T"));
        const hours = (end - start) / (1000 * 60 * 60);
        return acc + (hours > 0 ? hours : 0);
    }, 0);

    // Determine capacity (default to 40h/week * 6 weeks = 240h if not specified)
    // If 'capacity' string contains a number, use it. If "Full Time", use 40.
    let weeklyCap = 40;
    const capacityStr = String(employee.capacity || "").toLowerCase();
    if (capacityStr.includes("part")) weeklyCap = 20;
    else if (capacityStr.includes("casual")) weeklyCap = 0; // Casuals might not have a fixed bar

    // If exact number is in capacity string
    const match = capacityStr.match(/(\d+)/);
    if (match) weeklyCap = parseInt(match[1]);

    const weeks = 6;
    const maxCapacity = weeklyCap * weeks;
    const usagePercent = maxCapacity > 0 ? Math.min(100, (totalHours / maxCapacity) * 100) : 0;

    // Color code
    let barColor = "#10b981"; // green
    if (usagePercent > 90) barColor = "#ef4444"; // red
    else if (usagePercent > 75) barColor = "#f59e0b"; // orange

    return (
        <div className="master-schedule-row">
            <div className="master-employee-cell sticky-col">
                <div className="master-employee-name">
                    {employee.name}
                </div>
                {employee.capacity && (
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: "4px" }}>
                        {employee.capacity}
                    </div>
                )}

                {/* Capacity Bar */}
                {maxCapacity > 0 && (
                    <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "3px", marginTop: "4px" }}>
                        <div style={{
                            width: `${usagePercent}%`,
                            height: "100%",
                            background: barColor,
                            borderRadius: "3px",
                            transition: "width 0.3s ease"
                        }} />
                    </div>
                )}
                <div style={{ fontSize: "0.7em", color: "#9ca3af", marginTop: "2px" }}>
                    {Math.round(totalHours)}h / {maxCapacity}h
                </div>

                <div className="master-employee-address" style={{ marginTop: "4px" }}>{employee.address}</div>
            </div>

            {employee.shifts.map((shift, i) => (
                <ShiftCell
                    key={i}
                    shift={shift}
                    service={service}
                    emp_id={id}
                    onShiftClick={onShiftClick}
                />
            ))}
        </div>
    );
}
