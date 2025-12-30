const shiftMap = {
    "85 Neeve": { d: "d*", e: "e*", n: "n*" },
    "87 Neeve": { d: "d", e: "e", n: "n" },
    "Willow Place": { D: "D", E: "E", N: "N" }
};

export default function ShiftCell({ shift, service }) {
    let label = shift.time;

    if (service !== "Outreach" && shift.time) {
        label = shiftMap[service]?.[shift.time] || "";
    }

    return (
        <td
            className={`master-shift-cell ${shift.type}`}
            title={shift.training ? "Training day" : ""}
        >
            <span className="shift-label">{label}</span>

            {shift.training && (
                <span className="training-badge">T</span>
            )}
        </td>
    );
}
