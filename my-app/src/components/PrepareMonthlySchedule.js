import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";

function GenerateShifts({ empId }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/employees") // Flask route to get all employees
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data.employee || []);
      })
      .catch((err) => console.error("Error fetching employees:", err));
  
  fetch("http://127.0.0.1:5000/clients") // Flask route to get all employees
      .then((res) => res.json())
      .then((data) => {
        setClients(data.client || []);
      })
      .catch((err) => console.error("Error fetching clients:", err));
  }, []);

  // Toggle checkbox
  const handleCheckboxChange = (emp_id) => {
    setSelectedEmployees((prev) =>
      prev.includes(emp_id)
        ? prev.filter((id) => id !== emp_id)
        : [...prev, emp_id]
    );};
  const handleClientCheckboxChange = (client_id) => {
    setSelectedClients((prev) =>
        prev.includes(client_id)
        ? prev.filter((id) => id !== client_id)
        : [...prev, client_id]
    );
  };

  const handleGenerateShifts = async () => {
    setLoading(true);
    setMessage("");

    for (let emp_id of selectedEmployees) {
        try {
        const res = await fetch("http://127.0.0.1:5000/generate_next_month_shifts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({emp_id} ),
        });

        const data = await res.json();
        if (res.ok) {
            setMessage(data.message);
        } else {
            setMessage(`Error: ${data.error}`);
        }
        } catch (err) {
        console.error(err);
        setMessage(" Error connecting to server.");
        } finally {
        setLoading(false);
        }
    }
  };

  const handleClientGenerateShifts = async () => {
    setLoading(true);
    setMessage("");

    for (let client_id of selectedClients) {
        try {
        const res = await fetch("http://127.0.0.1:5000/client_generate_next_month_shifts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({client_id} ),
        });

        const data = await res.json();
        if (res.ok) {
            setMessage(data.message);
        } else {
            setMessage(`Error: ${data.error}`);
        }
        } catch (err) {
        console.error(err);
        setMessage(" Error connecting to server.");
        } finally {
        setLoading(false);
        }
    }
  };

  return (
    <div className="container mt-5 ms-sm-3">
      <div className="shadow-sm border-0">
        <div className="bg-primary text-white fw-bold">
          Prepare Next Month’s Employee Shifts
        </div>

        <div className="card-body">
          <p className="text-muted mb-4">
            Select the employees whose <strong>daily shifts</strong> should be automatically created for the next month
            based on their <em>employee_daily_timeline</em>.
          </p>

          {/* Employee Checklist */}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th scope="col">Select</th>
                  <th scope="col">Employee ID</th>
                  <th scope="col">First Name</th>
                  <th scope="col">Last Name</th>
                  <th scope="col">Service Type</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <tr key={emp.emp_id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.emp_id)}
                          onChange={() => handleCheckboxChange(emp.emp_id)}
                        />
                      </td>
                      <td>{emp.emp_id}</td>
                      <td>{emp.first_name}</td>
                      <td>{emp.last_name || "-"}</td>
                      <td>{emp.service_type || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            emp.status === "Available"
                              ? "bg-success"
                              : emp.status === "On Leave"
                              ? "bg-warning"
                              : "bg-secondary"
                          }`}
                        >
                          {emp.status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Generate Button */}
          <div className="text-end mt-3">
            <button
              className="btn btn-success fw-bold"
              onClick={handleGenerateShifts}
              disabled={loading}
            >
              {loading ? "⏳ Generating..." : "Generate Shifts for Next Month"}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`alert mt-3 ${
                message.includes("✅")
                  ? "alert-success"
                  : message.includes("⚠️")
                  ? "alert-warning"
                  : "alert-danger"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
      <div className="shadow-sm border-0">
        <div className="bg-primary text-white fw-bold">
          Prepare Next Month’s Client Shifts
        </div>

        <div className="card-body">
          <p className="text-muted mb-4">
            Select the clients whose <strong>daily shifts</strong> should be automatically created for the next month
            based on their <em>timeline</em>.
          </p>

          {/* Employee Checklist */}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th scope="col">Select</th>
                  <th scope="col">Client ID</th>
                  <th scope="col">First Name</th>
                  <th scope="col">Last Name</th>
                  <th scope="col">Service Type</th>
                </tr>
              </thead>
              <tbody>
                {clients.length > 0 ? (
                  clients.map((cl) => (
                    <tr key={cl.client_id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(cl.client_id)}
                          onChange={() => handleClientCheckboxChange(cl.client_id)}
                        />
                      </td>
                      <td>{cl.client_id}</td>
                      <td>{cl.first_name}</td>
                      <td>{cl.last_name || "-"}</td>
                      <td>{cl.service_type || "-"}</td>
                      
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Generate Button */}
          <div className="text-end mt-3">
            <button
              className="btn btn-success fw-bold"
              onClick={handleClientGenerateShifts}
              disabled={loading}
            >
              {loading ? "⏳ Generating..." : "Generate Shifts for Next Month"}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`alert mt-3 ${
                message.includes("✅")
                  ? "alert-success"
                  : message.includes("⚠️")
                  ? "alert-warning"
                  : "alert-danger"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenerateShifts;
