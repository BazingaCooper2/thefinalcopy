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
        setEmployees(data || []);
        setFilteredEmployees(data || []);
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

  //const { id } = useParams();
  //const [employee, setEmployee] = useState(null);

  const handleView =(emp_id) => {
    window.open(`/employee/${emp_id}`, "_blank"); 
    // const emp = employees.find((e) => e.emp_id == emp_id);
    // setEmployee(emp);
    // console.log(employee)
  };


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
                  <th>View</th>
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
                                  className={`badge`} style={{ backgroundColor: emp.status.color }}
                        >
                          {emp.status.label || "N/A"}
                        </span>
                      </td>
                      <td>{emp.service_type || "-"}</td>
                      <td><button className="badge bg-primary" onClick={() => handleView(emp.emp_id)}>View</button></td>
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
      {/* {employee && (
<div className="employee-profile card shadow-sm p-4 mt-4">

  
  <div className="d-flex align-items-center">
   
    <img
      src={"https://via.placeholder.com/80"}     // Replace with real employee photo if available
      alt="Employee"
      className="rounded-circle me-3"
      style={{ width: "80px", height: "80px" }}
    />

    <div>
      <h3 className="m-0 fw-bold">
        {employee.first_name} {employee.last_name}
      </h3>

      
      <span className={`badge mt-1 ${
        employee.status === "Available" ? "bg-success" :
        employee.status === "Busy" ? "bg-warning text-dark" :
        "bg-secondary"
      }`}>
        {employee.status}
      </span>

      
      <div className="text-muted small mt-2">
        {employee.designation || "Designation N/A"} •{" "}
        {employee.city || "City"} •{" "}
        {employee.service_type || "Service Type"} •{" "}
        <strong>EmpID:</strong> {employee.emp_id}
      </div>
    </div>
  </div>

  
  <div className="mt-4 border-bottom pb-2 d-flex gap-4 fw-semibold">
    <span className="tab">Overview</span>
    <span className="tab">Demographics</span>
    <span className="tab">Clients</span>
    <span className="tab">Skills & Qualifications</span>
    <span className="tab">Forms</span>
    <span className="tab text-primary border-primary border-bottom">
      Schedule
    </span>
    <span className="tab">Time Sheets & Premiums</span>
    <span className="tab">Employment</span>
    <span className="tab">Tasks</span>
  </div>

  
  <div className="d-flex justify-content-between align-items-center mt-4">

    
    <div className="d-flex align-items-center gap-2">
      <select className="form-select form-select-sm w-auto">
        <option>15 min</option>
        <option>30 min</option>
        <option>60 min</option>
      </select>

      <select className="form-select form-select-sm w-auto">
        <option>2 Weeks</option>
        <option>1 Week</option>
        <option>1 Month</option>
      </select>

      <button className="btn btn-light border">
        <i className="bi bi-calendar"></i>
      </button>

      <strong className="mx-3">Oct 12 – 25, 2025</strong>

      <button className="btn btn-light border">
        <i className="bi bi-chevron-left"></i>
      </button>

      <button className="btn btn-light border">
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>

    
    <div className="d-flex align-items-center gap-4">

      <div className="w-50">
        <span className="small text-muted">Two Weeks Capacity</span>
        <div className="progress" style={{ height: "10px" }}>
          <div
            className="progress-bar bg-primary"
            role="progressbar"
            style={{ width: "68%" }}
          >
            68.5
          </div>
        </div>
      </div>

      <button className="btn btn-outline-secondary">
        <i className="bi bi-printer"></i> Print
      </button>

      <button className="btn btn-primary">
        + Visit
      </button>
    </div>
  </div>
</div>
)} */}
    </div>
  );
};

export default EmployeeDetails;
