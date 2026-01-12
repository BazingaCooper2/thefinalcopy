import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dropdown, ButtonGroup, Button } from 'react-bootstrap';

function InjuryReportPage() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  // unique locations
  const uniqueLocations = [...new Set(reports.map(r => r.location).filter(Boolean))].sort();

  useEffect(() => {
    let result = reports;

    if (locationFilter) {
      result = result.filter(r => r.location === locationFilter);
    }

    if (statusFilter) {
      result = result.filter(r => (r.status || 'Unapproved').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.injured_person?.toLowerCase().includes(lower) ||
        r.location?.toLowerCase().includes(lower) ||
        r.reporting_employee?.toLowerCase().includes(lower)
      );
    }

    setFilteredReports(result);
  }, [searchTerm, locationFilter, reports]);

  const fetchReports = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/injury_reports');
      // Sort by date descending
      const sorted = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setReports(sorted);
      setFilteredReports(sorted);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch injury reports.');
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    if (!severity) return <span className="badge bg-secondary">Unknown</span>;
    const sev = severity.toLowerCase();
    if (sev.includes('high') || sev.includes('serious')) return <span className="badge bg-danger">Serious</span>;
    if (sev.includes('medium')) return <span className="badge bg-warning text-dark">Medium</span>;
    return <span className="badge bg-info text-dark">Minor/Near Miss</span>;
  };

  const handleAction = async (e, action, report) => {
    e.stopPropagation();
    console.log(`Action: ${action} for report ${report.id}`);

    if (action === 'Delete') {
      if (window.confirm('Are you sure you want to delete this report?')) {
        try {
          await axios.delete(`http://127.0.0.1:5000/injury_reports/${report.id}`);
          setReports(prev => prev.filter(r => r.id !== report.id));
        } catch (err) {
          alert('Failed to delete report');
          console.error(err);
        }
      }
    } else if (action === 'Approve') {
      try {
        await axios.put(`http://127.0.0.1:5000/injury_reports/${report.id}/status`, { status: 'Approved' });
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'Approved' } : r));
      } catch (err) {
        alert('Failed to approve report');
        console.error(err);
      }
    } else if (action === 'Print') {
      window.print();
    } else if (action === 'Email') {
      alert('Email functionality not yet implemented.');
    }
  };

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Incident & Injury Reports</h2>
          <p className="text-muted">Monitor and manage workplace incidents</p>
        </div>
        <div className="d-flex gap-3">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ maxWidth: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Unapproved">Unapproved</option>
            <option value="Reviewed">Reviewed</option>
          </select>

          <select
            className="form-select"
            style={{ maxWidth: '200px' }}
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">All Locations</option>
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => window.location.href = '/fillInjuryReport'}>
            <i className="bi bi-plus-lg"></i> New Report
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 text-muted">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger m-3">{error}</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-clipboard-x text-muted" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3 text-muted">No reports found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light text-secondary">
                <tr>
                  <th className="ps-4 py-3">Date</th>
                  <th className="py-3">Type / Severity</th>
                  <th className="py-3">Injured Person</th>
                  <th className="py-3">Location</th>
                  <th className="py-3">Status / Action</th>
                  <th className="py-3 text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id || Math.random()} style={{ cursor: 'pointer' }} onClick={() => setSelectedReport(report)}>
                    <td className="ps-4">
                      <div className="fw-semibold text-dark">{new Date(report.date).toLocaleDateString()}</div>
                      <div className="small text-muted">{new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      {getSeverityBadge(report.severity)}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center border" style={{ width: '32px', height: '32px' }}>
                          <i className="bi bi-person text-secondary"></i>
                        </div>
                        <div>
                          <div className="fw-medium text-dark">{report.injured_person}</div>
                          <div className="small text-muted">Reported by: {report.reporting_employee}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1 text-secondary">
                        <i className="bi bi-geo-alt"></i> {report.location}
                      </div>
                    </td>
                    <td>
                      <div className="d-inline-block text-truncate" style={{ maxWidth: '200px' }}>
                        {report.status || report.description}
                      </div>
                    </td>
                    <td className="text-end pe-4" onClick={(e) => e.stopPropagation()}>
                      <Dropdown as={ButtonGroup} size="sm">
                        <Button variant="outline-primary" onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}>View</Button>
                        <Dropdown.Toggle split variant="outline-primary" id={`dropdown-split-${report.id}`} />
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={(e) => handleAction(e, 'Approve', report)}>Approve</Dropdown.Item>
                          <Dropdown.Item onClick={(e) => handleAction(e, 'Email', report)}>Email</Dropdown.Item>
                          <Dropdown.Item onClick={(e) => handleAction(e, 'Print', report)}>Print</Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item className="text-danger" onClick={(e) => handleAction(e, 'Delete', report)}>Delete</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedReport && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg animate-slideUp">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  Incident Report Details
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedReport(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-md-12 text-center pb-3 border-bottom">
                    {getSeverityBadge(selectedReport.severity)}
                    <h3 className="mt-2 text-primary fw-bold">{selectedReport.injured_person}</h3>
                    <p className="text-muted"><i className="bi bi-geo-alt me-1"></i> {selectedReport.location} | {new Date(selectedReport.date).toLocaleString()}</p>
                  </div>

                  <div className="col-md-6">
                    <label className="text-muted small fw-bold text-uppercase">Reported By</label>
                    <p className="lead fs-6">{selectedReport.reporting_employee}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="text-muted small fw-bold text-uppercase">Incident ID</label>
                    <p className="lead fs-6">#{selectedReport.id || 'N/A'}</p>
                  </div>

                  <div className="col-12 bg-light p-3 rounded">
                    <label className="text-primary small fw-bold text-uppercase mb-2">Description of Incident / Injury</label>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.description}</p>
                  </div>

                  <div className="col-12 border p-3 rounded">
                    <label className="text-success small fw-bold text-uppercase mb-2">Action Taken / Status</label>
                    <p className="mb-0 text-dark">{selectedReport.status || 'No immediate action recorded'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
                <button type="button" className="btn btn-primary"><i className="bi bi-printer me-2"></i> Print Report</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InjuryReportPage;