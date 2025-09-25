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
    qualification: "",
    skills: "",
    image: "",
    gender: "",
    date_of_birth: "",
    preferred_language: "",
  });
  const [role, setRole] = useState("employee");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shifts, setShifts] = useState([
    { startDate: "", startTime: "", endTime: "" }
  ]);

  const addShift = () => {
    setShifts([...shifts, { startDate: "", startTime: "", endTime: "" }]);
  };

  const removeShift = (index) => {
    setShifts(shifts.filter((_, i) => i !== index));
  };

  const handleShiftChange = (index, field, value) => {
    const newShifts = [...shifts];
    newShifts[index][field] = value;
    setShifts(newShifts);
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
        role,
      };
      const endpoint = role === "employee" ? "http://127.0.0.1:5000/register" : "http://127.0.0.1:5000/register/client";
      //const res = await postJSON(endpoint, payload);
      const res = await fetch(endpoint,{method:"POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)});
      setOk(true);
      setMsg(res.message || "Registered successfully");
    } catch (err) {
      setOk(false);
      setMsg(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  function handleRoleChange(e) {
    setRole(e.target.value);
  }

  function handleReset() {
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
      date_of_birth: "",
      preferred_language: ""
    });
    setRole("employee");
  }

  return (
    <div className="container container-fluid mr-6">
    <form className="form" onSubmit={onSubmit}>
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
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </div>

      <div className="row">
        <div className="field">
          <label className="label" htmlFor="first_name">First name</label>
          <input
            id="first_name"
            className="input"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="last_name">Last name</label>
          <input
            id="last_name"
            className="input"
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
            className="input"
            value={form.phone_number}
            onChange={(e) => setField("phone_number", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="select"
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
          className="input"
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
        />
      </div>

      <div className={role==="employee"?"field":"d-none"}>
        <label className="label" htmlFor="qualification">Qualification</label>
        <input
          id="qualification"
          className="input"
          value={form.qualification}
          onChange={(e) => setField("qualification", e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="image">Image (URL or base64)</label>
        <input
          id="image"
          className="input"
          value={form.image}
          onChange={(e) => setField("image", e.target.value)}
          placeholder="Paste URL or base64 string"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="date_of_birth">Date of birth</label>
        <input
          id="date_of_birth"
          className="input"
          type="date"
          value={form.date_of_birth}
          onChange={(e) => setField("date_of_birth", e.target.value)}
        />
        <span className="helper">Format: YYYY-MM-DD</span>
      </div>

      <div className="field">
        <label className="label" htmlFor="preferred_language">Preferred Language</label>
        <select
          id="preferred_language"
          className="select"
          value={form.preferred_language}
          onChange={(e) => setField("preferred_language", e.target.value)}
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
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          value={form.password}
          onChange={(e) => setField("password", e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <div className = {role==="client"?"field":"d-none"}><h5>Enter Shift Details</h5>
        {/* Dynamic Shift Inputs */}
      {shifts.map((shift, index) => (
        <div className="field" key={index} style={{ marginBottom: "10px" }}>
          <input
            className="input"
            type="date"
            value={shift.startDate}
            onChange={(e) =>
              handleShiftChange(index, "startDate", e.target.value)
            }
          />
          <input
            className="input"
            type="datetime-local"
            value={shift.startTime}
            onChange={(e) =>
              handleShiftChange(index, "startTime", e.target.value)
            }
          />
          <input
            className="input"
            type="datetime-local"
            value={shift.endTime}
            onChange={(e) =>
              handleShiftChange(index, "endTime", e.target.value)
            }
          />
          <button className="btn btn-ghost" type="button" onClick={() => removeShift(index)}>
            Remove
          </button>
        </div>
      ))}

      <button className="btn btn-ghost" type="button" onClick={addShift}>
        ➕ Add Shift
      </button>

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
  </div>
  );
}