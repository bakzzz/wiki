import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from './AuthContext';

interface Room {
    name: string;
    display_name: string;
    logo_url?: string | null;
}

interface RoomContextType {
    rooms: Room[];
    currentRoom: string; // "public" or room name
    currentLogo: string; // URL of current room's logo or default
    myRole: string | null;
    canEdit: boolean;
    canAdmin: boolean;
    loading: boolean;
    switchRoom: (name: string) => void;
    refreshRooms: () => void;
}

const DEFAULT_LOGO = '/logo.svg';

const RoomContext = createContext<RoomContextType | null>(null);

export const useRoom = () => {
    const ctx = useContext(RoomContext);
    if (!ctx) throw new Error('useRoom must be used within RoomProvider');
    return ctx;
};

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<string>('public');
    const [myRole, setMyRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const refreshRooms = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/my-rooms`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch { }
        setLoading(false);
    }, [token]);

    const fetchMyRole = useCallback(async () => {
        if (!token || currentRoom === 'public') {
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

    // Current room logo: find from rooms list, fallback to default
    const currentLogo = useMemo(() => {
        if (currentRoom === 'public') return DEFAULT_LOGO;
        const room = rooms.find(r => r.name === currentRoom);
        if (room?.logo_url) {
            return `${API_BASE_URL}${room.logo_url}`;
        }
        return DEFAULT_LOGO;
    }, [currentRoom, rooms]);

    // Viewer can only read; Editor/Admin/Owner can edit; superuser always can
    const { user } = useAuth();
    const canEdit = useMemo(() => {
        if (user?.is_superuser) return true;
        if (currentRoom === 'public') return false;
        return myRole !== null && myRole !== 'Viewer';
    }, [user, currentRoom, myRole]);

    const canAdmin = !!user?.is_superuser;

    return (
        <RoomContext.Provider value={{ rooms, currentRoom, currentLogo, myRole, canEdit, canAdmin, loading, switchRoom, refreshRooms }}>
            {children}
        </RoomContext.Provider>
    );
};
