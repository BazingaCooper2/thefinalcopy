import React, { useState, useEffect } from "react";

function GenerateShifts({ empId }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState('employee');
    const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, clientRes] = await Promise.all([
          fetch("http://127.0.0.1:5000/employees"),
          fetch("http://127.0.0.1:5000/clients")
        ]);

        const empData = await empRes.json();
        const clientData = await clientRes.json();

        setEmployees(empData || []);
        setClients(clientData.client || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Toggle checkbox
  const handleCheckboxChange = (emp_id) => {
    setSelectedEmployees((prev) =>
      prev.includes(emp_id)
        ? prev.filter((id) => id !== emp_id)
        : [...prev, emp_id]
    );
  };

  const handleClientCheckboxChange = (client_id) => {
    setSelectedClients((prev) =>
      prev.includes(client_id)
        ? prev.filter((id) => id !== client_id)
        : [...prev, client_id]
    );
  };

  const handlenewShiftSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:5000/newShiftSchedule", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      // const result = await response.json();
      setMessage("✅ Shifts successfully assigned based on preparation.");
    } catch (error) {
      console.error("Error preparing schedule:", error);
      setMessage("❌ Failed to finalize schedule assignment.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShifts = async () => {
    setLoading(true);
    setMessage("");

    for (let emp_id of selectedEmployees) {
      try {
        const res = await fetch("http://127.0.0.1:5000/generate_next_month_shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emp_id }),
        });

        const data = await res.json();
        if (res.ok) {
          setMessage(`✅ ${data.message}`);
        } else {
          setMessage(`⚠️ Error: ${data.error}`);
        }
      } catch (err) {
        console.error(err);
        setMessage("❌ Error connecting to server.");
      }
    }
    setLoading(false);
  };

  const handleClientGenerateShifts = async () => {
    setLoading(true);
    setMessage("");

    for (let client_id of selectedClients) {
      try {
        const res = await fetch("http://127.0.0.1:5000/client_generate_next_month_shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id }),
        });

        const data = await res.json();
        if (res.ok) {
          setMessage(`✅ ${data.message}`);
        } else {
          setMessage(`⚠️ Error: ${data.error}`);
        }
      } catch (err) {
        console.error(err);
        setMessage("❌ Error connecting to server.");
      }
    }
    setLoading(false);
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.emp_id));
    }
  };

  const selectAllClients = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.client_id));
    }
  };

    // Helper to check if an item matches the location filter
    const checkLocationMatch = (item, filter) => {
        if (!filter) return true;
        const filterLower = filter.toLowerCase();

        // Check various fields where location info might be stored
        const city = item.city ? item.city.toLowerCase() : '';
        const address = item.address_line1 ? item.address_line1.toLowerCase() : '';
        const service = item.service_type ? item.service_type.toLowerCase() : '';
        const group = item.client_group ? item.client_group.toLowerCase() : ''; // For clients
        const program = item.program_group ? item.program_group.toLowerCase() : ''; // For clients
        const location = item.location ? item.location.toLowerCase() : '';
        const site = item.site ? item.site.toLowerCase() : '';

        // General check for all filters
        return city === filterLower ||
            address.includes(filterLower) ||
            service.includes(filterLower) ||
            group.includes(filterLower) ||
            program.includes(filterLower) ||
            location.includes(filterLower) ||
            site.includes(filterLower);
    };

    // Filter employees and clients based on location
    const filteredEmployees = employees.filter(emp => checkLocationMatch(emp, locationFilter));
    const filteredClients = clients.filter(client => checkLocationMatch(client, locationFilter));


  if (loading && employees.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="text-center">
          <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: 'var(--primary-purple)' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading schedule data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-calendar-plus me-3"></i>
          Generate Monthly Schedule
        </h1>
        <p className="page-subtitle">Prepare and automate next month's shift assignments</p>
      </div>

      {/* Action Card */}
      <div className="content-card mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-1">Finalize Schedule</h5>
            <p className="text-muted mb-0 small">Process all prepared shifts and assign them to the master schedule.</p>
          </div>
          <button
            className="btn-modern btn-primary"
            onClick={handlenewShiftSchedule}
            disabled={loading}
          >
            <i className="bi bi-check-circle-fill me-2"></i>
            {loading ? "Processing..." : "Finalize Next Month's Schedule"}
          </button>
        </div>
        {message && (
          <div className={`alert mt-3 mb-0 ${message.includes("✅") ? "alert-success" : "alert-warning"}`}>
            {message}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4">
        <button
          className={`btn ${activeTab === 'employee' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('employee')}
          style={activeTab === 'employee' ? { background: 'var(--primary-gradient)', border: 'none', color: 'white' } : { background: 'white', border: 'none' }}
        >
          <i className="bi bi-people-fill me-2"></i>
          Employee Shifts
        </button>
        <button
          className={`btn ${activeTab === 'client' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('client')}
          style={activeTab === 'client' ? { background: 'var(--primary-gradient)', border: 'none', color: 'white' } : { background: 'white', border: 'none' }}
        >
          <i className="bi bi-person-hearts me-2"></i>
          Client Shifts
        </button>
      </div>

      <div className="content-card">
        {activeTab === 'employee' ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="mb-1">Prepare Employee Shifts</h5>
                <p className="text-muted small mb-0">Select employees to automatically create daily shifts based on their timeline.</p>
              </div>
            <div className="d-flex gap-2 align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <label className="text-muted small mb-0" style={{ whiteSpace: 'nowrap' }}>
                        <i className="bi bi-geo-alt me-1"></i>
                        Filter by Location:
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        style={{ width: '160px' }}
                    >
                        <option value="">All Locations</option>
                        <option value="Outreach">Outreach</option>
                        <option value="85 Neeve">85 Neeve</option>
                        <option value="87 Neeve">87 Neeve</option>
                        <option value="Willow Place">Willow Place</option>
                    </select>
                </div>
                <button className="btn-modern btn-outline btn-sm" onClick={selectAllEmployees}>
                  {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  className="btn-modern btn-success btn-sm"
                  onClick={handleGenerateShifts}
                  disabled={loading || selectedEmployees.length === 0}
                >
                  <i className="bi bi-gear-fill me-2"></i>
                  Generate Selected
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedEmployees.length === employees.length && employees.length > 0}
                        onChange={selectAllEmployees}
                      />
                    </th>
                    <th>ID</th>
                    <th>Employee Name</th>
                    <th>Service Type</th>
                    <th>Status</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                   {filteredEmployees.map((emp) => (
                    <tr key={emp.emp_id} onClick={() => handleCheckboxChange(emp.emp_id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedEmployees.includes(emp.emp_id)}
                          onChange={() => handleCheckboxChange(emp.emp_id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td><span className="badge" style={{ background: 'var(--gray-200)', color: 'var(--gray-700)' }}>#{emp.emp_id}</span></td>
                      <td className="fw-semibold">{emp.first_name} {emp.last_name}</td>
                      <td>{emp.service_type || "-"}</td>
                      <td>
                        {/*<span className="badge" style={{*/}
                        {/*  background: emp.status === "Available" ? 'var(--success-gradient)' :*/}
                        {/*    emp.status === "On Leave" ? 'var(--warning-gradient)' : 'var(--gray-400)',*/}
                        {/*  color: 'white'*/}
                              {/*}}>*/}
                           <span>   
                            {emp.status ? (
                                <span
                                    className="badge"
                                    style={{
                                        backgroundColor: emp.status.color,
                                        color: "white",
                                        fontWeight: 600,
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                >
                                    {emp.status.label}
                                </span>
                            ) : (
                                <span className="badge bg-secondary">N/A</span>
                            )}
                        </span>
                           </td>
                           <td>{emp.service_type || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="mb-1">Prepare Client Shifts</h5>
                <p className="text-muted small mb-0">Select clients to automatically create daily shifts based on their timeline.</p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn-modern btn-outline btn-sm" onClick={selectAllClients}>
                  {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  className="btn-modern btn-success btn-sm"
                  onClick={handleClientGenerateShifts}
                  disabled={loading || selectedClients.length === 0}
                >
                  <i className="bi bi-gear-fill me-2"></i>
                  Generate Selected
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedClients.length === clients.length && clients.length > 0}
                        onChange={selectAllClients}
                      />
                    </th>
                    <th>ID</th>
                    <th>Client Name</th>
                    <th>Service Type</th>
                    <th>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((cl) => (
                    <tr key={cl.client_id} onClick={() => handleClientCheckboxChange(cl.client_id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedClients.includes(cl.client_id)}
                          onChange={() => handleClientCheckboxChange(cl.client_id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td><span className="badge" style={{ background: 'var(--gray-200)', color: 'var(--gray-700)' }}>#{cl.client_id}</span></td>
                      <td className="fw-semibold">{cl.first_name} {cl.last_name}</td>
                      <td>{cl.service_type || "-"}</td>
                      <td><span className="badge" style={{ background: 'var(--info-gradient)', color: 'white' }}>{cl.client_group || "General"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GenerateShifts;
