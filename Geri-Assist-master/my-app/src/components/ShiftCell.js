const shiftMap = {
    "85 Neeve": { d: "d*", e: "e*", n: "n*" },
    "87 Neeve": { d: "d", e: "e", n: "n" },
    "Willow Place": { D: "D", E: "E", N: "N" }
};

export default function ShiftCell({ shift, service, emp_id, onShiftClick }) {
    let label = shift.time;

    if (service !== "Outreach" && shift.time) {
        label = shiftMap[service]?.[shift.time] || "";
    }

    return (
        <td
            className={`master-shift-cell ${shift.type}`}
            title={shift.training ? "Training day" : ""}
            onClick={() => onShiftClick && onShiftClick({ ...shift, emp_id: emp_id })}
            style={{ cursor: "pointer" }}
        >
            <span className="shift-label">{label}</span>

            {shift.training && (
                <span className="training-badge">T</span>
            )}
        </td>
    );
}
