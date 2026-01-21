export function getEmpId() {
    const id = sessionStorage.getItem("emp_id");

    if (!id) {
        // hard redirect – auth state is broken
        window.location.replace("/login");
        return null;
    }

    return Number(id);
}
