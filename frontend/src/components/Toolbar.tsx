import React, { useState, useEffect } from 'react';
import { Button, Tooltip, Divider, Upload, message, theme, Popconfirm, Select } from 'antd';
import Icon from './Icon';
import type { Editor } from '@tiptap/react';
import { API_BASE_URL } from '../config';

interface ToolbarProps {
    editor: Editor | null;
    onSave?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    saving?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ editor, onSave, onDelete, onSettings, saving }) => {
    const { token } = theme.useToken();

    // Force re-render on editor state changes (selection, formatting)
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!editor) return;
        const handler = () => setTick(t => t + 1);
        editor.on('transaction', handler);
        return () => { editor.off('transaction', handler); };
    }, [editor]);

    if (!editor) return null;

    const handleImageUpload = async (file: File) => {
        try {
            // Get presigned upload URL
            const res = await fetch(`${API_BASE_URL}/api/v1/media/upload-url?filename=${encodeURIComponent(file.name)}`, {
                method: 'POST',
            });
            const { upload_url, object_key } = await res.json();

            // Upload to MinIO
            await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            // Get download URL
            const dlRes = await fetch(`${API_BASE_URL}/api/v1/media/download-url?object_key=${encodeURIComponent(object_key)}`);
            const { download_url } = await dlRes.json();

            // Insert image into editor
            editor.chain().focus().setImage({ src: download_url }).run();
            message.success('Изображение загружено!');
        } catch {
            message.error('Ошибка загрузки');
        }
    };

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    const ToolBtn = ({ icon, title, action, isActive }: { icon: React.ReactNode; title: string; action: () => void; isActive?: boolean }) => (
        <Tooltip title={title}>
            <Button
                type={isActive ? 'primary' : 'text'}
                icon={icon}
                size="small"
                onClick={action}
                onMouseDown={(e) => e.preventDefault()}
                style={{ minWidth: 32 }}
            />
        </Tooltip>
    );

    // Determine current heading level for the Select
    const currentLevel = [1, 2, 3, 4, 5, 6].find(l => editor.isActive('heading', { level: l }));
    const headingValue = currentLevel ? `h${currentLevel}` : 'paragraph';

    const handleHeadingChange = (value: string) => {
        if (value === 'paragraph') {
            editor.chain().focus().setParagraph().run();
        } else {
            const level = parseInt(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
            editor.chain().focus().toggleHeading({ level }).run();
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: '10px 20px',
            background: '#fff',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            alignItems: 'center',
        }}>
            {/* Heading selector */}
            <Select
                value={headingValue}
                onChange={handleHeadingChange}
                size="small"
                style={{ width: 150, fontFamily: "'Segoe UI', sans-serif" }}
                options={[
                    { value: 'paragraph', label: 'Обычный текст' },
                    { value: 'h1', label: <span style={{ fontSize: 18, fontWeight: 600 }}>Заголовок 1</span> },
                    { value: 'h2', label: <span style={{ fontSize: 16, fontWeight: 600 }}>Заголовок 2</span> },
                    { value: 'h3', label: <span style={{ fontSize: 14, fontWeight: 600 }}>Заголовок 3</span> },
                    { value: 'h4', label: <span style={{ fontSize: 13, fontWeight: 600 }}>Заголовок 4</span> },
                    { value: 'h5', label: <span style={{ fontSize: 12, fontWeight: 600 }}>Заголовок 5</span> },
                    { value: 'h6', label: <span style={{ fontSize: 11, fontWeight: 600 }}>Заголовок 6</span> },
                ]}
            />

            <Divider type="vertical" style={{ margin: '0 4px' }} />

            {/* Text formatting */}
            <ToolBtn icon={<Icon name="format_bold" />} title="Жирный (Ctrl+B)" action={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} />
            <ToolBtn icon={<Icon name="format_italic" />} title="Курсив (Ctrl+I)" action={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} />
            <ToolBtn icon={<Icon name="format_underlined" />} title="Подчёркнутый (Ctrl+U)" action={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} />
            <ToolBtn icon={<Icon name="format_strikethrough" />} title="Зачёркнутый" action={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} />
            <ToolBtn icon={<Icon name="code" />} title="Код" action={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} />

            <Divider type="vertical" style={{ margin: '0 4px' }} />

            {/* Lists */}
            <ToolBtn icon={<Icon name="format_list_bulleted" />} title="Маркированный список" action={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} />
            <ToolBtn icon={<Icon name="format_list_numbered" />} title="Нумерованный список" action={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} />

            <Divider type="vertical" style={{ margin: '0 4px' }} />

            {/* Align */}
            <ToolBtn icon={<Icon name="format_align_left" />} title="По левому краю" action={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} />
            <ToolBtn icon={<Icon name="format_align_center" />} title="По центру" action={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} />
            <ToolBtn icon={<Icon name="format_align_right" />} title="По правому краю" action={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} />

            <Divider type="vertical" style={{ margin: '0 4px' }} />

            {/* Extras */}
            <ToolBtn icon={<Icon name="link" />} title="Вставить ссылку" action={addLink} isActive={editor.isActive('link')} />
            <ToolBtn icon={<Icon name="horizontal_rule" />} title="Разделитель" action={() => editor.chain().focus().setHorizontalRule().run()} />
            <ToolBtn icon={<Icon name="data_object" />} title="Блок кода" action={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} />
            <ToolBtn icon={<Icon name="format_quote" />} title="Цитата" action={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} />

            <Divider type="vertical" style={{ margin: '0 4px' }} />

            {/* Image upload */}
            <Upload
                customRequest={({ file }) => handleImageUpload(file as File)}
                showUploadList={false}
                accept="image/*"
            >
                <Tooltip title="Загрузить изображение">
                    <Button type="text" icon={<Icon name="image" />} size="small" style={{ minWidth: 32 }} />
                </Tooltip>
            </Upload>

            <Divider type="vertical" style={{ margin: '0 4px' }} />

            {/* Undo/Redo */}
            <ToolBtn icon={<Icon name="undo" />} title="Отменить (Ctrl+Z)" action={() => editor.chain().focus().undo().run()} />
            <ToolBtn icon={<Icon name="redo" />} title="Повторить (Ctrl+Shift+Z)" action={() => editor.chain().focus().redo().run()} />

            {/* Spacer */}
            {(onSave || onDelete || onSettings) && <div style={{ flex: 1 }} />}

            {/* Save/Settings/Delete actions */}
            {onSettings && (
                <Button size="small" icon={<Icon name="settings" />} onClick={onSettings} title="Настройки страницы">
                    Настройки
                </Button>
            )}
            {onSave && (
                <Button type="primary" icon={<Icon name="save" />} size="small" loading={saving} onClick={onSave}>
                    Сохранить
                </Button>
            )}
            {onDelete && (
                <Popconfirm title="Удалить страницу?" onConfirm={onDelete} okText="Да" cancelText="Нет">
                    <Button danger size="small" icon={<Icon name="delete" />}>Удалить</Button>
                </Popconfirm>
            )}
        </div>
    );
};

export default Toolbar;
