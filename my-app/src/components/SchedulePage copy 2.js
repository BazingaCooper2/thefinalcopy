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
  // first_name: "",
  // email: "",
  // emp_id:"", 
  // service_type:"",
  // last_name:"",
  // phone:"",
  // address:"",
  // designation:"",
  // emp_status:"",
  // skills:"",
  // qualifications:"",
  // daily_shift_id:"",
  // task_id:"",
  // employment_duration:"",
  // gender:"", 
  // date_of_birth:"", 
  // image_url:"",
  // qualification_expiry_date : "",
    const handleClose = () => {
        setOpen(false);
        console.log(open);
    };

    const handleOpen = () => {
        setOpen(true);
    };


  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:5000/`); // Replace with your API endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        //console.log(data);
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
  const hours = Array.from({ length: 14 }, (_, i) => 6 + i); // 06 to 19

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
        {/* <li className="nav-item"
        onClick={() => {
            setEmpltrue(true);
            setClttrue(true);
          }}
        >
          <a className={`nav-link ${empltrue ? 'active':''}`} href="#"
          >All Schedule</a>
        </li> */}
        <li className="nav-item"
        onClick={() => {
            if (empltrue) {
              clschedule();
            } else {
              empschedule();
            }
          }}
        >
          <a className={`nav-link ${empltrue ? 'active':''}`} href="#"
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
          <a className={`nav-link ${clttrue ? 'active':''}`} href="#"
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
              <div key={hour} className="header-cell text-center">{hour.toString().padStart(2, '0')+":00"}</div>
            ))}
          </div>
            {scheduleData.employee.map((emp, rowIndex) => (
              <div key={rowIndex} className='row-body'>
                <div className='cell employee-cell'>{emp.name}</div>
                {hours.map((hour, colIndex) => {
                  const appt = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour == s.shift_start_time.split(" ")[4].split(":")[0] ) )))
                  const nogap = scheduleData.shift.find(s => (s.emp_id === emp.emp_id && (
                    (hour >= s.shift_start_time.split(" ")[4].split(":")[0] && hour < s.shift_end_time.split(" ")[4].split(":")[0] ) )))
                  const s_dur = scheduleData.daily_shift.find(d => (d.emp_id === emp.emp_id && (
                    (hour == d.shift_start_time.split(" ")[4].split(":")[0] ) )))
                  const nogap_daily = scheduleData.daily_shift.find(d => (d.emp_id === emp.emp_id && (
                    (hour >= d.shift_start_time.split(" ")[4].split(":")[0] && hour < d.shift_end_time.split(" ")[4].split(":")[0] ) )))
                    //employee tile
                  // if(appt && s_dur && clttrue && empltrue){
                  //   const startHour = parseInt(s_dur.shift_start_time.split(" ")[4].split(":")[0]);
                  //   const endHour = parseInt(s_dur.shift_end_time.split(" ")[4].split(":")[0]);
                  //   const startMinute = s_dur.shift_start_time.split(" ")[4].split(":")[1];
                  //   const endMinute = s_dur.shift_end_time.split(" ")[4].split(":")[1];
                  //   const duration = endHour - startHour;
                  //   const clstartHour = parseInt(appt.shift_start_time.split(" ")[4].split(":")[0]);
                  //   const clendHour = parseInt(appt.shift_end_time.split(" ")[4].split(":")[0]);
                  //   const clstartMinute = appt.shift_start_time.split(" ")[4].split(":")[1];
                  //   const clendMinute = appt.shift_end_time.split(" ")[4].split(":")[1];
                  //   const clduration = clendHour - clstartHour;

                  //   const client = scheduleData.client.find(cl => cl.client_id === appt.client_id);
                    
                  //   return (
                  //     <div>
                  //     <div key={colIndex}
                  //       className={`cell appointment bg-secondary`}
                  //       style={{ gridColumn: `span ${duration}` }}>
                  //         {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                  //         {client && <div>{emp.service_type}</div>}
                  //     </div>
                  //     <div key={colIndex}
                  //       className={`cell appointment bg-primary`}
                  //       style={{ gridColumn: `span ${clduration}` }}>
                  //         {clstartHour}:{clstartMinute} - {clendHour}:{clendMinute}<br />
                  //         {client && <div>{client.address_line1}</div>}
                  //     </div>
                  //     </div>
                  //   );
                  
                  // }
                  
                  if(s_dur && !clttrue && empltrue){
                    const startHour = parseInt(s_dur.shift_start_time.split(" ")[4].split(":")[0]);
                    const endHour = parseInt(s_dur.shift_end_time.split(" ")[4].split(":")[0]);
                    const startMinute = s_dur.shift_start_time.split(" ")[4].split(":")[1];
                    const endMinute = s_dur.shift_end_time.split(" ")[4].split(":")[1];
                    const duration = endHour - startHour;

                    const client = scheduleData.client.find(cl => cl.client_id === appt.client_id);
                    return (
                      <div key={colIndex}
                        className={`cell appointment bg-secondary`}
                        style={{ gridColumn: `span ${duration}` }}
                        onClick={handleOpen}>
                          {startHour}:{startMinute} - {endHour}:{endMinute}<br />
                          {client && <div>{emp.service_type}</div>}
                      </div>
                    );
                  }
                  if(open){
                    return(
                    <Modal isOpen={open} onClose={handleClose}>
                        <div className="container mt-4 border p-4 bg-white rounded shadow-sm">
                      <h5>Edit Visit</h5>
                      <Row>
                          {/* Left Side Form */}
                          <Col md={6}>
                          <Form>
                              <Form.Group controlId="visitId">
                              <Form.Label><strong>Visit ID 102128 Details</strong></Form.Label>
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="client">
                              <Form.Label>Client *</Form.Label>
                              <Form.Control type="text" disabled defaultValue="87 Neeve - Assisted Living" />
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="clientService">
                              <Form.Label>Client Services *</Form.Label>
                              <InputGroup>
                                  <Form.Control type="text" defaultValue="ASW - 87 Neeve" />
                                  <Button variant="info">Chosen</Button>
                              </InputGroup>
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="serviceCode">
                              <Form.Label>Service Code *</Form.Label>
                              <Form.Control type="text" defaultValue="ASW - 87 Neeve" />
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="employee">
                              <Form.Label>Assign to Employee</Form.Label>
                              <InputGroup>
                                  <Form.Control type="text" defaultValue="Hasmin Bag-Ayan" />
                                  <Button variant="secondary">Find Employee</Button>
                              </InputGroup>
                              <small className="text-muted">⚠️ Employees are filtered by department: ALS</small>
                              </Form.Group>

                              <Row>
                              <Col>
                                  <Form.Group className="mb-3" controlId="activityCode">
                                  <Form.Label>Activity Code</Form.Label>
                                  <Form.Control type="text" placeholder="Type to add activity" />
                                  </Form.Group>
                              </Col>
                              <Col>
                                  <Form.Group className="mb-3" controlId="forms">
                                  <Form.Label>Forms</Form.Label>
                                  <Form.Control type="text" placeholder="Type to add forms" />
                                  </Form.Group>
                              </Col>
                              </Row>

                              <Form.Group className="mb-3" controlId="skills">
                              <Form.Label>Skills</Form.Label>
                              <Form.Control type="text" placeholder="Type to add skills" />
                              </Form.Group>

                              <Form.Group className="mb-3" controlId="instructions">
                              <Form.Label>Service Instructions</Form.Label>
                              <Form.Control as="textarea" rows={2} />
                              </Form.Group>

                              <Form.Group controlId="tags">
                              <Form.Label>Tags</Form.Label>
                              <Button variant="outline-secondary" size="sm">+</Button>
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
                                  <Form.Control type="datetime-local" defaultValue="2025-07-03T08:00" />
                              </Col>
                              <Col>
                                  <Form.Label>End Time *</Form.Label>
                                  <Form.Control type="datetime-local" defaultValue="2025-07-03T12:00" />
                              </Col>
                              </Row>
                          </Form.Group>

                          <Form.Group className="mb-3" controlId="serviceDuration">
                              <Form.Check type="checkbox" label="Use Service Duration (480 min)" />
                          </Form.Group>

                          <Form.Group className="mb-3" controlId="breakTime">
                              <Form.Label>Break (in Minutes)</Form.Label>
                              <Form.Control type="number" defaultValue="0" />
                          </Form.Group>

                          <Form.Group className="mb-3" controlId="iadls">
                              <Form.Label>IADLs</Form.Label>
                              <div className="border p-2 rounded bg-light">
                              There are no matching IADLs for the selected period.
                              <Button variant="outline-dark" size="sm" className="float-end">Edit for visit</Button>
                              </div>
                          </Form.Group>
                          </Col>
                      </Row>

                      <div className="text-end mt-3">
                          <Button variant="primary">Update Visit</Button>
                      </div>
                      </div>
                    </Modal>
                    );
                  }
                  if(!s_dur && !nogap_daily && !clttrue && empltrue){
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  //Client tile
                  if (appt && !empltrue && clttrue){
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
                  if(!appt && !nogap && !empltrue && clttrue){
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  if((!s_dur && !appt && !nogap_daily && !nogap && empltrue && clttrue)){
                    return (<div key={colIndex} className="cell empty-cell"></div>);
                  }
                  else{
                    return null;
                  }
                  })}
                </div>
              ))}
        </div>
      </div>
      
    </div>
  );
  
}


