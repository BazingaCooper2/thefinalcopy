import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";

export default function EmployeeAvailability({ emp }) {

    const [availability, setAvailability] = useState([]);
    const [activeTab, setActiveTab] = useState("availability");

    useEffect(() => {
        fetch(`http://127.0.0.1:5000/employees/${emp.emp_id}`)
            .then((res) => res.json())
            .then((data) => {
                setAvailability(data.employee || []);
            });
    }, [emp.emp_id]);

    

    return (
        <div className="d-flex">
            {/* ================ RIGHT CONTENT ================ */}
            <div className="flex-grow-1 ps-4">

                <div className="d-flex justify-content-between align-items-center mt-2">
                    <h5 className="fw-semibold">Availability</h5>

                    <Button className="btn btn-primary">
                        + Add Availability
                    </Button>
                </div>

                <div className="mt-3 p-3 border rounded bg-light">
                    <strong>Current and Upcoming Availability</strong>
                </div>

                {/* ========== AVAILABILITY TABLE ========== */}
                <table className="table table-hover mt-3">
                    <thead className="table-light">
                        <tr>
                            <th>Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Description</th>
                            <th>Rule</th>
                            <th>Duration</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {availability.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center text-muted p-4">
                                    No Availability Records Found
                                </td>
                            </tr>
                        ) : (
                            availability.map((a) => (
                                <tr key={a.id}>
                                    <td>{a.type}</td>
                                    <td>{a.start_date}</td>
                                    <td>{a.end_date}</td>
                                    <td>{a.description}</td>
                                    <td>{a.rule}</td>
                                    <td>{a.duration} min</td>
                                    <td>
                                        <Button size="sm" variant="outline-secondary">
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="d-flex justify-content-end me-3">
                    <small className="text-muted">Per page: 10 ▼</small>
                </div>
            </div>
        </div>
    );
}
