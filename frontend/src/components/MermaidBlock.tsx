import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Input, Button, Space, Typography, theme } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

mermaid.initialize({ startOnLoad: false, theme: 'default' });

interface MermaidBlockProps {
    code: string;
    onUpdate?: (code: string) => void;
}

const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onUpdate }) => {
    const { token } = theme.useToken();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editing, setEditing] = useState(false);
    const [editCode, setEditCode] = useState(code);
    const [svgContent, setSvgContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        renderDiagram(code);
    }, [code]);

    const renderDiagram = async (diagramCode: string) => {
        try {
            const id = `mermaid-${Date.now()}`;
            const { svg } = await mermaid.render(id, diagramCode);
            setSvgContent(svg);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Invalid Mermaid syntax');
            setSvgContent('');
        }
    };

    const handleSave = () => {
        setEditing(false);
        if (onUpdate) onUpdate(editCode);
        renderDiagram(editCode);
    };

    if (editing) {
        return (
            <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: 12, margin: '8px 0', background: token.colorBgTextHover }}>
                <Text strong>Редактор диаграммы</Text>
                <TextArea
                    value={editCode}
                    rows={6}
                    onChange={(e) => setEditCode(e.target.value)}
                    style={{ fontFamily: 'monospace', marginTop: 8 }}
                />
                <Space style={{ marginTop: 8 }}>
                    <Button type="primary" size="small" onClick={handleSave}>Сохранить</Button>
                    <Button size="small" onClick={() => setEditing(false)}>Отмена</Button>
                </Space>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{ border: `1px dashed ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: 16, margin: '8px 0', cursor: 'pointer', background: token.colorBgContainer }}
            onDoubleClick={() => { setEditing(true); setEditCode(code); }}
        >
            {error && <Text type="danger">{error}</Text>}
            {svgContent && <div dangerouslySetInnerHTML={{ __html: svgContent }} />}
            {!svgContent && !error && <Text type="secondary">Дважды кликните для редактирования</Text>}
        </div>
    );
};

export default MermaidBlock;
