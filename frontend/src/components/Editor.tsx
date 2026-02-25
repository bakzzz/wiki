import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Button, Space, message, Typography, Spin, Divider, Popconfirm, theme } from 'antd';
import Icon from './Icon';
import { API_BASE_URL, tenantHeaders } from '../config';
import Toolbar from './Toolbar';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';

const { Title, Text } = Typography;

interface PageData {
    id: number;
    title: string;
    slug: string;
    content: string;
    path: string;
}

interface EditorProps {
    pageId: number | null;
    onPageDeleted?: () => void;
    canEdit?: boolean;
}

const uploadImageToMinIO = async (file: File, token: string | null, room: string): Promise<string | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/media/upload-url?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: tenantHeaders(token, room),
        });
        const { upload_url, object_key } = await res.json();

        await fetch(upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });

        const dlRes = await fetch(`${API_BASE_URL}/api/v1/media/download-url?object_key=${encodeURIComponent(object_key)}`, {
            headers: tenantHeaders(token, room),
        });
        const { download_url } = await dlRes.json();
        return download_url;
    } catch {
        return null;
    }
};

const Editor: React.FC<EditorProps> = ({ pageId, onPageDeleted, canEdit = true }) => {
    const { token: themeToken } = theme.useToken();
    const { token } = useAuth();
    const { currentRoom } = useRoom();

    const [page, setPage] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: false, allowBase64: true }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false }),
        ],
        content: '',
        editable: canEdit,
        editorProps: {
            handleDrop(view, event, _slice, moved) {
                if (moved || !event.dataTransfer?.files?.length) return false;
                const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                if (files.length === 0) return false;

                event.preventDefault();
                files.forEach(async (file) => {
                    message.loading({ content: `Uploading ${file.name}...`, key: file.name });
                    const url = await uploadImageToMinIO(file, token, currentRoom);
                    if (url) {
                        const { schema } = view.state;
                        const node = schema.nodes.image.create({ src: url });
                        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (pos) {
                            const tr = view.state.tr.insert(pos.pos, node);
                            view.dispatch(tr);
                        }
                        message.success({ content: `${file.name} uploaded!`, key: file.name });
                    } else {
                        message.error({ content: `Failed to upload ${file.name}`, key: file.name });
                    }
                });
                return true;
            },
            handlePaste(_view, event) {
                const items = event.clipboardData?.items;
                if (!items) return false;

                const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
                if (imageItems.length === 0) return false;

                event.preventDefault();
                imageItems.forEach(async (item) => {
                    const file = item.getAsFile();
                    if (!file) return;
                    message.loading({ content: 'Uploading pasted image...', key: 'paste' });
                    const url = await uploadImageToMinIO(file, token, currentRoom);
                    if (url) {
                        message.success({ content: 'Image pasted!', key: 'paste' });
                        // Insert via transaction
                        const { schema } = _view.state;
                        const node = schema.nodes.image.create({ src: url });
                        const tr = _view.state.tr.replaceSelectionWith(node);
                        _view.dispatch(tr);
                    } else {
                        message.error({ content: 'Failed to upload image', key: 'paste' });
                    }
                });
                return true;
            },
        },
    });

    // Update editable state when canEdit changes (e.g. switching rooms)
    useEffect(() => {
        if (editor) editor.setEditable(canEdit);
    }, [editor, canEdit]);

    const loadPage = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/${id}`, {
                headers: tenantHeaders(token, currentRoom),
            });
            if (res.ok) {
                const data = await res.json();
                setPage(data);
                if (editor) {
                    editor.commands.setContent(data.content || '<p></p>');
                }
            } else {
                message.error('Страница не найдена');
                setPage(null);
            }
        } catch {
            message.error('Ошибка загрузки страницы');
        } finally {
            setLoading(false);
        }
    }, [editor]);

    useEffect(() => {
        if (pageId && editor) {
            loadPage(pageId);
        } else {
            setPage(null);
            if (editor) editor.commands.setContent('<h2>Welcome to Wiki</h2><p>Select a page from the sidebar or create a new one.</p>');
        }
    }, [pageId, editor, loadPage]);

    const handleSave = async () => {
        if (!editor || !page) return;
        setSaving(true);
        try {
            const html = editor.getHTML();
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/${page.id}`, {
                method: 'PUT',
                headers: tenantHeaders(token, currentRoom),
                body: JSON.stringify({ content: html }),
            });
            if (res.ok) {
                message.success('Страница сохранена!');
            } else {
                message.error('Ошибка сохранения');
            }
        } catch {
            message.error('Ошибка сети');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!page) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/${page.id}`, {
                method: 'DELETE',
                headers: tenantHeaders(token, currentRoom)
            });
            if (res.ok) {
                message.success('Страница удалена');
                setPage(null);
                if (editor) editor.commands.setContent('<p>Страница удалена. Выберите другую.</p>');
                if (onPageDeleted) onPageDeleted();
            } else {
                message.error('Ошибка удаления');
            }
        } catch {
            message.error('Ошибка сети');
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ width: '100%' }}>
            {page && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{page.title}</Title>
                            <Text type="secondary" style={{ fontSize: 12 }}>/{page.slug} · path: {page.path}</Text>
                        </div>
                        {canEdit && <Space>
                            <Button type="primary" icon={<Icon name="save" />} loading={saving} onClick={handleSave}>
                                Сохранить
                            </Button>
                            <Popconfirm title="Удалить страницу?" onConfirm={handleDelete} okText="Да" cancelText="Нет">
                                <Button danger icon={<Icon name="delete" />}>Удалить</Button>
                            </Popconfirm>
                        </Space>}
                    </div>
                    <Divider style={{ margin: '8px 0 0 0' }} />
                </>
            )}
            <div style={{
                border: `1px solid ${themeToken.colorBorderSecondary}`,
                borderRadius: themeToken.borderRadius,
                overflow: 'hidden',
                background: themeToken.colorBgContainer,
                width: '100%',
            }}>
                {canEdit && <Toolbar editor={editor} />}
                <div style={{ padding: 16, minHeight: 400 }}>
                    <EditorContent editor={editor} style={{ width: '100%' }} />
                </div>
            </div>
        </div>
    );
};

export default Editor;
