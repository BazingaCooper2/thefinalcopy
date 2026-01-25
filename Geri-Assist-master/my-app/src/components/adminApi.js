// src/admin/adminApi.js
const API = "http://localhost:5000";

export async function getAdminDashboard() {
  return fetch(`${API}/admin/dashboard`).then(r => r.json());
}

export async function getAdminSchedule(start, end, status) {
  const params = new URLSearchParams({
    start_date: start,
    end_date: end,
    ...(status ? { status } : {})
  });

  return fetch(`${API}/admin/schedule?${params}`).then(r => r.json());
}

export async function resolveShift(id) {
  return fetch(`${API}/admin/shift/${id}/resolve`, {
    method: 'POST'
  });
}

export async function reassignShift(id) {
  return fetch(`${API}/admin/shift/${id}/reassign`, {
    method: 'POST'
  });
}
