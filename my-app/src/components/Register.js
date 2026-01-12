// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link } from 'react-router-dom';
// import { postJSON } from "../api";

export default function Register() {
  const [form, setForm] = useState({
    employee_id: "",
    password: "",
    first_name: "",
    last_name: "",
    age: "",
    gender: "",
    date_of_birth: "",
  });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

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
        age: form.age ? Number(form.age) : undefined,
      };
      const res = await fetch("http://127.0.0.1:5000/register",{method:"POST",
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

  return (
    <div className="container-fluid">
    <form className="form" onSubmit={onSubmit}>
      <h1 className="title">Create an account</h1>
      <p className="subtitle">Add employee details to continue</p>

      <div className="field">
        <label className="label" htmlFor="employee_id">Employee ID</label>
        <input
          id="employee_id"
          className="input"
          value={form.employee_id}
          onChange={(e) => setField("employee_id", e.target.value)}
          placeholder="e.g. EMP12345"
          required
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          value={form.password}
          onChange={(e) => setField("password", e.target.value)}
          placeholder="Choose a strong password"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="rowfld">
        <div className="field">
          <label className="label" htmlFor="first_name">First name</label>
          <input
            id="first_name"
            className="input"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            placeholder="First name"
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
            placeholder="Last name"
            required
          />
        </div>
      </div>

      <div className="rowfld">
        <div className="field">
          <label className="label" htmlFor="age">Age</label>
          <input
            id="age"
            className="input"
            type="number"
            min="0"
            value={form.age}
            onChange={(e) => setField("age", e.target.value)}
            placeholder="Age"
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
        <label className="label" htmlFor="dob">Date of birth</label>
        <input
          id="dob"
          className="input"
          type="date"
          value={form.date_of_birth}
          onChange={(e) => setField("date_of_birth", e.target.value)}
        />
        <span className="helper">Format: YYYY-MM-DD</span>
      </div>

      <div className="actions">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() =>
            setForm({
              employee_id: "",
              password: "",
              first_name: "",
              last_name: "",
              age: "",
              gender: "",
              date_of_birth: "",
            })
          }
        >
          Reset
        </button>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
        </button>
      </div>
      <div className="helper">Want to Login ? <Link to="/login">Click me to Login!</Link></div>
      {msg && (
        <div className={`message ${ok ? "success" : "error"}`} role="status" aria-live="polite">
          {msg}
        </div>
      )}
    </form>
    </div>
  );
}
