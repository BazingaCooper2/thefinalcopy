import EmployeeRow from "./EmployeeRow";

export default function ScheduleGrid({ data, service, onShiftClick }) {
    if (!data?.employees?.length) {
        return <div className="empty-state">No schedule available</div>;
    }
    const totalDays = data.weeks.length;
    return (
        <div className="schedule-wrapper">
            <div className="master-schedule-row" style={{
                gridTemplateColumns: `200px repeat(${totalDays}, 1fr)`
            }}
            >
                <div className="master-employee-cell sticky-col">Employee</div>
                {data.weeks.map((day, i) => (
                    <div key={i} className="master-shift-cell">
                        {day}
                    </div>
                ))}
            </div>

            {data.employees.map(emp => (
                <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    id={emp.id}
                    service={service}
                    onShiftClick={onShiftClick}
                />
            ))}
        </div>

    );
}
