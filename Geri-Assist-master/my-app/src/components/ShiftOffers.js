import React, { useEffect, useState } from "react";
import API_URL from '../config/api';


export default function ShiftOffers() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/shift-offers`)
            .then(res => res.json())
            .then(data => {
                setOffers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);
    const statusColor = (status) => {
        if (status === "accepted") return "success";
        if (status === "rejected") return "danger";
        if (status === "sent") return "warning";
        return "secondary";
    };
    const formatDateTime = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleString();
    };


    if (loading) return <p>Loading offers...</p>;

    return (
        <div className="container mt-4">
            <h3>Shift Offers</h3>

            <table className="table table-bordered mt-3">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Shift Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Sent At</th>
                        <th>Responded At</th>
                    </tr>
                </thead>
                <tbody>
                    {offers.map(o => (
                        <tr key={o.id}>
                            <td>
                                {o.employee.first_name} {o.employee.last_name}
                            </td>

                            <td>{o.shift.date}</td>

                            <td>
                                {o.shift.shift_start_time.slice(11, 16)} to
                                {o.shift.shift_end_time.slice(11, 16)}
                            </td>

                            <td>
                                <span className={`badge bg-${statusColor(o.status)}`}>
                                    {o.status.toUpperCase()}
                                </span>
                            </td>

                            <td>{formatDateTime(o.sent_at)}</td>
                            <td>{formatDateTime(o.responded_at)}</td>

                        </tr>
                    ))}
                </tbody>

            </table>
        </div>
    );
}
