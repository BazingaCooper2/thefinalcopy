import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";

export default function EmployeeCustomPayRates({ empId }) {
    const [customRates, setCustomRates] = useState([]);

    useEffect(() => {
        loadRates();
    }, [empId]);

    async function loadRates() {
        //const { data, error } = await supabase
        //    .from("custom_pay_rates")
        //    .select("*")
        //    .eq("emp_id", empId);

        //if (!error) setCustomRates(data || []);
    }

    return (
        <div>

            {/* ============= Default Pay Rate Section ============= */}
            <div className="border rounded p-3 mb-4">

                <div className="d-flex justify-content-between align-items-center">
                    <h6 className="fw-semibold">Default Employee Pay Rate for Visits</h6>

                    <Button size="sm" variant="outline-secondary">
                        ✏️ Edit Default Pay Rate for Visits
                    </Button>
                </div>

                <h5 className="mt-2">$ –</h5>

                <div className="alert alert-primary mt-3" style={{ background: "#ede8ff" }}>
                    <i className="bi bi-info-circle me-2"></i>
                    Please note that the Default Employee Rate will only apply to Visits with Pay Codes
                    that do not have a custom rate entered in Custom Employee Pay Rates. Default Employee
                    Rate will apply to the units of the corresponding Pay Code.
                </div>
            </div>

            {/* ============= Custom Pay Rate Section ============= */}
            <div className="border rounded p-3">

                <h6 className="fw-semibold">Custom Employee Pay Rate</h6>

                <div className="alert alert-primary mt-3" style={{ background: "#ede8ff" }}>
                    <i className="bi bi-info-circle me-2"></i>
                    The custom rates will apply to all Visits, Visit Premiums, Employee Premiums,
                    Calculated Premiums and Time off linked to the Pay Code.
                </div>

                {/* Header Bar */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="text-muted">
                        <i className="bi bi-funnel"></i>
                    </div>

                    <Button className="btn btn-primary">+ Employee Custom Rate</Button>
                </div>

                {/* Table */}
                <table className="table table-hover">
                    <thead className="table-light">
                        <tr>
                            <th>Pay Code</th>
                            <th>Pay Code Name</th>
                            <th>Pay Code Rate</th>
                            <th>Custom Rate</th>
                            <th>Units</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {customRates.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center text-muted p-4">
                                    No data found
                                </td>
                            </tr>
                        ) : (
                            customRates.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.pay_code}</td>
                                    <td>{r.pay_code_name}</td>
                                    <td>{r.pay_code_rate}</td>
                                    <td>{r.custom_rate}</td>
                                    <td>{r.units}</td>
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

                <div className="d-flex justify-content-end mt-2">
                    <small className="text-muted">Per page: 10 ▼</small>
                </div>
            </div>
        </div>
    );
}
