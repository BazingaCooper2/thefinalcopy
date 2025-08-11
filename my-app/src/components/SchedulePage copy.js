import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styledashboard.css';

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:5000/`); // Replace with your API endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        setScheduleData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []); // Empty dependency array ensures this runs once on mount

  if (loading) return <div>Loading schedule...</div>;
  if (error) return <div>Error: {error.message}</div>;

  /*return (
    <div>
      <h1>Schedule</h1>
      <pre>{JSON.stringify(scheduleData, null, 2)}</pre> 
    </div>
  );*/
  const hours = Array.from({ length: 14 }, (_, i) => 6 + i); // 06 to 19
  
  const employees = ['Lincoln Bartlett', 'Amelia Harper', 'Stu Pizaro', 'Lucy Ball'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const groupedStartTimes = scheduleData.shift.reduce((acc, shift) => {
    const empId = shift.emp_id;
    const startTime = shift.shift_start_time;
    if (!acc[empId]) {
      acc[empId] = [];
    }
    acc[empId].push(startTime);
    return acc;
  }, {});
  const groupedDurationTimes = scheduleData.shift.reduce((acc, shift) => {
    const empId = shift.emp_id;
    const startTime = shift.shift_start_time;
    const endTime = shift.shift_end_time;
    if (!acc[empId]) {
      acc[empId] = [];
    }
    acc[empId].push(endTime-startTime);
    return acc;
  }, {});

  const data = scheduleData;


const appointments = [
  { employee: 'Lincoln Bartlett', time: '09:00', duration: 2, title: 'Andrew Glover', type: 'Hospital', color: 'bg-primary' },
  { employee: 'Amelia Harper', time: '09:00', duration: 1, title: 'Addison Davis', type: 'Hospital', color: 'bg-danger' },
  { employee: 'Stu Pizaro', time: '09:00', duration: 2, title: 'Follow-up Checkup', type: 'Medical', color: 'bg-warning' },
  { employee: 'Lucy Ball', time: '09:00', duration: 1, title: 'Isabella Carter', type: 'Home', color: 'bg-danger' },
  { employee: 'Lincoln Bartlett', time: '12:00', duration: 2, title: 'Mark Oliver', type: 'Hospital', color: 'bg-success' },
];

  return (
    <div className="container-fluid">
      {/* Tabs */}
      <ul className="nav nav-tabs mt-3">
        <li className="nav-item">
          <a className="nav-link active" href="#">All-Employee Schedule</a>
        </li>
        <li className="nav-item">
          <a className="nav-link" href="#">All-Client Schedule</a>
        </li>
      </ul>

      {/* Header Filters */}
      <div className="card-responsive mt-3 p-3">
        <div className="d-flex flex-wrap gap-3">
          <input type="text" className="form-control" placeholder="Employee" style={{ maxWidth: 200 }} />
          <input type="text" className="form-control" placeholder="Client Group" style={{ maxWidth: 200 }} />
          <input type="text" className="form-control" placeholder="Service Department" style={{ maxWidth: 200 }} />
          <input type="text" className="form-control" placeholder="Saved Filters" style={{ maxWidth: 200 }} />
          <button className="btn btn-outline-secondary">Reset Filters</button>
          <button className="btn btn-primary">Apply</button>
        </div>
      </div>

      {/* Timeline Table */}
      {/* <div className="schedule-container container-fluid mt-3">
        <div className="schedule-grid overflow-auto">
          <div className='header-row'>
            <div className="header-cell employee-label">Employee</div>
            {hours.map((hour) => (
              <div key={hour} className="header-cell text-center">{hour.toString().padStart(2, '0')+":00"}</div>
            ))}
          </div>
            {data.map((d => {
              {d.employee.map((emp,rowidx)=>{
                {d.shift.map((s)=>( s.emp_id === emp.emp_id &&
                  <div key={rowidx} className='row-body'>
                  <div className='cell employee-cell'>{emp.name}</div>
                  {hours.map((hour,colidx)=>{ hour == (s.shift_start_time.split(" ")[4].split(":")[0]) && 
                    <div></div>
                  })}
                )}
              })}
            }))}
        </div>
      </div> */}
      <div className="schedule-container container-fluid mt-3">
        <div className="schedule-grid overflow-auto">
          
          {/* Header Row */}
          <div className="header-row">
            <div className="header-cell employee-label">Employee</div>
            {hours.map((hour) => (
              <div key={hour} className="header-cell text-center">
                {hour.toString().padStart(2, '0') + ":00"}
              </div>
            ))}
          </div>

          {/* Employee Rows */}
          {/* {data.map((d, idx) => ( */}
            {data.employee.map((emp, rowIdx) => (
              <div key={rowIdx} className="row-body align-items-center">
                <div className="cell employee-cell">{emp.name}</div>

                {/* Empty grid background */}
                {hours.map((hour, colIdx) => (
                  <div key={colIdx} className="cell empty-cell"></div>
                ))}

                {/* Shift blocks */}
                {hours.map((hour, colIdx) => {
                {data.shift.map((s) => {
                  if (s.emp_id === emp.emp_id && hour == s.shift_start_time.split(" ")[4].split(":")[0]) {
                    const startHour = s.shift_start_time.split(" ")[4].split(":")[0];
                    const endHour = s.shift_end_time.split(" ")[4].split(":")[0];
                    // const colStart = startHour - hours[0] + 1; 
                    const colSpan = endHour - startHour;
                    const client = data.client.find(cl => cl.client_id === s.client_id);
                    console.log(hour);
                    return (
                      <div
                        key={colIdx}
                        className={`cell appointment bg-primary`}
                        style={{
                          gridColumn: `span ${colSpan}`
                          }}>
                        {startHour}:00 - ${endHour}:00
                        <br />
                        {client && <div>{client.address_line1}</div>}
                      </div>
                    );
                  }
                  else{
                  return null;
                  }
                })}
                })}
              </div>
            ))}
          {/* ))} */}
        </div>
      </div>

      
    </div>
  );
  
}


