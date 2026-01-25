import React, { useState } from "react";
import API_BASE from "../config/api";

export default function AdminShiftModal({ shift, onClose, onUpdated }) {
  const [empId, setEmpId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (endpoint, method = "POST", body = null) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Action failed");
      }

      onUpdated();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const requireEmp = () => {
    if (!empId) {
      setError("Employee ID is required");
      return false;
    }
    return true;
  };

  return (
    <>
      <style>{`
        .glass-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .glass-modal {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow: hidden;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .glass-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .glass-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .glass-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #fff;
          font-size: 20px;
        }

        .glass-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .glass-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .glass-body {
          padding: 24px;
          max-height: calc(90vh - 180px);
          overflow-y: auto;
        }

        .shift-info {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .shift-date {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        }

        .shift-time {
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 12px;
          font-size: 14px;
        }

        .shift-detail {
          color: #fff;
          margin-bottom: 6px;
          font-size: 14px;
        }

        .shift-badge {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .glass-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          color: #000000;
          font-size: 14px;
          margin-bottom: 16px;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .glass-input::placeholder {
          color: rgba(0, 0, 0, 0.6);
        }

        .glass-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.2);
        }

        .glass-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .glass-error {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.4);
          color: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .glass-button {
          width: 100%;
          padding: 12px 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 10px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .glass-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .glass-button:last-child {
          margin-bottom: 0;
        }

        .btn-success {
          background: rgba(25, 135, 84, 0.3);
          color: #fff;
        }

        .btn-success:hover:not(:disabled) {
          background: rgba(0, 160, 85, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(25, 135, 84, 0.3);
        }

        .btn-warning {
          background: rgba(255, 193, 7, 0.3);
          color: #fff;
        }

        .btn-warning:hover:not(:disabled) {
          background: rgba(255, 191, 0, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
        }

        .btn-danger {
          background: rgba(235, 37, 57, 0.3);
          color: #fff;
        }

        .btn-danger:hover:not(:disabled) {
          background: rgba(255, 0, 25, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .btn-outline {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .btn-outline:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .glass-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
          margin: 20px 0;
          border: none;
        }

        .glass-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          justify-content: flex-end;
        }

        .btn-secondary {
          background: rgba(108, 117, 125, 0.3);
          color: #fff;
          padding: 10px 24px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(108, 117, 125, 0.5);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="glass-backdrop" onClick={onClose}>
        <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
          
          {/* HEADER */}
          <div className="glass-header">
            <h5 className="glass-title">Shift #{shift.shift_id}</h5>
            <button
              className="glass-close"
              onClick={onClose}
              disabled={loading}
            >
              ×
            </button>
          </div>

          {/* BODY */}
          <div className="glass-body">
            <div className="shift-info">
              <div className="shift-date">{shift.date}</div>
              <div className="shift-time">
                {shift.start} – {shift.end} (UTC)
              </div>
              <div className="shift-detail">
                Client: <strong>{shift.client_name}</strong>
              </div>
              <div className="shift-detail">
                Status: <span className="shift-badge">{shift.shift_status}</span>
              </div>
            </div>

            <input
              className="glass-input"
              placeholder="Employee ID"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              disabled={loading}
            />

            {error && (
              <div className="glass-error">
                {error}
              </div>
            )}

            <div>
              {/* AUTO ASSIGN */}
              <button
                className="glass-button btn-success"
                disabled={loading}
                onClick={() =>
                  apiCall(
                    `/admin/shift/${shift.shift_id}/resolve`,
                    "POST"
                  )
                }
              >
                Auto Assign (Recommended)
              </button>

              {/* REASSIGN */}
              <button
                className="glass-button btn-warning"
                disabled={loading}
                onClick={() =>
                  requireEmp() &&
                  apiCall(
                    `/admin/shift/${shift.shift_id}/reassign`,
                    "POST",
                    { emp_id: empId }
                  )
                }
              >
                Reassign to Employee
              </button>

              {/* FORCE ASSIGN */}
              <button
                className="glass-button btn-danger"
                disabled={loading}
                onClick={() =>
                  requireEmp() &&
                  apiCall(
                    `/admin/shift/${shift.shift_id}/force`,
                    "POST",
                    { emp_id: empId }
                  )
                }
              >
                Emergency Assign
              </button>

              <hr className="glass-divider" />

              {/* EDIT */}
              <button
                className="glass-button btn-outline"
                disabled={loading}
                onClick={() =>
                  apiCall(
                    `/admin/shift/${shift.shift_id}`,
                    "PUT",
                    {
                      shift_start_time: shift.start,
                      shift_end_time: shift.end,
                    }
                  )
                }
              >
                Save Time Edit
              </button>

              {/* DELETE */}
              <button
                className="glass-button btn-outline"
                disabled={loading}
                onClick={() =>
                  window.confirm("Delete this shift?") &&
                  apiCall(
                    `/admin/shift/${shift.shift_id}`,
                    "DELETE"
                  )
                }
              >
                Delete Shift
              </button>
            </div>
          </div>

          {/* FOOTER */}
          <div className="glass-footer">
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </>
  );
}