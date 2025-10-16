import React, { useEffect, useState } from 'react';
import axios from 'axios';

function InjuryReportPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Replace with your actual API endpoint
    axios.get('http://127.0.0.1:5000/injury_reports')
      .then((response) => {
        setReports(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch injury reports.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="container my-4 ms-sm-5">
      <h2 className="mb-4">Injury Reports</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead className="thead-dark">
              <tr>
                <th>Date</th>
                <th>Person Injured</th>
                <th>Reported By</th>
                <th>Location</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No injury reports available.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>{new Date(report.date).toLocaleString()}</td>
                    <td>{report.injured_person}</td>
                    <td>{report.reporting_employee}</td>
                    <td>{report.location}</td>
                    <td>{report.description}</td>
                    <td>{report.severity}</td>
                    <td>{report.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InjuryReportPage;