import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Spin, Tree, Layout, Empty, theme, Button, Modal, Input, Form, message } from 'antd';
import type { TreeDataNode } from 'antd';
import { API_BASE_URL } from '../config';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { TextArea } = Input;

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

/** Find the first page ID in the tree (DFS). */
const findFirstPageId = (items: PageTreeItem[]): number | null => {
    if (items.length === 0) return null;
    return items[0].id;
};

// Page content + Table of Contents component
const PageContentWithToc: React.FC<{ content: string; token: any }> = ({ content, token }) => {
    // Inject IDs into headings and build TOC
    const tocItems: { level: number; id: string; text: string }[] = [];
    const slugCounts: Record<string, number> = {};
    const processedContent = content.replace(/<h([1-6])([^>]*)>(.*?)<\/h([1-6])>/gi,
        (_match, level, attrs, innerHtml, closeLevel) => {
            const text = innerHtml.replace(/<[^>]+>/g, '').trim();
            if (!text) return _match;
            // Generate slug from text
            const baseSlug = text.toLowerCase()
                .replace(/[^a-zа-яё0-9\s-]/gi, '')
                .replace(/\s+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '') || 'heading';
            slugCounts[baseSlug] = (slugCounts[baseSlug] || 0) + 1;
            const id = slugCounts[baseSlug] > 1 ? `${baseSlug}-${slugCounts[baseSlug]}` : baseSlug;
            tocItems.push({ level: parseInt(level), id, text });
            // Inject id into the heading tag
            if (attrs.includes('id=')) {
                return `<h${level}${attrs.replace(/id="[^"]*"/, `id="${id}"`)}>${innerHtml}</h${closeLevel}>`;
            }
            return `<h${level} id="${id}"${attrs}>${innerHtml}</h${closeLevel}>`;
        }
    );
    const minLevel = tocItems.length > 0 ? Math.min(...tocItems.map(i => i.level)) : 1;

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            <div style={{
                flex: 1,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                background: token.colorBgContainer,
                padding: 40,
                minHeight: 'calc(100vh - 64px - 48px)',
                minWidth: 0,
            }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: processedContent }} />
            </div>
            {tocItems.length > 0 && (
                <div style={{
                    width: 220,
                    flexShrink: 0,
                    position: 'sticky',
                    top: 24,
                    alignSelf: 'flex-start',
                    maxHeight: 'calc(100vh - 64px - 48px)',
                    overflowY: 'auto',
                }}>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>Структура документа</Title>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {tocItems.map((item, idx) => (
                            <div
                                key={idx}
                                title={item.text}
                                style={{
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    paddingLeft: (item.level - minLevel) * 12,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: token.colorPrimary,
                                    lineHeight: '20px',
                                    borderRadius: 3,
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => { if (item.id) e.currentTarget.style.background = 'rgba(22,119,255,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                onClick={() => {
                                    if (item.id) {
                                        const el = document.getElementById(item.id);
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                            >
                                {item.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PublicView: React.FC<{ slug: string }> = ({ slug }) => {
    const { token } = theme.useToken();
    const [roomInfo, setRoomInfo] = useState<{ display_name: string; logo_url: string | null; public_title: string; public_subtitle: string } | null>(null);
    const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
    const [page, setPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Feedback state
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [form] = Form.useForm();

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

                    // Auto-load first page
                    const firstId = findFirstPageId(tree);
                    if (firstId) {
                        setSelectedPageId(firstId);
                    }
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

    // Auto-load page when selectedPageId changes
    useEffect(() => {
        if (selectedPageId) loadPage(selectedPageId);
    }, [selectedPageId, loadPage]);

    const handleSelect = (keys: React.Key[]) => {
        if (keys.length > 0) {
            const id = Number(keys[0]);
            setSelectedPageId(id);
        }
    };

    const handleFeedbackSubmit = async () => {
        try {
            const values = await form.validateFields();
            setFeedbackLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/v1/public/${slug}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (res.ok) {
                message.success('Сообщение отправлено!');
                form.resetFields();
                setFeedbackOpen(false);
            } else {
                message.error('Ошибка отправки');
            }
        } catch { }
        setFeedbackLoading(false);
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
    const headerTitle = roomInfo?.public_title || roomInfo?.display_name || '';
    const headerSubtitle = roomInfo?.public_subtitle || '';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '0 24px',
                height: 64,
                backgroundColor: token.colorBgElevated,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}>
                <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ height: 36, objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <Text strong style={{ fontSize: 16, lineHeight: '20px' }}>{headerTitle}</Text>
                    {headerSubtitle && (
                        <Text type="secondary" style={{ fontSize: 12, lineHeight: '16px' }}>{headerSubtitle}</Text>
                    )}
                </div>
                <div style={{ flex: 1 }} />
                <Button
                    type="primary"
                    onClick={() => setFeedbackOpen(true)}
                    style={{ borderRadius: 20, fontWeight: 500 }}
                >
                    Обратная связь
                </Button>
            </div>

            <Layout>
                <Sider
                    width={260}
                    style={{
                        backgroundColor: token.colorBgContainer,
                        padding: '16px 8px',
                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'auto',
                        height: 'calc(100vh - 64px)',
                    }}
                >
                    {treeData.length > 0 ? (
                        <Tree
                            className="sidebar-tree"
                            blockNode
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
                    height: 'calc(100vh - 64px)',
                }}>
                    {pageLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>
                    ) : page ? (
                        <PageContentWithToc content={page.content} token={token} />
                    ) : (
                        <div style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: token.borderRadius,
                            background: token.colorBgContainer,
                            padding: 40,
                            minHeight: 'calc(100vh - 64px - 48px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text type="secondary">Выберите страницу для просмотра</Text>
                        </div>
                    )}
                </Content>
            </Layout>

            {/* Feedback Modal */}
            <Modal
                title="Обратная связь"
                open={feedbackOpen}
                onCancel={() => setFeedbackOpen(false)}
                onOk={handleFeedbackSubmit}
                confirmLoading={feedbackLoading}
                okText="Отправить"
                cancelText="Отмена"
                width={480}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="author_name" label="Ваше имя" rules={[{ required: true, message: 'Введите имя' }]}>
                        <Input placeholder="Иван Иванов" />
                    </Form.Item>
                    <Form.Item name="author_org" label="Организация">
                        <Input placeholder="ООО «Компания»" />
                    </Form.Item>
                    <Form.Item name="text" label="Сообщение" rules={[{ required: true, message: 'Введите сообщение' }]}>
                        <TextArea rows={4} placeholder="Ваш вопрос или замечание..." />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default PublicView;
