import API_URL from '../config/api';

export async function fetchServiceSchedule(service) {
    // encodeURIComponent handles the space in "85 Neeve"
    const res = await fetch(`${API_URL}/masterSchedule/${encodeURIComponent(service)}`);
    
    if (!res.ok) {
        // If Flask returns 500, this will catch it
        const errorText = await res.text();
        console.error("Server Error Detail:", errorText);
        throw new Error(`Server Error: ${res.status}`);
    }

    return await res.json();
}