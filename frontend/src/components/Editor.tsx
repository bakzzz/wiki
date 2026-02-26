import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { message, Typography, Spin, theme, Modal, Form, Input, Select, Button } from 'antd';
import { API_BASE_URL, tenantHeaders } from '../config';
import Toolbar from './Toolbar';
import Icon from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';

/** Generate a URL-friendly slug from text, with a counter for duplicates */
const slugify = (text: string): string =>
    text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'heading';

const { Text } = Typography;

interface PageData {
    id: number;
    title: string;
    slug: string;
    content: string;
    path: string;
    created_at?: string | null;
    updated_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
}

interface VersionItem {
    id: number;
    page_id: number;
    title: string;
    edited_by: string | null;
    edited_at: string | null;
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
    const [toc, setToc] = useState<{ id: string; text: string; level: number; pos: number }[]>([]);
    const [versions, setVersions] = useState<VersionItem[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [allPages, setAllPages] = useState<{ id: number, title: string; path: string }[]>([]);
    const [settingsForm] = Form.useForm();

    const openSettings = async () => {
        if (!page) return;
        setSettingsOpen(true);
        settingsForm.setFieldsValue({
            title: page.title,
            slug: page.slug,
            parent_path: page.path.includes('.') ? page.path.split('.').slice(0, -1).join('.') : undefined
        });

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/tree`, {
                headers: tenantHeaders(token, currentRoom)
            });
            if (res.ok) {
                const tree = await res.json();
                const flattened: any[] = [];
                const walk = (nodes: any[]) => {
                    for (const node of nodes) {
                        flattened.push(node);
                        if (node.children) walk(node.children);
                    }
                };
                walk(tree);
                const safePages = flattened.filter(p => p.id !== page.id && !p.path.startsWith(page.path + '.'));
                setAllPages(safePages);
            }
        } catch { }
    };

    const handleSaveSettings = async (values: { title: string, slug: string, parent_path?: string }) => {
        if (!page) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pages/${page.id}`, {
                method: 'PUT',
                headers: {
                    ...tenantHeaders(token, currentRoom),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: values.title,
                    slug: values.slug,
                    parent_path: values.parent_path || "",
                    content: editor?.getHTML() || page.content
                }),
            });
            if (res.ok) {
                message.success('Настройки страницы обновлены. Требуется обновление дерева.');
                setSettingsOpen(false);
                // The tree will be somewhat stale, but next selection or refresh will fix it,
                // or we could signal App.tsx to reload tree via an event. For now, it updates the backend.
                loadPage(page.id);
            } else {
                const err = await res.json();
                message.error(err.detail || 'Ошибка сохранения настроек');
            }
        } catch {
            message.error('Сетевая ошибка');
        } finally {
            setSaving(false);
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false }),
            Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }).extend({
                renderHTML({ node, HTMLAttributes }) {
                    const level = node.attrs.level;
                    const text = node.textContent;
                    const id = slugify(text);
                    return [`h${level}`, { ...HTMLAttributes, id }, 0];
                },
            }),
            Image.configure({ inline: false, allowBase64: true }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            FontFamily,
        ],
        content: '',
        editable: canEdit,
        onUpdate({ editor }) {
            const items: any[] = [];
            const slugCounts: Record<string, number> = {};
            editor.state.doc.descendants((node) => {
                if (node.type.name === 'heading') {
                    const text = node.textContent;
                    const baseSlug = slugify(text);
                    slugCounts[baseSlug] = (slugCounts[baseSlug] || 0) + 1;
                    const id = slugCounts[baseSlug] > 1 ? `${baseSlug}-${slugCounts[baseSlug]}` : baseSlug;
                    items.push({
                        level: node.attrs.level,
                        text,
                        id,
                    });
                }
            });
            setToc(prev => {
                if (prev.length !== items.length) return items;
                for (let i = 0; i < prev.length; i++) {
                    if (prev[i].text !== items[i].text || prev[i].level !== items[i].level || prev[i].pos !== items[i].pos) {
                        return items;
                    }
                }
                return prev;
            });
        },
        editorProps: {
            // Clean pasted HTML: parse as DOM, normalize bold/italic, strip visual styles
            transformPastedHTML(html: string) {
                // Remove Word-specific XML/comments first
                let clean = html;
                clean = clean.replace(/<!--[\s\S]*?-->/g, '');
                clean = clean.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '');
                clean = clean.replace(/<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, '');

                // Convert Word heading classes to proper heading tags
                clean = clean.replace(/<p\s+class="Mso(Heading|Title)(\d?)"[^>]*>([\s\S]*?)<\/p>/gi,
                    (_match, type, level, content) => {
                        const hLevel = type === 'Title' ? 1 : (parseInt(level) || 2);
                        return `<h${hLevel}>${content}</h${hLevel}>`;
                    });

                // Parse into DOM for proper analysis
                const dom = document.createElement('div');
                dom.innerHTML = clean;

                // Walk all elements: detect real bold/italic from styles, unwrap fake ones
                const processNode = (el: Element) => {
                    // Process children first (bottom-up)
                    Array.from(el.children).forEach(child => processNode(child));

                    const tag = el.tagName.toLowerCase();
                    const style = el.getAttribute('style') || '';

                    // Handle <b>/<strong>: check if actually bold
                    if (tag === 'b' || tag === 'strong') {
                        const fwMatch = style.match(/font-weight\s*:\s*(\w+|\d+)/i);
                        if (fwMatch) {
                            const fw = fwMatch[1].toLowerCase();
                            const isActuallyBold = fw === 'bold' || fw === 'bolder' || parseInt(fw) >= 600;
                            if (!isActuallyBold) {
                                // Not bold — unwrap: replace <b> with its children
                                const parent = el.parentNode;
                                while (el.firstChild) parent?.insertBefore(el.firstChild, el);
                                parent?.removeChild(el);
                                return;
                            }
                        }
                        // No font-weight in style, or actually bold — check if parent/context suggests it's not bold
                        // If it has font-weight:normal in style, unwrap
                    }

                    // Handle <span>: convert font-weight:bold spans to <strong>, font-style:italic to <em>
                    if (tag === 'span') {
                        const fwMatch = style.match(/font-weight\s*:\s*(\w+|\d+)/i);
                        const fsMatch = style.match(/font-style\s*:\s*italic/i);
                        const parent = el.parentNode;

                        if (fwMatch) {
                            const fw = fwMatch[1].toLowerCase();
                            const isBold = fw === 'bold' || fw === 'bolder' || parseInt(fw) >= 600;
                            if (isBold) {
                                // Convert to <strong>
                                const strong = document.createElement('strong');
                                while (el.firstChild) strong.appendChild(el.firstChild);
                                parent?.replaceChild(strong, el);
                                if (fsMatch) {
                                    const em = document.createElement('em');
                                    while (strong.firstChild) em.appendChild(strong.firstChild);
                                    strong.appendChild(em);
                                }
                                return;
                            }
                        }
                        if (fsMatch) {
                            const em = document.createElement('em');
                            while (el.firstChild) em.appendChild(el.firstChild);
                            parent?.replaceChild(em, el);
                            return;
                        }

                        // Plain span — unwrap
                        while (el.firstChild) parent?.insertBefore(el.firstChild, el);
                        parent?.removeChild(el);
                        return;
                    }

                    // Handle <font> — always unwrap
                    if (tag === 'font') {
                        const parent = el.parentNode;
                        while (el.firstChild) parent?.insertBefore(el.firstChild, el);
                        parent?.removeChild(el);
                        return;
                    }
                };

                Array.from(dom.children).forEach(child => processNode(child));

                // Strip all remaining style/class attributes
                dom.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
                dom.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));

                // Remove empty paragraphs
                dom.querySelectorAll('p').forEach(el => {
                    if (!el.textContent?.trim() && !el.querySelector('img, br, table')) {
                        el.remove();
                    }
                });

                return dom.innerHTML;
            },
            handleDrop(view, event, _slice, moved) {
                if (moved || !event.dataTransfer?.files?.length) return false;
                const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                if (files.length === 0) return false;

                event.preventDefault();
                files.forEach(async (file) => {
                    message.loading({ content: `Загрузка ${file.name}...`, key: file.name });
                    const url = await uploadImageToMinIO(file, token, currentRoom);
                    if (url) {
                        const { schema, tr } = view.state;
                        const node = schema.nodes.image.create({ src: url });
                        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        const insertPos = coords ? coords.pos : tr.mapping.map(view.state.doc.content.size);
                        view.dispatch(tr.insert(insertPos, node));
                        message.success({ content: `Загружено!`, key: file.name });
                    } else {
                        message.error({ content: `Ошибка загрузки ${file.name}`, key: file.name });
                    }
                });
                return true;
            },
            handlePaste(_view, event) {
                const types = Array.from(event.clipboardData?.types || []);

                // For HTML content: let Tiptap handle it (preserves structure)
                // then clean up fonts after insertion
                if (types.includes('text/html')) {
                    // Let Tiptap process the paste normally
                    // After a tick, strip all font/color marks from the document
                    setTimeout(() => {
                        if (!_view.isDestroyed) {
                            const { tr, doc } = _view.state;
                            let modified = false;
                            doc.descendants((node, pos) => {
                                if (node.isText) {
                                    node.marks.forEach(mark => {
                                        if (mark.type.name === 'textStyle') {
                                            tr.removeMark(pos, pos + node.nodeSize, mark.type);
                                            modified = true;
                                        }
                                    });
                                }
                            });
                            if (modified) {
                                _view.dispatch(tr);
                            }
                        }
                    }, 50);
                    return false; // Let Tiptap handle the paste
                }

                const items = event.clipboardData?.items;
                if (!items) return false;

                const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
                if (imageItems.length === 0) return false;

                event.preventDefault();
                imageItems.forEach(async (item) => {
                    const file = item.getAsFile();
                    if (!file) return;
                    message.loading({ content: 'Вставка картинки...', key: 'paste' });
                    const url = await uploadImageToMinIO(file, token, currentRoom);
                    if (url) {
                        message.success({ content: 'Картинка вставлена!', key: 'paste' });
                        const { schema } = _view.state;
                        const node = schema.nodes.image.create({ src: url });
                        const tr = _view.state.tr.replaceSelectionWith(node);
                        _view.dispatch(tr);
                    } else {
                        message.error({ content: 'Не удалось загрузить картинку', key: 'paste' });
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
                    // Prepend title as H1 if content doesn't already start with one
                    let content = data.content || '<p></p>';
                    const startsWithH1 = /^\s*<h1[^>]*>/i.test(content);
                    if (!startsWithH1 && data.title) {
                        content = `<h1>${data.title}</h1>${content}`;
                    }
                    editor.commands.setContent(content);
                }
            } else {
                message.error('Страница не найдена');
                setPage(null);
                if (onPageDeleted) onPageDeleted();
            }
        } catch {
            message.error('Ошибка загрузки страницы');
        } finally {
            setLoading(false);
        }
    }, [editor, currentRoom, token]);

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

            // Title stays independent — it is only changed via the sidebar rename
            const title = page.title;

            const res = await fetch(`${API_BASE_URL}/api/v1/pages/${page.id}`, {
                method: 'PUT',
                headers: tenantHeaders(token, currentRoom),
                body: JSON.stringify({ content: html, title }),
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
            {/* Full-width sticky toolbar */}
            {canEdit && (
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}>
                    <Toolbar
                        editor={editor}
                        onSettings={page ? openSettings : undefined}
                        onSave={page ? handleSave : undefined}
                        onDelete={page ? handleDelete : undefined}
                        saving={saving}
                    />
                </div>
            )}

            {/* Content + TOC row */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{
                    flex: 1,
                    minWidth: 0,
                    background: themeToken.colorBgContainer,
                    minHeight: 'calc(100vh - 56px)',
                }}>
                    <div style={{ padding: '40px 40px 40px 40px', maxWidth: 800, margin: '0 auto' }}>
                        <EditorContent editor={editor} style={{ width: '100%' }} />
                    </div>
                </div>

                <div style={{
                    width: 250,
                    position: 'sticky',
                    top: canEdit ? 50 : 24,
                    alignSelf: 'flex-start',
                    padding: 20,
                    maxHeight: canEdit ? 'calc(100vh - 70px)' : 'calc(100vh - 100px)',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}>
                    {/* Page metadata — above TOC */}
                    {page && (
                        <div style={{
                            fontSize: 11,
                            color: themeToken.colorTextSecondary,
                            lineHeight: '18px',
                            marginBottom: 12,
                            paddingBottom: 12,
                            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
                        }}>
                            {page.created_by && (
                                <div><Icon name="person" size={12} /> Создал: <strong>{page.created_by}</strong></div>
                            )}
                            {page.created_at && (
                                <div style={{ marginBottom: 4 }}><Icon name="calendar_today" size={12} /> {new Date(page.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            )}
                            {page.updated_by && page.updated_by !== page.created_by && (
                                <div><Icon name="edit" size={12} /> Редактировал: <strong>{page.updated_by}</strong></div>
                            )}
                            {page.updated_at && (
                                <div style={{ marginBottom: 8 }}><Icon name="update" size={12} /> {new Date(page.updated_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            )}
                            <a
                                style={{ cursor: 'pointer', color: themeToken.colorPrimary, fontSize: 11 }}
                                onClick={() => {
                                    fetch(`${API_BASE_URL}/api/v1/pages/${page.id}/versions`, {
                                        headers: tenantHeaders(token, currentRoom),
                                    })
                                        .then(r => r.json())
                                        .then(data => { setVersions(data); setHistoryOpen(true); })
                                        .catch(() => { });
                                }}
                            >
                                <Icon name="history" size={12} /> История изменений
                            </a>
                        </div>
                    )}

                    <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Структура документа</Typography.Title>
                    {toc.length === 0 ? <Text type="secondary" style={{ fontSize: 12 }}>Нет заголовков</Text> : (() => {
                        const minLevel = Math.min(...toc.map(i => i.level));
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {toc.map((item, idx) => (
                                    <div
                                        key={idx}
                                        title={item.text || 'Без названия'}
                                        style={{
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            paddingLeft: (item.level - minLevel) * 12,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: themeToken.colorPrimary,
                                            lineHeight: '20px',
                                            paddingRight: 4,
                                            borderRadius: 3,
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,119,255,0.06)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => {
                                            const el = document.getElementById(item.id);
                                            if (el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }}
                                    >
                                        {item.text || 'Без названия'}
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Version history modal */}
                <Modal title="История изменений" open={historyOpen} onCancel={() => setHistoryOpen(false)} footer={null} width={500}>
                    {versions.length === 0 ? (
                        <Text type="secondary">Нет сохранённых версий</Text>
                    ) : (
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {versions.map(v => (
                                <div key={v.id} style={{ padding: '8px 0', borderBottom: `1px solid ${themeToken.colorBorderSecondary}`, fontSize: 13 }}>
                                    <div><strong>{v.title}</strong></div>
                                    <div style={{ color: themeToken.colorTextSecondary, fontSize: 11 }}>
                                        {v.edited_by && `${v.edited_by} · `}
                                        {v.edited_at && new Date(v.edited_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
                {/* Settings modal */}
                <Modal title="Настройки страницы" open={settingsOpen} onCancel={() => setSettingsOpen(false)} footer={null}>
                    <Form form={settingsForm} layout="vertical" onFinish={handleSaveSettings}>
                        <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="slug" label="URL (slug)" rules={[{ required: true, message: 'Введите slug' }, { pattern: /^[a-z0-9_]+$/, message: 'Только строчные латинские буквы, цифры, _' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="parent_path" label="Родительская страница">
                            <Select allowClear placeholder="Корневой уровень">
                                {allPages.map(p => (
                                    <Select.Option key={p.path} value={p.path}>{p.title} ({p.path})</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={saving} block>Сохранить изменения</Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default Editor;
