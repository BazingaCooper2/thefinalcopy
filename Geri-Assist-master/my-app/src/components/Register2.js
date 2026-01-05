import { useState } from "react";
import { Link } from 'react-router-dom';
// Ensure you have imported 'modern-theme.css' in index.js for these styles to work

export default function Register() {
  const [form, setForm] = useState({
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    emp_role: "",
    qualification: "",
    full_time: "",
    skills: "",
    image: "",
    gender: "",
    date_of_birth: (new Date("01-01-2000")).toLocaleDateString("en-CA"),
    preferred_language: "English",
  });
  const [role, setRole] = useState("employee");
  const [msg, setMsg] = useState("");
  const [sched, setSched] = useState(false);
  const [schedmsg, setSchedMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shifts, setShifts] = useState([
    { startDate: "", startTime: "", endTime: "" }
  ]);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [weekshift, setWeekShift] = useState(
    days.map((day) => ({ day, shifts: [] }))
  );
  const [clid, setClid] = useState(0);

  const handleChange = (dayval, index, field, value) => {
    const updated = [...weekshift];
    updated.forEach((d) => {
      if (d.day === dayval) {
        d.shifts[index][field] = value;
      }
    });
    setWeekShift(updated);
  };

  // Add new shift for a day
  const addDayShift = (dayval) => {
    const updated = [...weekshift];
    updated.forEach((d) => {
      if (d.day === dayval) {
        d.shifts.push({ start: "", end: "" });
      }
    });
    setWeekShift(updated);
  };

  const removeDayShift = (dayval, index) => {
    const updated = [...weekshift];
    updated.forEach((d) => {
      if (d.day === dayval) {
        d.shifts.splice(index, 1); // remove the shift
      }
    });
    setWeekShift(updated);
  };

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setOk(false);
    setBusy(true);
    try {
      const payload = {
        ...form,
        shifts,
        weekshift,
        role,
      };
      const endpoint = role === "employee" ? "http://127.0.0.1:5000/register" : "http://127.0.0.1:5000/register/client";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const register_data = await res.json();
      if (res.ok) {
        setClid(register_data.client_id);
        setOk(true);
        setMsg(register_data.message || "Registered successfully");
      } else {
        throw new Error(register_data.message || register_data.error || "Registration failed");
      }
    } catch (err) {
      setOk(false);
      setMsg(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const handlePrepareSchedule = async () => {
    try {
      setBusy(true);
      const response = await fetch("http://127.0.0.1:5000/prepareSchedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clid, // fetched after registration
          weekshift: weekshift     // from state
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setSched(true);
        setSchedMsg(result.message || "Schedule Prepared successfully");
        alert(result.message);
      } else {
        throw new Error(result.message || "Failed to prepare schedule");
      }
    } catch (error) {
      console.error("Error preparing schedule:", error);
      setSched(false);
      setSchedMsg(error.message || "Schedule Preparation failed");
      alert("Failed to prepare schedule");
    }
    finally {
      setBusy(false);
    }
  };


  function handleRoleChange(value) {
    handleReset();
    setRole(value);
  }

  function handleReset() {
    setOk(false);
    setMsg("");
    setSched(false);
    setSchedMsg("");
    setForm({
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      address: "",
      emp_role: "",
      qualification: "",
      full_time: "",
      skills: "",
      image: "",
      gender: "",
      date_of_birth: (new Date("01-01-2000")).toLocaleDateString("en-CA"),
      preferred_language: "English"
    });
    setRole("employee");
    setWeekShift(days.map((day) => ({ day, shifts: [] })));
  }

  return (
    <div className="container-fluid p-4" style={{ background: 'var(--gray-50)', minHeight: '100vh' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="content-card animate-fadeIn position-relative">

            <div className="text-center mb-5">
              <h1 className="page-title">Create an Account</h1>
              <p className="page-subtitle">Join us as a Client or an Employee to get started</p>
            </div>

            {/* Role Toggle */}
            <div className="d-flex justify-content-center gap-4 mb-5">
              <div
                onClick={() => handleRoleChange('employee')}
                className={`p-4 rounded-4 cursor-pointer transition-all ${role === 'employee' ? 'border-primary bg-light shadow-md' : 'border bg-white text-muted opacity-75'}`}
                style={{
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: role === 'employee' ? 'var(--primary-purple)' : 'var(--gray-200)',
                  width: '200px',
                  cursor: 'pointer'
                }}
              >
                <div className="text-center">
                  <span className="display-4">👨‍⚕️</span>
                  <h5 className="mt-2 font-weight-bold" style={{ color: role === 'employee' ? 'var(--primary-purple)' : 'inherit' }}>Employee</h5>
                </div>
              </div>

              <div
                onClick={() => handleRoleChange('client')}
                className={`p-4 rounded-4 cursor-pointer transition-all ${role === 'client' ? 'border-primary bg-light shadow-md' : 'border bg-white text-muted opacity-75'}`}
                style={{
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: role === 'client' ? 'var(--primary-purple)' : 'var(--gray-200)',
                  width: '200px',
                  cursor: 'pointer'
                }}
              >
                <div className="text-center">
                  <span className="display-4">🏥</span>
                  <h5 className="mt-2 font-weight-bold" style={{ color: role === 'client' ? 'var(--primary-purple)' : 'inherit' }}>Client</h5>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className={ok ? "opacity-50 pointer-events-none" : ""}>

              {/* Personal Information Section */}
              <h4 className="mb-4 text-primary font-weight-bold border-bottom pb-2">Personal Information</h4>
              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="first_name">First Name <span className="text-danger">*</span></label>
                    <input
                      id="first_name"
                      className="input-modern"
                      value={form.first_name}
                      onChange={(e) => setField("first_name", e.target.value)}
                      required
                      placeholder="e.g. John"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="last_name">Last Name <span className="text-danger">*</span></label>
                    <input
                      id="last_name"
                      className="input-modern"
                      value={form.last_name}
                      onChange={(e) => setField("last_name", e.target.value)}
                      required
                      placeholder="e.g. Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="email">Email Address <span className="text-danger">*</span></label>
                    <input
                      id="email"
                      className="input-modern"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      required
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="phone_number">Phone Number</label>
                    <input
                      id="phone_number"
                      className="input-modern"
                      value={form.phone_number}
                      onChange={(e) => setField("phone_number", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="gender">Gender</label>
                    <select
                      id="gender"
                      className="input-modern"
                      value={form.gender}
                      onChange={(e) => setField("gender", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="date_of_birth">Date of Birth <span className="text-danger">*</span></label>
                    <input
                      id="date_of_birth"
                      className="input-modern"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setField("date_of_birth", e.target.value)}
                      required
                      disabled={ok || sched}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="input-group-modern">
                    <label className="input-label-modern" htmlFor="preferred_language">Preferred Language</label>
                    <select
                      id="preferred_language"
                      className="input-modern"
                      value={form.preferred_language}
                      onChange={(e) => setField("preferred_language", e.target.value)}
                      disabled={ok || sched}
                    >
                      <option value="">Select...</option>
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Mandarin</option>
                      <option>Hindi</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="input-group-modern">
                <label className="input-label-modern" htmlFor="address">Address</label>
                <textarea
                  id="address"
                  className="input-modern"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  rows="3"
                  placeholder="1234 Main St, City, Country"
                />
              </div>

              <div className="input-group-modern">
                <label className="input-label-modern" htmlFor="image">Profile Image URL (or Base64)</label>
                <input
                  id="image"
                  className="input-modern"
                  value={form.image}
                  onChange={(e) => setField("image", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {role === "employee" && (
                <>
                  <h4 className="mb-4 text-primary font-weight-bold border-bottom pb-2 mt-5">Professional Details</h4>
                  <div className="row g-4 mb-4">
                    <div className="col-md-4">
                      <div className="input-group-modern">
                        <label className="input-label-modern" htmlFor="emp_role">Assigned Role</label>
                        <input
                          id="emp_role"
                          className="input-modern"
                          value={form.emp_role}
                          onChange={(e) => setField("emp_role", e.target.value)}
                          placeholder="e.g. Nurse, Caregiver"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="input-group-modern">
                        <label className="input-label-modern" htmlFor="qualification">Qualification</label>
                        <input
                          id="qualification"
                          className="input-modern"
                          value={form.qualification}
                          onChange={(e) => setField("qualification", e.target.value)}
                          placeholder="e.g. RN, CNA"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="input-group-modern">
                        <label className="input-label-modern" htmlFor="full_time">Employment Type</label>
                        <select
                          id="full_time"
                          className="input-modern"
                          value={form.full_time}
                          onChange={(e) => setField("full_time", e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option>Full Time</option>
                          <option>Half Time</option>
                          <option>Temporary</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="input-group-modern mt-4">
                <label className="input-label-modern" htmlFor="password">Password <span className="text-danger">*</span></label>
                <input
                  id="password"
                  className="input-modern"
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={ok || sched}
                  placeholder="Enter a strong password"
                />
              </div>

              {/* Weekly Shift Planner */}
              <div className="mt-5">
                <h2 className="mb-4 text-center gradient-text font-weight-bold">📅 Weekly Shift Planner</h2>
                <p className="text-center text-muted mb-4">Set up availability or required shifts for the week.</p>

                <div className="table-responsive shadow-sm rounded-4 overflow-hidden">
                  <table className="table table-modern align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: "150px" }}>Day</th>
                        <th>Shifts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekshift.map((dayData, dIndex) => (
                        <tr key={dIndex}>
                          <td className="fw-bold bg-light">{dayData.day}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              {dayData.shifts.map((shift, sIndex) => (
                                <div key={sIndex} className="d-flex align-items-center gap-2 p-2 bg-white border rounded shadow-sm">
                                  <input
                                    type="time" // Changed to time input for better UX
                                    className="form-control form-control-sm border-0 bg-light"
                                    value={shift.start}
                                    onChange={(e) => handleChange(dayData.day, sIndex, "start", e.target.value)}
                                  />
                                  <span className="text-muted">–</span>
                                  <input
                                    type="time"
                                    className="form-control form-control-sm border-0 bg-light"
                                    value={shift.end}
                                    onChange={(e) => handleChange(dayData.day, sIndex, "end", e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm text-danger hover-bg-danger-light rounded-circle"
                                    onClick={() => removeDayShift(dayData.day, sIndex)}
                                    title="Remove Shift"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                type="button"
                                onClick={() => addDayShift(dayData.day)}
                              >
                                + Add Shift
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="d-flex justify-content-end align-items-center gap-3 mt-5">
                <button
                  className="btn btn-outline-secondary btn-lg px-5"
                  type="button"
                  onClick={handleReset}
                >
                  Reset
                </button>
                <button className="btn btn-primary btn-lg px-5 btn-modern" type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : "Create Account"}
                </button>
              </div>

            </form>

            <div className="text-center mt-4">
              <span className="text-muted">Already have an account? </span>
              <Link to="/login" className="text-primary font-weight-bold text-decoration-none">Login here</Link>
            </div>

            {/* Success/Error Messages */}
            {msg && (
              <div className={`alert ${ok ? 'alert-success' : 'alert-danger'} mt-4 animate-slideUp`} role="alert">
                {ok ? "✅" : "⚠️"} {msg}
              </div>
            )}

            {/* Client Schedule Prep Button */}
            {role === "client" && ok && (
              <div className="mt-4 p-4 border rounded-4 bg-light animate-fadeIn">
                <h5 className="text-primary mb-3">Next Steps</h5>
                <p>Now that you are registered, you can prepare the schedule based on your shift preferences.</p>
                <button
                  className="btn btn-success btn-modern"
                  type="button"
                  onClick={handlePrepareSchedule}
                  disabled={busy}
                >
                  Prepare Schedule
                </button>
                {schedmsg && (
                  <div className={`alert ${sched ? 'alert-success' : 'alert-danger'} mt-3`} role="alert">
                    {schedmsg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}