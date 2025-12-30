export async function fetchServiceSchedule(service) {
    
    const res = await fetch(`http://127.0.0.1:5000/masterSchedule/${service}`);
    const data = await res.json();
    
    return data;
}
