import React, { useState } from "react";
import { Button } from "react-bootstrap";
import EmployeeSettingsModal from "./EmployeeSettingsModal";

export default function EmployeeEmploymentSettings({ emp }) {
    const [employee, setEmployee] = useState(emp);
    console.log(employee);
    const [modalInfo, setModalInfo] = useState({
        show: false,
        key: "",
        label: "",
        value: "",
        emp_id: ""
    });

    const openModal = (key, label, value, emp_id) => {
        setModalInfo({
            show: true,
            key,
            label,
            value,
            emp_id
        });
    };

    const handleUpdate = (field, value) => {
        console.log(field, value);
        setEmployee((prev) => ({ ...prev, [field]: value }));
    };

    const settings = [
        { key: "employment_type", label: "Employment Type", value: employee?.employee_type || "FT - Full Time" },
        { key: "designation", label: "Employee Designation", value: employee?.designation || "- Not Set -" },
        { key: "seniority_no", label: "Employee Seniority Number", value: employee?.seniority || "- Not Set -" },
        { key: "salary_base", label: "Salary Base", value: employee?.salary_base || "- Not Set -" },
        { key: "overtime_rule", label: "Overtime Rule", value: employee?.overtime_rule || "44 Hours Per 7 Days" },
        { key: "payroll_number", label: "Payroll Number", value: employee?.payroll_no || "061" },
        { key: "working_hours", label: "Working Hours (All Day)", value: employee?.working_hours || "- Not Set -" },
        { key: "min_daily_cap", label: "Minimum Daily Capacity", value: employee?.min_daily_cap || "- Not Set -" },
        { key: "max_daily_cap", label: "Maximum Daily Capacity", value: employee?.max_daily_cap || "8" },
        { key: "min_weekly_cap", label: "Minimum Weekly Capacity", value: employee?.min_weekly_cap || "- Not Set -" },
    ];

    return (
        <div className="border rounded p-4 mt-3">

            <h5 className="fw-semibold mb-3">Employment Settings</h5>

            <table className="table table-borderless align-middle">
                <tbody>
                    {settings.map((item, index) => (
                        <tr key={index} className="border-bottom">
                            <td className="fw-semibold">{item.label}{employee?.emp_id}</td>

                            <td className="text-muted">{item.value}</td>

                            <td className="text-end">
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    className="px-3"
                                    onClick={() => openModal(item.key, item.label, item.value, employee?.emp_id)}
                                >
                                    Set / Edit
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal */}
            <EmployeeSettingsModal
                show={modalInfo.show}
                onHide={() => setModalInfo({ ...modalInfo, show: false })}
                settingKey={modalInfo.key}
                settingLabel={modalInfo.label}
                currentValue={modalInfo.value}
                empId={employee?.emp_id}
                onUpdated={handleUpdate}
            />
        </div>
    );
}
