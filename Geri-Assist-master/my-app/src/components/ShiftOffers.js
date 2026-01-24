import React, { useEffect, useState } from "react";
import API_URL from "../config/api";
import { getEmpId } from "../utils/emp";

export default function ShiftOffers() {
  const empId = getEmpId();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState({});
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (!empId) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/shift-offers?emp_id=${empId}`)
      .then(res => res.json())
      .then(data => {
        setOffers(data.offers || []);
        setIsSupervisor(data.is_supervisor);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`${API_URL}/employees/simple`)
      .then(res => res.json())
      .then(setEmployees)
      .catch(() => {});
  }, [empId]);

  const respond = (shift_id, status) => {
    fetch(`${API_URL}/shift_offer/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id, emp_id: empId, status })
    }).then(() =>
      setOffers(prev => prev.filter(o => o.shift.shift_id !== shift_id))
    );
  };

  const handleForceAssign = (shiftId, empId) => {
    if (!window.confirm("Force assign this shift?")) return;

    fetch(`${API_URL}/shift_offer/force-assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, emp_id: empId })
    }).then(() => window.location.reload());
  };

  const handleResendOffer = shiftId => {
    const emp = selectedEmployee[shiftId];
    if (!emp) return;

    fetch(`${API_URL}/shift_offer/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, emp_id: Number(emp) })
    }).then(() => window.location.reload());
  };

  const badgeStyle = status => {
    if (status === "accepted") return styles.badgeAccepted;
    if (status === "rejected") return styles.badgeRejected;
    return styles.badgePending;
  };

  if (!empId) return <p style={styles.message}>Unauthorized</p>;
  if (loading) return <p style={styles.message}>Loading…</p>;

  return (
    <div style={styles.page}>
      <style>{`
        tr:hover { background: rgba(255,255,255,0.35); }
        button:hover:not(:disabled) { transform: translateY(-1px); }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <h2 style={styles.title}>Shift Offers</h2>

      <div style={styles.glassCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              {isSupervisor && <th style={styles.th}>Employee</th>}
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Sent</th>
              <th style={styles.th}>Responded</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {offers.map(o => (
              <tr key={o.offer_id} style={styles.tr}>
                {isSupervisor && (
                  <td style={styles.td}>
                    <div style={styles.empName}>
                      {o.employee.first_name} {o.employee.last_name}
                    </div>
                    <div style={styles.empType}>
                      {o.employee.employee_type}
                    </div>
                  </td>
                )}

                <td style={styles.td}>{o.shift.date}</td>
                <td style={{ ...styles.td, fontWeight: 500 }}>
                  {o.shift.shift_start_time} – {o.shift.shift_end_time}
                </td>

                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...badgeStyle(o.status) }}>
                    {o.status.toUpperCase()}
                  </span>
                </td>

                <td style={styles.td}>
                  {o.sent_at ? new Date(o.sent_at).toLocaleString() : "—"}
                </td>

                <td style={styles.td}>
                  {o.responded_at ? new Date(o.responded_at).toLocaleString() : "—"}
                </td>

                <td style={styles.td}>
                  {!isSupervisor ? (
                    <div style={styles.rowActions}>
                      <button
                        style={styles.accept}
                        disabled={o.status !== "sent"}
                        onClick={() => respond(o.shift.shift_id, "accepted")}
                      >
                        Accept
                      </button>
                      <button
                        style={styles.reject}
                        disabled={o.status !== "sent"}
                        onClick={() => respond(o.shift.shift_id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div style={styles.supervisorBox}>
                      <div style={styles.rowActions}>
                        <select
                          style={styles.select}
                          value={selectedEmployee[o.shift.shift_id] || ""}
                          onChange={e =>
                            setSelectedEmployee(p => ({
                              ...p,
                              [o.shift.shift_id]: e.target.value
                            }))
                          }
                        >
                          <option value="">Select employee</option>
                          {employees.map(emp => (
                            <option key={emp.emp_id} value={emp.emp_id}>
                              {emp.first_name} {emp.last_name}
                            </option>
                          ))}
                        </select>

                        <button
                          style={styles.send}
                          disabled={!selectedEmployee[o.shift.shift_id]}
                          onClick={() => handleResendOffer(o.shift.shift_id)}
                        >
                          Send
                        </button>
                      </div>

                      <button
                        style={styles.force}
                        onClick={() =>
                          handleForceAssign(
                            o.shift.shift_id,
                            o.employee.emp_id
                          )
                        }
                      >
                        Force Assign
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 40,
    background:
      "linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #dbeafe 100%)",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont"
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 24,
    color: "#111827"
  },
  message: { padding: 24, fontSize: 16 },
  glassCard: {
    backdropFilter: "blur(18px)",
    background: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.5)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
    overflow: "hidden"
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "16px 20px",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#374151",
    background: "rgba(255,255,255,0.6)"
  },
  tr: { borderTop: "1px solid rgba(255,255,255,0.4)" },
  td: { padding: "16px 20px", fontSize: 14, color: "#1f2937" },
  empName: { fontWeight: 500 },
  empType: { fontSize: 12, color: "#6b7280" },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600
  },
  badgeAccepted: { background: "#10b981", color: "#fff" },
  badgeRejected: { background: "#ef4444", color: "#fff" },
  badgePending: { background: "#fbbf24", color: "#1f2937" },
  rowActions: { display: "flex", gap: 8 },
  supervisorBox: { display: "flex", flexDirection: "column", gap: 8 },
  select: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "rgba(255,255,255,0.85)",
    flex: 1
  },
  accept: { background: "#10b981", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px" },
  reject: { background: "#ef4444", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px" },
  send: { background: "#3b82f6", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px" },
  force: { background: "#111827", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px" }
};
