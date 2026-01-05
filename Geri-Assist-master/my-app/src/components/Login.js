// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link } from 'react-router-dom';
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
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <i className="bi bi-heart-pulse-fill" style={{ color: '#667eea' }}></i>
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to Geri-Assist Dashboard</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="employee_id">Employee ID</label>
            <input
              id="employee_id"
              className="login-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. 1001"
              required
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <span className="login-helper-text">Enter the password provided by your administrator</span>
          </div>

          <div className="login-actions">
            <button
              className="login-btn-ghost"
              type="button"
              onClick={() => { setEmployeeId(""); setPassword(""); }}
            >
              Clear
            </button>
            <button
              className="login-btn-primary"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <span><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Signing in...</span>
              ) : (
                <>Sign In <i className="bi bi-arrow-right ms-2"></i></>
              )}
            </button>
          </div>

          {msg && (
            <div className={`login-message ${ok ? "success" : "error"}`} role="status" aria-live="polite">
              {ok ? <i className="bi bi-check-circle-fill me-2"></i> : <i className="bi bi-exclamation-triangle-fill me-2"></i>}
              {msg}
            </div>
          )}

          <div className="login-footer">
            <p className="mb-2">Don't have an account?</p>
            <Link to="/register">Register New Employee</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
