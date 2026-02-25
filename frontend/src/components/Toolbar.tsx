import React from 'react';
import { Button, Tooltip, Divider, Upload, message, theme } from 'antd';
import Icon from './Icon';
import type { Editor } from '@tiptap/react';
import { API_BASE_URL } from '../config';

interface ToolbarProps {
    editor: Editor | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
    const { token } = theme.useToken();
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
                style={{ minWidth: 32 }}
            />
        </Tooltip>
    );

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            padding: '8px 12px',
            background: token.colorBgTextHover,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: '6px 6px 0 0',
            alignItems: 'center',
        }}>
            {/* Headings */}
            {[1, 2, 3].map(level => (
                <Tooltip title={`Heading ${level}`} key={level}>
                    <Button
                        type={editor.isActive('heading', { level }) ? 'primary' : 'text'}
                        size="small"
                        onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
                        style={{ minWidth: 32, fontWeight: 'bold', fontSize: 12 }}
                    >
                        H{level}
                    </Button>
                </Tooltip>
            ))}

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

            <Tooltip title="Блок кода">
                <Button
                    type={editor.isActive('codeBlock') ? 'primary' : 'text'}
                    size="small"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    style={{ minWidth: 32, fontFamily: 'monospace', fontSize: 11 }}
                >
                    {'</>'}
                </Button>
            </Tooltip>

            <Tooltip title="Цитата">
                <Button
                    type={editor.isActive('blockquote') ? 'primary' : 'text'}
                    size="small"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    style={{ minWidth: 32, fontWeight: 'bold' }}
                >
                    "
                </Button>
            </Tooltip>

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
        </div>
    );
};

export default Toolbar;
