import React, { useState, useCallback } from 'react';
import { Tree, Empty, Spin, Button, Modal, Form, Input, Select, Tooltip, App as AntdApp } from 'antd';
import Icon from './Icon';
import type { TreeDataNode } from 'antd';
import { API_BASE_URL, tenantHeaders } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PageTreeItem {
    id: number;
    title: string;
    slug: string;
    path: string;
    children: PageTreeItem[];
}

const generateSlug = (text: string): string => {
    const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    return text.toLowerCase()
        .split('')
        .map(ch => map[ch] || ch)
        .join('')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        || 'page';
};

// Flatten tree to get all pages for parent selector
const flattenTree = (items: PageTreeItem[]): PageTreeItem[] => {
    const result: PageTreeItem[] = [];
    const walk = (list: PageTreeItem[]) => {
        for (const item of list) {
            result.push(item);
            if (item.children?.length) walk(item.children);
        }
    };
    walk(items);
    return result;
};

interface SidebarTreeProps {
    onSelect?: (pageId: number) => void;
    onTreeLoaded?: (pages: PageTreeItem[]) => void;
    selectedPageId?: number | null;
    canEdit?: boolean;
}

const SidebarTree: React.FC<SidebarTreeProps> = ({ onSelect, onTreeLoaded, selectedPageId, canEdit = true }) => {
    const { token } = useAuth();
    const { currentRoom } = useRoom();
    const { message } = AntdApp.useApp();

    const [rawData, setRawData] = useState<PageTreeItem[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [defaultParentPath, setDefaultParentPath] = useState<string | undefined>(undefined);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // ─── React Query for fetching tree ───
    const { data: pagesResult, isLoading: loading, refetch: loadTree } = useQuery({
        queryKey: ['pagesTree', currentRoom, token],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/tree`, {
                headers: tenantHeaders(token, currentRoom)
            });
            if (!res.ok) throw new Error('Ошибка загрузки дерева');
            return res.json() as Promise<PageTreeItem[]>;
        },
        enabled: !!token && !!currentRoom,
    });

    React.useEffect(() => {
        if (pagesResult && Array.isArray(pagesResult)) {
            setRawData(pagesResult);
            setExpandedKeys(pagesResult.map((item: PageTreeItem) => String(item.id)));
            if (onTreeLoaded) onTreeLoaded(pagesResult);
        }
    }, [pagesResult, onTreeLoaded]);

    // ─── React Query for renaming ───
    const renameMutation = useMutation({
        mutationFn: async ({ pageId, title }: { pageId: number, title: string }) => {
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/${pageId}`, {
                method: 'PUT',
                headers: tenantHeaders(token, currentRoom),
                body: JSON.stringify({ title }),
            });
            if (!res.ok) throw new Error('Ошибка переименования');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pagesTree'] });
            setEditingId(null);
        },
        onError: () => {
            message.error('Ошибка переименования');
            setEditingId(null);
        }
    });

    const handleRenameSubmit = (pageId: number, newTitle: string) => {
        const trimmed = newTitle.trim();
        if (!trimmed) {
            setEditingId(null);
            return;
        }
        renameMutation.mutate({ pageId, title: trimmed });
    };

    const openCreateModal = useCallback((parentPath?: string) => {
        setDefaultParentPath(parentPath);
        form.resetFields();
        if (parentPath) {
            form.setFieldValue('parent_path', parentPath);
        }
        setModalOpen(true);
    }, [form]);

    const transformToTreeData = useCallback((items: PageTreeItem[]): TreeDataNode[] => {
        return items.map(item => ({
            title: (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    {editingId === item.id ? (
                        <input
                            autoFocus
                            defaultValue={editTitle}
                            style={{
                                flex: 1, fontSize: 12, border: '1px solid #4096ff', borderRadius: 3,
                                padding: '1px 4px', outline: 'none', fontFamily: 'inherit',
                                minWidth: 0, lineHeight: '20px',
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRenameSubmit(item.id, (e.target as HTMLInputElement).value);
                                } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                }
                            }}
                            onBlur={(e) => handleRenameSubmit(item.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                            onDoubleClick={(e) => {
                                if (canEdit) {
                                    e.stopPropagation();
                                    setEditingId(item.id);
                                    setEditTitle(item.title);
                                }
                            }}
                        >
                            {item.title}
                        </span>
                    )}
                    {canEdit && (
                        <Tooltip title={`Добавить в «${item.title}»`} placement="right" mouseEnterDelay={0.3}>
                            <span
                                className="sidebar-tree-add-btn"
                                role="button"
                                tabIndex={-1}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openCreateModal(item.path);
                                }}
                                style={{
                                    opacity: 0,
                                    transition: 'opacity 0.15s',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    flexShrink: 0,
                                    color: 'inherit',
                                }}
                            >
                                <Icon name="add" size={16} />
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
            key: String(item.id),
            children: item.children?.length > 0 ? transformToTreeData(item.children) : [],
        }));
    }, [canEdit, openCreateModal, editingId, editTitle, handleRenameSubmit]);

    const treeData = React.useMemo(() => {
        return transformToTreeData(rawData);
    }, [rawData, transformToTreeData]);    // ─── React Query for creating ───
    const createMutation = useMutation({
        mutationFn: async (values: { title: string; slug: string; parent_path?: string }) => {
            const slug = values.slug || generateSlug(values.title);
            const body: any = { title: values.title, slug, content: '' };
            if (values.parent_path) body.parent_path = values.parent_path;

            const res = await fetch(`${API_BASE_URL}/api/v1/pages/`, {
                method: 'POST',
                headers: {
                    ...tenantHeaders(token, currentRoom),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Ошибка создания');
            }
            return res.json();
        },
        onSuccess: (created) => {
            message.success('Страница создана');
            setModalOpen(false);
            form.resetFields();
            queryClient.invalidateQueries({ queryKey: ['pagesTree'] });
            if (onSelect) onSelect(created.id);
        },
        onError: (error: any) => {
            message.error(error.message || 'Сетевая ошибка');
        }
    });

    const handleCreate = (values: { title: string; slug: string; parent_path?: string }) => {
        createMutation.mutate(values);
    };

    const allPages = flattenTree(rawData);

    // Find sibling keys at the same level to collapse them
    const findSiblingKeys = (data: TreeDataNode[], target: React.Key): React.Key[] => {
        for (const node of data) {
            if (node.children) {
                const childKeys = node.children.map(c => c.key);
                if (childKeys.includes(target)) {
                    return childKeys.filter(k => k !== target);
                }
                const found = findSiblingKeys(node.children, target);
                if (found.length > 0) return found;
            }
        }
        return [];
    };

    // Collect all descendant keys of siblings to collapse them too
    const getAllDescendantKeys = (data: TreeDataNode[], parentKeys: React.Key[]): React.Key[] => {
        const result: React.Key[] = [];
        const parentSet = new Set(parentKeys);

        const traverse = (nodes: TreeDataNode[]) => {
            for (const node of nodes) {
                if (parentSet.has(node.key)) {
                    const collectAll = (n: TreeDataNode) => {
                        if (n.children) {
                            for (const child of n.children) {
                                result.push(child.key);
                                collectAll(child);
                            }
                        }
                    };
                    collectAll(node);
                }
                if (node.children) traverse(node.children);
            }
        };
        traverse(data);
        return result;
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {canEdit && <Button type="primary" icon={<Icon name="add" />} size="small" onClick={() => openCreateModal()} block>
                    Новая страница
                </Button>}
                <Button icon={<Icon name="refresh" />} size="small" onClick={() => loadTree()} />
            </div>

            {loading ? <Spin size="small" /> : treeData.length === 0 ? (
                <Empty description="Нет страниц" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <Tree
                    className="sidebar-tree"
                    treeData={treeData}
                    expandedKeys={expandedKeys}
                    blockNode
                    onExpand={(keys, info) => {
                        const expandedKey = info.node.key;
                        if (info.expanded) {
                            const siblingKeys = findSiblingKeys(treeData, expandedKey);
                            const keysToRemove = new Set([...siblingKeys, ...getAllDescendantKeys(treeData, siblingKeys)]);
                            setExpandedKeys(keys.filter(k => !keysToRemove.has(k)));
                        } else {
                            setExpandedKeys(keys);
                        }
                    }}
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
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    initialValues={{ parent_path: defaultParentPath }}
                >
                    <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
                        <Input
                            placeholder="Моя страница"
                            onBlur={(e) => {
                                if (!form.isFieldTouched('slug') && e.target.value) {
                                    form.setFieldValue('slug', generateSlug(e.target.value));
                                }
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="slug"
                        label="Slug (URL, латиница)"
                        rules={[
                            { required: true, message: 'Введите slug' },
                            { pattern: /^[a-z0-9_]+$/, message: 'Только строчные буквы, цифры, _' }
                        ]}
                    >
                        <Input
                            placeholder="my_awesome_page"
                            addonAfter={
                                <Button
                                    type="text"
                                    icon={<Icon name="refresh" />}
                                    size="small"
                                    onClick={() => {
                                        const currentTitle = form.getFieldValue('title');
                                        if (currentTitle) {
                                            form.setFieldValue('slug', generateSlug(currentTitle));
                                        }
                                    }}
                                    title="Сгенерировать из заголовка"
                                />
                            }
                        />
                    </Form.Item>
                    <Form.Item name="parent_path" label="Родительская страница">
                        <Select allowClear placeholder="Корневой уровень">
                            {allPages.map(p => (
                                <Select.Option key={p.path} value={p.path}>{p.title} ({p.path})</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>
                            Создать
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SidebarTree;
