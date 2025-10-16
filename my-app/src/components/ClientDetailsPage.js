import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ClientDetailsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredClient, setFilteredClient] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Handle search
  const handleSearch = (e) => {
    setSearch(e.target.value);
    if (e.target.value.trim() === "") {
      setFilteredClient(null);
    } else {
      const found = clients.find(
        (c) =>
          c.client_id.toString() === e.target.value.trim() ||
          c.first_name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
          c.last_name?.toLowerCase().includes(e.target.value.toLowerCase())
      );
      setFilteredClient(found || null);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading clients...</div>;

  return (
    <div className="container my-5">
      <div className="shadow-lg border-0">
        <div className="ms-sm-6">
          <h2 className="text-center mb-4 text-primary">
            Client Details
          </h2>

          {/* Search Box */}
          <div className="d-flex justify-content-center mb-4">
            <input
              type="text"
              className="form-control w-50 shadow-sm"
              placeholder="🔍 Search by ID or Name..."
              value={search}
              onChange={handleSearch}
            />
          </div>

          {/* Client Info */}
          {filteredClient ? (
            <div className="p-4 shadow-sm">
              <div className="row">
                {/* Left: Image + Basic Info */}
                <div className="col-md-3 text-center border-end">
                  <img
                    src={
                      filteredClient.image_url ||
                      "https://via.placeholder.com/150"
                    }
                    alt="Client"
                    className="img-fluid rounded-circle mb-3 shadow-sm"
                    style={{ width: "150px", height: "150px", objectFit: "cover" }}
                  />
                  <h5 className="fw-bold">
                    {filteredClient.first_name} {filteredClient.last_name}
                  </h5>
                  <p className="text-muted">
                    {filteredClient.service_type || "No Service Assigned"}
                  </p>
                  <span className="badge bg-info text-dark px-3 py-2">
                    ID: {filteredClient.client_id}
                  </span>
                </div>

                {/* Right: Detailed Info */}
                <div className="col-md-9">
                  <table className="table table-borderless table-striped align-middle">
                    <tbody>
                      <tr>
                        <th className="w-25">Phone</th>
                        <td>{filteredClient.phone || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Email</th>
                        <td>{filteredClient.email || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Date of Birth</th>
                        <td>{filteredClient.date_of_birth || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Gender</th>
                        <td>{filteredClient.gender || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Preferred Language</th>
                        <td>{filteredClient.preferred_language || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Address</th>
                        <td>
                          {filteredClient.address_line1 || ""},{" "}
                          {filteredClient.address_line2 || ""},{" "}
                          {filteredClient.city || ""},{" "}
                          {filteredClient.province || ""}{" "}
                          {filteredClient.zip_code || ""}
                        </td>
                      </tr>
                      <tr>
                        <th>Shift Time</th>
                        <td>
                          {filteredClient.shift_start_time || "N/A"} -{" "}
                          {filteredClient.shift_end_time || "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <th>Coordinator</th>
                        <td>{filteredClient.client_coordinator_name || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Notes</th>
                        <td>{filteredClient.notes || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Risks</th>
                        <td>{filteredClient.risks || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Accounting</th>
                        <td>{filteredClient.accounting_details || "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-info text-center mt-3 ms-sm-3">
              ℹ No client selected. Start searching to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
