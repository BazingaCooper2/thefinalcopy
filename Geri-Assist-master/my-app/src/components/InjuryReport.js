import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dropdown, ButtonGroup, Button } from 'react-bootstrap';
import API_URL from '../config/api';

function InjuryReportPage() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  // Static locations
  const locationsList = ["85 Neeve", "87 Neeve", "Willow Place", "Outreach", "Assisted Living"];

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

    if (reportTypeFilter) {
      result = result.filter(r => (r.report_type || 'Injury') === reportTypeFilter);
    }

    setFilteredReports(result);
  }, [searchTerm, locationFilter, statusFilter, reportTypeFilter, reports]);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/injury_reports`);
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

  const getSeverityBadge = (report) => {
    const type = report.report_type || 'Injury';
    const severity = report.severity || '';

    if (type === 'Hazard') {
      return severity === 'serious'
        ? <span className="badge bg-danger">Serious Hazard</span>
        : <span className="badge bg-warning text-dark">Minor / Near Miss</span>;
    }

    if (type === 'Incident') {
      return <span className="badge bg-primary">Incident</span>;
    }

    // Default Injury Logic
    if (!severity) return <span className="badge bg-secondary">Injury</span>;
    if (severity === 'Medical Attention') return <span className="badge bg-danger">Medical Attention</span>;
    return <span className="badge bg-secondary">Injury</span>;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Hazard': return <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>;
      case 'Incident': return <i className="bi bi-exclamation-circle-fill text-primary fs-5"></i>;
      default: return <i className="bi bi-bandaid-fill text-danger fs-5"></i>;
    }
  };

  const handleAction = async (e, action, report) => {
    e.stopPropagation();
    console.log(`Action: ${action} for report ${report.id}`);

    if (action === 'Delete') {
      if (window.confirm('Are you sure you want to delete this report?')) {
        try {
          await axios.delete(`${API_URL}/injury_reports/${report.id}?type=${report.report_type || 'Injury'}`);
          setReports(prev => prev.filter(r => r.id !== report.id || (r.report_type && r.report_type !== report.report_type)));
        } catch (err) {
          alert('Failed to delete report');
          console.error(err);
        }
      }
    } else if (action === 'Approve') {
      try {
        await axios.put(`${API_URL}/injury_reports/${report.id}/status`, { status: 'Approved' });
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
            {locationsList.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ maxWidth: '160px' }}
            value={reportTypeFilter}
            onChange={(e) => setReportTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Injury">Injury</option>
            <option value="Incident">Incident</option>
            <option value="Hazard">Hazard</option>
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
                      {getSeverityBadge(report)}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center border" style={{ width: '32px', height: '32px' }}>
                          {getTypeIcon(report.report_type)}
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

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .modal.show {
              position: absolute;
              left: 0;
              top: 0;
              margin: 0;
              padding: 0;
              overflow: visible !important;
            }
            .modal-content, .modal-content * {
              visibility: visible;
            }
            .modal-content {
              box-shadow: none !important;
              border: none !important;
            }
            .modal-header, .modal-footer, .btn-close {
              display: none !important;
            }
            .modal-body {
              padding: 0 !important;
            }
          }
        `}
      </style>

      {/* View Modal */}
      {selectedReport && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg animate-slideUp">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  Incident Report Details #{selectedReport.id || 'N/A'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedReport(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">

                  {/* Status Banner */}
                  <div className="col-12 text-center pb-3 border-bottom">
                    {getSeverityBadge(selectedReport)}
                    <h3 className="mt-2 text-primary fw-bold">{selectedReport.report_type === 'Hazard' ? 'Hazard Report' : selectedReport.injured_person}</h3>
                    <p className="text-muted mb-1">
                      <i className="bi bi-geo-alt me-1"></i> {selectedReport.location} &bull;
                      <i className="bi bi-calendar3 ms-2 me-1"></i> {new Date(selectedReport.date).toLocaleDateString()}
                    </p>
                    <span className={`badge ${selectedReport.status === 'Approved' ? 'bg-success' : 'bg-secondary'}`}>
                      Status: {selectedReport.status || 'Submitted'}
                    </span>
                  </div>

                  {/* 1. Description */}
                  <div className="col-12">
                    <div className="bg-light p-3 rounded h-100">
                      <label className="text-primary small fw-bold text-uppercase mb-2">Description</label>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Conditional Rendering based on Report Type */}

                  {/* --- HAZARD SPECIFIC --- */}
                  {selectedReport.report_type === 'Hazard' && (
                    <>
                      <div className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                            <i className="bi bi-exclamation-triangle me-2 text-warning"></i>Hazard Details
                          </div>
                          <div className="card-body ps-0">
                            <dl className="row mb-0">
                              <dt className="col-sm-5 text-muted small text-uppercase">Hazard Types</dt>
                              <dd className="col-sm-7">{(selectedReport.hazard_types || []).join(", ") || 'N/A'}</dd>
                              <dt className="col-sm-5 text-muted small text-uppercase">Immediate Action</dt>
                              <dd className="col-sm-7">{selectedReport.immediate_action || 'N/A'}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                            <i className="bi bi-people me-2"></i>Involved
                          </div>
                          <div className="card-body ps-0">
                            <p className="mb-1"><strong>Workers:</strong> {selectedReport.workers_involved || 'None'}</p>
                            <p className="mb-0"><strong>Clients:</strong> {selectedReport.clients_involved || 'None'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* --- INCIDENT SPECIFIC --- */}
                  {selectedReport.report_type === 'Incident' && (
                    <>
                      <div className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                            <i className="bi bi-clipboard-data me-2 text-info"></i>Details
                          </div>
                          <div className="card-body ps-0">
                            <dl className="row mb-0">
                              <dt className="col-sm-5 text-muted small text-uppercase">Sequence of Events</dt>
                              <dd className="col-sm-7">{selectedReport.sequence_of_events || 'N/A'}</dd>
                              <dt className="col-sm-5 text-muted small text-uppercase">Immediate Actions</dt>
                              <dd className="col-sm-7">{selectedReport.immediate_actions || 'N/A'}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                            <i className="bi bi-person-lines-fill me-2"></i>Involved Parties
                          </div>
                          <div className="card-body ps-0">
                            <p className="mb-1"><strong>Who Involved:</strong> {selectedReport.injured_person}</p>
                            <p className="mb-1"><strong>Client Concerns:</strong> {selectedReport.client_concerns || 'N/A'}</p>
                            <p className="mb-0"><strong>Injuries:</strong> {selectedReport.injuries || 'None'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* --- INJURY SPECIFIC (Original Layout) --- */}
                  {(selectedReport.report_type === 'Injury' || !selectedReport.report_type) && (
                    <>
                      <div className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                            <i className="bi bi-bandaid me-2 text-danger"></i>Injury Details
                          </div>
                          <div className="card-body ps-0">
                            <dl className="row mb-0">
                              <dt className="col-sm-5 text-muted small text-uppercase">Date of Injury</dt>
                              <dd className="col-sm-7">{selectedReport.injury_date}</dd>
                              <dt className="col-sm-5 text-muted small text-uppercase">Time of Injury</dt>
                              <dd className="col-sm-7">{selectedReport.injury_time}</dd>
                              <dt className="col-sm-5 text-muted small text-uppercase">Body Parts</dt>
                              <dd className="col-sm-7">
                                {Array.isArray(selectedReport.injured_body_parts)
                                  ? selectedReport.injured_body_parts.join(", ")
                                  : selectedReport.injured_body_parts || 'None specified'}
                              </dd>
                              <dt className="col-sm-5 text-muted small text-uppercase">Program/Service</dt>
                              <dd className="col-sm-7">{selectedReport.program || 'N/A'}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                            <i className="bi bi-hospital me-2 text-success"></i>Medical Info
                          </div>
                          <div className="card-body ps-0">
                            <dl className="row mb-0">
                              <dt className="col-sm-7 text-muted small text-uppercase">Medical Attention?</dt>
                              <dd className="col-sm-5 fw-bold">{selectedReport.medical_attention_required ? "YES" : "NO"}</dd>
                              <dt className="col-sm-7 text-muted small text-uppercase">RTW Package Given?</dt>
                              <dd className="col-sm-5 fw-bold">{selectedReport.rtw_package_taken ? "YES" : "NO"}</dd>
                              <dt className="col-sm-12 text-muted small text-uppercase mt-2">Health Care Provider</dt>
                              <dd className="col-sm-12">
                                {selectedReport.hcp_name ? (
                                  <div className="bg-light p-2 rounded small">
                                    <strong>{selectedReport.hcp_name}</strong><br />
                                    {selectedReport.hcp_address}<br />
                                    Ph: {selectedReport.hcp_phone}
                                  </div>
                                ) : "N/A"}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </>
                  )}


                  {/* 3. Reporting Info (Common) */}
                  <div className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm">
                      <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                        <i className="bi bi-file-earmark-text me-2 text-info"></i>Reporting Info
                      </div>
                      <div className="card-body ps-0">
                        <dl className="row mb-0">
                          <dt className="col-sm-5 text-muted small text-uppercase">Reported By</dt>
                          <dd className="col-sm-7">{selectedReport.reporting_employee}</dd>
                          <dt className="col-sm-5 text-muted small text-uppercase">Date Reported</dt>
                          <dd className="col-sm-7">{selectedReport.reported_date}</dd>
                          <dt className="col-sm-5 text-muted small text-uppercase">Reported To</dt>
                          <dd className="col-sm-7">{selectedReport.reported_to_supervisor_name || 'N/A'}</dd>
                          <dt className="col-sm-5 text-muted small text-uppercase">Delay Reason</dt>
                          <dd className="col-sm-7">{selectedReport.delay_reason || 'N/A'}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  {/* 4. Witness Information (Common) */}
                  <div className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm">
                      <div className="card-header bg-white fw-bold text-dark border-bottom-0 pb-0 ps-0">
                        <i className="bi bi-eye me-2 text-warning"></i>Witness Info
                      </div>
                      <div className="card-body ps-0">
                        {selectedReport.witness_name ? (
                          <dl className="row mb-0">
                            <dt className="col-sm-4 text-muted small text-uppercase">Name</dt>
                            <dd className="col-sm-8">{selectedReport.witness_name}</dd>
                            <dt className="col-sm-4 text-muted small text-uppercase">Remarks</dt>
                            <dd className="col-sm-8 fst-italic">"{selectedReport.witness_remarks || selectedReport.witness_statement}"</dd>
                          </dl>
                        ) : (
                          <p className="text-muted fst-italic">No witness recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 border-top pt-3">
                    <label className="text-success small fw-bold text-uppercase mb-2">Action Taken / Status</label>
                    <p className="mb-0 text-dark">{selectedReport.status || 'No immediate action recorded'}</p>
                  </div>

                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <i className="bi bi-printer me-2"></i> Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InjuryReportPage;