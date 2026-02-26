import React, { useState, useCallback, Suspense } from 'react';
import { API_BASE_URL } from './config';
import { Layout, Typography, Select, Button, Space, Tag, Spin, theme } from 'antd';
import Icon from './components/Icon';
import { useAuth } from './contexts/AuthContext';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import SidebarTree from './components/SidebarTree';
import Dashboard from './components/Dashboard';
import SearchBar from './components/SearchBar';
import LoginPage from './components/LoginPage';
import PublicView from './components/PublicView';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy components
const Editor = React.lazy(() => import('./components/Editor'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const WikiApp: React.FC = () => {
  const { user, logout } = useAuth();
  const { token: authToken } = useAuth();
  const { rooms, currentRoom, currentLogo, welcomePageId, currentPublicSlug, myRole, canEdit, canAdmin, switchRoom, loading: roomsLoading } = useRoom();
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [firstPageId, setFirstPageId] = useState<number | null>(null);
  const [treeKey, setTreeKey] = useState(0);
  const { token } = theme.useToken();

  // ─── URL Routing State ───
  const [initialUrlHandled, setInitialUrlHandled] = useState(false);
  const selectedSlugRef = React.useRef<string | null>(null);
  // When true, URL-driven navigation is in progress — block room-change resets
  const navigatingFromUrlRef = React.useRef(false);
  // Pending slug waiting for room switch to complete
  const pendingSlugRef = React.useRef<{ room: string; slug: string } | null>(null);

  // ─── Resolve slug → pageId via API ───
  const resolveSlug = useCallback(async (slug: string, room: string): Promise<{ id: number; slug: string } | null> => {
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}` };
      if (room !== 'public') headers['X-Tenant-ID'] = room;
      const res = await fetch(`${API_BASE_URL}/api/v1/pages/by-slug/${slug}`, { headers });
      if (res.ok) {
        const data = await res.json();
        return { id: data.id, slug: data.slug };
      }
    } catch { }
    return null;
  }, [authToken]);

  // ─── Fetch slug for a page ID ───
  const fetchPageSlug = useCallback(async (pageId: number, room: string): Promise<string | null> => {
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}` };
      if (room !== 'public') headers['X-Tenant-ID'] = room;
      const res = await fetch(`${API_BASE_URL}/api/v1/pages/${pageId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.slug;
      }
    } catch { }
    return null;
  }, [authToken]);

  // ═══ EFFECT 1: Parse URL on initial load ═══
  React.useEffect(() => {
    if (roomsLoading || initialUrlHandled || !authToken) return;

    const path = window.location.pathname;
    if (path === '/login') {
      setInitialUrlHandled(true);
      return;
    }

    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 1) {
      const urlRoom = parts[0];
      if (urlRoom === 'dashboard' || urlRoom === 'admin') {
        setInitialUrlHandled(true);
        return;
      }
      if (rooms.some(r => r.name === urlRoom)) {
        if (parts.length >= 2) {
          const pageSlug = parts[1];
          navigatingFromUrlRef.current = true;
          if (currentRoom === urlRoom) {
            // Room matches → resolve slug now
            resolveSlug(pageSlug, urlRoom).then(result => {
              if (result) {
                selectedSlugRef.current = result.slug;
                setSelectedPageId(result.id);
              }
              navigatingFromUrlRef.current = false;
            });
          } else {
            // Room doesn't match → store pending slug, switch room
            pendingSlugRef.current = { room: urlRoom, slug: pageSlug };
            switchRoom(urlRoom);
          }
        } else {
          // Just room, no slug
          if (currentRoom !== urlRoom) switchRoom(urlRoom);
        }
      }
    }
    setInitialUrlHandled(true);
  }, [roomsLoading, rooms, initialUrlHandled, authToken]);

  // ═══ EFFECT 2: Apply pending slug after room switch ═══
  React.useEffect(() => {
    if (pendingSlugRef.current && currentRoom === pendingSlugRef.current.room) {
      const { slug, room } = pendingSlugRef.current;
      pendingSlugRef.current = null;
      resolveSlug(slug, room).then(result => {
        if (result) {
          selectedSlugRef.current = result.slug;
          setSelectedPageId(result.id);
        }
        navigatingFromUrlRef.current = false;
      });
    }
  }, [currentRoom]);

  // ═══ EFFECT 3: Reset page when room changes (user-driven only) ═══
  React.useEffect(() => {
    // Skip during URL-driven navigation to avoid killing the pending page
    if (navigatingFromUrlRef.current || pendingSlugRef.current) return;
    selectedSlugRef.current = null;
    setSelectedPageId(null);
    setFirstPageId(null); // Clear stale page from previous room
    setTreeKey(prev => prev + 1); // Force tree to re-mount for new room
  }, [currentRoom]);

  // ═══ EFFECT 4: Auto-select topmost page or welcome page ═══
  React.useEffect(() => {
    if (!selectedPageId && initialUrlHandled
      && !navigatingFromUrlRef.current && !pendingSlugRef.current) {
      if (firstPageId) {
        setSelectedPageId(firstPageId);
      } else if (welcomePageId) {
        setSelectedPageId(welcomePageId);
      }
    }
  }, [firstPageId, welcomePageId, currentRoom, initialUrlHandled]);

  // ═══ EFFECT 5: Sync URL bar when page changes ═══
  React.useEffect(() => {
    if (!initialUrlHandled || navigatingFromUrlRef.current) return;
    if (selectedPageId && !selectedSlugRef.current) {
      fetchPageSlug(selectedPageId, currentRoom).then(slug => {
        if (slug) {
          selectedSlugRef.current = slug;
          const url = `/${currentRoom}/${slug}`;
          if (window.location.pathname !== url) {
            window.history.pushState(null, '', url);
          }
        }
      });
    } else {
      let url = `/${currentRoom}`;
      if (selectedPageId && selectedSlugRef.current) {
        url += `/${selectedSlugRef.current}`;
      }
      if (window.location.pathname !== url) {
        window.history.pushState(null, '', url);
      }
    }
  }, [currentRoom, selectedPageId, initialUrlHandled]);

  // ═══ EFFECT 6: Browser back/forward ═══
  React.useEffect(() => {
    const onPopState = () => {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const urlRoom = parts[0];
        const pageSlug = parts[1];
        if (currentRoom !== urlRoom) {
          navigatingFromUrlRef.current = true;
          pendingSlugRef.current = { room: urlRoom, slug: pageSlug };
          switchRoom(urlRoom);
        } else {
          resolveSlug(pageSlug, urlRoom).then(result => {
            if (result) {
              selectedSlugRef.current = result.slug;
              setSelectedPageId(result.id);
            }
          });
        }
      } else if (parts.length === 1) {
        const urlRoom = parts[0];
        if (rooms.some(r => r.name === urlRoom)) {
          switchRoom(urlRoom);
        }
        selectedSlugRef.current = null;
        setSelectedPageId(null);
      } else {
        selectedSlugRef.current = null;
        setSelectedPageId(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [rooms, currentRoom]);

  const handlePageSelect = useCallback((pageId: number) => {
    selectedSlugRef.current = null; // will be fetched by URL sync effect
    setSelectedPageId(pageId);
  }, []);

  const handleTreeLoaded = useCallback((pages: any[]) => {
    if (pages.length > 0) {
      setFirstPageId(pages[0].id);
    } else {
      setFirstPageId(null);
    }
  }, []);

  const handlePageDeleted = useCallback(() => {
    setSelectedPageId(null);
    setTreeKey(prev => prev + 1);
  }, []);

  if (!currentRoom) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
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
          <img
            src={currentLogo}
            alt="Logo"
            style={{ height: 32, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
          />
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
          {canAdmin && <Button type="text" icon={<Icon name="settings" />} onClick={() => { window.location.href = '/admin'; }} title="Панель управления" aria-label="Панель управления" />}
          {currentPublicSlug && (
            <Button
              type="text"
              icon={<Icon name="open_in_new" />}
              onClick={() => { window.open(`/public/${currentPublicSlug}`, '_blank'); }}
              title="Публичная страница продукта"
              aria-label="Публичная страница продукта"
            />
          )}
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
          {/* Product selector */}
          <div style={{ marginBottom: 12 }}>
            {canEdit ? (
              <Select
                value={currentRoom}
                onChange={switchRoom}
                size="small"
                style={{ width: '100%' }}
                dropdownStyle={{ minWidth: 200 }}
              >
                {rooms.map(r => (
                  <Select.Option key={r.name} value={r.name}>{r.display_name}</Select.Option>
                ))}
              </Select>
            ) : (
              <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                {rooms.find(r => r.name === currentRoom)?.display_name || currentRoom}
              </Text>
            )}
          </div>
          <nav aria-label="Меню страниц">
            <SidebarTree key={treeKey} onSelect={handlePageSelect} onTreeLoaded={handleTreeLoaded} selectedPageId={selectedPageId} canEdit={canEdit} />
          </nav>
        </Sider>
        <Content style={{
          padding: selectedPageId ? 0 : '24px',
          backgroundColor: token.colorBgLayout,
          flex: 1,
          overflow: 'auto',
          height: 'calc(100vh - 56px)',
        }}>
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>}>
            {selectedPageId ? (
              <Editor pageId={selectedPageId} onPageDeleted={handlePageDeleted} canEdit={canEdit} />
            ) : (
              <Dashboard />
            )}
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

  // Public link: /public/:slug — accessible by everyone (authenticated or not)
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

  // Admin panel at /admin URL
  if (window.location.pathname === '/admin') {
    return (
      <ErrorBoundary>
        <RoomProvider>
          <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Spin size="large" /></div>}>
            <AdminPanel onClose={() => { window.location.href = '/'; }} />
          </Suspense>
        </RoomProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <RoomProvider>
        <WikiApp />
      </RoomProvider>
    </ErrorBoundary>
  );
};

export default App;
