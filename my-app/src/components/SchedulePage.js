import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styledashboard.css';
import Modal from './editModal.js';
import { Form, Button, Row, Col, InputGroup } from 'react-bootstrap';


export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [empltrue, setEmpltrue] = useState(true);
  const [clttrue, setClttrue] = useState(false);
  const [open, setOpen] = useState(false);
  const [clid, setClient] = useState(0);
  const [empid, setEmp] = useState(0);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    shift_id:"",
    client_id:"",
    emp_id:"",
    shift_start_time:"",
    shift_end_time:"",
    shift_status:"",
    Shift_Date:"",
    Task_ID:"",
    Skills:"",
    Service_Instructions:"",
    Tags:"",
    Use_Service_Duration:"",
    Forms:"",
  });
  
  const [currentDate, setCurrentDate] = useState(new Date("07-23-2025"));

  // Optional: Update time every minute
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentDate(new Date());
  //   }, 60000);
  //   return () => clearInterval(interval);
  // }, []);

  const handleClose = () => {
    if(open){
      setOpen(false);
      setClient(0); 
    }
  };

  const handleOpen = (c,eid) => {
    if(!open){
      setOpen(true);
      if(c!==0){
        setClient(c);
      }
      if(eid!==0){
        setEmp(eid);
      }
    }
  };

  const handleChange = (e) => {
    if(e){
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    if(clid !== 0){
      formData.client_id=clid;
    }
    if(empid !== 0){
      formData.emp_id=empid;
    }
    console.log(JSON.stringify(formData));
    e.preventDefault(); // Prevent page refresh

    try {
      const res = await fetch("http://127.0.0.1:5000/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      setMessage("Form submitted successfully");
      console.log("API response:", data);
      handleClose();
      fetchSchedule();
    } catch (err) {
      console.error(err);
      setMessage("Error submitting form");
    }
  };
  const fetchSchedule = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/scheduled"); // Replace with your API endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setScheduleData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []); // Empty dependency array ensures this runs once on mount

  if (loading) return <div>Loading schedule...</div>;
  if (error) return <div>Error: {error.message}</div>;
  const hours = Array.from({ length: 17 }, (_, i) => 6 + i); // 06 to 19

  const clschedule = () => {
    setEmpltrue(false);
    setClttrue(true);
  };

  const empschedule = () => {
    setEmpltrue(true);
    setClttrue(false);
  };

  return (
    <div className="container-fluid">
      {/* Tabs */}
      <ul className="nav nav-tabs mt-3">
        <li className="nav-item"
          onClick={() => {
            if (empltrue) {
              clschedule();
            } else {
              empschedule();
            }
          }}
        >
          <a className={`nav-link ${empltrue ? 'active' : ''}`} href="#"
          >All-Employee Schedule</a>
        </li>
        <li className="nav-item"
          onClick={() => {
            if (clttrue) {
              empschedule();
            } else {
              clschedule();
            }
          }}
        >
          <a className={`nav-link ${clttrue ? 'active' : ''}`} href="#"
          >All-Client Schedule</a>
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
              <div key={hour} className="header-cell text-center">{hour.toString().padStart(2, '0') + ":00"}</div>
            ))}
          </div>
          {scheduleData.employee.map((emp, rowIndex) => (
            <div className={emp.status === "Available" ? "row-body" : "d-none"}>
              <div className='cell employee-cell'>{emp.first_name}</div>
              <div key={rowIndex} className="row-body">
                {hours.map((hour, colIndex) => {
                  const dtime = currentDate;
                  const emp_shift = scheduleData.shift.find(s => (s.emp_id === emp.emp_id));
                  const appt = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour == s.shift_start_time.split(" ")[1].split(":")[0]) &&
                  (new Date(s.shift_start_time)).toDateString()==dtime.toDateString())))
                  const nogap = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour >= s.shift_start_time.split(" ")[1].split(":")[0] && hour < s.shift_end_time.split(" ")[1].split(":")[0]))))
                  const s_dur = scheduleData.daily_shift.find(d => (d.emp_id === emp.emp_id && (
                    (hour == d.shift_start_time.split(" ")[1].split(":")[0]) && 
                  (new Date(d.shift_start_time)).toDateString()==dtime.toDateString())))
                  const nogap_daily = scheduleData.daily_shift.find(d => (d.emp_id === emp.emp_id && (
                    (hour >= d.shift_start_time.split(" ")[1].split(":")[0] && hour < d.shift_end_time.split(" ")[1].split(":")[0]))))
                  
                    if (open) {
                    return (
                      <Modal isOpen={open} onClose={handleClose}>
                        <div className="container mt-4 border p-4 bg-white rounded shadow-sm">
                          <h5>Edit Visit</h5>
                          <Row>
                            {/* Left Side Form */}
                            <Col md={6}>
                              <Form onSubmit={handleSubmit}>
                                <Form.Group controlId="visitId">
                                  <Form.Label><strong>Visit ID {emp_shift.shift_id} Details</strong></Form.Label>
                                </Form.Group>
                                
                                <Form.Group className="mb-3" controlId="client">
                                  <Form.Label>Client *</Form.Label>
                                  <Form.Control type="text" disabled defaultValue={clid} name='client_id' onChange={handleChange} />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="clientService">
                                  <Form.Label>Client Services *</Form.Label>
                                  <InputGroup>
                                    <Form.Control type="text" defaultValue="" name='service_type' onChange={handleChange} />
                                    <Button variant="info">Chosen</Button>
                                  </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="serviceCode">
                                  <Form.Label>Service Code *</Form.Label>
                                  <Form.Control type="text" defaultValue="ASW - 87 Neeve" name='service_code' onChange={handleChange} />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="employee">
                                  <Form.Label>Assign to Employee</Form.Label>
                                  <InputGroup>
                                    <Form.Control type="text" defaultValue={emp.first_name} name='first_name' onChange={handleChange} />
                                    <Button variant="secondary">Find Employee</Button>
                                  </InputGroup>
                                  <small className="text-muted">⚠️ Employees are filtered by department: ALS</small>
                                </Form.Group>

                                <Row>
                                  <Col>
                                    <Form.Group className="mb-3" controlId="activityCode">
                                      <Form.Label>Activity Code</Form.Label>
                                      <Form.Control type="text" placeholder="Type to add activity" name='Task_ID' onChange={handleChange} />
                                    </Form.Group>
                                  </Col>
                                  <Col>
                                    <Form.Group className="mb-3" controlId="forms">
                                      <Form.Label>Forms</Form.Label>
                                      <Form.Control type="text" placeholder="Type to add forms" name='Forms' onChange={handleChange} />
                                    </Form.Group>
                                  </Col>
                                </Row>

                                <Form.Group className="mb-3" controlId="skills">
                                  <Form.Label>Skills</Form.Label>
                                  <Form.Control type="text" placeholder="Type to add skills" name='Skills' onChange={handleChange} />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="instructions">
                                  <Form.Label>Service Instructions</Form.Label>
                                  <Form.Control as="textarea" rows={2} name='Service_Instructions' onChange={handleChange} />
                                </Form.Group>

                                <Form.Group controlId="tags">
                                  <Form.Label>Tags</Form.Label>
                                  <Button variant="outline-secondary" name='Tags' size="sm"> + </Button>
                                </Form.Group>
                              </Form>
                            </Col>

                            {/* Right Side Scheduling */}
                            <Col md={6}>
                              <Form.Group className="mb-3" controlId="scheduling">
                                <Form.Label><strong>Scheduling</strong></Form.Label>
                                <Row>
                                  <Col>
                                    <Form.Label>Start Time *</Form.Label>
                                    <Form.Control type="datetime-local" defaultValue="2025-07-03T08:00" name='shift_start_time' onChange={handleChange} />
                                  </Col>
                                  <Col>
                                    <Form.Label>End Time *</Form.Label>
                                    <Form.Control type="datetime-local" defaultValue="2025-07-03T12:00" name='shift_end_time' onChange={handleChange} />
                                  </Col>
                                </Row>
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="serviceDuration">
                                <Form.Check type="checkbox" label="Use Service Duration (480 min)" name='Use_Service_Duration' onChange={handleChange} />
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="breakTime">
                                <Form.Label>Break (in Minutes)</Form.Label>
                                <Form.Control type="number" defaultValue="0" name='Break' onChange={handleChange} />
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="iadls">
                                <Form.Label>IADLs</Form.Label>
                                <div className="border p-2 rounded bg-light">
                                  There are no matching IADLs for the selected period.
                                  <Button variant="outline-dark" size="sm" className="float-end" onChange={handleChange}>Edit for visit</Button>
                                </div>
                              </Form.Group>
                            </Col>
                          </Row>

                          <div className="text-end mt-3">
                            <Button type="submit" variant="primary" onClick={handleSubmit}>Update Visit</Button>
                          </div>
                        </div>
                      </Modal>
                    );
                  }
                  //employee tile
                  if (s_dur && !clttrue && empltrue) {
                    const startHour = parseInt(s_dur.shift_start_time.split(" ")[1].split(":")[0]);
                    const endHour = parseInt(s_dur.shift_end_time.split(" ")[1].split(":")[0]);
                    const startMinute = s_dur.shift_start_time.split(" ")[1].split(":")[1];
                    const endMinute = s_dur.shift_end_time.split(" ")[1].split(":")[1];
                    const duration = endHour - startHour;

                    const client = scheduleData.client.find(cl => cl.client_id === s_dur.client_id);
                    return (
                      <div key={colIndex}
                        className={`cell appointment bg-secondary`}
                        style={{ gridColumn: `span ${duration}` }}
                        onClick={() => handleOpen(client.client_id,emp.emp_id)}>
                        {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                        {client && <div>{emp.service_type}</div>}
                      </div>
                    );
                  }
                  else if (!s_dur && !nogap_daily && !clttrue && empltrue) {
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  //Client tile
                  else if (appt && !empltrue && clttrue) {
                    const startHour = parseInt(appt.shift_start_time.split(" ")[1].split(":")[0]);
                    const endHour = parseInt(appt.shift_end_time.split(" ")[1].split(":")[0]);
                    const startMinute = appt.shift_start_time.split(" ")[1].split(":")[1];
                    const endMinute = appt.shift_end_time.split(" ")[1].split(":")[1];
                    const duration = endHour - startHour;

                    const client = scheduleData.client.find(cl => cl.client_id === appt.client_id);
                    return (
                      <div key={colIndex}
                        className={`cell appointment bg-primary`}
                        style={{ gridColumn: `span ${duration}` }}
                        onClick={() => handleOpen(client.client_id, emp.emp_id)}>
                        {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                        {client && <div>{client.address_line1}</div>}
                      </div>
                    );
                  }
                  else if (!appt && !nogap && !empltrue && clttrue) {
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  else if (!appt && nogap && !empltrue && clttrue) {
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  else {
                    return null;
                  }
                })}
              </div>
              <div key={rowIndex} className={(empltrue && !clttrue) ? `row-body` : `d-none`}>
                <div className='cell employee-cell'></div>
                {hours.map((hour, colIndex) => {
                  const dtime = currentDate;
                  const appt = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour == s.shift_start_time.split(" ")[1].split(":")[0]) && 
                  (new Date(s.shift_start_time)).toDateString()==dtime.toDateString())))
                  const nogap = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour >= s.shift_start_time.split(" ")[1].split(":")[0] && 
                    hour < s.shift_end_time.split(" ")[1].split(":")[0]))))
                  //Client tile
                  if (appt && empltrue && !clttrue) {
                    const startHour = parseInt(appt.shift_start_time.split(" ")[1].split(":")[0]);
                    const endHour = parseInt(appt.shift_end_time.split(" ")[1].split(":")[0]);
                    const startMinute = appt.shift_start_time.split(" ")[1].split(":")[1];
                    const endMinute = appt.shift_end_time.split(" ")[1].split(":")[1];
                    const duration = endHour - startHour;

                    const client = scheduleData.client.find(cl => cl.client_id === appt.client_id);
                    return (
                      <div key={colIndex}
                        className={`cell appointment bg-primary`}
                        style={{ gridColumn: `span ${duration}` }}
                        onClick={() => handleOpen(client.client_id,emp.emp_id)}>
                        {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                        {client && <div>{client.address_line1}</div>}
                      </div>
                    );
                  }
                  else if (!appt && !nogap && empltrue && !clttrue) 
                  {
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  else {
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );

}


