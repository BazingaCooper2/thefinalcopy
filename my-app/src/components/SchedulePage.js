import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('matrix');
  const [selectedLocation, setSelectedLocation] = useState('85 Neeve');
  const [timelineDays, setTimelineDays] = useState(14);

  const locations = ['85 Neeve', '87 Neeve', 'Willow Place', 'Outreach'];

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/scheduled');
      setScheduleData(response.data.shift || []);
      setEmployees(response.data.employee || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setLoading(false);
    }
  };

  const getDays = () => {
    const days = [];
    const startObj = new Date(currentDate);
    // startObj.setDate(startObj.getDate() - startObj.getDay() + 1); // Start Monday? Or today?
    // Using simple forward projection from current view date
    for (let i = 0; i < timelineDays; i++) {
      const d = new Date(startObj);
      d.setDate(startObj.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const days = getDays();

  // Filter Logic:
  // We want to show employees relevant to the organization.
  // And cell data relevant to the selected location.
  // Ideally, we filter employees who CAN work at 'selectedLocation'.
  // For this UI, we will show all employees but only light up cells if they have a shift at 'selectedLocation'.
  // If we don't have location data on the shift, we will simulate it (or show all).

  // NOTE: Assuming scheduleData items have a 'location' or derived from client.
  // Since real data might be sparse, I'll allow all shifts to show for now, but in a real app:
  // const locShifts = scheduleData.filter(s => s.location === selectedLocation);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold text-dark">Service Types</h2>
        <p className="text-muted small">Select a location to view coverage.</p>
      </div>

      {/* Location Filter Tabs - Styling to match 'try like this' image pill look */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {locations.map(loc => (
          <button
            key={loc}
            onClick={() => setSelectedLocation(loc)}
            className={`btn rounded-pill px-4 fw-bold border-0 ${selectedLocation === loc ? 'text-white' : 'text-secondary bg-light'}`}
            style={{
              backgroundColor: selectedLocation === loc ? '#6366f1' : '#f3f4f6', // Purple for active
              transition: 'all 0.2s',
              minWidth: '120px',
              paddingTop: '10px',
              paddingBottom: '10px'
            }}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Date Navigation & Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary btn-sm rounded-circle" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d);
          }}><i className="bi bi-chevron-left"></i></button>

          <span className="fw-bold text-dark fs-5">
            {days[0].toLocaleString('default', { month: 'short' })} {days[0].getDate()} - {days[days.length - 1].toLocaleString('default', { month: 'short' })} {days[days.length - 1].getDate()}
          </span>

          <button className="btn btn-outline-secondary btn-sm rounded-circle" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d);
          }}><i className="bi bi-chevron-right"></i></button>
        </div>

        <div className="btn-group">
          <button className={`btn btn-sm ${viewMode === 'matrix' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setViewMode('matrix')}>Matrix View</button>
          <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setViewMode('list')}>List View</button>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {viewMode === 'matrix' ? (
        <div className="card border shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table mb-0" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-light">
                <tr>
                  <th className="py-3 ps-4 border-end border-bottom bg-white" style={{ position: 'sticky', left: 0, zIndex: 10, width: '200px' }}>
                    Employee
                  </th>
                  {days.map((day, i) => (
                    <th key={i} className="text-center py-3 border-end border-bottom bg-white text-secondary small fw-bold" style={{ minWidth: '100px' }}>
                      <div className="text-dark">{day.getDate()}-{day.toLocaleString('default', { month: 'short' })}</div>
                      {/* <div className="text-muted fw-normal">{day.toLocaleDateString('en-US', {weekday: 'short'})}</div> */}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.emp_id}>
                    <td className="py-3 ps-4 border-end border-bottom bg-white fw-bold text-dark" style={{ position: 'sticky', left: 0, zIndex: 5 }}>
                      {emp.first_name} {emp.last_name}
                    </td>
                    {days.map((day, i) => {
                      const dayStr = day.toISOString().split('T')[0];
                      const shift = scheduleData.find(s =>
                        s.emp_id === emp.emp_id &&
                        (s.date || s.shift_date)?.startsWith(dayStr)
                      );

                      // Visual Logic:
                      // If shift exists -> Green block (or 'e' block)
                      // If no shift -> Yellow background (Availability/Empty) as per image reference
                      const hasShift = !!shift;

                      return (
                        <td key={i} className="p-0 border-end border-bottom text-center align-middle" style={{ height: '60px', backgroundColor: '#fff7ed' }}>
                          {/* Using light yellow/orange tint (#fff7ed) for empty cells to match 'try like this' vibe */}
                          {hasShift && (
                            <div
                              className="mx-auto shadow-sm rounded-1 d-flex align-items-center justify-content-center fw-bold small text-dark"
                              style={{
                                width: '80%',
                                height: '70%',
                                backgroundColor: '#ffffff', // White box for shift
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer'
                              }}
                              title={shift.shift_start_time}
                            >
                              {/* Simply 'e' or time? User image showed 'e'. Let's show time for utility but keep simplistic look. */}
                              {new Date(shift.shift_start_time).getHours()}:{new Date(shift.shift_start_time).getMinutes().toString().padStart(2, '0')}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <RosterListView days={days} scheduleData={scheduleData} employees={employees} selectedLocation={selectedLocation} />
      )}
    </div>
  );
}

function RosterListView({ days, scheduleData, employees, selectedLocation }) {
  return (
    <div className="bg-white rounded border shadow-sm p-4">
      {days.slice(0, 7).map((day, dayIdx) => {
        const dayStr = day.toISOString().split('T')[0];
        const shifts = scheduleData.filter(s => (s.date || s.shift_date)?.startsWith(dayStr)).sort((a, b) => (a.shift_start_time > b.shift_start_time ? 1 : -1));

        return (
          <div key={dayIdx} className="mb-4">
            <h6 className="border-bottom pb-2 mb-3 fw-bold text-dark">{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h6>
            {shifts.length === 0 ? <p className="text-muted small ps-3">No shifts scheduled.</p> : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <tbody>
                    {shifts.map((s, idx) => {
                      const emp = employees.find(e => e.emp_id === s.emp_id);
                      return (
                        <tr key={idx}>
                          <td width="100" className="fw-bold small">{s.shift_start_time ? new Date(s.shift_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</td>
                          <td><span className="badge bg-light text-dark border">{selectedLocation || 'Assigned'}</span></td>
                          <td>
                            {emp ? <span className="small fw-bold">{emp.first_name} {emp.last_name}</span> : <span className="small text-danger">Unassigned</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
