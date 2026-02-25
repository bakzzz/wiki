import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Spin, Tree, Layout, Empty, theme } from 'antd';
import type { TreeDataNode } from 'antd';
import { API_BASE_URL } from '../config';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

interface PageTreeItem {
    id: number;
    title: string;
    slug: string;
    path: string;
    children: PageTreeItem[];
}

interface PageData {
    id: number;
    title: string;
    slug: string;
    content: string;
    path: string;
}

const transformToTreeData = (items: PageTreeItem[]): TreeDataNode[] =>
    items.map(item => ({
        title: item.title,
        key: String(item.id),
        children: item.children?.length > 0 ? transformToTreeData(item.children) : undefined,
    }));

const PublicView: React.FC<{ slug: string }> = ({ slug }) => {
    const { token } = theme.useToken();
    const [roomInfo, setRoomInfo] = useState<{ display_name: string; logo_url: string | null } | null>(null);
    const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
    const [page, setPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const infoRes = await fetch(`${API_BASE_URL}/api/v1/public/${slug}`);
                if (!infoRes.ok) { setError('Ссылка не найдена или недоступна'); setLoading(false); return; }
                const info = await infoRes.json();
                setRoomInfo(info);

                const treeRes = await fetch(`${API_BASE_URL}/api/v1/public/${slug}/tree`);
                if (treeRes.ok) {
                    const tree: PageTreeItem[] = await treeRes.json();
                    setTreeData(transformToTreeData(tree));
                }
            } catch {
                setError('Ошибка загрузки');
            }
            setLoading(false);
        })();
    }, [slug]);

    const loadPage = useCallback(async (pageId: number) => {
        setPageLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/public/${slug}/page/${pageId}`);
            if (res.ok) {
                setPage(await res.json());
            }
        } catch { }
        setPageLoading(false);
    }, [slug]);

    const handleSelect = (keys: React.Key[]) => {
        if (keys.length > 0) {
            const id = Number(keys[0]);
            setSelectedPageId(id);
            loadPage(id);
        }
    };

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <Title level={3} style={{ margin: 0 }}>404</Title>
                <Text type="secondary">{error}</Text>
            </div>
        );
    }

    const logoUrl = roomInfo?.logo_url ? `${API_BASE_URL}${roomInfo.logo_url}` : '/logo.svg';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 24px',
                height: 56,
                backgroundColor: token.colorBgElevated,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}>
                <img src={logoUrl} alt="Logo" style={{ height: 32, objectFit: 'contain' }} />
                <Text strong style={{ fontSize: 16 }}>{roomInfo?.display_name}</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>Только просмотр</Text>
            </div>
            <Layout>
                <Sider
                    width={260}
                    style={{
                        backgroundColor: token.colorBgContainer,
                        padding: '16px',
                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'auto',
                        height: 'calc(100vh - 56px)',
                    }}
                >
                    {treeData.length > 0 ? (
                        <Tree
                            treeData={treeData}
                            selectedKeys={selectedPageId ? [String(selectedPageId)] : []}
                            onSelect={handleSelect}
                            defaultExpandAll
                        />
                    ) : (
                        <Empty description="Нет страниц" />
                    )}
                </Sider>
                <Content style={{
                    padding: '24px',
                    backgroundColor: token.colorBgLayout,
                    flex: 1,
                    overflow: 'auto',
                    height: 'calc(100vh - 56px)',
                }}>
                    {pageLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>
                    ) : page ? (
                        <div style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: token.borderRadius,
                            background: token.colorBgContainer,
                            padding: 24,
                            minHeight: 400,
                        }}>
                            <Title level={4} style={{ margin: 0, marginBottom: 8 }}>{page.title}</Title>
                            <div dangerouslySetInnerHTML={{ __html: page.content }} />
                        </div>
                    ) : (
                        <div style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: token.borderRadius,
                            background: token.colorBgContainer,
                            padding: 24,
                            minHeight: 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text type="secondary">Выберите страницу для просмотра</Text>
                        </div>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
};

export default PublicView;
