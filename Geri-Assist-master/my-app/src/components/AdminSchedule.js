import React, { useEffect, useState } from 'react';
import { getAdminSchedule, resolveShift, reassignShift } from './adminApi';

export default function AdminSchedule() {
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);

  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(weekLater);
  const [shifts, setShifts] = useState([]);

  const load = () => {
    getAdminSchedule(start, end).then(setShifts);
  };

  useEffect(load, [start, end]);

  return (
    <div className="p-4">
      <h2>Admin Schedule</h2>

      <div className="d-flex gap-2 mb-3">
        <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        <button className="btn btn-primary" onClick={load}>Refresh</button>
      </div>

      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Client</th>
            <th>Employee</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {shifts.map(s => (
            <tr key={s.shift_id}>
              <td>{s.date}</td>
              <td>{fmt(s.start_time)} – {fmt(s.end_time)}</td>
              <td>{s.client?.name}</td>
              <td>{s.employee?.name || '—'}</td>
              <td>{s.status}</td>
              <td>
                {primaryAction(s, load)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function primaryAction(shift, reload) {
  if (shift.status === 'Unassigned' || shift.status === 'Offer Sent') {
    return (
      <button
        className="btn btn-sm btn-success"
        onClick={() => resolveShift(shift.shift_id).then(reload)}
      >
        Resolve
      </button>
    );
  }

  return (
    <button
      className="btn btn-sm btn-warning"
      onClick={() => reassignShift(shift.shift_id).then(reload)}
    >
      Reassign
    </button>
  );
}

function fmt(iso) {
  return iso?.slice(11, 16);
}
