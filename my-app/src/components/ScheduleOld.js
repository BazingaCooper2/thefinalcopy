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
      <div className="schedule-container container-fluid mt-3">
        <div className="schedule-grid overflow-auto">
          <div className='header-row'>
            <div className="header-cell employee-label">Employee</div>
            {hours.map((hour) => (
              <div key={hour} className="header-cell text-center">{hour.toString().padStart(2, '0')+":00"}</div>
            ))}
          </div>
            {scheduleData.employee.map((emp, rowIndex) => (
              <div key={rowIndex} className='row-body'>
                <div className='cell employee-cell'>{emp.name}</div>
                {hours.map((hour, colIndex) => {
                  const clientShift = groupedStartTimes[emp.emp_id].sort();
                  const appt = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour == s.shift_start_time.split(" ")[4].split(":")[0] ) )))
                    const s_dur = scheduleData.daily_shift.find(d => (d.emp_id === emp.emp_id && (
                    (hour == d.shift_start_time.split(" ")[4].split(":")[0] ) )))
                      //employee tile
                      // if(s_dur){
                      //   const startHour = parseInt(s_dur.shift_start_time.split(" ")[4].split(":")[0]);
                      //   const endHour = parseInt(s_dur.shift_end_time.split(" ")[4].split(":")[0]);
                      //   const startMinute = s_dur.shift_start_time.split(" ")[4].split(":")[1];
                      //   const endMinute = s_dur.shift_end_time.split(" ")[4].split(":")[1];
                      //   const duration = endHour - startHour;

                      //   const client = scheduleData.client.find(cl => cl.client_id === appt.client_id);
                      //   return (
                      //     <div key={colIndex}
                      //       className={`cell appointment bg-primary`}
                      //       style={{ gridColumn: `span ${duration}` }}>
                      //         {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                      //         {client && <div>{client.address_line1}</div>}
                      //         {/* <div>{groupedStartTimes[emp.emp_id].sort()}</div> */}
                      //     </div>
                      //   );
                      // }
                      // if(!s_dur){
                      //   return (<div key={colIndex} className="cell empty-cell"></div>);
                      // }
                      //Client tile
                      if (appt){
                        const startHour = parseInt(appt.shift_start_time.split(" ")[4].split(":")[0]);
                        const endHour = parseInt(appt.shift_end_time.split(" ")[4].split(":")[0]);
                        const startMinute = appt.shift_start_time.split(" ")[4].split(":")[1];
                        const endMinute = appt.shift_end_time.split(" ")[4].split(":")[1];
                        const duration = endHour - startHour;

                        const client = scheduleData.client.find(cl => cl.client_id === appt.client_id);
                        return (
                          <div key={colIndex}
                            className={`cell appointment bg-primary`}
                            style={{ gridColumn: `span ${duration}` }}>
                              {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                              {client && <div>{client.address_line1}</div>}
                              {/* <div>{groupedStartTimes[emp.emp_id].sort()}</div> */}
                          </div>
                        );
                      }
                      if(!appt){
                        return (<div key={colIndex} className="cell empty-cell"></div>);
                      }
                })}
                </div>
              ))}
        </div>
      </div>
      {/*scheduleData.client.map(emp => <div>{emp.name}</div> )*/}
      {/*<div className="schedule-container container-fluid">
      <div className="schedule-grid">
        
        <div className="header-row">
          <div className="header-cell employee-label">Employees</div>
          {timeSlots.map((time, idx) => (
            <div key={idx} className="header-cell">{time}</div>
          ))}
        </div>

        
        {scheduleData.employee.map((employee, rowIdx) => (
          <div key={rowIdx} className="row-body">
            <div className="cell employee-cell">{employee.name}</div>
            {timeSlots.map((time, colIdx) => {
              const appt = scheduleData.shift.find(a => a.emp_id === employee.emp_id && (a.shift_start_time.split(" ")[4].split(":")[0]-1)+":00" === time);
              if (appt) {
                return (
                  <div
                    key={colIdx}
                    className={`cell appointment bg-primary`}
                    style={{ gridColumn: `span ${3}` }}
                  >
                    
                    <small>({appt.shift_status})</small>
                  </div>
                );
              }
              return <div key={colIdx} className="cell empty-cell"></div>;
            })}
          </div>
        ))}
      </div>
    </div>*/}
    </div>
  );
  /*const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace with your actual API URL
    axios.get('https://your-backend-api.com/api/schedules')
      .then(res => {
        setSchedules(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch schedules:', err);
        setLoading(false);
      });
  }, []);*/

  /*return (
    <div>Hello</div>
    <div>
      <h2 className="text-2xl font-bold mb-4">Employee Schedule</h2>
      {loading ? (
        <p>Loading...</p>
      ) : schedules.length === 0 ? (
        <p>No schedule data available.</p>
      ) : (
        <table className="w-full table-auto border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2">{item.employee_name}</td>
                <td className="px-4 py-2">{item.date}</td>
                <td className="px-4 py-2">{item.time}</td>
                <td className="px-4 py-2">{item.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );*/
}


