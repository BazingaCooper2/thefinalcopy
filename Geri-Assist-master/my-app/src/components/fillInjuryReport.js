import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import SignatureCanvas from 'react-signature-canvas';

const UnifiedReportForm = () => {
  const [reportType, setReportType] = useState("hazard"); // hazard, incident, injury
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (formData) => {
    setLoading(true);
    setSuccess("");
    try {
      // In a real app, this might go to different endpoints or have a 'type' field
      const payload = { ...formData, report_type: reportType };

      const response = await fetch("http://127.0.0.1:5000/send_injury_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(`✅ ${reportType === 'injury' ? 'Injury' : reportType === 'incident' ? 'Incident' : 'Hazard'} report submitted successfully!`);
        // Reset logic could go here, but complex forms might want to stay filled or redirect
      } else {
        setSuccess("❌ Failed to send report. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setSuccess("⚠️ Error while sending the report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4 mb-5 animate-fadeIn">
      <div className="card border-0 shadow-lg overflow-hidden">
        <div className="card-header bg-dark text-white p-4">
          <h2 className="mb-0 fw-bold"><i className="bi bi-file-earmark-text me-3"></i>Unified Reporting Portal</h2>
          <p className="mb-0 opacity-75 mt-2">Select the type of report you need to file below.</p>
        </div>

        <div className="card-body p-4">
          {/* Report Selector */}
          <div className="mb-5">
            <label className="form-label fw-bold">Select Report Type</label>
            <select
              className="form-select form-select-lg border-2"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setSuccess("");
              }}
            >
              <option value="hazard">Hazard / Near Miss Report</option>
              <option value="hazard-followup">Hazard Report Follow-up (Supervisor/Manager/JHSC)</option>
              <option value="incident">Incident Report</option>
              <option value="incident-followup">Incident Report Follow-up (Supervisor/Manager)</option>
              <option value="injury">Employee Occupational Illness/Injury Report</option>
              <option value="injury-followup">Injury Report Follow-up (Supervisor/Manager)</option>
            </select>
          </div>

          {/* Form Rendering */}
          <hr className="my-4" />

          {success && <div className="alert alert-success d-flex align-items-center mb-4"><i className="bi bi-check-circle-fill me-2 fs-4"></i>{success}</div>}

          {reportType === "hazard" && <HazardForm onSubmit={handleSubmit} loading={loading} />}
          {reportType === "hazard-followup" && <HazardFollowupForm onSubmit={handleSubmit} loading={loading} />}
          {reportType === "incident" && <IncidentForm onSubmit={handleSubmit} loading={loading} />}
          {reportType === "incident-followup" && <IncidentFollowupForm onSubmit={handleSubmit} loading={loading} />}
          {reportType === "injury" && <InjuryForm onSubmit={handleSubmit} loading={loading} />}
          {reportType === "injury-followup" && <InjuryFollowupForm onSubmit={handleSubmit} loading={loading} />}
        </div>
      </div>
    </div>
  );
};

// --- 1. HAZARD / NEAR MISS REPORT ---
const HazardForm = ({ onSubmit, loading }) => {
  const [data, setData] = useState({
    // Part 1
    reporter_name: "", phone: "", work_location: "", supervisor_notified: "",
    date_reported: "", time_reported: "",
    date_of_incident: "", time_of_incident: "",
    on_hazard_board: "No", delay_reason: "",
    // Part 2
    workers_involved: "", clients_involved: "", others_involved: "",
    // Part 3
    hazard_rating: "minor", // serious, minor
    // Part 4 (Checkboxes)
    hazards: [],
    // Part 5
    hazard_details: "",
    conversations_and_actions: "", // "conversations with person(s) involved and any actions taken"
    confirmation_signed: false, // "I confirm the information..."
    // Part 6
    witness_name: "", witness_statement: "", witness_date: "", witness_time: "", witness_signature: "",
    reporter_signature: ""
  });

  const hazardTypes = [
    "Biological", "Chemical", "Client Action", "Energy",
    "Environmental", "Ergonomic/Work Design", "Material Handling", "Mechanical",
    "Physical", "Violence", "Work Practices", "Other"
  ];

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' && e.target.name === 'confirmation_signed'
      ? e.target.checked
      : e.target.value;
    setData({ ...data, [e.target.name]: value });
  };

  const handleSignatureEnd = (fieldName, sigCanvasRef) => {
    if (sigCanvasRef.current) {
      setData(prev => ({ ...prev, [fieldName]: sigCanvasRef.current.toDataURL() }));
    }
  };

  const handleCheck = (type) => {
    const newHazards = data.hazards.includes(type)
      ? data.hazards.filter(h => h !== type)
      : [...data.hazards, type];
    setData({ ...data, hazards: newHazards });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
      <h4 className="mb-3 text-warning fw-bold border-bottom pb-2">HAZARD / NEAR MISS REPORT</h4>
      <div className="alert alert-warning small">
        <strong>Hazard:</strong> a practice, behaviour, condition or situation that can contribute to injury.<br />
        <strong>Near Miss:</strong> danger is not imminent, but has the potential for future harm.<br />
        <em>Employees are to complete part 1-6 only.</em>
      </div>

      {/* Part 1 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 1: REPORT COMPLETED BY</h5>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">Name</label><input required name="reporter_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Telephone</label><input name="phone" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Primary Work Location</label><input name="work_location" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Supervisor/Designate Notified</label><input name="supervisor_notified" className="form-control" placeholder="Name of supervisor" onChange={handleChange} /></div>

        <div className="col-md-3"><label className="form-label">Date Reported</label><input type="date" name="date_reported" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time Reported</label><input type="time" name="time_reported" className="form-control" onChange={handleChange} /></div>

        <div className="col-md-3"><label className="form-label">Date of Incident</label><input type="date" name="date_of_incident" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time of Incident</label><input type="time" name="time_of_incident" className="form-control" onChange={handleChange} /></div>

        <div className="col-md-6"><label className="form-label">Location of Incident</label><input name="location" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6">
          <label className="form-label">Documented on Hazard Board?</label>
          <select name="on_hazard_board" className="form-select" onChange={handleChange}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div className="col-12">
          <label className="form-label">If incident was not reported immediately, provide reason for delay:</label>
          <input name="delay_reason" className="form-control" onChange={handleChange} />
        </div>
      </div>

      {/* Part 2 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 2: INDIVIDUALS INVOLVED</h5>
      <p className="small text-muted mb-2">List all involved individuals including any witnesses.</p>
      <div className="row g-3">
        <div className="col-md-4"><label className="form-label">Workers</label><textarea rows="2" name="workers_involved" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Clients</label><textarea rows="2" name="clients_involved" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Other (please identify)</label><textarea rows="2" name="others_involved" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 3 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 3: HAZARD RATING</h5>
      <div className="form-check">
        <input className="form-check-input" type="radio" name="hazard_rating" value="serious" onChange={handleChange} />
        <label className="form-check-label fw-bold text-danger">SERIOUS - Immediate danger to personal health & safety, significant damage to property or environment, or contravenes/violates legislation</label>
      </div>
      <div className="form-check">
        <input className="form-check-input" type="radio" name="hazard_rating" value="minor" defaultChecked onChange={handleChange} />
        <label className="form-check-label fw-bold text-warning">MINOR / NEAR MISS - Danger is not imminent, but has potential for future harm to person, property or environment</label>
      </div>

      {/* Part 4 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 4: TYPE OF HAZARD</h5>
      <div className="row">
        {hazardTypes.map(h => (
          <div className="col-md-4" key={h}>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" onChange={() => handleCheck(h)} />
              <label className="form-check-label">{h}</label>
            </div>
          </div>
        ))}
      </div>

      {/* Part 5 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 5: STATEMENT OF HAZARD/NEAR MISS AND IMMEDIATE ACTION TAKEN</h5>
      <p className="small text-muted">
        Please provide factual information only on what was seen, heard, stated (how, what, who, when, where, etc.), conversations with person(s) involved and any actions taken to resolve the hazard/near miss. Do not write down personal opinions.
      </p>
      <div className="mb-3">
        <label className="form-label fw-bold">Statement & Action Details</label>
        <textarea required name="hazard_details" className="form-control" rows="5" onChange={handleChange} placeholder="Describe the hazard/near miss, conversations, and actions taken..."></textarea>
      </div>

      <div className="form-check mt-3 mb-2">
        <input className="form-check-input" type="checkbox" name="confirmation_signed" id="confirmSign" onChange={handleChange} required />
        <label className="form-check-label fw-bold" htmlFor="confirmSign">
          I confirm the information contained in this document is true, complete, and correct.
        </label>
      </div>

      {/* Signature Component for Employee */}
      <SignaturePad label="Employee Signature" onEnd={(ref) => handleSignatureEnd('reporter_signature', ref)} />


      {/* Part 6 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 6: WITNESS REMARKS</h5>
      <p className="small text-muted">This section is to be completed by any witness involved in the occupational illness/injury report. Remarks should include confirmation of events and/or additional information observed.</p>

      <div className="mb-3">
        <label className="form-label">Witness Remarks</label>
        <textarea name="witness_statement" className="form-control" rows="3" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">Witness Name</label><input name="witness_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Date</label><input type="date" name="witness_date" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Time</label><input type="time" name="witness_time" className="form-control" onChange={handleChange} /></div>

        <div className="col-12"><SignaturePad label="Witness Signature" onEnd={(ref) => handleSignatureEnd('witness_signature', ref)} /></div>
      </div>

      <button type="submit" className="btn btn-warning w-100 fw-bold mt-5" disabled={loading}>{loading ? "Submitting..." : "Submit Hazard Report"}</button>
    </form>
  );
};

// Start Helper for Signature
const SignaturePad = ({ label, onEnd }) => {
  const sigRef = useRef({});
  return (
    <div className="mb-3">
      <label className="form-label fw-bold small text-uppercase">{label}</label>
      <div className="border border-2 rounded bg-white">
        <SignatureCanvas
          penColor="black"
          canvasProps={{ className: 'sigCanvas w-100', height: 150 }}
          ref={sigRef}
          onEnd={() => onEnd(sigRef)}
        />
      </div>
      <div className="text-end">
        <button type="button" className="btn btn-sm btn-light text-muted border mt-1" onClick={() => {
          sigRef.current.clear();
          onEnd(sigRef); // Clear in state too
        }}>Clear</button>
      </div>
    </div>
  );
};
// End Helper for Signature

// --- 2. HAZARD REPORT FOLLOW-UP (Supervisor/Manager/JHSC) ---
const HazardFollowupForm = ({ onSubmit, loading }) => {
  const [data, setData] = useState({
    supervisor_rec: "", supervisor_signature: "", supervisor_sign_date: "", supervisor_sign_time: "",
    manager_followup: "", manager_signature: "", manager_sign_date: "",
    jhsc_rec: "", worker_co_chair_signature: "", worker_co_chair_date: "", management_co_chair_signature: "", management_co_chair_date: ""
  });

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSignatureEnd = (fieldName, sigCanvasRef) => {
    if (sigCanvasRef.current) {
      setData(prev => ({ ...prev, [fieldName]: sigCanvasRef.current.toDataURL() }));
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
      <h4 className="mb-3 text-warning fw-bold border-bottom pb-2">HAZARD REPORT FOLLOW-UP</h4>
      <div className="alert alert-info small">
        <strong>Note:</strong> This form is for supervisor, program manager, and JHSC follow-up on hazard reports.
      </div>

      {/* --- SUPERVISOR ACTION --- */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">Action taken by supervisor/coordinator (Hazard Report)</h5>
      <div className="mb-3">
        <label className="form-label">Recommendations for controlling/correcting the hazard and preventing future near misses:</label>
        <textarea name="supervisor_rec" className="form-control" rows="4" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-6"><SignaturePad label="Supervisor's/Coordinator's Signature" onEnd={(ref) => handleSignatureEnd('supervisor_signature', ref)} /></div>
        <div className="col-md-3"><label className="form-label">Date</label><input type="date" name="supervisor_sign_date" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time</label><input type="time" name="supervisor_sign_time" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* --- PROGRAM MANAGER FOLLOW UP --- */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">Program manager follow-up (Hazard Report)</h5>
      <div className="mb-3">
        <label className="form-label">Follow up and steps taken to resolve and prevent recurrence:</label>
        <textarea name="manager_followup" className="form-control" rows="3" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-8"><SignaturePad label="Program Manager's Signature" onEnd={(ref) => handleSignatureEnd('manager_signature', ref)} /></div>
        <div className="col-md-4"><label className="form-label">Date</label><input type="date" name="manager_sign_date" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* --- JHSC FOLLOW UP --- */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">JHSC follow-up (Hazard Report)</h5>
      <div className="mb-3">
        <label className="form-label">Include recommendations for controlling/correcting the hazard and preventing future near misses:</label>
        <textarea name="jhsc_rec" className="form-control" rows="3" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <SignaturePad label="Worker Co-Chair's Signature" onEnd={(ref) => handleSignatureEnd('worker_co_chair_signature', ref)} />
          <input type="date" name="worker_co_chair_date" className="form-control mt-2" onChange={handleChange} />
        </div>
        <div className="col-md-6">
          <SignaturePad label="Management Co-Chair's Signature" onEnd={(ref) => handleSignatureEnd('management_co_chair_signature', ref)} />
          <input type="date" name="management_co_chair_date" className="form-control mt-2" onChange={handleChange} />
        </div>
      </div>

      <button type="submit" className="btn btn-warning w-100 fw-bold mt-5" disabled={loading}>{loading ? "Submitting..." : "Submit Follow-up Report"}</button>
    </form>
  );
};

// --- 3. INCIDENT REPORT ---
const IncidentForm = ({ onSubmit, loading }) => {
  const [data, setData] = useState({
    // Part 1
    reporter_name: "", job_title: "", telephone: "", email: "", work_location: "", supervisor_notified: "",
    date_reported: "", time_reported: "",
    confirmation_signed: false, reporter_signature: "", date_signed: "",
    // Part 2
    workers: "", clients: "", others: "",
    witness_name: "", witness_job_title: "", witness_contact: "",
    // Part 3
    date_of_incident: "", time_of_incident: "", location: "",
    incident_description: "", // "What was the incident?"
    who_involved: "", // "Who is involved in the incident?"
    who_reported: "", // "Who reported the incident?"
    witness_statement: "", // "What exactly did they state?"
    personal_observation: "", // "What did you personally see/hear/note?"
    sequence_of_events: "", // "What was the sequence of events..."
    client_concerns: "", // "Did the client express pain..."
    client_condition: "", // "What was the client's condition..."
    injuries: "", // "Did anyone get hurt..."
    environmental_hazards: "", // "Were there environmental hazards..."
    immediate_actions: "", // "What actions did you take immediately..."
    who_informed: "", // "Who was informed..."
    worker_name_bottom: "", date_of_incident_bottom: "", client_name_bottom: "", time_of_incident_bottom: "" // Repeated fields at bottom of Part 3
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' && e.target.name === 'confirmation_signed'
      ? e.target.checked
      : e.target.value;
    setData({ ...data, [e.target.name]: value });
  };

  const handleSignatureEnd = (fieldName, sigCanvasRef) => {
    if (sigCanvasRef.current) {
      setData(prev => ({ ...prev, [fieldName]: sigCanvasRef.current.toDataURL() }));
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
      <h4 className="mb-3 text-primary fw-bold border-bottom pb-2">INCIDENT REPORT</h4>
      <div className="alert alert-info small">
        <strong>Note:</strong> Please notify the Supervisor/Coordinator of the incident prior to the end of the shift.
      </div>

      {/* Part 1 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 1: REPORT COMPLETED BY</h5>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">Name</label><input required name="reporter_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Job Title</label><input name="job_title" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Telephone #</label><input name="telephone" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Email</label><input name="email" type="email" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Work Location</label><input name="work_location" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Supervisor/Designate you reported incident to</label><input name="supervisor_notified" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Date Reported</label><input type="date" name="date_reported" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time</label><input type="time" name="time_reported" className="form-control" onChange={handleChange} /></div>

        <div className="col-12 mt-4">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" name="confirmation_signed" id="incConfirm" onChange={handleChange} required />
            <label className="form-check-label small" htmlFor="incConfirm">
              I, [Name above], confirm that to the best of my knowledge the information contained in this document is true, complete, and correct.
            </label>
          </div>
        </div>
        <div className="col-md-6"><SignaturePad label="Signature" onEnd={(ref) => handleSignatureEnd('reporter_signature', ref)} /></div>
        <div className="col-md-6"><label className="form-label">Date</label><input type="date" name="date_signed" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 2 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 2: INDIVIDUALS INVOLVED</h5>
      <p className="small text-muted">List all involved individuals including any witnesses</p>
      <div className="row g-3">
        <div className="col-md-4"><label className="form-label">Workers</label><textarea rows="2" name="workers" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Clients</label><textarea rows="2" name="clients" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Other (please identify)</label><textarea rows="2" name="others" className="form-control" onChange={handleChange} /></div>

        <h6 className="mt-3 fw-bold small">Witnesses may be contacted for additional information:</h6>
        <div className="col-md-4"><label className="form-label">Name</label><input name="witness_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Job Title</label><input name="witness_job_title" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Contact Number</label><input name="witness_contact" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 3 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 3: STATEMENT OF INCIDENT</h5>
      <div className="alert alert-secondary small p-2">
        Please state what you personally observed. Report factual information only. Do not write down personal opinions.
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-6"><label className="form-label">Date of Incident</label><input type="date" name="date_of_incident" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Time</label><input type="time" name="time_of_incident" className="form-control" onChange={handleChange} /></div>
        <div className="col-12"><label className="form-label">Location</label><input name="location" className="form-control" onChange={handleChange} /></div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <tbody>
            <tr><td className="bg-light w-25">What was the incident?</td><td><textarea name="incident_description" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Who is involved in the incident?</td><td><textarea name="who_involved" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Who reported the incident? (Client, staff, family, etc.)</td><td><textarea name="who_reported" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What exactly did they state?</td><td><textarea name="witness_statement" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What did you personally see/hear/note?</td><td><textarea name="personal_observation" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What was the sequence of events leading up to the incident?</td><td><textarea name="sequence_of_events" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Did the client express pain, discomfort, or concern?</td><td><textarea name="client_concerns" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What was the client's condition (alert, injured, responsive)?</td><td><textarea name="client_condition" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Did anyone get hurt or require medical attention?</td><td><textarea name="injuries" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Were there environmental hazards present?</td><td><textarea name="environmental_hazards" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What actions did you take immediately after the incident?</td><td><textarea name="immediate_actions" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Who was informed (supervisor, nurse, family)?</td><td><textarea name="who_informed" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
          </tbody>
        </table>
      </div>
      <div className="row g-3 bg-light p-2 rounded mx-0">
        <div className="col-md-6"><small>Worker Name:</small><input name="worker_name_bottom" className="form-control form-control-sm" onChange={handleChange} /></div>
        <div className="col-md-6"><small>Date of Incident:</small><input type="date" name="date_of_incident_bottom" className="form-control form-control-sm" onChange={handleChange} /></div>
        <div className="col-md-6"><small>Client Name:</small><input name="client_name_bottom" className="form-control form-control-sm" onChange={handleChange} /></div>
        <div className="col-md-6"><small>Time of Incident:</small><input type="time" name="time_of_incident_bottom" className="form-control form-control-sm" onChange={handleChange} /></div>
      </div>

      <button type="submit" className="btn btn-primary w-100 fw-bold mt-4" disabled={loading}>{loading ? "Submitting..." : "Submit Incident Report"}</button>
    </form>
  );
};

// --- 3. INCIDENT REPORT FOLLOW-UP (Supervisor/Manager) ---
const IncidentFollowupForm = ({ onSubmit, loading }) => {
  const [data, setData] = useState({
    // Part 4 Supervisor
    reported_to_supervisor_by: "", reported_to_supervisor_time: "",
    supervisor_witness_statement: "", // "What did the worker/client/witness state?"
    reporting_delays: "", // "Were there any delays..."
    verified_info: "", // "What information was personally verified"
    factual_summary: "", // "Factual summary of the incident..."
    immediate_risks: "", // "Were there any immediate risks..."
    hr_followup: "", // "Was follow-up required with HR..."
    supervisor_steps: "", // "Immediate steps taken..."
    further_followup: "", // "Any further follow-up is required..."
    prevention_recs: "", // "Can recommendations prevent similar incidents..."
    supervisor_signature: "", supervisor_sign_date: "", supervisor_sign_time: "",
    // Part 5 Manager
    manager_followup: "", manager_signature: "", manager_sign_date: ""
  });

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSignatureEnd = (fieldName, sigCanvasRef) => {
    if (sigCanvasRef.current) {
      setData(prev => ({ ...prev, [fieldName]: sigCanvasRef.current.toDataURL() }));
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
      <h4 className="mb-3 text-primary fw-bold border-bottom pb-2">INCIDENT REPORT FOLLOW-UP</h4>
      <div className="alert alert-info small">
        <strong>Note:</strong> This form is for supervisor and program manager follow-up on incident reports.
      </div>

      {/* Part 4 Supervisor */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">Action taken by supervisor/coordinator (Incident Report)</h5>
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <tbody>
            <tr><td className="bg-light w-25">Who reported the incident to you, and when?</td><td><textarea name="reported_to_supervisor_by" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What did the worker/client/witness state?</td><td><textarea name="supervisor_witness_statement" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Were there any delays in reporting, and if so, what reasons were given?</td><td><textarea name="reporting_delays" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">What information was personally verified (injury, environment, equipment)?</td><td><textarea name="verified_info" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Factual summary of the incident based on information received and verified?</td><td><textarea name="factual_summary" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Were there any immediate risks or hazards that required correction?</td><td><textarea name="immediate_risks" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Was follow-up required with HR, Executive Director, Health and safety Rep?</td><td><textarea name="hr_followup" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Immediate steps taken (e.g., worker support, hazard correction)?</td><td><textarea name="supervisor_steps" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Any further follow-up is required (investigation, care plan update, training)?</td><td><textarea name="further_followup" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
            <tr><td className="bg-light">Can recommendations prevent similar incidents in the future?</td><td><textarea name="prevention_recs" className="form-control border-0" rows="2" onChange={handleChange}></textarea></td></tr>
          </tbody>
        </table>
      </div>
      <div className="row g-3">
        <div className="col-md-6"><SignaturePad label="Supervisor's/Coordinator's Signature" onEnd={(ref) => handleSignatureEnd('supervisor_signature', ref)} /></div>
        <div className="col-md-3"><label className="form-label">Date</label><input type="date" name="supervisor_sign_date" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time</label><input type="time" name="supervisor_sign_time" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 5 Manager */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">Program manager follow-up (Incident Report)</h5>
      <div className="mb-3">
        <label className="form-label">Follow up and steps taken to resolve and prevent recurrence:</label>
        <textarea name="manager_followup" className="form-control" rows="4" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-8"><SignaturePad label="Program Manager's Signature" onEnd={(ref) => handleSignatureEnd('manager_signature', ref)} /></div>
        <div className="col-md-4"><label className="form-label">Date</label><input type="date" name="manager_sign_date" className="form-control" onChange={handleChange} /></div>
      </div>

      <button type="submit" className="btn btn-primary w-100 fw-bold mt-5" disabled={loading}>{loading ? "Submitting..." : "Submit Follow-up Report"}</button>
    </form>
  );
};

// --- 4. INJURY REPORT ---
const InjuryForm = ({ onSubmit, loading }) => {
  const [data, setData] = useState({
    // Part 1
    reporter_name: "", reported_to_supervisor: "", date_reported: "", time_of_injury: "", delay_reason: "",
    // Part 2
    emp_name: "", emp_phone: "", emp_email: "", emp_address: "",
    medical_attention_required: "No", // 2a
    rtw_package_taken: "No", // 2b
    // Part 3
    date_of_injury: "", time_of_injury_detail: "", time_left_work: "", program: "", location: "", client_involved: "",
    // Part 4
    body_parts: [],
    // Part 5
    injury_description: "",
    // Part 6 - Employee Confirmation
    confirmation_signed: false, employee_signature: "", sign_date: "",
    // Part 6 - Witness
    witness_remarks: "", witness_name: "", witness_phone: "", witness_signature: "", witness_date: "", witness_time: "",
    // Part 7
    hcp_name_title: "", hcp_address: "", hcp_phone: "", faf_form_brought: "No"
  });

  const bodyParts = [
    "Head", "Teeth", "Upper Back", "Lower Back", "Shoulder",
    "Wrist", "Hip", "Ankle", "Face", "Neck",
    "Ears", "Chest", "Abdomen", "Elbow",
    "Fingers", "Pelvis", "Forearm", "Lower Legs", "Other"
  ];

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' && (e.target.name === 'confirmation_signed')
      ? e.target.checked
      : e.target.value;
    setData({ ...data, [e.target.name]: value });
  };

  const handleCheck = (part) => {
    const newParts = data.body_parts.includes(part)
      ? data.body_parts.filter(p => p !== part)
      : [...data.body_parts, part];
    setData({ ...data, body_parts: newParts });
  };

  const handleSignatureEnd = (fieldName, sigCanvasRef) => {
    if (sigCanvasRef.current) {
      setData(prev => ({ ...prev, [fieldName]: sigCanvasRef.current.toDataURL() }));
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
      <h4 className="mb-3 text-danger fw-bold border-bottom pb-2">EMPLOYEE OCCUPATIONAL ILLNESS/INJURY REPORT</h4>
      <div className="alert alert-danger small">
        <strong>If you are filling out this report:</strong><br />
        • You are required to <u>immediately</u> contact and speak to your supervisor / designate.<br />
        • Use the Emergency Notification System if necessary.
      </div>

      {/* Part 1 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 1: REPORT COMPLETED BY</h5>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">Name</label><input required name="reporter_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Illness/Injury Reported To (Name of Supervisor/Designate)</label><input name="reported_to_supervisor" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Date Reported (D/M/Y)</label><input type="date" name="date_reported" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Time of Injury</label><input type="time" name="time_of_injury" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-12"><label className="form-label">If Illness/Injury was not reported immediately, please provide reason for delay:</label><input name="delay_reason" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 2 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 2: PERSONAL DATA OF INJURED EMPLOYEE</h5>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">Name</label><input name="emp_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Telephone Number</label><input name="emp_phone" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Email</label><input name="emp_email" type="email" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Address</label><input name="emp_address" className="form-control" onChange={handleChange} /></div>

        <div className="col-md-6 mt-3">
          <label className="fw-bold d-block">a) Medical attention required?</label>
          <div className="form-check form-check-inline">
            <input className="form-check-input" type="radio" name="medical_attention_required" value="Yes" onChange={handleChange} /> <label className="form-check-label">YES</label>
          </div>
          <div className="form-check form-check-inline">
            <input className="form-check-input" type="radio" name="medical_attention_required" value="No" defaultChecked onChange={handleChange} /> <label className="form-check-label">NO</label>
          </div>
          <small className="d-block text-muted">(If YES, please answer b)</small>
        </div>
        <div className="col-md-6 mt-3">
          <label className="fw-bold d-block">b) Was a Return To Work package taken to the RHCP by the employee?</label>
          <div className="form-check form-check-inline">
            <input className="form-check-input" type="radio" name="rtw_package_taken" value="Yes" onChange={handleChange} /> <label className="form-check-label">YES</label>
          </div>
          <div className="form-check form-check-inline">
            <input className="form-check-input" type="radio" name="rtw_package_taken" value="No" defaultChecked onChange={handleChange} /> <label className="form-check-label">NO</label>
          </div>
        </div>
      </div>

      {/* Part 3 */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 3: INJURY DETAILS</h5>
      <div className="row g-3">
        <div className="col-md-4"><label className="form-label">Date of Injury (D/M/Y)</label><input type="date" name="date_of_injury" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Time</label><input type="time" name="time_of_injury_detail" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Time Left Work</label><input type="time" name="time_left_work" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-4"><label className="form-label">Program</label><input name="program" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-8"><label className="form-label">Location (address of where injury occurred)</label><input name="location" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-12"><label className="form-label">Client Involved (name and telephone number)</label><input name="client_involved" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 4 Body Parts */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 4: AREA OF INJURY (BODY PART)</h5>
      <p className="small text-muted">Please check all that apply and indicate "R" or "L" in description if applicable.</p>
      <div className="row ps-2">
        {bodyParts.map(part => (
          <div className="col-6 col-md-3" key={part}>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" onChange={() => handleCheck(part)} />
              <label className="form-check-label">{part}</label>
            </div>
          </div>
        ))}
      </div>

      {/* Part 5 Description */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 5: INJURY DETAILS</h5>
      <div className="mb-3">
        <label className="form-label">Describe what happened to cause the injury/illness and what you were doing at the time.</label>
        <textarea required name="injury_description" className="form-control" rows="4" onChange={handleChange} placeholder="Lifting a 50 lb. box, slipped on wet floor... Include details of equipment, materials, environmental conditions (work area, temperature, noise, chemical, gas, fumes, other person)..."></textarea>
      </div>

      {/* Part 6 Confirmation */}
      <div className="mt-4 p-3 bg-white border rounded">
        <div className="form-check mb-2">
          <input className="form-check-input" type="checkbox" name="confirmation_signed" id="injConfirm" onChange={handleChange} required />
          <label className="form-check-label small fw-bold" htmlFor="injConfirm">
            I confirm to the best of my knowledge the information contained in this document is true, complete, and correct.
          </label>
        </div>
        <div className="row g-3">
          <div className="col-md-8"><SignaturePad label="Employee Signature" onEnd={(ref) => handleSignatureEnd('employee_signature', ref)} /></div>
          <div className="col-md-4"><label className="form-label">Date (D/M/Y)</label><input type="date" name="sign_date" className="form-control" onChange={handleChange} /></div>
        </div>
      </div>

      {/* Part 6 Witness Remarks */}
      <h5 className="bg-light p-2 border rounded mt-4">PART 6: WITNESS REMARKS</h5>
      <p className="small text-muted">This section is to be completed, signed and dated by any witness involved.</p>
      <div className="mb-3">
        <label className="form-label">Remarks (confirmation of events/additional info)</label>
        <textarea name="witness_remarks" className="form-control" rows="3" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">Witness Name</label><input name="witness_name" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><label className="form-label">Phone Number</label><input name="witness_phone" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-6"><SignaturePad label="Witness Signature" onEnd={(ref) => handleSignatureEnd('witness_signature', ref)} /></div>
        <div className="col-md-3"><label className="form-label">Date</label><input type="date" name="witness_date" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time</label><input type="time" name="witness_time" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 7 HCP */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">PART 7: DETAILS OF ATTENDING HEALTH CARE PRACTITIONER</h5>
      <div className="row g-3">
        <div className="col-12"><label className="form-label">Name and Title of HCP</label><input name="hcp_name_title" className="form-control" onChange={handleChange} /></div>
        <div className="col-12"><label className="form-label">Address of HCP</label><input name="hcp_address" className="form-control" onChange={handleChange} /></div>
        <div className="col-12"><label className="form-label">Phone Number of HCP</label><input name="hcp_phone" className="form-control" onChange={handleChange} /></div>

        <div className="col-12 mt-2">
          <span className="fw-bold me-3">Did you bring an FAF form with you?</span>
          <div className="form-check form-check-inline">
            <input className="form-check-input" type="radio" name="faf_form_brought" value="Yes" onChange={handleChange} /> <label className="form-check-label">YES</label>
          </div>
          <div className="form-check form-check-inline">
            <input className="form-check-input" type="radio" name="faf_form_brought" value="No" defaultChecked onChange={handleChange} /> <label className="form-check-label">NO</label>
          </div>
        </div>
        <div className="col-12 text-muted fst-italic small">
          Please attach your RETURN TO WORK INFORMATION (page 2 of the HCP's report) to this document.
        </div>
      </div>

      <button type="submit" className="btn btn-danger w-100 fw-bold mt-4" disabled={loading}>{loading ? "Submitting..." : "Submit Injury Report"}</button>
    </form>
  );
};

// --- 5. INJURY REPORT FOLLOW-UP (Supervisor/Manager) ---
const InjuryFollowupForm = ({ onSubmit, loading }) => {
  const [data, setData] = useState({
    // Part 8
    rtw_process_initiated: "No", investigation_initiated: "No", copy_provided_to_hr: "No",
    supervisor_steps_resolve: "",
    supervisor_signature: "", supervisor_sign_date: "", supervisor_sign_time: "",
    // Part 9
    manager_recommendations: "",
    manager_signature: "", manager_sign_date: "", manager_sign_time: ""
  });

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSignatureEnd = (fieldName, sigCanvasRef) => {
    if (sigCanvasRef.current) {
      setData(prev => ({ ...prev, [fieldName]: sigCanvasRef.current.toDataURL() }));
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
      <h4 className="mb-3 text-danger fw-bold border-bottom pb-2">INJURY REPORT FOLLOW-UP</h4>
      <div className="alert alert-danger small">
        <strong>Note:</strong> This form is for supervisor and program manager follow-up on employee injury/illness reports.
      </div>

      {/* Part 8 Supervisor Action */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">Action taken by supervisor/coordinator (Injury Report)</h5>
      <div className="row g-3">
        <div className="col-12">
          <span className="fw-bold me-3">Return to Work (RTW) Process initiated?</span>
          <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="rtw_process_initiated" value="Yes" onChange={handleChange} /> Yes</div>
          <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="rtw_process_initiated" value="No" defaultChecked onChange={handleChange} /> No</div>
        </div>
        <div className="col-12">
          <span className="fw-bold me-3">Was an Incident/Injury Investigation Form initiated?</span>
          <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="investigation_initiated" value="Yes" onChange={handleChange} /> Yes</div>
          <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="investigation_initiated" value="No" defaultChecked onChange={handleChange} /> No</div>
        </div>
        <div className="col-12">
          <span className="fw-bold me-3">If RTW Process was initiated, was a copy of this Illness/Injury Report provided to HR?</span>
          <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="copy_provided_to_hr" value="Yes" onChange={handleChange} /> Yes</div>
          <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="copy_provided_to_hr" value="No" defaultChecked onChange={handleChange} /> No</div>
        </div>
        <div className="col-12">
          <label className="form-label fw-bold">Steps taken to resolve and prevent recurrence:</label>
          <textarea name="supervisor_steps_resolve" className="form-control" rows="3" onChange={handleChange}></textarea>
        </div>
        <div className="col-md-6"><SignaturePad label="Supervisor's/Coordinator's Signature" onEnd={(ref) => handleSignatureEnd('supervisor_signature', ref)} /></div>
        <div className="col-md-3"><label className="form-label">Date</label><input type="date" name="supervisor_sign_date" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time</label><input type="time" name="supervisor_sign_time" className="form-control" onChange={handleChange} /></div>
      </div>

      {/* Part 9 Manager Action */}
      <h5 className="bg-secondary text-white p-2 border rounded mt-4">Program manager follow-up (Injury Report)</h5>
      <div className="mb-3">
        <label className="form-label fw-bold">Recommendations by Program Manager:</label>
        <textarea name="manager_recommendations" className="form-control" rows="3" onChange={handleChange}></textarea>
      </div>
      <div className="row g-3">
        <div className="col-md-6"><SignaturePad label="Program Manager's Signature" onEnd={(ref) => handleSignatureEnd('manager_signature', ref)} /></div>
        <div className="col-md-3"><label className="form-label">Date</label><input type="date" name="manager_sign_date" className="form-control" onChange={handleChange} /></div>
        <div className="col-md-3"><label className="form-label">Time</label><input type="time" name="manager_sign_time" className="form-control" onChange={handleChange} /></div>
      </div>

      <button type="submit" className="btn btn-danger w-100 fw-bold mt-5" disabled={loading}>{loading ? "Submitting..." : "Submit Follow-up Report"}</button>
    </form>
  );
};

export default UnifiedReportForm;
