import React, { use, useEffect, useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import "./SchedulePage.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import './styledashboard.css';
import Modal from './editModal.js';
import { Form, Button, Row, Col, InputGroup } from 'react-bootstrap';

/**
 * SchedulePage
 * - Calls the API (expects JSON with client, employee, shift, daily_shift arrays)
 * - Builds per-employee data for a selected date
 * - Renders: Header (hours) + for each employee: 2 rows (shifts, appointments)
 * - Timeline resolution: minutes (1 grid column = 1 minute)
 */

const toMinutesOfDay = (timeStr) => {
  // timeStr expected like "YYYY-MM-DD HH:MM:SS" or "HH:MM:SS"
  const timePart = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const [hh, mm] = timePart.split(":").map((n) => parseInt(n, 10));
  return hh * 60 + mm;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function SchedulePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [empltrue, setEmpltrue] = useState(true);
  const [clttrue, setClttrue] = useState(false);
  const [open, setOpen] = useState(false);
  const [clid, setClient] = useState(0);
  const [sid, setShift] = useState(0);
  const [empid, setEmp] = useState(0);
  const [empl, setEmpl] = useState(null);
  const [shift_ptr_start, setShiftptrstart] = useState(null);
  const [shift_ptr_end, setShiftptrend] = useState(null);
  const [message, setMessage] = useState("");
  const [unassignedPresent, setPresent] = useState(false);
  const [formData, setFormData] = useState({
    shift_id: "",
    client_id: "",
    emp_id: "",
    shift_start_time: "",
    shift_end_time: "",
    shift_status: "",
    Shift_Date: "",
    Task_ID: "",
    Skills: "",
    Service_Instructions: "",
    Tags: "",
    Use_Service_Duration: "",
    Forms: "",
  });

  const [collapsed, setCollapsed] = useState({"Outreach":false,"Willow Place":false,
    "87 Neeve":false, "85 Neeve":false});

  const toggleCollapse = (type) => {
    setCollapsed((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };


  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString("en-CA"));

  // Optional: Update time every minute
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentDate(new Date());
  //   }, 60000);
  //   return () => clearInterval(interval);
  // }, []);

  const handleClose = () => {
    if (open) {
      setOpen(false);
      setClient(0);
    }
  };

  const handleOpen = (c, eid, empl, shift_ptr) => {
    // console.log(!open);
    if (!open) {
      setOpen(true);
      // console.log(open);
      if (c !== 0) {
        setClient(c);
      }
      if (eid !== 0) {
        setEmp(eid);
      }
      if (empl) {
        setEmpl(empl);
      }
      if (shift_ptr.shift_id){
        setShift(shift_ptr.shift_id);
      }
      if (shift_ptr.shift_start_time) {
        const [day, month, rest] = shift_ptr.shift_start_time.split("-");
        const [year, time] = rest.split(" "); 
        var start_time= `${year}-${month}-${day}T${time}`;
        setShiftptrstart(start_time);
        //console.log(shift_ptr_start);
      }
      if (shift_ptr.shift_end_time) {
        const [day, month, rest] = shift_ptr.shift_end_time.split("-");
        const [year, time] = rest.split(" "); 
        var end_time= `${year}-${month}-${day}T${time}`;
        setShiftptrend(end_time);
      }
    }
  };

  const handleChange = (e) => {
    if (e) {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    if (clid !== 0) {
      formData.client_id = clid;
    }
    if (empid !== 0) {
      formData.emp_id = empid;
    }
    if (sid !== 0) {
      formData.shift_id = sid;
    }
    // console.log(JSON.stringify(formData));
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
      // console.log("API response:", data);
      handleClose();
      //fetchSchedule();
    } catch (err) {
      // console.error(err);
      setMessage("Error submitting form");
    }
  };
  const clschedule = () => {
    setEmpltrue(false);
    setClttrue(true);
  };

  const empschedule = () => {
    setEmpltrue(true);
    setClttrue(false);
  };


  // fixed timeline range — change if needed
  const startHour = 6;
  const endHour = 23;
  const totalMinutes = (endHour - startHour) * 60; // e.g. 6->22 = 16*60 = 960

  useEffect(() => {
    fetch("http://127.0.0.1:5000/scheduled") // adjust endpoint as needed
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        // choose a default date: try to pick first daily_shift date if present
        const ds = json?.daily_shift;
        // console.log(currentDate);
        if (ds && ds.length) setCurrentDate(new Date().toLocaleDateString("en-GB").replace(/\//g, "-"));
        else setCurrentDate(new Date().toISOString().slice(0, 10));
        const hasUnassigned = (json?.shift).some(
          (s) => s.shift_status === "Unassigned"
        );
        setPresent(hasUnassigned);
      })
      .catch((err) => console.error(err));
      
  }, []);

  if (!data || !currentDate) return <div>Loading schedule...</div>;

  // map clients by id for quick lookup
  const clientsMap = (data.client || []).reduce((m, c) => {
    m[c.client_id] = c;
    return m;
  }, {});

  // Build per-employee grouped data for the currentDate
  // Build per-employee grouped data for the currentDate
const employees = (data.employee || [])
  // only employees who are available and have daily_shift on that date
  .filter((emp) => {
    const hasDailyShift = (data.daily_shift || []).some(
      (ds) => ds.emp_id === emp.emp_id && ds.shift_date === currentDate
    );
    return emp.status === "Available" && hasDailyShift;
  })
  .map((emp) => {
    const shifts = (data.daily_shift || []).filter(
      (ds) => ds.emp_id === emp.emp_id && ds.shift_date === currentDate
    );

    const appointments = (data.shift || [])
      .filter(
        (s) => s.emp_id === emp.emp_id && s.date === currentDate
      )
      .map((s) => ({
        ...s,
        client: clientsMap[s.client_id] || null,
      }));

    return {
      ...emp,
      shifts,
      appointments,
    };
  });


  // Helper: given sorted items, create segments (gap / item) to render efficiently
  const buildSegments = (items) => {
    // items expected to have shift_start_time, shift_end_time
    const segs = [];
    if (!items || items.length === 0) {
      segs.push({ type: "empty", span: totalMinutes });
      return segs;
    }

    // sort by start minute
    const sorted = items
      .map((it) => {
        const start = toMinutesOfDay(it.shift_start_time);
        const end = toMinutesOfDay(it.shift_end_time);
        return { ...it, _startMin: start, _endMin: end };
      })
      .sort((a, b) => a._startMin - b._startMin);

    let cursor = startHour * 60; // absolute minutes in day
    for (let i = 0; i < sorted.length; i++) {
      const it = sorted[i];
      // compute indexes relative to startHour
      const relStart = clamp(it._startMin - startHour * 60, 0, totalMinutes);
      const relEnd = clamp(it._endMin - startHour * 60, 0, totalMinutes);

      // empty gap before this item
      const gap = relStart - (cursor - startHour * 60);
      if (gap > 0) {
        segs.push({ type: "empty", span: gap });
      }

      // item span (ensure positive)
      const span = relEnd - relStart;
      if (span > 0) {
        segs.push({ type: "item", span, item: it });
      }

      // move cursor
      cursor = it._endMin;
    }

    // trailing gap
    const consumed = segs.reduce((s, seg) => s + seg.span, 0);
    const remain = totalMinutes - consumed;
    if (remain > 0) segs.push({ type: "empty", span: remain });

    return segs;
  };

  const renderSegments = (segments, kind) =>
    segments.map((seg, idx) => {
      if (seg.type === "empty") {
        return (
          <div
            key={`empty-${kind}-${idx}`}
            className="empty-cell"
            style={{ gridColumn: `span ${seg.span}` }}
          />
        );
      } else {
        const it = seg.item;
        const startMin = toMinutesOfDay(it.shift_start_time);
        const endMin = toMinutesOfDay(it.shift_end_time);

        const startH = Math.floor(startMin / 60);
        const startM = startMin % 60;
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
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
                        <Form.Label><strong>Visit ID: {sid} - Details</strong></Form.Label>
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
                          <Form.Control type="text" defaultValue={it.name} name='first_name' onChange={handleChange} />
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
                          <Form.Control type="text" defaultValue={shift_ptr_start} name='shift_start_time' onChange={handleChange} />
                        </Col>
                        <Col>
                          <Form.Label>End Time *</Form.Label>
                          <Form.Control type="text" defaultValue={shift_ptr_end} name='shift_end_time' onChange={handleChange} />
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
        if (seg.span < 60) {
          return (
            <OverlayTrigger
              key={idx}
              placement="top"
              overlay={
                <Tooltip id={`tooltip-${it.shift_id}`}>
                  {it.client?.name} <br />
                  {it.client?.address_line1} <br />
                  {`${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`}
                </Tooltip>
              }
            >
              <div
                key={`${kind}-${it.shift_id || it.emp_id}-${idx}`}
                className={kind === "shift" ? "employee-shift shift-cell" : "client-shift shift-cell"}
                style={{ gridColumn: `span ${seg.span}`, cursor: "pointer" }} // very small visual
                onClick={() => handleOpen(it.client_id,it.emp_id,it,it)}
              >
                <div className="shift-time"><i class={seg.span > 30 ? "bi bi-chat-left-text" : "d-none"} style={{ fontSize: `10px` }}></i> </div>
                <div className="shift-desc"><i class={seg.span > 30 ? "bi bi-info-circle-fill" : "d-none"} style={{ fontSize: `10px` }}></i> </div>
                <div className="shift-desc" style={{height:"30px", width:`${seg.span/2}`}}></div>
              </div>
            </OverlayTrigger>
          );
        }
        return (
          <div
            key={`${kind}-${it.shift_id || it.emp_id}-${idx}`}
            className={(kind === "shift") ? "employee-shift shift-cell" : "client-shift shift-cell"}
            style={{ gridColumn: `span ${seg.span}`, cursor: "pointer" }}
            title={`${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`}
            onClick={() => handleOpen(it.client_id,it.emp_id,it,it)}
          >
            <div className="shift-time">
              {`${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`}
            </div>
            <div className="shift-desc">
              {kind === "shift"
                ? `Shift (${it.shift_type || ""})`
                : `${it.client?.name || "Client"}${it.client?.address_line1 ? `\n${it.client.address_line1}` : ""}`}
            </div>
          </div>
        );
      }
    });

  // header hours segments (each spans 60 minutes)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <div className="container-fluid ms-sm-5">

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
      <div className="schedule-wrapper container-fluid">
                {/* ===== Unassigned Shifts Timeline ===== */}
        
        {/* UNASSIGNED CLIENT SHIFTS SECTION */}
        <div className="unassigned-wrapper container-fluid mt-4 mb-4">
          <div className="border-0 shadow-sm">
            <div className="bg-danger p-3 text-white fw-bold">
              Unassigned Client Shifts
            </div>

            <div className={unassignedPresent?"p-0 unassigned-scroll-x":"d-none"}>
              
              <div className="header-row bg-light border-bottom">
                <div className="header-employee">Service Type / Client</div>
                <div className="header-timeline">
                  <div className="hours-grid">
                    {hours.map((h) => (
                      <div
                        key={`unassigned-hour-${h}`}
                        className="header-hour"
                        style={{ gridColumn: `span 60`}}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              
              <div className="body-rows">
                {Object.entries(
                  (data.client || []).reduce((groups, client) => {
                    const unassigned = (data.shift || []).filter(
                      (s) => s.client_id === client.client_id && s.shift_status === "Unassigned"
                    );
                    if (unassigned.length > 0) {
                      const type = client.service_type || "Uncategorized";
                      if (!groups[type]) groups[type] = [];
                      groups[type].push({ client, unassigned });
                    }
                    return groups;
                  }, {})
                ).map(([serviceType, clients]) => {
                  
                  return (
                    <div key={serviceType} className="aacord mb-2">
                      
                      <div
                        className="bg-light border py-2 px-3 d-flex justify-content-between align-items-center cursor-pointer"
                        onClick={() => toggleCollapse(serviceType)}
                        style={{ cursor: "pointer", width:"1220px"}}
                      >
                        <span className="fw-bold text-dark">{serviceType}</span>
                        <i
                          className={`bi ${collapsed[serviceType] ? "bi-chevron-down" : "bi-chevron-up"}`}
                        ></i>
                      </div>

                      
                      {!collapsed[serviceType] && (
                        <div className="client-rows">
                          {clients.map(({ client, unassigned }) => {
                            const segments = buildSegments(unassigned);
                            return (
                              <div
                                className="schedule-row border-bottom"
                                key={`unassigned-${client.client_id}`}
                              >
                                
                                <div className="employee-cell bg-white">
                                  <span className="fw-bold d-block">{client.name}</span>
                                </div>

                                
                                <div className="timeline-row bg-light">
                                  {segments.map((seg, idx) => {
                                    if (seg.type === "empty") {
                                      return (
                                        <div
                                          key={`empty-${client.client_id}-${idx}`}
                                          className="empty-cell"
                                          style={{ gridColumn: `span ${seg.span}` }}
                                        />
                                      );
                                    } else {
                                      const it = seg.item;
                                      const startMin = toMinutesOfDay(it.shift_start_time);
                                      const endMin = toMinutesOfDay(it.shift_end_time);
                                      const startH = Math.floor(startMin / 60);
                                      const startM = startMin % 60;
                                      const endH = Math.floor(endMin / 60);
                                      const endM = endMin % 60;

                                      return (
                                        <OverlayTrigger
                                          key={`unassigned-${client.client_id}-${idx}`}
                                          placement="top"
                                          overlay={
                                            <Tooltip id={`tooltip-${it.shift_id}`}>
                                              {`${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`}
                                            </Tooltip>
                                          }
                                        >
                                          <div
                                            className="shift-cell bg-warning text-dark fw-semibold rounded"
                                            style={{
                                              gridColumn: `span ${seg.span}`,
                                              border: "1px solid #d39e00",
                                              cursor: "pointer"
                                            }}
                                            onClick={() => handleOpen(it.client_id, 0, client, it)}
                                          >
                                            <span className="small">
                                              {`${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`}
                                            </span>
                                          </div>
                                        </OverlayTrigger>
                                      );
                                    }
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={!unassignedPresent?"p-2 unassigned-scroll-x text-centre d-flex":"d-none"}> No Unassigned Shifts </div>
          </div>
        </div>



        <div className="schedule-table overflow-auto">

          {/* Header */}
          <div className="header-row">
            <div className="header-employee">Employee</div>
            <div className="header-timeline">
              {/* timeline grid same column-base (totalMinutes) */}
              <div className="hours-grid">
                {hours.map((h) => (
                  <div key={h} className="header-hour" style={{ gridColumn: `span 60` }}>
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Employee rows */}
          <div className="body-rows">
            {employees.map((emp) => {
              const shiftSegments = buildSegments(emp.shifts || []);
              const apptSegments = buildSegments(emp.appointments || []);

              return (
                <React.Fragment key={emp.emp_id} >
                  {/* Row 1: employee daily-shift (gray) */}
                  <div className="schedule-row">
                    <div className="employee-cell">{emp.first_name || emp.name || `Emp ${emp.emp_id}`}</div>
                    <div className={empltrue ? "timeline-row" : "d-none"}>{renderSegments(shiftSegments, "shift")}</div>
                    <div className={clttrue ? "timeline-row" : "d-none"}>{renderSegments(apptSegments, "appt")}</div>
                  </div>

                  {/* Row 2: client appointments (blue) */}
                  <div className={(empltrue) ? "schedule-row" : "d-none"}>
                    <div className="employee-cell" />{/* empty left cell for alignment */}
                    <div className="timeline-row">{renderSegments(apptSegments, "appt")}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
