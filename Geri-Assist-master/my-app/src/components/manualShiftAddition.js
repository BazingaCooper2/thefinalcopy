import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const AddShift = () => {
    const [mode, setMode] = useState("client"); // "client" or "employee"
    const [clients, setClients] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [message, setMessage] = useState("");

    // Default shift values
    const [formData, setFormData] = useState({
        emp_id: "",
        client_id: "",
        shift_date: new Date().toISOString().slice(0, 10),
        shift_start_time: "09:00",
        shift_end_time: "17:00",
        shift_type: "s1",
        status:"Scheduled",
    });

    // Fetch employee + client list
    useEffect(() => {
        fetch("http://127.0.0.1:5000/employees")
            .then((res) => res.json())
            .then((data) => setEmployees(data.employee || []));

        fetch("http://127.0.0.1:5000/clients")
            .then((res) => res.json())
            .then((data) => setClients(data.client || []));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        const url =
            mode === "client"
                ? "http://127.0.0.1:5000/add_client_shift"
                : "http://127.0.0.1:5000/add_employee_shift";

        const payload =
            mode === "client"
                ? {
                    client_id: formData.client_id,
                    emp_id: formData.emp_id,
                    shift_date: formData.shift_date,
                    shift_start_time: `${formData.shift_date} ${formData.shift_start_time}`,
                    shift_end_time: `${formData.shift_date} ${formData.shift_end_time}`,
                    shift_status: formData.status,
                }
                : {
                    emp_id: formData.emp_id,
                    shift_date: formData.shift_date,
                    shift_start_time: `${formData.shift_date} ${formData.shift_start_time}`,
                    shift_end_time: `${formData.shift_date} ${formData.shift_end_time}`,
                    shift_type: formData.shift_type,
                };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setMessage("✅ Shift added successfully!");
            } else {
                setMessage("❌ Failed to add shift.");
            }
        } catch (e) {
            console.error(e);
            setMessage("⚠️ Error while adding shift.");
        }
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white fw-bold">
                    ➕ Add Shift Manually
                </div>

                <div className="card-body">
                    {/* Toggle Buttons */}
                    <div className="d-flex mb-4 gap-2">
                        <button
                            className={`btn ${mode === "client" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setMode("client")}
                        >
                            Client Shift
                        </button>

                        <button
                            className={`btn ${mode === "employee" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setMode("employee")}
                        >
                            Employee Shift
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Conditional Sections */}
                        {mode === "client" ? (
                            <>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Select Client</label>
                                    <select
                                        name="client_id"
                                        className="form-select"
                                        value={formData.client_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Choose client</option>
                                        {clients.map((c) => (
                                            <option key={c.client_id} value={c.client_id}>
                                                {c.name} (ID: {c.client_id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Select Employee</label>
                                    <select
                                        name="emp_id"
                                        className="form-select"
                                        value={formData.emp_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Choose employee</option>
                                        {employees.map((e) => (
                                            <option key={e.emp_id} value={e.emp_id}>
                                                {e.first_name} {e.last_name} (ID: {e.emp_id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                
                            </>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Select Employee</label>
                                    <select
                                        name="emp_id"
                                        className="form-select"
                                        value={formData.emp_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Choose employee</option>
                                        {employees.map((e) => (
                                            <option key={e.emp_id} value={e.emp_id}>
                                                {e.first_name} {e.last_name} (ID: {e.emp_id})
                                            </option>
                                        ))}
                                    </select>
                                    </div>
                                    {/* Shift Type */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Shift Type</label>
                                        <input
                                            name="text"
                                            className="form-select"
                                            value={formData.shift_type}
                                            onChange={handleChange}
                                        >
                                        </input>
                                    </div>
                            </>
                        )}

                        {/* Shared Fields */}
                        <div className="row mb-3">
                            <div className="col">
                                <label className="form-label fw-bold">Shift Date</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="shift_date"
                                    value={formData.shift_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col">
                                <label className="form-label fw-bold">Start Time</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="shift_start_time"
                                    value={formData.shift_start_time}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col">
                                <label className="form-label fw-bold">End Time</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="shift_end_time"
                                    value={formData.shift_end_time}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-success w-100 fw-bold">
                            Add Shift
                        </button>
                    </form>

                    {message && (
                        <div className="alert alert-info mt-3 text-center">{message}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddShift;
