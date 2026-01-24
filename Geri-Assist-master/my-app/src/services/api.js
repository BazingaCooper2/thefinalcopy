import API_URL from '../config/api';

export async function fetchServiceSchedule(service) {

    const res = await fetch(`${API_URL}/masterSchedule/${service}`);
    const data = await res.json();

    return data;
}
