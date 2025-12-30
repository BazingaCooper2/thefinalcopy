import ShiftCell from "./ShiftCell";

export default function EmployeeRow({ employee, service }) {
  return (
    <div className="master-schedule-row">
      <div className="master-employee-cell sticky-col">
        <div className="master-employee-name">{employee.name}</div>
        <div className="master-employee-address">{employee.address}</div>
      </div>

      {employee.shifts.map((shift, i) => (
        <ShiftCell
          key={i}
          shift={shift}
          service={service}
        />
      ))}
    </div>
  );
}
