import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import '@refinedev/antd/dist/reset.css';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useThemeContext } from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const ThemedApp: React.FC = () => {
  const { themeConfig } = useThemeContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={themeConfig}>
        <AntdApp>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
);
