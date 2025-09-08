// frontend/src/pages/Login.jsx
import { useState } from "react";
//import { postJSON } from "../api";

export default function Login() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setOk(false);
    setBusy(true);
    try {
        const payload = {
            employeeId,
            password
        }
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
         headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      setOk(true);
      setMsg(res.message || "Login successful");
    } catch (err) {
      setOk(false);
      setMsg(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid">
    <form className="form" onSubmit={onSubmit}>
      <h1 className="title">Welcome back</h1>
      <p className="subtitle">Sign in with employee credentials</p>

      <div className="field">
        <label className="label" htmlFor="employee_id">Employee ID</label>
        <input
          id="employee_id"
          className="input"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="e.g. EMP12345"
          required
          autoComplete="username"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        <span className="helper">Use the password set during registration</span>
      </div>

      <div className="actions">
        <button className="btn btn-ghost" type="button" onClick={() => { setEmployeeId(""); setPassword(""); }}>
          Clear
        </button>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </div>

      {msg && (
        <div className={`message ${ok ? "success" : "error"}`} role="status" aria-live="polite">
          {msg}
        </div>
      )}
    </form>
    </div>
  );
}
