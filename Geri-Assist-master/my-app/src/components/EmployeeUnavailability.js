import React, { useState, useEffect } from "react";
import "../../node_modules/bootstrap-icons/font/bootstrap-icons.css";


const EmployeeUnavailability = ({ emp }) => {
    const [unavailability, setUnavailability] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);   // contains row being edited
    const [showEditModal, setShowEditModal] = useState(false);

    const [form, setForm] = useState({
        type: "Unavailable",
        start_date: "",
        end_date: "",
        start_time: "",
        end_time:"",
        description: "",
    });

    // Fetch unavailability from backend
    useEffect(() => {
        fetch(`http://127.0.0.1:5000/unavailability/${emp.emp_id}`)
            .then((res) => res.json())
            .then((data) => {
                setUnavailability(data.unavailability || []);
            });
    }, [emp.emp_id]);

    // Form input handler
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Add new unavailability
    const handleSave = async () => {
        const response = await fetch("http://127.0.0.1:5000/add_unavailability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emp_id: emp.emp_id,
                ...form,
            }),
        });

        if (response.ok) {
            setShowModal(false);
            setForm({ type: "Unavailable", start_date: "", end_date: "",start_time:"", end_time:"", description: "" });

            // refresh table
            const res = await fetch(`http://127.0.0.1:5000/unavailability/${emp.emp_id}`);
            const data = await res.json();
            setUnavailability(data.unavailability || []);
        }
    };

    const handleEdit = (row) => {
        setEditing(row);
        setShowEditModal(true);
    };

    const handleDelete = async (leave_id) => {
        if (!window.confirm("Are you sure you want to delete this entry?")) return;

        try {
            const res = await fetch(`http://127.0.0.1:5000/delete_unavailability/${leave_id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                alert("Deleted successfully");
                // remove from UI without refresh
                setUnavailability(prev => prev.filter(u => u.leave_id !== leave_id));
            } else {
                alert("Failed to delete");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdate = async () => {
        try {
            const res = await fetch(
                `http://127.0.0.1:5000/update_unavailability/${editing.leave_id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editing),
                }
            );

            if (res.ok) {
                alert("Updated successfully");

                setUnavailability(prev =>
                    prev.map(u => (u.leave_id === editing.leave_id ? editing : u))
                );

                setShowEditModal(false);
            } else {
                alert("Update failed");
            }
        } catch (err) {
            console.error("Update error:", err);
        }
    };


    function calcDuration(start, end) {
        if (!start || !end) return 0;

        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);

        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        return endMin - startMin;
    }


    return (
        <div className="d-flex mt-4">

            {/* LEFT SIDEBAR */}
            {/*<div className="border-end pe-4" style={{ width: "220px" }}>*/}
            {/*    <div className="fw mb-2">Custom Pay Rates</div>*/}
            {/*    <div className="fw text-primary mb-2">Unavailability</div>*/}
            {/*    <div className="fw mb-2">Availability</div>*/}
            {/*    <div className="fw mb-2">Employment Settings</div>*/}
            {/*    <div className="fw mb-2">Notification Settings</div>*/}
            {/*</div>*/}

            {/* RIGHT CONTENT */}
            <div className="flex-grow-1 ps-4">

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="btn btn-outline-secondary">Current and Upcoming</div>

                    <button
                        className="btn btn-primary"
                        onClick={() => setShowModal(true)}
                    >
                        + Add Unavailability
                    </button>
                </div>

                {/* TABLE */}
                <div className="table-responsive shadow-sm border rounded bg-white">
                    <table className="table mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Type</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Description</th>
                                <th>Rule</th>
                                <th>Duration</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {unavailability.map((u, index) => (
                                <tr key={index}>
                                    <td>{u.leave_type}</td>
                                    <td>{u.leave_start_date}</td>
                                    <td>{u.leave_end_date}</td>
                                    <td>{u.leave_start_time}</td>
                                    <td>{u.leave_end_time}</td>
                                    <td>{u.leave_reason}</td>

                                    <td className="text-muted small">
                                        {/* auto rule generation */}
                                        {`Every Day, from ${u.leave_start_time} to ${u.leave_end_time}  
                      Starting ${u.leave_start_date}, ending on ${u.leave_end_date}`}
                                    </td>

                                    <td>
                                        {calcDuration(u.leave_start_time, u.leave_end_time)} min

                                    </td>

                                    <td className="text-end">
                                        <div className="dropdown">
                                            <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                Action
                                            </button>
                                            <ul class="dropdown-menu">
                                                <li><button class="dropdown-item" onClick={() => handleEdit(u)}>Edit</button></li>
                                                <li><button class="dropdown-item" onClick={() => handleDelete(u.leave_id)}>Delete</button></li>
                                            </ul>
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ADD UNAVAILABILITY MODAL */}
                {showModal && (
                    <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
                        <div className="modal-dialog">
                            <div className="modal-content p-3">

                                <h5 className="fw-bold">Add Unavailability</h5>

                                <label className="mt-2">Start Date</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="start_date"
                                    value={form.start_date}
                                    onChange={handleChange}
                                />

                                <label className="mt-2">End Date</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="end_date"
                                    value={form.end_date}
                                    onChange={handleChange}
                                />
                                <label className="mt-2">Start Time</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="start_time"
                                    value={form.start_time}
                                    onChange={handleChange}
                                />

                                <label className="mt-2">End Time</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="end_time"
                                    value={form.end_time}
                                    onChange={handleChange}
                                />

                                <label className="mt-2">Description</label>
                                <select
                                    type="text"
                                    className="form-control"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                >
                                    <option name="Sick">Sick</option>
                                    <option name="Selected Shift Off">Selected Shift Off</option>
                                </select>

                                <div className="d-flex justify-content-end mt-3 gap-2">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleSave}>Save</button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {showEditModal && editing && (
                    <div className="modal-backdrop-custom">
                        <div className="modal-container p-4 shadow rounded bg-white">

                            <h5 className="mb-3">Edit Unavailability</h5>

                            <div className="mb-3">
                                <label className="form-label">Start Date</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editing.leave_start_date}
                                    onChange={(e) =>
                                        setEditing({ ...editing, leave_start_date: e.target.value })
                                    }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">End Date</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editing.leave_end_date}
                                    onChange={(e) =>
                                        setEditing({ ...editing, leave_end_date: e.target.value })
                                    }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Start Time</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editing.leave_start_time}
                                    onChange={(e) =>
                                        setEditing({ ...editing, leave_start_time: e.target.value })
                                    }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">End Time</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editing.leave_end_time}
                                    onChange={(e) =>
                                        setEditing({ ...editing, leave_end_time: e.target.value })
                                    }
                                />
                            </div>

                            <div className="d-flex justify-content-end gap-2">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpdate}
                                >
                                    Save Changes
                                </button>
                            </div>

                        </div>
                    </div>
                )}


            </div>
        </div>
    );
};

export default EmployeeUnavailability;
