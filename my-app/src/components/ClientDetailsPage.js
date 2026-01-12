import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ClientDetailsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [documents, setDocuments] = useState([]);

  // Fetch all clients from API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/clients");
        setClients(response.data.client || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Filter clients based on search and location
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.client_id.toString().includes(search.trim()) ||
      client.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(search.toLowerCase());

    const matchesLocation = locationFilter === "" || client.city === locationFilter;

    return matchesSearch && matchesLocation;
  });

  // Unique locations for filter dropdown
  const locations = [...new Set(clients.map(c => c.city).filter(Boolean))].sort();

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: 'bi-person-circle' },
    { id: 'medical', label: 'Medical History', icon: 'bi-heart-pulse' },
    { id: 'contacts', label: 'Emergency Contacts', icon: 'bi-telephone' },
    { id: 'schedule', label: 'Schedule', icon: 'bi-calendar-check' },
    { id: 'documents', label: 'Documents', icon: 'bi-file-earmark-text' },
    { id: 'notes', label: 'Progress Notes', icon: 'bi-journal-text' },
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="text-center">
          <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: 'var(--primary-purple)' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page Header */}
      <div className="page-header d-flex justify-content-between align-items-start">
        <div>
          <h1 className="page-title">
            <i className="bi bi-person-circle me-3"></i>
            Client Management
          </h1>
          <p className="page-subtitle">Comprehensive client information and care management</p>
        </div>
        {selectedClient && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => { setSelectedClient(null); setSearch(""); setLocationFilter(""); }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Client List
          </button>
        )}
      </div>

      {!selectedClient ? (
        /* Client List View */
        <div className="animate-slideUp">
          {/* Filters */}
          <div className="content-card mb-4">
            <div className="row g-3">
              <div className="col-md-8">
                <div className="input-group-modern">
                  <label className="input-label-modern">
                    <i className="bi bi-search me-2"></i>
                    Search Client
                  </label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="input-modern"
                      placeholder="Enter client ID, first name, or last name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        className="btn position-absolute end-0 top-50 translate-middle-y me-2"
                        onClick={() => setSearch("")}
                        style={{ background: 'transparent', border: 'none', color: 'var(--gray-400)' }}
                      >
                        <i className="bi bi-x-circle-fill"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="input-group-modern">
                  <label className="input-label-modern">
                    <i className="bi bi-geo-alt me-2"></i>
                    Filter by Location
                  </label>
                  <select
                    className="form-select input-modern"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    style={{ height: '52px' }}
                  >
                    <option value="">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Client Grid */}
          {filteredClients.length > 0 ? (
            <div className="row g-4">
              {filteredClients.map(client => (
                <div key={client.client_id} className="col-md-6 col-lg-4 col-xl-3">
                  <div
                    className="card h-100 border-0 shadow-sm hover-elevate transition-all"
                    style={{ borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="card-body text-center p-4">
                      <div className="position-relative d-inline-block mb-3">
                        <img
                          src={client.image_url || "https://via.placeholder.com/150"}
                          alt={`${client.first_name} ${client.last_name}`}
                          className="rounded-circle shadow-sm"
                          style={{ width: "100px", height: "100px", objectFit: "cover", border: '3px solid white' }}
                        />
                        <span className={`position-absolute bottom-0 end-0 badge rounded-circle p-2 border border-2 border-white ${client.status === 'Active' ? 'bg-success' : 'bg-success'}`} style={{ width: '15px', height: '15px' }}></span>
                      </div>

                      <h5 className="fw-bold mb-1">{client.first_name} {client.last_name}</h5>
                      <p className="text-muted small mb-2">ID: {client.client_id}</p>

                      <div className="d-flex justify-content-center gap-2 mb-3">
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-hospital me-1"></i>
                          {client.program_group || 'Willow Place'}
                        </span>
                        {client.city && (
                          <span className="badge bg-light text-dark border">
                            <i className="bi bi-geo-alt me-1"></i>
                            {client.city}
                          </span>
                        )}
                      </div>

                      <div className="d-grid">
                        <button className="btn btn-outline-primary btn-sm rounded-pill">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-search" style={{ fontSize: '3rem', color: 'var(--gray-300)' }}></i>
              <h5 className="mt-3 text-muted">No clients found</h5>
              <p className="text-muted">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        /* Client Detail View */
        <div className="content-card animate-slideUp">
          {/* Client Header */}
          <div className="row g-4 pb-4 border-bottom">
            <div className="col-md-3 text-center">
              <div className="position-relative d-inline-block">
                <img
                  src={selectedClient.image_url || "https://via.placeholder.com/150"}
                  alt="Client"
                  className="rounded-circle shadow-lg"
                  style={{ width: "150px", height: "150px", objectFit: "cover", border: '4px solid white' }}
                />
                <span className="position-absolute bottom-0 end-0 badge bg-success rounded-circle p-2" style={{ width: '20px', height: '20px' }}></span>
              </div>

              <h3 className="mt-3 mb-1 fw-bold">
                {selectedClient.first_name} {selectedClient.last_name}
              </h3>
              <span className="badge px-3 py-2 mb-2" style={{ background: 'var(--primary-gradient)', color: 'white', fontSize: '0.9rem' }}>
                <i className="bi bi-hash me-1"></i>
                {selectedClient.client_id}
              </span>
              <div className="text-muted small">
                <i className="bi bi-hospital me-1"></i>
                {selectedClient.program_group || 'Willow Place'}
              </div>
            </div>

            <div className="col-md-9">
              <div className="row g-3">
                <QuickInfo icon="bi-card-text" label="Health Card" value={selectedClient.health_card || 'N/A'} />
                <QuickInfo icon="bi-translate" label="Language" value={selectedClient.preferred_language || 'English'} />
                <QuickInfo icon="bi-telephone" label="Phone" value={selectedClient.phone || 'N/A'} />
                <QuickInfo icon="bi-envelope" label="Email" value={selectedClient.email || 'N/A'} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="d-flex gap-2 my-4 overflow-auto pb-2" style={{ borderBottom: '2px solid var(--gray-200)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`btn d-flex align-items-center gap-2 px-3 py-2 ${activeTab === tab.id ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all var(--transition-base)',
                  whiteSpace: 'nowrap',
                  border: activeTab === tab.id ? 'none' : '1px solid var(--gray-300)',
                  background: activeTab === tab.id ? 'var(--primary-gradient)' : 'white'
                }}
              >
                <i className={`bi ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'profile' && <ProfileTab client={selectedClient} />}
            {activeTab === 'medical' && <MedicalHistoryTab client={selectedClient} />}
            {activeTab === 'contacts' && <EmergencyContactsTab client={selectedClient} />}
            {activeTab === 'schedule' && <ScheduleTab client={selectedClient} />}
            {activeTab === 'documents' && <DocumentsTab client={selectedClient} documents={documents} setDocuments={setDocuments} />}
            {activeTab === 'notes' && <ProgressNotesTab client={selectedClient} />}
          </div>
        </div>
      )}
    </div>
  );
}

// Quick Info Component
function QuickInfo({ icon, label, value }) {
  return (
    <div className="col-md-6">
      <div className="d-flex align-items-center gap-2">
        <i className={`bi ${icon}`} style={{ color: 'var(--primary-purple)', fontSize: '1.2rem' }}></i>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="fw-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ client }) {
  return (
    <div className="row g-3">
      <SectionHeader icon="bi-person-badge" title="Personal Information" />
      <InfoField icon="bi-card-text" label="Health Card Number" value={client.health_card_number} />
      <InfoField icon="bi-person" label="First Name" value={client.first_name} />
      <InfoField icon="bi-person-fill" label="Last Name" value={client.last_name} />
      <InfoField icon="bi-calendar-event" label="Date of Birth" value={client.date_of_birth} />
      <InfoField icon="bi-gender-ambiguous" label="Gender" value={client.gender} />
      <InfoField icon="bi-translate" label="Preferred Language" value={client.preferred_language} />

      <SectionHeader icon="bi-hospital" title="Program & Care" />
      <InfoField icon="bi-building" label="Program Group" value={client.program_group || 'Willow Place'} badge />
      <InfoField icon="bi-activity" label="Ailment Type" value={client.ailment_type || 'N/A'} />
      <InfoField icon="bi-person-badge-fill" label="Care Manager" value={client.care_manager || 'N/A'} />
      <InfoField icon="bi-person-heart" label="Care Coordinator" value={client.client_coordinator_name || 'N/A'} />

      <SectionHeader icon="bi-geo-alt" title="Contact Information" />
      <InfoField icon="bi-telephone" label="Phone" value={client.phone} />
      <InfoField icon="bi-envelope" label="Email" value={client.email} fullWidth />
      <InfoField
        icon="bi-house-door"
        label="Address"
        value={`${client.address_line1 || ''} ${client.address_line2 || ''} ${client.city || ''}, ${client.province || ''} ${client.zip_code || ''}`.trim() || 'N/A'}
        fullWidth
      />

      <SectionHeader icon="bi-cash-stack" title="Financial" />
      <InfoField icon="bi-wallet2" label="Accounting Details" value={client.accounting_details || 'N/A'} fullWidth />
    </div>
  );
}

// Medical History Tab
function MedicalHistoryTab({ client }) {
  return (
    <div className="row g-3">
      <SectionHeader icon="bi-clipboard2-pulse" title="Diagnosis & Conditions" />
      <InfoField icon="bi-file-medical" label="Primary Diagnosis" value={client.primary_diagnosis || 'N/A'} fullWidth />
      <InfoField icon="bi-sticky" label="Medical Notes" value={client.medical_notes || 'N/A'} fullWidth />

      <SectionHeader icon="bi-wheelchair" title="Mobility & Equipment" />
      <div className="col-md-4">
        <StatusBadge
          icon="bi-wheelchair"
          label="Wheelchair User"
          active={client.wheelchair_user}
        />
      </div>
      <div className="col-md-4">
        <StatusBadge
          icon="bi-box-seam"
          label="Catheter"
          active={client.has_catheter}
        />
      </div>
      <div className="col-md-4">
        <StatusBadge
          icon="bi-wind"
          label="Oxygen"
          active={client.requires_oxygen}
        />
      </div>

      <SectionHeader icon="bi-people" title="Care Team" />
      <InfoField icon="bi-person-badge" label="Assigned Doctor" value={client.doctor_name || 'N/A'} />
      <InfoField icon="bi-telephone" label="Doctor Contact" value={client.doctor_contact || 'N/A'} />
      <InfoField icon="bi-person-hearts" label="Assigned Nurse" value={client.assigned_nurse || 'N/A'} />

      <SectionHeader icon="bi-exclamation-triangle" title="Risks & Precautions" />
      <InfoField icon="bi-shield-exclamation" label="Known Risks" value={client.risks || 'None documented'} fullWidth />
    </div>
  );
}

// Emergency Contacts Tab
function EmergencyContactsTab({ client }) {
  const mockContacts = [
    { name: 'Dr. Sarah Johnson', relationship: 'Physician', phone: '(519) 555-0123', email: 'sarah.j@hospital.com' },
    { name: 'Emily Martinez', relationship: 'Care Coordinator', phone: '(519) 555-0124', email: 'emily.m@gerriassist.com' },
    { name: 'Mark Thompson', relationship: 'Brother', phone: '(519) 555-0125', email: 'mark.t@email.com' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="m-0"><i className="bi bi-telephone-plus me-2"></i>Emergency Contacts</h5>
        <button className="btn-modern btn-primary btn-sm">
          <i className="bi bi-plus-circle me-1"></i>
          Add Contact
        </button>
      </div>

      <div className="row g-3">
        {mockContacts.map((contact, index) => (
          <div key={index} className="col-md-6">
            <div className="p-3 rounded shadow-sm" style={{ background: 'white', border: '1px solid var(--gray-200)' }}>
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', color: 'white', fontWeight: '600' }}>
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="fw-bold">{contact.name}</div>
                    <span className="badge badge-sm" style={{ background: 'var(--info-gradient)', color: 'white' }}>
                      {contact.relationship}
                    </span>
                  </div>
                </div>
                <button className="btn btn-sm" style={{ color: 'var(--gray-400)' }}>
                  <i className="bi bi-three-dots-vertical"></i>
                </button>
              </div>
              <div className="small mt-3">
                <div className="mb-1">
                  <i className="bi bi-telephone me-2 text-muted"></i>
                  {contact.phone}
                </div>
                <div>
                  <i className="bi bi-envelope me-2 text-muted"></i>
                  {contact.email}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Schedule Tab
function ScheduleTab({ client }) {
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mockSchedule = {
    'Monday': [{ time: '8:00 - 12:00', type: 'D', employee: 'Sarah J.' }],
    'Wednesday': [{ time: '8:00 - 12:00', type: 'D', employee: 'Mike R.' }],
    'Friday': [{ time: '8:00 - 12:00', type: 'D', employee: 'Sarah J.' }],
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="m-0"><i className="bi bi-calendar-week me-2"></i>Weekly Schedule</h5>
        <button className="btn-modern btn-primary btn-sm">
          <i className="bi bi-plus-circle me-1"></i>
          Add Shift
        </button>
      </div>

      <div className="row g-3">
        {weekDays.map(day => (
          <div key={day} className="col-md-12">
            <div className="p-3 rounded" style={{ background: mockSchedule[day] ? 'var(--gray-50)' : 'white', border: '1px solid var(--gray-200)' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold">{day}</div>
                {mockSchedule[day] ? (
                  <div className="d-flex gap-2">
                    {mockSchedule[day].map((shift, idx) => (
                      <span key={idx} className="badge px-3 py-2" style={{ background: 'var(--success-gradient)', color: 'white' }}>
                        <i className="bi bi-clock me-1"></i>
                        {shift.time} - {shift.employee}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted small">No shifts scheduled</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Documents Tab
function DocumentsTab({ client, documents, setDocuments }) {
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      uploadDate: new Date().toLocaleDateString(),
      category: 'General'
    }));
    setDocuments([...documents, ...newDocs]);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="m-0"><i className="bi bi-file-earmark-text me-2"></i>Documents & Attachments</h5>
        <label className="btn-modern btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          <i className="bi bi-upload me-1"></i>
          Upload Document
          <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {documents.length > 0 ? (
        <div className="table-responsive">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Category</th>
                <th>Size</th>
                <th>Upload Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={index}>
                  <td>
                    <i className="bi bi-file-pdf text-danger me-2"></i>
                    {doc.name}
                  </td>
                  <td><span className="badge" style={{ background: 'var(--info-gradient)', color: 'white' }}>{doc.category}</span></td>
                  <td>{doc.size}</td>
                  <td>{doc.uploadDate}</td>
                  <td className="text-center">
                    <button className="btn btn-sm me-2" style={{ color: 'var(--primary-purple)' }}>
                      <i className="bi bi-download"></i>
                    </button>
                    <button className="btn btn-sm" style={{ color: 'var(--gray-400)' }}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-5" style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <i className="bi bi-cloud-upload" style={{ fontSize: '3rem', color: 'var(--gray-300)' }}></i>
          <p className="mt-3 text-muted">No documents uploaded yet</p>
        </div>
      )}
    </div>
  );
}

// Progress Notes Tab
function ProgressNotesTab({ client }) {
  const [notes, setNotes] = useState([
    {
      id: 1,
      createdOn: '2025-12-15 09:12',
      clientName: `${client.first_name} ${client.last_name}`,
      details: 'Joe may be coming home from Hospital in afternoon on Wed Dec 17',
      author: 'Stacey Jayne, Program Manager - Community',
      timeInfo: '2 days ago, 2025-12-15 09:12',
      type: 'Individual Client Record',
      status: 'Active'
    },
    {
      id: 2,
      createdOn: '2025-11-14 11:53',
      clientName: `${client.first_name} ${client.last_name}`,
      details: 'A month ago, 2025-11-14 11:53',
      author: 'Stacey Jayne, Program Manager - Community',
      timeInfo: 'a month ago, 2025-11-14 11:53',
      type: 'Individual Client Record',
      status: 'Active'
    },
  ]);

  const [noteContent, setNoteContent] = useState('');

  return (
    <div className="animate-fadeIn">
      {/* Editor Section */}
      <div className="border rounded bg-white mb-4">
        {/* Toolbar */}
        <div className="d-flex align-items-center gap-3 p-2 border-bottom bg-light rounded-top flex-wrap">
          <select className="form-select form-select-sm" style={{ width: '100px' }} defaultValue="Normal">
            <option>Normal</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
          </select>
          <div className="vr text-secondary"></div>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-type-bold"></i></button>
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-type-italic"></i></button>
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-type-underline"></i></button>
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-type-strikethrough"></i></button>
          </div>
          <div className="vr text-secondary"></div>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-palette"></i></button>
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-link-45deg"></i></button>
          </div>
          <div className="vr text-secondary"></div>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-list-ul"></i></button>
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-list-ol"></i></button>
            <button className="btn btn-light border-0 text-secondary"><i className="bi bi-text-indent-left"></i></button>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          className="form-control border-0 p-3"
          rows="6"
          style={{ resize: 'vertical', minHeight: '150px' }}
          placeholder=""
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        ></textarea>
      </div>

      {/* Action Bar */}
      <div className="d-flex align-items-center gap-3 mb-4 bg-light p-2 rounded border">
        <select className="form-select form-select-sm" style={{ width: '200px' }}>
          <option>Individual Client Record</option>
          <option>Medical Note</option>
          <option>General Note</option>
        </select>
        <button className="btn btn-primary btn-sm px-4">Publish</button>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3 bg-white p-3 rounded border">
        <select className="form-select form-select-sm" style={{ width: '120px' }} defaultValue="Published">
          <option>Published</option>
          <option>Draft</option>
          <option>Archived</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: '120px' }} defaultValue="Note Types">
          <option>Note Types</option>
          <option>Clinical</option>
          <option>General</option>
        </select>
        <input type="text" className="form-control form-control-sm" style={{ width: '140px' }} placeholder="Created Start Date" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => e.target.type = 'text'} />
        <input type="text" className="form-control form-control-sm" style={{ width: '140px' }} placeholder="Created End Date" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => e.target.type = 'text'} />
        <select className="form-select form-select-sm" style={{ width: '130px' }} defaultValue="Employees">
          <option>Employees</option>
        </select>
        <button className="btn btn-outline-primary btn-sm px-3">
          Reset
        </button>
        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-light btn-sm border"><i className="bi bi-printer text-secondary"></i></button>
          <button className="btn btn-light btn-sm border"><i className="bi bi-gear text-secondary"></i></button>
          <div className="input-group input-group-sm" style={{ width: '200px' }}>
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input type="text" className="form-control border-start-0 ps-0" placeholder="Find" />
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-light btn-sm border fw-semibold text-secondary">Expand All</button>
        <button className="btn btn-light btn-sm border fw-semibold text-secondary">Collapse All</button>
      </div>

      {/* Notes Table */}
      <div className="border rounded bg-white overflow-hidden">
        <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
          <thead className="bg-light text-secondary">
            <tr>
              <th className="py-3 ps-3" style={{ width: '50px' }}></th>
              <th className="py-3 text-primary">Created On <i className="bi bi-sort-down ms-1"></i></th>
              <th className="py-3">Client Name</th>
              <th className="py-3">Details</th>
              <th className="py-3">Status</th>
              <th className="py-3 text-end pe-3"></th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <React.Fragment key={note.id}>
                <tr className="align-middle border-bottom-0">
                  <td className="ps-3">
                    <button className="btn btn-sm btn-light border text-secondary" style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}>
                      <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem' }}></i>
                    </button>
                  </td>
                  <td className="text-secondary">{note.createdOn}</td>
                  <td className="text-secondary">{note.clientName}</td>
                  <td className="text-secondary">
                    <div className="mb-0">{note.details}</div>
                  </td>
                  <td className="text-success small">{note.status}</td>
                  <td className="text-end pe-3">
                    <button className="btn btn-sm btn-light border px-3 text-secondary d-flex align-items-center gap-2 ms-auto">
                      Archive <i className="bi bi-chevron-down small"></i>
                    </button>
                  </td>
                </tr>
                <tr style={{ background: '#fafafa' }}>
                  <td></td>
                  <td colSpan="5" className="pb-4 pt-0 border-top-0">
                    <div className="ps-0 pt-2">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge px-2 py-1 fw-normal" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.75rem' }}>
                          {note.type}
                        </span>
                        <span className="text-secondary small">
                          <i className="bi bi-person me-1"></i> {note.author}
                        </span>
                      </div>
                      <div className="text-muted small">
                        <i className="bi bi-clock me-1"></i> {note.timeInfo}
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper Components
function SectionHeader({ icon, title }) {
  return (
    <div className="col-12 mt-4 mb-2">
      <h6 className="mb-0 d-flex align-items-center" style={{ color: 'var(--gray-700)' }}>
        <i className={`bi ${icon} me-2`} style={{ color: 'var(--primary-purple)' }}></i>
        {title}
      </h6>
      <hr style={{ borderColor: 'var(--gray-300)', marginTop: '0.5rem' }} />
    </div>
  );
}

function InfoField({ icon, label, value, fullWidth = false, badge = false }) {
  return (
    <div className={fullWidth ? 'col-12' : 'col-md-6'}>
      <div className="p-3 rounded" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
        <div className="d-flex align-items-start gap-2">
          <i className={`bi ${icon}`} style={{ color: 'var(--primary-purple)', fontSize: '1.2rem', marginTop: '2px' }}></i>
          <div className="flex-grow-1">
            <div className="text-muted small fw-semibold mb-1">{label}</div>
            {badge ? (
              <span className="badge px-2 py-1" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                {value || 'N/A'}
              </span>
            ) : (
              <div className="fw-medium">{value || 'N/A'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon, label, active }) {
  return (
    <div
      className="p-3 rounded text-center"
      style={{
        background: active ? 'var(--success-gradient)' : 'var(--gray-200)',
        color: active ? 'white' : 'var(--gray-600)',
        border: '1px solid ' + (active ? 'transparent' : 'var(--gray-300)')
      }}
    >
      <i className={`bi ${icon} d-block mb-2`} style={{ fontSize: '1.5rem' }}></i>
      <div className="small fw-semibold">{label}</div>
      <div className="small mt-1">{active ? 'Yes' : 'No'}</div>
    </div>
  );
}
