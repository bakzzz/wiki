import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from './AuthContext';

interface Room {
    name: string;
    display_name: string;
    logo_url?: string | null;
    welcome_page_id?: number | null;
    public_slug?: string | null;
}

interface RoomContextType {
    rooms: Room[];
    currentRoom: string;
    currentLogo: string;
    welcomePageId: number | null;
    currentPublicSlug: string | null;
    myRole: string | null;
    canEdit: boolean;
    canAdmin: boolean;
    loading: boolean;
    switchRoom: (name: string) => void;
    refreshRooms: () => void;
}

const FALLBACK_LOGO = '/logo.svg';

const RoomContext = createContext<RoomContextType | null>(null);

export const useRoom = () => {
    const ctx = useContext(RoomContext);
    if (!ctx) throw new Error('useRoom must be used within RoomProvider');
    return ctx;
};

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<string>('');
    const [myRole, setMyRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [defaultLogo, setDefaultLogo] = useState<string>(FALLBACK_LOGO);

    // Fetch default logo from API
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/v1/admin/default-logo`)
            .then(res => res.json())
            .then(data => {
                if (data.logo_url) setDefaultLogo(`${API_BASE_URL}${data.logo_url}`);
            })
            .catch(() => { });
    }, []);

    const refreshRooms = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/my-rooms`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
                // If no room selected yet, default to first room
                setCurrentRoom(prev => {
                    if (!prev || prev === '' || prev === 'public') {
                        return data.length > 0 ? data[0].name : '';
                    }
                    return prev;
                });
            }
        } catch { }
        setLoading(false);
    }, [token]);

    const fetchMyRole = useCallback(async () => {
        if (!token || !currentRoom) {
            setMyRole(null);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/my-role/${currentRoom}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMyRole(data.role);
            }
        } catch { }
    }, [token, currentRoom]);

    useEffect(() => { refreshRooms(); }, [refreshRooms]);
    useEffect(() => { fetchMyRole(); }, [fetchMyRole]);

    const switchRoom = (name: string) => {
        setCurrentRoom(name);
    };

    // Current room logo
    const currentLogo = useMemo(() => {
        if (!currentRoom) return defaultLogo;
        const room = rooms.find(r => r.name === currentRoom);
        if (room?.logo_url) {
            return `${API_BASE_URL}${room.logo_url}`;
        }
        return defaultLogo;
    }, [currentRoom, rooms, defaultLogo]);

    // Welcome page ID for current room
    const welcomePageId = useMemo(() => {
        const room = rooms.find(r => r.name === currentRoom);
        return room?.welcome_page_id ?? null;
    }, [currentRoom, rooms]);

    // Public slug for current room
    const currentPublicSlug = useMemo(() => {
        const room = rooms.find(r => r.name === currentRoom);
        return room?.public_slug ?? null;
    }, [currentRoom, rooms]);

    // Viewer can only read; Editor/Admin/Owner can edit; superuser always can
    const { user } = useAuth();
    const canEdit = useMemo(() => {
        if (user?.is_superuser) return true;
        if (!currentRoom) return false;
        return myRole !== null && myRole !== 'Viewer';
    }, [user, currentRoom, myRole]);

    const canAdmin = !!user?.is_superuser;

    return (
        <RoomContext.Provider value={{ rooms, currentRoom, currentLogo, welcomePageId, currentPublicSlug, myRole, canEdit, canAdmin, loading, switchRoom, refreshRooms }}>
            {children}
        </RoomContext.Provider>
    );
};
