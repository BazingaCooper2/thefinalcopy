import React, { useEffect, useState } from "react";
import AdminShiftModal from "./AdminShiftModal";
import API_BASE from "../config/api"; // adjust path if needed

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/admin/dashboard`);

      if (!res.ok) {
        throw new Error("Failed to load admin dashboard");
      }

      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="p-4">Loading admin dashboard…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-danger">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-3">
      <h4 className="mb-3">Admin Dashboard</h4>

      {/* 🔹 COUNTS */}
      <div className="row mb-4">
        <Stat title="Unassigned" value={data.counts.unassigned} color="danger" />
        <Stat title="Offers Sent" value={data.counts.offer_sent} color="warning" />
        <Stat title="Starting Soon" value={data.counts.starting_soon} color="info" />
      </div>

      {/* 🔹 ACTION TABLES */}
      <ShiftTable
        title="Unassigned Shifts"
        shifts={data.unassigned_shifts}
        onFix={setSelectedShift}
      />

      <ShiftTable
        title="Pending Offers"
        shifts={data.offer_sent_shifts}
        onFix={setSelectedShift}
      />

      <ShiftTable
        title="Starting in 24 Hours"
        shifts={data.starting_soon_shifts}
        onFix={setSelectedShift}
      />

      {/* 🔥 MODAL */}
      {selectedShift && (
        <AdminShiftModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onUpdated={loadDashboard}
        />
      )}
    </div>
  );
}

/* ---------- Small Components ---------- */

function Stat({ title, value, color }) {
  return (
    <div className="col-md-4 mb-2">
      <div className={`card border-${color}`}>
        <div className="card-body text-center">
          <h6 className="text-muted">{title}</h6>
          <h3 className={`text-${color}`}>{value}</h3>
        </div>
      </div>
    </div>
  );
}

function ShiftTable({ title, shifts, onFix }) {
  if (!shifts || shifts.length === 0) return null;

  return (
    <div className="card mb-4">
      <div className="card-header">{title}</div>

      <div className="table-responsive">
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Client</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.shift_id}>
                <td>{s.date}</td>
                <td>{s.start} – {s.end}</td>
                <td>{s.client_name}</td>
                <td>
                  <span className="badge bg-secondary">
                    {s.shift_status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onFix(s)}
                  >
                    Fix / Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
