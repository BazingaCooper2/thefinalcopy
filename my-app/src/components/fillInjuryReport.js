import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const InjuryReportForm = () => {
  const [formData, setFormData] = useState({
    date_of_incident: new Date().toISOString().slice(0, 10),
    injured_person: "",
    reported_by: "",
    location: "",
    injury_details: "",
    action_taken: "",
    severity:"",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");

    try {
      const response = await fetch("http://127.0.0.1:5000/send_injury_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess("✅ Injury report successfully sent to the supervisor!");
        setFormData({
          date_of_incident: new Date().toISOString().slice(0, 10),
          injured_person: "",
          reported_by: "",
          location: "",
          injury_details: "",
          action_taken: "",
        });
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
    <div className="container mt-5">
      <div className="shadow-sm border-0">
        <div className="bg-danger text-white fw-bold">
          🚨 New Injury Report
        </div>

        <div className="ms-sm-5">
          <p className="text-muted mb-4">
            This form records details of an injury incident. Once submitted, the
            supervisor will be notified via email.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Date */}
            <div className="mb-3">
              <label className="form-label fw-bold">Date of Incident</label>
              <input
                type="date"
                className="form-control"
                name="date_of_incident"
                value={formData.date_of_incident}
                onChange={handleChange}
                required
              />
            </div>

            {/* Injured Person */}
            <div className="mb-3">
              <label className="form-label fw-bold">Injured Person</label>
              <input
                type="text"
                className="form-control"
                name="injured_person"
                placeholder="Enter injured person's name"
                value={formData.injured_person}
                onChange={handleChange}
                required
              />
            </div>

            {/* Reported By */}
            <div className="mb-3">
              <label className="form-label fw-bold">Reported By</label>
              <input
                type="text"
                className="form-control"
                name="reported_by"
                placeholder="Name of person reporting"
                value={formData.reported_by}
                onChange={handleChange}
                required
              />
            </div>

            {/* Location */}
            <div className="mb-3">
              <label className="form-label fw-bold" >Location</label>
              <select
                name="location"
                className="form-control"
                value={formData.location}
                onChange={handleChange}
                >
                <option value="">Select location of incident</option>
                <option value="Outreach">Outreach</option>
                <option value="Willow Place">Willow Place</option>
                <option value="85 Neeve">85 Neeve</option>
                <option value="87 Neeve">87 Neeve</option>
              </select>
            </div>

            {/* Injury Details */}
            <div className="mb-3">
              <label className="form-label fw-bold">Injury Details</label>
              <textarea
                className="form-control"
                name="injury_details"
                rows="4"
                placeholder="Describe the injury in detail"
                value={formData.injury_details}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            {/* Action Taken */}
            <div className="mb-3">
              <label className="form-label fw-bold">Action Taken</label>
              <textarea
                className="form-control"
                name="action_taken"
                rows="3"
                placeholder="Describe immediate action taken"
                value={formData.action_taken}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            {/* Severity */}
            <div className="mb-3">
              <label className="form-label fw-bold" >Severity</label>
              <select
                name="severity"
                className="form-control"
                value={formData.severity}
                onChange={handleChange}
                >
                <option value="">Select severity type</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-danger w-100 fw-bold"
              disabled={loading}
            >
              {loading ? "Sending..." : "Submit Report"}
            </button>
          </form>

          {success && <div className="alert alert-info mt-3">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default InjuryReportForm;
