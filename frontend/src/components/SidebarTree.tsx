import React, { useEffect, useState } from 'react';
import { Tree, Empty, Spin, Button, Modal, Form, Input, Select, message } from 'antd';
import Icon from './Icon';
import type { TreeDataNode } from 'antd';
import { API_BASE_URL, tenantHeaders } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';

interface PageTreeItem {
    id: number;
    title: string;
    slug: string;
    path: string;
    children: PageTreeItem[];
}

// Flatten tree to get all pages for parent selector
const flattenTree = (items: PageTreeItem[]): PageTreeItem[] => {
    const result: PageTreeItem[] = [];
    for (const item of items) {
        result.push(item);
        if (item.children?.length > 0) {
            result.push(...flattenTree(item.children));
        }
    }
    return result;
};

const transformToTreeData = (items: PageTreeItem[]): TreeDataNode[] => {
    return items.map(item => ({
        title: item.title,
        key: String(item.id),
        children: item.children?.length > 0 ? transformToTreeData(item.children) : [],
    }));
};

interface SidebarTreeProps {
    onSelect?: (pageId: number) => void;
    selectedPageId?: number | null;
    canEdit?: boolean;
}

const SidebarTree: React.FC<SidebarTreeProps> = ({ onSelect, selectedPageId, canEdit = true }) => {
    const { token } = useAuth();
    const { currentRoom } = useRoom();

    const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
    const [rawData, setRawData] = useState<PageTreeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();

    const loadTree = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/v1/pages/tree`, {
            headers: tenantHeaders(token, currentRoom)
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setRawData(data);
                    setTreeData(transformToTreeData(data));
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadTree(); }, []);

    const handleCreate = async (values: { title: string; slug: string; parent_path?: string }) => {
        setCreating(true);
        try {
            const body: any = { title: values.title, slug: values.slug, content: '<p>New page content</p>' };
            if (values.parent_path) body.parent_path = values.parent_path;

            const res = await fetch(`${API_BASE_URL}/api/v1/pages/`, {
                method: 'POST',
                headers: tenantHeaders(token, currentRoom),
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const page = await res.json();
                message.success(`Page "${page.title}" created!`);
                setModalOpen(false);
                form.resetFields();
                loadTree();
                if (onSelect) onSelect(page.id);
            } else {
                const err = await res.json();
                message.error(err.detail || 'Ошибка создания');
            }
        } catch {
            message.error('Ошибка сети');
        } finally {
            setCreating(false);
        }
    };

    const allPages = flattenTree(rawData);

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {canEdit && <Button type="primary" icon={<Icon name="add" />} size="small" onClick={() => setModalOpen(true)} block>
                    Новая страница
                </Button>}
                <Button icon={<Icon name="refresh" />} size="small" onClick={loadTree} />
            </div>

            {loading ? <Spin size="small" /> : treeData.length === 0 ? (
                <Empty description="Нет страниц" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <Tree
                    treeData={treeData}
                    defaultExpandAll
                    selectedKeys={selectedPageId ? [String(selectedPageId)] : []}
                    onSelect={(selectedKeys) => {
                        if (onSelect && selectedKeys.length > 0) {
                            onSelect(Number(selectedKeys[0]));
                        }
                    }}
                />
            )}

            <Modal
                title="Создать страницу"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
                        <Input placeholder="Моя страница" />
                    </Form.Item>
                    <Form.Item
                        name="slug"
                        label="Slug (URL, латиница)"
                        rules={[
                            { required: true, message: 'Введите slug' },
                            { pattern: /^[a-z0-9_]+$/, message: 'Только строчные буквы, цифры, _' }
                        ]}
                    >
                        <Input placeholder="my_awesome_page" />
                    </Form.Item>
                    <Form.Item name="parent_path" label="Родительская страница">
                        <Select allowClear placeholder="Корневой уровень">
                            {allPages.map(p => (
                                <Select.Option key={p.path} value={p.path}>{p.title} ({p.path})</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={creating} block>
                            Создать
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SidebarTree;
