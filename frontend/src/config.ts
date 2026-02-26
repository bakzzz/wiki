export const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export const authHeaders = (token: string | null) => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
};

export const tenantHeaders = (token: string | null, room: string) => {
    const h = authHeaders(token);
    if (room && room !== 'public') h['X-Tenant-ID'] = room;
    return h;
};
