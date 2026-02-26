import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { RoomProvider } from './contexts/RoomContext';

describe('App', () => {
    it('renders login page without crashing', () => {
        // Override window.location to ensure we render the root or login
        Object.defineProperty(window, 'location', {
            value: { pathname: '/login' },
            writable: true
        });

        render(
            <AuthProvider>
                <RoomProvider>
                    <App />
                </RoomProvider>
            </AuthProvider>
        );
        expect(screen.getByText(/Войти/i)).toBeInTheDocument();
    });
});
