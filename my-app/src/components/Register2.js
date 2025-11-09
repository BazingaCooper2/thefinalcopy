import { useState } from "react";
//import { postJSON } from "../api";
//import { useState } from "react";
import { Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    emp_role:"",
    qualification: "",
    full_time:"",
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

  // const addShift = () => {
  //   setShifts([...shifts, { startDate: "", startTime: "", endTime: "" }]);
  // };

  // const removeShift = (index) => {
  //   setShifts(shifts.filter((_, i) => i !== index));
  // };

  // const handleShiftChange = (index, field, value) => {
  //   const newShifts = [...shifts];
  //   newShifts[index][field] = value;
  //   setShifts(newShifts);
  // };

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
      //const res = await postJSON(endpoint, payload);
      const res = await fetch(endpoint,{method:"POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)});
        const register_data = await res.json();
        setClid(register_data.client_id);
      setOk(true);
      setMsg(res.message || "Registered successfully");
    } catch (err) {
      setOk(false);
      setMsg(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const handlePrepareSchedule = async () => {
  try {
    const response = await fetch("http://127.0.0.1:5000/prepareSchedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clid, // fetched after registration
        weekshift: weekshift     // from state
      }),
    });

    const result = await response.json();
    setSched(true);
    setSchedMsg(response.message || "Schedule Prepared successfully");
    alert(result.message);
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


  function handleRoleChange(e) {
    handleReset();
    setRole(e.target.value);
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
      qualification: "",
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
    <div className="container container-fluid ms-sm-5">
    <form className={ok?"disable":"form"} onSubmit={onSubmit}>
      <h1 className="title">Create an account</h1>

      <div className="field">
        <label className="label">Registering as</label>
        <div>
          <label>
            <input
              type="radio"
              name="role"
              value="employee"
              checked={role === "employee"}
              onChange={handleRoleChange}
            />{" "}
            Employee
          </label>{" "}
          <label>
            <input
              type="radio"
              name="role"
              value="client"
              checked={role === "client"}
              onChange={handleRoleChange}
            />{" "}
            Client
          </label>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="email">Email <span style={{color:"red"}}>*</span></label>
        <input
          id="email"
          className="input bg-light"
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </div>

      <div className="row">
        <div className="field">
          <label className="label" htmlFor="first_name">First name <span style={{color:"red"}}>*</span></label>
          <input
            id="first_name"
            className="input bg-light"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="last_name">Last name <span style={{color:"red"}}>*</span></label>
          <input
            id="last_name"
            className="input bg-light"
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label className="label" htmlFor="phone_number">Phone Number</label>
          <input
            id="phone_number"
            className="input bg-light"
            value={form.phone_number}
            onChange={(e) => setField("phone_number", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="select bg-light"
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

      <div className="field">
        <label className="label" htmlFor="address">Address</label>
        <textarea
          id="address"
          className="input bg-light"
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
        />
      </div>

      <div className={role==="employee"?"field":"d-none"}>
        <label className="label" htmlFor="emp_role">Assigned Role</label>
        <input
          id="emp_role"
          className="input bg-light"
          value={form.qualification}
          onChange={(e) => setField("emp_role", e.target.value)}
        />
        <label className="label" htmlFor="qualification">Qualification</label>
        <input
          id="qualification"
          className="input bg-light"
          value={form.qualification}
          onChange={(e) => setField("qualification", e.target.value)}
        />
        <label className="label" htmlFor="full_time">Full Time/ Half Time/ Temporary</label>
        <input
          id="full_time"
          className="input bg-light"
          value={form.full_time}
          onChange={(e) => setField("full_time", e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="image">Image (URL or base64)</label>
        <input
          id="image"
          className="input bg-light"
          value={form.image}
          onChange={(e) => setField("image", e.target.value)}
          placeholder="Paste URL or base64 string"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="date_of_birth">Date of birth <span style={{color:"red"}}>*</span></label>
        <input
          id="date_of_birth"
          className="input bg-light"
          type="text"
          value={form.date_of_birth}
          onChange={(e) => setField("date_of_birth", e.target.value)}
          required
          disabled = {ok||sched}
        />
        <span className="helper">Format: YYYY-MM-DD</span>
      </div>

      <div className="field">
        <label className="label" htmlFor="preferred_language">Preferred Language</label>
        <select
          id="preferred_language"
          className="select bg-light"
          value={form.preferred_language}
          onChange={(e) => setField("preferred_language", e.target.value)}
          disabled = {ok||sched}
        >
          <option value="">Select...</option>
          <option>English</option>
          <option>Spanish</option>
          <option>French</option>
          <option>German</option>
          <option>Mandarin</option>
          <option>Hindi</option>
          <option>Arabic</option>
          <option>Portuguese</option>
          <option>Russian</option>
          <option>Japanese</option>
          <option>Other</option>
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="password">Password <span style={{color:"red", fontSize:14}}>*</span></label>
        <input
          id="password"
          className="input bg-light"
          type="password"
          value={form.password}
          onChange={(e) => setField("password", e.target.value)}
          required
          autoComplete="new-password"
          disabled = {ok||sched}
        />
      </div>

      {/* {weekly schedule setup} */}
      <div className="container my-4">
      <h2 className="mb-4 text-center text-primary">📅 Weekly Shift Planner</h2>

      <div className="table-responsive shadow-sm">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th style={{ width: "150px" }}>Day</th>
              <th>Shifts</th>
              {/* <th>Total Hours</th> */}
            </tr>
          </thead>
          <tbody>
            {weekshift.map((dayData, dIndex) => (
              <tr key={dIndex}>
                <td className="fw-bold">{dayData.day}</td>
                <td>
                  {dayData.shifts.map((shift, sIndex) => (
                    <div
                      key={sIndex}
                      className="d-flex align-items-center mb-2 gap-2"
                    >
                      <input
                        type="text"
                        className="form-control"
                        value={shift.start}
                        onChange={(e) =>
                          handleChange(dayData.day, sIndex, "start", e.target.value)
                        }
                      />
                      <span>-</span>
                      <input
                        type="text"
                        className="form-control"
                        value={shift.end}
                        onChange={(e) =>
                          handleChange(dayData.day, sIndex, "end", e.target.value)
                        }
                      />
                      <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        onClick={() => removeDayShift(dayData.day, sIndex)}
                      >
                        ❌ Remove
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    type="button"
                    onClick={() => addDayShift(dayData.day)}
                  >
                    ➕ Add Shift
                  </button>
                </td>
                {/* <td className="text-success fw-bold">
                  {calculateTotalHours(dayData.shifts)}
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>

      <div className="actions">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleReset}
        >
          Reset
        </button>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
        </button>
        <div className="helper">Want to Login ? <Link to="/login">Click me to Login!</Link></div>
      </div>

      {msg && (
        <div className={ok? "message success" : "message error"} role="status" aria-live="polite">
          {msg}
        </div>
      )}
    </form>
  <div className={role==="client"?"field":"d-none"}>
      <div className={!ok?"d-none":"btn btn-secondary"} type="button" onClick={handlePrepareSchedule}>
          Prepare schedule
      </div>
      {schedmsg && (
        <div className={sched? "message success" : "message error"} role="status" aria-live="polite">
          {schedmsg}
        </div>
      )}
      </div>
  </div>
  );
}