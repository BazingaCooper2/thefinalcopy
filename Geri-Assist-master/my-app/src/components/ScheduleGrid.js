import EmployeeRow from "./EmployeeRow";

export default function ScheduleGrid({ data, service, onShiftClick }) {
    if (!data?.employees?.length) {
        return <div className="empty-state">No schedule available</div>;
    }

    return (
        <div className="schedule-wrapper">
            <div className="schedule-header">
                <div className="header-cell sticky-col">Employee</div>
                {data.weeks.map((day, i) => (
                    <div key={i} className="header-cell">
                        {day}
                    </div>
                ))}
            </div>

            {data.employees.map(emp => (
                <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    service={service}
                    onShiftClick={onShiftClick}
                />
            ))}
        </div>

    );
}
