// src/utils/emp.js
export function getEmpId() {
    const id = sessionStorage.getItem("emp_id");
    if (!id) throw new Error("emp_id missing from session");
    return Number(id);
}
