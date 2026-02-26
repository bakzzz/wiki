import React from 'react';
import { theme } from 'antd';
import { useRoom } from '../contexts/RoomContext';

const Dashboard: React.FC = () => {
    const { currentLogo } = useRoom();
    const { token } = theme.useToken();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 56px)',
            backgroundColor: token.colorBgLayout,
        }}>
            <img
                src={currentLogo}
                alt="Logo"
                style={{
                    height: 240,
                    objectFit: 'contain',
                    opacity: 0.85,
                }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
            />
        </div>
    );
};

export default Dashboard;
