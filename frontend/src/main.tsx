import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import '@refinedev/antd/dist/reset.css';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useThemeContext } from './theme';

const ThemedApp: React.FC = () => {
  const { themeConfig } = useThemeContext();
  return (
    <ConfigProvider theme={themeConfig}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
);
