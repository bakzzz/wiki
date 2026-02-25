import React, { useState, useCallback } from 'react';
import { Layout, Typography, Select, Button, Space, Tag, Spin, theme } from 'antd';
import Icon from './components/Icon';
import { useAuth } from './contexts/AuthContext';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import SidebarTree from './components/SidebarTree';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import SearchBar from './components/SearchBar';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import PublicView from './components/PublicView';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const WikiApp: React.FC = () => {
  const { user, logout } = useAuth();
  const { rooms, currentRoom, currentLogo, myRole, canEdit, canAdmin, switchRoom } = useRoom();
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [treeKey, setTreeKey] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const { token } = theme.useToken();

  const handlePageSelect = useCallback((pageId: number) => {
    setSelectedPageId(pageId);
  }, []);

  const handlePageDeleted = useCallback(() => {
    setSelectedPageId(null);
    setTreeKey(prev => prev + 1);
  }, []);

  if (showAdmin) {
    return <AdminPanel onClose={() => { setShowAdmin(false); setTreeKey(prev => prev + 1); }} />;
  }

  const roleColor = myRole ? { Owner: 'gold', Admin: 'red', Editor: 'blue', Viewer: 'green' }[myRole] || 'default' : 'default';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: token.colorBgElevated,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: '0 24px',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={currentLogo} alt="Logo" style={{ height: 32, objectFit: 'contain' }} />
          {canEdit ? (
            <Select
              value={currentRoom}
              onChange={switchRoom}
              size="small"
              style={{ minWidth: 160 }}
              dropdownStyle={{ minWidth: 200 }}
            >
              <Select.Option value="public">Общее пространство</Select.Option>
              {rooms.map(r => (
                <Select.Option key={r.name} value={r.name}>{r.display_name}</Select.Option>
              ))}
            </Select>
          ) : (
            <Text strong style={{ fontSize: 14 }}>
              {rooms.find(r => r.name === currentRoom)?.display_name || currentRoom}
            </Text>
          )}
          {myRole && currentRoom !== 'public' && <Tag color={roleColor}>{myRole}</Tag>}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ maxWidth: 320 }}>
          <SearchBar onSelect={handlePageSelect} />
        </div>

        {/* User Menu */}
        <Space>
          <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{user?.email}</Text>
          {user?.is_superuser && <Tag color="purple" style={{ margin: 0 }}>SU</Tag>}
          {canAdmin && <Button
            type="text"
            icon={<Icon name="settings" />}
            onClick={() => setShowAdmin(true)}
            title="Панель управления"
          />}
          <Button
            type="text"
            icon={<Icon name="logout" />}
            onClick={logout}
            title="Выход"
          />
        </Space>
      </Header>
      <Layout>
        <Sider
          width={280}
          style={{
            backgroundColor: token.colorBgContainer,
            padding: '16px',
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            overflow: 'auto',
            height: 'calc(100vh - 56px)',
          }}
        >
          <SidebarTree key={treeKey} onSelect={handlePageSelect} selectedPageId={selectedPageId} canEdit={canEdit} />
        </Sider>
        <Content style={{
          padding: '24px',
          backgroundColor: token.colorBgLayout,
          flex: 1,
          overflow: 'auto',
          height: 'calc(100vh - 56px)',
        }}>
          {selectedPageId ? (
            <Editor pageId={selectedPageId} onPageDeleted={handlePageDeleted} canEdit={canEdit} />
          ) : (
            <Dashboard />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

  // Public link: /public/:slug — no auth required
  const path = window.location.pathname;
  const publicMatch = path.match(/^\/public\/([^/]+)/);
  if (publicMatch) {
    return <PublicView slug={publicMatch[1]} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <RoomProvider>
      <WikiApp />
    </RoomProvider>
  );
};

export default App;
