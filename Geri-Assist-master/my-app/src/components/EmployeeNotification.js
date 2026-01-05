import React, { useState } from "react";

const NotificationSettings = () => {

  const [settings, setSettings] = useState({
    task_assignment: "None",
    service_status_change: "Email",
    new_client_notification: "None",
    visit_rec_sent: "Email",
    visit_rec_assigned: "None",
    referral_update: "Task"
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const openEditor = (field, current) => {
    setTempValue(current);
    setEditingField(field);
  };

  const saveEdit = () => {
    setSettings(prev => ({
      ...prev,
      [editingField]: tempValue
    }));
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm p-4">

        <h5 className="fw-bold mb-3">Notification Settings</h5>

        <table className="table table-borderless align-middle">
          <tbody>

            {/* Row Component */}
            {[
              { label: "Task Assignment", field: "task_assignment" },
              { label: "Service Status Change", field: "service_status_change" },
              { label: "New Client Notification", field: "new_client_notification" },
              { label: "Visit And Recurrence Offers Sent", field: "visit_rec_sent" },
              { label: "Visit And Recurrence Offers Assigned", field: "visit_rec_assigned" },
              { label: "Referral Update Notification", field: "referral_update" }
            ].map((item) => (
              <tr key={item.field} className="border-bottom">
                
                {/* Setting Name */}
                <td className="w-50 fw-semibold">{item.label}</td>

                {/* Current Value */}
                <td className="text-muted">
                  {editingField === item.field ? (
                    <select
                      className="form-select form-select-sm w-50"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                    >
                      <option value="None">None</option>
                      <option value="Email">Email</option>
                      <option value="Task">Task</option>
                    </select>
                  ) : (
                    settings[item.field]
                  )}
                </td>

                {/* Action Button */}
                <td className="text-end">

                  {editingField === item.field ? (
                    <>
                      <button className="btn btn-success btn-sm me-2" onClick={saveEdit}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <button
                      className="btn btn-light border btn-sm"
                      onClick={() => openEditor(item.field, settings[item.field])}
                    >
                      Set / Edit
                    </button>
                  )}

                </td>

              </tr>
            ))}

          </tbody>
        </table>

      </div>
    </div>
  );
};

export default NotificationSettings;
