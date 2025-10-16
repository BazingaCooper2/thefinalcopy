import React, { useState, useEffect } from "react";

const EmployeeDetails = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Fetch employees from backend (Flask + Supabase)
  useEffect(() => {
    fetch("http://127.0.0.1:5000/employees")
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data.employee || []);
        setFilteredEmployees(data.employee || []);
      })
      .catch((err) => console.error("Error fetching employees:", err));
  }, []);

  // Filter employees based on search
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            (emp.first_name &&
              emp.first_name.toLowerCase().includes(search.toLowerCase())) ||
            (emp.last_name &&
              emp.last_name.toLowerCase().includes(search.toLowerCase())) ||
            (emp.emp_id && emp.emp_id.toString().includes(search))
        )
      );
    }
  }, [search, employees]);

  return (
    <div className="container my-4">
      <div className=" shadow-lg border-0">
        <div className="ms-sm-6">
          <h2 className="text-center mb-4">Employee Details</h2>

          {/* Search box */}
          <div className="d-flex justify-content-center mb-4">
            <input
              type="text"
              className="form-control w-50 shadow-sm"
              placeholder="🔍 Search by name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Responsive Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Emp ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Service Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.emp_id}>
                      <td className="fw-bold">{emp.emp_id}</td>
                      <td>{emp.first_name}</td>
                      <td>{emp.last_name || "-"}</td>
                      <td>{emp.phone || "-"}</td>
                      <td>{emp.email || "-"}</td>
                      <td>{emp.designation || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            emp.status === "Available"
                              ? "bg-success"
                              : emp.status === "Busy"
                              ? "bg-warning text-dark"
                              : "bg-secondary"
                          }`}
                        >
                          {emp.status || "N/A"}
                        </span>
                      </td>
                      <td>{emp.service_type || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
                      🚫 No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;
