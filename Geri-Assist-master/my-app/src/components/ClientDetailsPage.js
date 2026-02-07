
import React, { useEffect, useState } from "react";
import axios from "axios";
import API_URL from '../config/api';
import jsPDF from "jspdf";


// ---------- EXPORT HELPERS ----------

const exportToJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `${filename}.json`);
};

const exportToCSV = (data, filename) => {
  const flatten = (obj, parent = '', res = {}) => {
    for (let key in obj) {
      const prop = parent ? `${parent}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flatten(obj[key], prop, res);
      } else {
        res[prop] = Array.isArray(obj[key]) ? JSON.stringify(obj[key]) : obj[key];
      }
    }
    return res;
  };

  const flatData = Array.isArray(data) ? data.map(flatten) : [flatten(data)];
  const headers = Object.keys(flatData[0]);
  const rows = flatData.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `${filename}.csv`);
};

const exportToPDF = (data, filename) => {
  const doc = new jsPDF();
  let y = 10;

  doc.setFontSize(14);
  doc.text("Client Export", 10, y);
  y += 10;

  const writeField = (key, value) => {
    doc.setFontSize(10);
    doc.text(`${key}: ${String(value)}`, 10, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  };

  const recurse = (obj, prefix = "") => {
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === "object" && val !== null) {
        recurse(val, `${prefix}${key}.`);
      } else {
        writeField(`${prefix}${key}`, val);
      }
    }
  };

  recurse(data);
  doc.save(`${filename}.pdf`);
};

const downloadFile = (url, filename) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};


export default function ClientDetailsPage() {
  // --- State: Data & UI ---
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [documents, setDocuments] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [progressNotes, setProgressNotes] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [clientTasks, setClientTasks] = useState([]);

  // --- State: Editing ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  // --- Fetch Clients ---
  useEffect(() => {
    fetchClients();
  }, []);


  const fetchClients = async () => {
    try {
      console.log("Fetching clients from:", `${API_URL}/clients`);
      const response = await axios.get(`${API_URL}/clients`);
      console.log("Response:", response.data);
      const clientList = response.data.clients || response.data.client || [];
      console.log("Client list:", clientList);
      setClients(clientList);

      // If we are currently viewing a client, refresh their data in the view
      if (selectedClient) {
        const updatedClient = clientList.find(c => c.client_id === selectedClient.client_id);
        if (updatedClient) setSelectedClient(updatedClient);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      alert("Failed to load clients: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      const response = await axios.get(`${API_URL}/clients/${clientId}`);
      const clientData = response.data.client || response.data;
      setSelectedClient(clientData);
      setEmergencyContacts(clientData.emergency_contacts || []);
      setProgressNotes(clientData.progress_notes || []);
      setAdminNotes(clientData.administrative_notes || []);
      fetchClientTasks(clientId);
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  };

  const fetchClientTasks = async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/client-tasks/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching client tasks:", error);
    }
  };

  // --- Edit Handlers ---
  const handleEditClick = () => {
    setEditForm(selectedClient);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleJsonChange = (e, field) => {
    try {
      const value = JSON.parse(e.target.value);
      setEditForm(prev => ({
        ...prev,
        [field]: value
      }));
    } catch (error) {
      // Allow typing invalid JSON temporarily (optional: add validation state)
      console.error('Invalid JSON structure');
    }
  };

  const saveClient = async () => {
    try {
      const response = await fetch(`${API_URL}/clients/${editForm.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        setIsEditing(false);
        fetchClients(); // Refresh list and current view
        alert("Client updated successfully!");
      } else {
        alert("Failed to update client.");
      }
    } catch (error) {
      console.error('Error saving client:', error);
      alert("Error saving client.");
    }
  };

  // --- Filtering ---
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.client_id.toString().includes(search.trim()) ||
      client.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = locationFilter === "" ||
      client.service_type?.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const locations = [
    "85 Neeve",
    "87 Neeve",
    "Willow Place",
    "Outreach",
    "Assisted Living"
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'bi-person-circle' },
    { id: 'care', label: 'Care', icon: 'bi-activity' },
    { id: 'schedule', label: 'Schedule', icon: 'bi-calendar-check' },
    { id: 'documents', label: 'Documents', icon: 'bi-file-earmark-text' },
    { id: 'notes', label: 'Progress Notes', icon: 'bi-journal-text' },
    { id: 'admin_notes', label: 'Administrative Notes', icon: 'bi-journal-check' },
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 animate-fadeIn" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page Header */}
      <div className="page-header d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark">
            <i className="bi bi-person-circle me-3 text-primary"></i>
            Client Management
          </h1>
          <p className="text-muted">Comprehensive client information and care management</p>
        </div>
        <div className="d-flex gap-2">
          {!selectedClient && (
            <div className="btn-group">
              <button
                className="btn btn-dark dropdown-toggle"
                data-bs-toggle="dropdown"
                type="button"
              >
                <i className="bi bi-database-down me-1"></i> Bulk Export
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => exportToJSON(filteredClients, "clients_bulk")}
                  >
                    Export All (JSON)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => exportToCSV(filteredClients, "clients_bulk")}
                  >
                    Export All (CSV)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => exportToPDF(filteredClients, "clients_bulk")}
                  >
                    Export All (PDF)
                  </button>
                </li>
              </ul>
            </div>
          )}

          {selectedClient && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                setSelectedClient(null);
                setIsEditing(false);
                setSearch("");
              }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to List
            </button>
          )}
        </div>

      </div>

      {!selectedClient ? (
        /* --- LIST VIEW --- */
        <div className="animate-slideUp">
          {/* Filters */}
          <div className="card shadow-sm border-0 mb-4 p-4">
            <div className="row g-3">
              <div className="col-md-8">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by ID or Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    list="locationList"
                  />
                  <button
                    className="btn btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    style={{ borderLeft: 'none' }}
                  >
                  </button>
                  <ul
                    className="dropdown-menu dropdown-menu-end"
                    style={{
                      maxHeight: '240px', // ~6 items
                      overflowY: 'auto'
                    }}
                  >

                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setLocationFilter(''); }}>All Locations</a></li>
                    <li><hr className="dropdown-divider" /></li>
                    {locations.map(loc => (
                      <li key={loc}>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => { e.preventDefault(); setLocationFilter(loc); }}
                        >
                          {loc}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <datalist id="locationList">
                  {locations.map(loc => <option key={loc} value={loc} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="row g-4">
            {filteredClients.map(client => (
              <div key={client.client_id} className="col-md-6 col-lg-4 col-xl-3">
                <div
                  className="card h-100 border-0 shadow-sm hover-shadow transition-all"
                  style={{ borderRadius: '1rem', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedClient(client);
                    fetchClientDetails(client.client_id);
                  }}

                >
                  <div className="card-body text-center p-4">
                    <img
                      src={"https://i.ibb.co/twnJ1rqx/user.png"}
                      alt="Client"
                      className="rounded-circle mb-3 shadow-sm"
                      style={{ width: "80px", height: "80px", objectFit: "cover" }}
                    />
                    <h5 className="fw-bold mb-1">{client.name || `${client.first_name} ${client.last_name}`}</h5>
                    <p className="text-muted small mb-2">ID: {client.client_id}</p>
                    <span className="badge bg-light text-dark border">
                      <i className="bi bi-geo-alt me-1"></i>
                      {client.address_line1 || client.city || 'Unknown Location'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div className="text-center py-5 w-100">
                <p className="text-muted">No clients found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- DETAIL VIEW --- */
        <div className="card shadow border-0 animate-slideUp">
          <div className="card-body p-4">
            {/* Detail Header */}
            <div className="d-flex justify-content-between align-items-start border-bottom pb-4 mb-4">
              <div className="d-flex align-items-center gap-4">
                <img
                  src={selectedClient.image_url || "https://i.ibb.co/twnJ1rqx/user.png"}
                  alt="Client"
                  className="rounded-circle shadow-sm"
                  style={{ width: "100px", height: "100px", objectFit: "cover" }}
                  onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=👤"; }}
                />
                <div>
                  <h2 className="fw-bold mb-1">
                    {selectedClient.name || `${selectedClient.first_name} ${selectedClient.last_name}`}
                  </h2>
                  <div className="d-flex gap-2">
                    <span className="badge bg-primary">ID: {selectedClient.client_id}</span>
                    <span className="badge bg-info text-dark">{selectedClient.program_group || 'Willow Place'}</span>
                  </div>
                </div>
              </div>

              {/* EDIT ACTION BUTTONS */}
              <div className="d-flex gap-2 flex-wrap">
                {/* EXPORT BUTTON */}
                <div className="btn-group">
                  <button
                    className="btn btn-outline-dark dropdown-toggle"
                    data-bs-toggle="dropdown"
                    type="button"
                  >
                    <i className="bi bi-download me-1"></i> Export
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          exportToJSON(selectedClient, `client_${selectedClient.client_id}`)
                        }
                      >
                        Export as JSON
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          exportToCSV(selectedClient, `client_${selectedClient.client_id}`)
                        }
                      >
                        Export as CSV
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          exportToPDF(selectedClient, `client_${selectedClient.client_id}`)
                        }
                      >
                        Export as PDF
                      </button>
                    </li>
                  </ul>
                </div>

                {/* EDIT / SAVE CONTROLS */}
                {isEditing ? (
                  <>
                    <button className="btn btn-success" onClick={saveClient}>
                      <i className="bi bi-check-lg me-2"></i>Save Changes
                    </button>
                    <button className="btn btn-secondary" onClick={handleCancelEdit}>
                      <i className="bi bi-x-lg me-2"></i>Cancel
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={handleEditClick}>
                    <i className="bi bi-pencil-square me-2"></i>Edit Client
                  </button>
                )}
              </div>
            </div>

            {/* Tabs Navigation */}
            <ul className="nav nav-pills mb-4 gap-2">
              {tabs.map(tab => (
                <li className="nav-item" key={tab.id}>
                  <button
                    className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <i className={`bi ${tab.icon} me-2`}></i>{tab.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'profile' && (
                <ProfileTab
                  client={selectedClient}
                  isEditing={isEditing}
                  editForm={editForm}
                  handleInputChange={handleInputChange}
                  emergencyContacts={emergencyContacts}
                  setEmergencyContacts={setEmergencyContacts}
                  fetchClientDetails={fetchClientDetails}
                />
              )}

              {activeTab === 'care' && (
                <CareTab
                  client={selectedClient}
                  isEditing={isEditing}
                  editForm={editForm}
                  handleInputChange={handleInputChange}
                  clientTasks={clientTasks}
                />
              )}
              {activeTab === 'schedule' && <ScheduleTab client={selectedClient} />}
              {activeTab === 'documents' && <DocumentsTab client={selectedClient} documents={documents} setDocuments={setDocuments} />}
              {activeTab === 'notes' && <ProgressNotesTab client={selectedClient} progressNotes={progressNotes} setProgressNotes={setProgressNotes} fetchClientDetails={fetchClientDetails} />}
              {activeTab === 'admin_notes' && <AdministrativeNotesTab client={selectedClient} adminNotes={adminNotes} setAdminNotes={setAdminNotes} fetchClientDetails={fetchClientDetails} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

// 1. Profile Tab (Modified: Includes Personal Info, Medical, Contacts)
function ProfileTab({ client, isEditing, editForm, handleInputChange, emergencyContacts, setEmergencyContacts, fetchClientDetails }) {
  if (isEditing) {
    return (
      <div className="row g-3">
        <h5 className="text-primary border-bottom pb-2">Basic Information</h5>
        <div className="col-md-6">
          <label className="form-label">First Name</label>
          <input className="form-control" name="first_name" value={editForm.first_name || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Last Name</label>
          <input className="form-control" name="last_name" value={editForm.last_name || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Phone</label>
          <input className="form-control" name="phone" value={editForm.phone || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Email</label>
          <input className="form-control" name="email" value={editForm.email || ''} onChange={handleInputChange} />
        </div>
        <div className="col-12">
          <label className="form-label">Address</label>
          <input className="form-control" name="address_line1" value={editForm.address_line1 || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">City</label>
          <input className="form-control" name="city" value={editForm.city || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Postal Code</label>
          <input className="form-control" name="postal_code" value={editForm.postal_code || ''} onChange={handleInputChange} />
        </div>

        {/* Medical Section (Edit Mode) */}
        <div className="col-12 mt-4">
          <MedicalHistoryTab client={client} isEditing={true} editForm={editForm} handleInputChange={handleInputChange} />
        </div>
      </div>
    );
  }

  // View Mode
  return (
    <div className="row g-3">
      <SectionHeader icon="bi-person-badge" title="Personal Information" />
      <InfoField icon="bi-person" label="First Name" value={client.first_name} />
      <InfoField icon="bi-person-fill" label="Last Name" value={client.last_name} />
      <InfoField icon="bi-telephone" label="Phone" value={client.phone} />
      <InfoField icon="bi-envelope" label="Email" value={client.email} />
      <SectionHeader icon="bi-geo-alt" title="Address" />
      <InfoField icon="bi-house" label="Address" value={client.address_line1} />
      <div className="col-md-6">
        <div className="row g-2">
          <InfoField icon="bi-building" label="City" value={client.city} />
        </div>
      </div>
      <InfoField icon="bi-postage" label="Postal Code" value={client.postal_code} />

      {/* Embedded Medical & Contacts */}
      <div className="col-12 mt-2">
        <MedicalHistoryTab client={client} isEditing={false} />
      </div>

      <div className="col-12 mt-2">
        <EmergencyContactsTab
          client={client}
          emergencyContacts={emergencyContacts}
          setEmergencyContacts={setEmergencyContacts}
          fetchClientDetails={fetchClientDetails}
        />
      </div>
    </div>
  );
}

// 1.5 Care Tab (New Logic: Includes Fetched Tasks)
function CareTab({ client, isEditing, editForm, handleInputChange, clientTasks }) {
  if (isEditing) {
    return (
      <div className="row g-3">
        <h5 className="text-primary border-bottom pb-2">Care Management</h5>
        <div className="col-12">
          <label className="form-label fw-bold">Care Management Details</label>
          <textarea className="form-control" name="care_mgmt" rows="3" value={editForm.care_mgmt || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-bold">Individual Service</label>
          <input className="form-control" name="individual_service" value={editForm.individual_service || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-bold">Tasks</label>
          <input className="form-control" name="tasks" value={editForm.tasks || ''} onChange={handleInputChange} />
        </div>
        <div className="col-12">
          <label className="form-label fw-bold">Coordinator Notes</label>
          <textarea className="form-control" name="coordinator_notes" rows="3" value={editForm.coordinator_notes || ''} onChange={handleInputChange} />
        </div>
        <div className="col-12">
          <label className="form-label fw-bold text-danger">Special Instructions</label>
          <textarea className="form-control" name="instructions" rows="3" value={editForm.instructions || ''} onChange={handleInputChange} />
        </div>
      </div>
    );
  }

  return (
    <div className="row g-3">
      <SectionHeader icon="bi-clipboard-check" title="Care Management Plan" />

      {/* Care Management Field */}
      <div className="col-12">
        {client.care_mgmt ? (
          <div className="alert alert-light border">
            <strong className="d-block mb-1 text-primary">Care Management Details:</strong>
            {client.care_mgmt}
          </div>
        ) : (
          <div className="text-muted fst-italic">No care management details provided.</div>
        )}
      </div>



      <InfoField icon="bi-activity" label="Individual Service" value={client.individual_service} />

      {/* Dynamic Tasks Section */}
      <div className="col-12 mt-3">
        <h6 className="text-secondary border-bottom pb-2"><i className="bi bi-list-check me-2"></i>Assigned Tasks</h6>
        {clientTasks && clientTasks.length > 0 ? (
          <ul className="list-group">
            {clientTasks.map(task => (
              <li key={task.task_id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <span className={`badge me-2 ${task.status ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {task.status ? 'Completed' : 'Pending'}
                  </span>
                  {task.details}
                </div>
                <small className="text-muted">{new Date(task.task_created).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted fst-italic p-2 border rounded bg-light">
            No active tasks assigned in current shifts.
          </div>
        )}
      </div>

      <SectionHeader icon="bi-journal-bookmark" title="Notes & Instructions" />

      {
        client.coordinator_notes && (
          <div className="col-12 mt-2">
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-circle-fill me-2"></i>
              <strong>Coordinator Notes:</strong> {client.coordinator_notes}
            </div>
          </div>
        )
      }

      {
        client.instructions && (
          <div className="col-12 mt-2">
            <div className="alert alert-info">
              <i className="bi bi-info-circle-fill me-2"></i>
              <strong>Special Instructions:</strong><br />
              {client.instructions}
            </div>
          </div>
        )
      }
      {
        !client.coordinator_notes && !client.instructions && (
          <div className="col-12 text-muted fst-italic">No special notes or instructions.</div>
        )
      }
    </div >
  );
}

// 2. Medical History Tab (Added Doctor/Nurse editing)
function MedicalHistoryTab({ client, isEditing, editForm, handleInputChange }) {
  if (isEditing) {
    return (
      <div className="row g-3">
        <h5 className="text-primary border-bottom pb-2">Medical Team</h5>
        <div className="col-md-6">
          <label className="form-label">Doctor Name</label>
          <input className="form-control" name="doctor" value={editForm.doctor || ''} onChange={handleInputChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Nurse Name</label>
          <input className="form-control" name="nurse" value={editForm.nurse || ''} onChange={handleInputChange} />
        </div>

        <h5 className="text-primary border-bottom pb-2 mt-4">Diagnosis & Conditions</h5>
        <div className="col-12">
          <label className="form-label">Primary Diagnosis</label>
          <input className="form-control" name="primary_diagnosis" value={editForm.primary_diagnosis || ''} onChange={handleInputChange} />
        </div>
        <div className="col-12">
          <label className="form-label">Medical Notes</label>
          <textarea className="form-control" name="medical_notes" rows="3" value={editForm.medical_notes || ''} onChange={handleInputChange} />
        </div>

        <h5 className="text-primary border-bottom pb-2 mt-4">Mobility & Equipment</h5>
        <div className="col-md-4">
          <label className="form-label">Wheelchair User</label>
          <select className="form-select" name="wheelchair_user" value={editForm.wheelchair_user || false} onChange={handleInputChange}>
            <option value={false}>No</option>
            <option value={true}>Yes</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Has Catheter</label>
          <select className="form-select" name="has_catheter" value={editForm.has_catheter || false} onChange={handleInputChange}>
            <option value={false}>No</option>
            <option value={true}>Yes</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Requires Oxygen</label>
          <select className="form-select" name="requires_oxygen" value={editForm.requires_oxygen || false} onChange={handleInputChange}>
            <option value={false}>No</option>
            <option value={true}>Yes</option>
          </select>
        </div>
      </div>
    );
  }

  // View Mode
  return (
    <div className="row g-3">
      <SectionHeader icon="bi-people" title="Care Team" />
      <InfoField icon="bi-person-badge" label="Assigned Doctor" value={client.doctor || client.doctor_name} />
      <InfoField icon="bi-person-hearts" label="Assigned Nurse" value={client.nurse || client.assigned_nurse} />

      <SectionHeader icon="bi-clipboard2-pulse" title="Diagnosis & Conditions" />
      <InfoField icon="bi-file-medical" label="Primary Diagnosis" value={client.primary_diagnosis} fullWidth />
      <InfoField icon="bi-sticky" label="Medical Notes" value={client.medical_notes} fullWidth />

      <SectionHeader icon="bi-wheelchair" title="Mobility & Equipment" />
      <div className="col-md-4">
        <StatusBadge icon="bi-wheelchair" label="Wheelchair" active={client.wheelchair_user} />
      </div>
      <div className="col-md-4">
        <StatusBadge icon="bi-box-seam" label="Catheter" active={client.has_catheter} />
      </div>
      <div className="col-md-4">
        <StatusBadge icon="bi-wind" label="Oxygen" active={client.requires_oxygen} />
      </div>
    </div>
  );
}

// 3. Emergency Contacts Tab
function EmergencyContactsTab({ client, emergencyContacts, setEmergencyContacts, fetchClientDetails }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });

  const handleAddContact = async () => {
    try {
      const updatedContacts = [...emergencyContacts, { ...newContact, id: Date.now() }];
      const response = await fetch(`${API_URL}/clients/${client.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergency_contacts: updatedContacts })
      });

      if (response.ok) {
        await fetchClientDetails(client.client_id);
        setNewContact({ name: '', relationship: '', phone: '', email: '' });
        setIsAdding(false);
        alert("Contact added successfully!");
      } else {
        alert("Failed to add contact.");
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert("Error adding contact.");
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm("Delete this contact?")) return;

    try {
      const updatedContacts = emergencyContacts.filter(c => c.id !== contactId);
      const response = await fetch(`${API_URL}/clients/${client.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergency_contacts: updatedContacts })
      });

      if (response.ok) {
        await fetchClientDetails(client.client_id);
        alert("Contact deleted successfully!");
      } else {
        alert("Failed to delete contact.");
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert("Error deleting contact.");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="m-0"><i className="bi bi-telephone-plus me-2"></i>Emergency Contacts</h5>
        <button
          className="btn btn-primary btn-sm rounded-pill px-3"
          onClick={() => setIsAdding(!isAdding)}
        >
          <i className={`bi ${isAdding ? 'bi-x-circle' : 'bi-plus-circle'} me-1`}></i>
          {isAdding ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {isAdding && (
        <div className="card mb-4 p-3 bg-light">
          <h6 className="mb-3">New Emergency Contact</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Relationship"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </div>
            <div className="col-12">
              <button className="btn btn-success" onClick={handleAddContact}>
                <i className="bi bi-check-lg me-1"></i> Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3">
        {emergencyContacts.length > 0 ? (
          emergencyContacts.map((contact, index) => (
            <div key={contact.id || index} className="col-md-6">
              <div className="p-3 rounded shadow-sm border bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-bold">{contact.name}</div>
                  <div className="d-flex gap-2">
                    <span className="badge bg-info text-dark">{contact.relationship}</span>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="small">
                  <div className="mb-1"><i className="bi bi-telephone me-2 text-muted"></i>{contact.phone}</div>
                  <div><i className="bi bi-envelope me-2 text-muted"></i>{contact.email}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12 text-center py-4 text-muted">
            No emergency contacts added yet.
          </div>
        )}
      </div>
    </div>
  );
}

// 4. Schedule Tab (Unchanged)
function ScheduleTab({ client }) {
  return (
    <div className="text-center py-5 bg-light rounded border">
      <i className="bi bi-calendar-range text-muted" style={{ fontSize: '2rem' }}></i>
      <p className="mt-2 mb-0">Schedule management coming soon.</p>
    </div>
  );
}

// 5. Documents Tab (Unchanged)
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
        <h5 className="m-0">Documents</h5>
        <label className="btn btn-primary btn-sm">
          <i className="bi bi-upload me-1"></i> Upload
          <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {documents.length > 0 ? (
        <ul className="list-group">
          {documents.map((doc, index) => (
            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <i className="bi bi-file-earmark-text me-2 text-danger"></i>
                {doc.name}
              </div>
              <span className="badge bg-secondary">{doc.size}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-5 bg-light rounded">No documents uploaded yet.</div>
      )}
    </div>
  );
}

// 6. Progress Notes Tab (Reduced for brevity but functional)
// 6. Progress Notes Tab
function ProgressNotesTab({ client, progressNotes, setProgressNotes, fetchClientDetails }) {
  const [newNote, setNewNote] = useState('');

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert("Please write a note before publishing.");
      return;
    }

    try {
      const noteEntry = {
        id: Date.now(),
        note: newNote,
        timestamp: new Date().toISOString(),
        author: 'Current User' // You can update this with actual user info
      };

      const updatedNotes = [noteEntry, ...progressNotes];

      const response = await fetch(`${API_URL}/clients/${client.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_notes: updatedNotes })
      });

      if (response.ok) {
        await fetchClientDetails(client.client_id);
        setNewNote('');
        alert("Note published successfully!");
      } else {
        alert("Failed to publish note.");
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert("Error publishing note.");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;

    try {
      const updatedNotes = progressNotes.filter(n => n.id !== noteId);

      const response = await fetch(`${API_URL}/clients/${client.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_notes: updatedNotes })
      });

      if (response.ok) {
        await fetchClientDetails(client.client_id);
        alert("Note deleted successfully!");
      } else {
        alert("Failed to delete note.");
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert("Error deleting note.");
    }
  };

  return (
    <div>
      <div className="card border-0 shadow-sm p-4 mb-4">
        <h6 className="mb-3"><i className="bi bi-pencil-square me-2"></i>Add Progress Note</h6>
        <textarea
          className="form-control mb-3"
          placeholder="Write a progress note..."
          rows="4"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        ></textarea>
        <button className="btn btn-primary" onClick={handleAddNote}>
          <i className="bi bi-check-circle me-2"></i>Publish Note
        </button>
      </div>

      <div className="mt-4">
        <h6 className="mb-3"><i className="bi bi-clock-history me-2"></i>Recent Notes</h6>
        {progressNotes.length > 0 ? (
          <div className="d-flex flex-column gap-3">
            {progressNotes.map((note) => (
              <div key={note.id} className="card border-0 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="small text-muted">
                    <i className="bi bi-person-circle me-1"></i>
                    {note.author} • {new Date(note.timestamp).toLocaleString()}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
                <p className="mb-0">{note.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            No progress notes yet.
          </div>
        )}
      </div>
    </div>
  );
}

// 7. Administrative Notes Tab
function AdministrativeNotesTab({ client, adminNotes, setAdminNotes, fetchClientDetails }) {
  const [newNote, setNewNote] = useState('');

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert("Please write a note before publishing.");
      return;
    }

    try {
      const noteEntry = {
        id: Date.now(),
        note: newNote,
        timestamp: new Date().toISOString(),
        author: 'Administrator'
      };

      const updatedNotes = [noteEntry, ...adminNotes];

      const response = await fetch(`${API_URL}/clients/${client.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ administrative_notes: updatedNotes })
      });

      if (response.ok) {
        await fetchClientDetails(client.client_id);
        setNewNote('');
        alert("Administrative note added successfully!");
      } else {
        alert("Failed to add administrative note.");
      }
    } catch (error) {
      console.error('Error adding admin note:', error);
      alert("Error publishing admin note.");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Delete this administrative note?")) return;

    try {
      const updatedNotes = adminNotes.filter(n => n.id !== noteId);

      const response = await fetch(`${API_URL}/clients/${client.client_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ administrative_notes: updatedNotes })
      });

      if (response.ok) {
        await fetchClientDetails(client.client_id);
        alert("Administrative note deleted successfully!");
      } else {
        alert("Failed to delete administrative note.");
      }
    } catch (error) {
      console.error('Error deleting admin note:', error);
      alert("Error deleting admin note.");
    }
  };

  return (
    <div>
      <div className="card border-0 shadow-sm p-4 mb-4 bg-light">
        <h6 className="mb-3 text-primary"><i className="bi bi-shield-lock me-2"></i>Administrative Log</h6>
        <textarea
          className="form-control mb-3"
          placeholder="Log an administrative note (visible to admins only)..."
          rows="3"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        ></textarea>
        <button className="btn btn-primary" onClick={handleAddNote}>
          <i className="bi bi-plus-circle me-2"></i>Add Admin Note
        </button>
      </div>

      <div className="mt-4">
        <h6 className="mb-3"><i className="bi bi-list-check me-2"></i>Log History</h6>
        {adminNotes.length > 0 ? (
          <div className="d-flex flex-column gap-3">
            {adminNotes.map((note) => (
              <div key={note.id} className="card border-0 shadow-sm p-3 border-start border-4 border-primary">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="small text-muted fw-bold">
                    <i className="bi bi-person-badge-fill me-1"></i>
                    {note.author} • {new Date(note.timestamp).toLocaleString()}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleDeleteNote(note.id)}
                    title="Delete Note"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                <p className="mb-0 text-dark">{note.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted border rounded border-dashed">
            No administrative notes logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

// --- HELPERS ---
function SectionHeader({ icon, title }) {
  return (
    <div className="col-12 mt-4 mb-2">
      <h6 className="mb-0 text-dark fw-bold border-bottom pb-2">
        <i className={`bi ${icon} me-2 text-primary`}></i>{title}
      </h6>
    </div>
  );
}

function InfoField({ icon, label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'col-12' : 'col-md-6'}>
      <div className="p-3 rounded bg-white border h-100">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className={`bi ${icon} text-primary`}></i>
          <span className="text-muted small fw-bold text-uppercase">{label}</span>
        </div>
        <div className="fw-medium ps-4">{value || <span className="text-muted fst-italic">N/A</span>}</div>
      </div>
    </div>
  );
}

function StatusBadge({ icon, label, active }) {
  return (
    <div className={`p-3 rounded text-center border ${active ? 'bg-success bg-opacity-10 border-success' : 'bg-light'}`}>
      <i className={`bi ${icon} d-block mb-2 fs-4 ${active ? 'text-success' : 'text-muted'}`}></i>
      <div className="small fw-bold">{label}</div>
      <div className="small">{active ? 'Yes' : 'No'}</div>
    </div>
  );
}