import React, { useState } from 'react';
import { useAuth } from '../App';

export default function FLWLeaveRequest() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        type: "",
        start_date: "",
        end_date: "",
        all_day: true,
        start_time: "",
        end_time: "",
        description: "",
        notifySupervisor: true
    });

    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const LEAVE_TYPES = [
        "Unavailability",
        "Vacation FT Hourly - pay only",
        "Float Day",
        "Sick paid",
        "Sick unpaid",
        "Vacation PT and Casual - Seniority only",
        "Lieu day for Stat worked (unpaid)",
        "Unpaid leave + no seniority",
        "ESA leave + seniority",
        "Moved",
        "WSIB Leave (with seniority)",
        "Union",
        "Domestic Violence Leave",
        "Bereavement paid",
        "Bereavement unpaid",
        "Jury Duty",
        "Vacation FT - seniority only",
        "JHSC",
        "Unavailable - First Aid CPR",
        "Maternity/Paternity Leave"
    ];

    const filteredTypes = LEAVE_TYPES.filter(t =>
        t.toLowerCase().includes(filter.toLowerCase())
    );

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.type) {
            alert("Please select a leave type");
            setLoading(false);
            return;
        }

        if (!formData.start_date || !formData.end_date) {
            alert("Please select start and end dates");
            setLoading(false);
            return;
        }

        try {
            const body = {
                emp_id: user?.emp_id,
                type: formData.type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                start_time: formData.all_day ? "00:00:00" : formData.start_time,
                end_time: formData.all_day ? "23:59:00" : formData.end_time,
                description: formData.description
            };

            const response = await fetch(`http://localhost:5000/add_unavailability`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setSuccess(true);
                setFormData({
                    type: "",
                    start_date: "",
                    end_date: "",
                    all_day: true,
                    start_time: "",
                    end_time: "",
                    description: "",
                    notifySupervisor: true
                });
                
                setTimeout(() => setSuccess(false), 5000);
            } else {
                alert('Failed to submit leave request');
            }
        } catch (error) {
            console.error("Error submitting request:", error);
            alert("An error occurred while submitting the request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid p-4">
            {/* Header */}
            <div className="mb-4">
                <h2 className="mb-1">Request Leave</h2>
                <p className="text-muted mb-0">
                    Submit time-off requests for vacation, sick days, or personal leave
                </p>
            </div>

            {/* Success Alert */}
            {success && (
                <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                    <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                    <div>
                        Leave request submitted successfully! Your supervisor has been notified.
                    </div>
                </div>
            )}

            <div className="row">
                <div className="col-lg-8 col-xl-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4">
                            {/* Employee Info */}
                            <div className="p-3 rounded mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                <div className="d-flex align-items-center gap-3 text-white">
                                    <div className="rounded-circle bg-white d-flex align-items-center justify-content-center"
                                        style={{ width: '50px', height: '50px', color: '#667eea', fontWeight: '700', fontSize: '1.2rem' }}>
                                        {user?.first_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="fw-semibold fs-5">{user?.first_name}</div>
                                        <div className="small opacity-90">Employee ID: #{user?.emp_id}</div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Leave Type */}
                                <div className="mb-3 position-relative">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-tag me-2 text-primary"></i>
                                        Leave Type
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search or select type..."
                                        name="type"
                                        value={open ? filter : formData.type}
                                        onFocus={() => setOpen(true)}
                                        onChange={(e) => {
                                            setFilter(e.target.value);
                                            handleChange(e);
                                            setOpen(true);
                                        }}
                                        autoComplete="off"
                                        required
                                    />
                                    {open && (
                                        <ul className="list-group position-absolute w-100 shadow-lg" 
                                            style={{ zIndex: 1000, maxHeight: '250px', overflowY: 'auto', top: '100%' }}>
                                            {filteredTypes.length > 0 ? (
                                                filteredTypes.map((t, idx) => (
                                                    <li key={idx}
                                                        className="list-group-item list-group-item-action"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, type: t }));
                                                            setFilter("");
                                                            setOpen(false);
                                                        }}>
                                                        {t}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="list-group-item text-muted">No matching types</li>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Date Range */}
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            <i className="bi bi-calendar-event me-2 text-primary"></i>
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            name="start_date"
                                            value={formData.start_date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            <i className="bi bi-calendar-check me-2 text-primary"></i>
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            name="end_date"
                                            value={formData.end_date}
                                            onChange={handleChange}
                                            min={formData.start_date}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* All Day Toggle */}
                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="allDayCheck"
                                        name="all_day"
                                        checked={formData.all_day}
                                        onChange={(e) => {
                                            handleChange(e);
                                            if (e.target.checked) {
                                                setFormData(prev => ({ ...prev, start_time: "", end_time: "" }));
                                            }
                                        }}
                                    />
                                    <label className="form-check-label fw-semibold" htmlFor="allDayCheck">
                                        All Day Leave
                                    </label>
                                </div>

                                {/* Time Range (if not all day) */}
                                {!formData.all_day && (
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">
                                                <i className="bi bi-clock me-2 text-primary"></i>
                                                Start Time
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                name="start_time"
                                                value={formData.start_time}
                                                onChange={handleChange}
                                                required={!formData.all_day}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">
                                                <i className="bi bi-clock-fill me-2 text-primary"></i>
                                                End Time
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                name="end_time"
                                                value={formData.end_time}
                                                onChange={handleChange}
                                                required={!formData.all_day}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-chat-left-text me-2 text-primary"></i>
                                        Reason / Notes
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        placeholder="Provide additional details about your leave request..."
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                    />
                                </div>

                                {/* Notification Toggle */}
                                <div className="form-check mb-4">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="notifySupervisor"
                                        name="notifySupervisor"
                                        checked={formData.notifySupervisor}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="notifySupervisor">
                                        Send email notification to supervisor
                                    </label>
                                </div>

                                {/* Submit Button */}
                                <button 
                                    type="submit" 
                                    className="btn btn-primary w-100 py-3"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-send me-2"></i>
                                            Submit Leave Request
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="col-lg-4 col-xl-6">
                    <div className="card shadow-sm border-0 bg-light">
                        <div className="card-body p-4">
                            <h5 className="card-title mb-3">
                                <i className="bi bi-info-circle me-2 text-info"></i>
                                Important Information
                            </h5>
                            
                            <div className="mb-3">
                                <h6 className="fw-semibold">📅 Leave Request Guidelines:</h6>
                                <ul className="small text-muted ps-3">
                                    <li>Submit requests at least 2 weeks in advance when possible</li>
                                    <li>Check your schedule before requesting time off</li>
                                    <li>Your supervisor will review and approve/deny the request</li>
                                    <li>You'll receive an email notification once processed</li>
                                </ul>
                            </div>

                            <div className="mb-3">
                                <h6 className="fw-semibold">⚠️ Important Notes:</h6>
                                <ul className="small text-muted ps-3">
                                    <li>Assigned shifts during your leave will be automatically reassigned</li>
                                    <li>Emergency leave should be reported immediately by phone</li>
                                    <li>Sick leave requires appropriate documentation</li>
                                </ul>
                            </div>

                            <div className="alert alert-info mb-0" role="alert">
                                <i className="bi bi-lightbulb me-2"></i>
                                <strong>Tip:</strong> For partial day leave, uncheck "All Day Leave" to specify exact hours.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}