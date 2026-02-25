import React, { useState } from 'react';
import { Input, List, Typography, Popover } from 'antd';
import { API_BASE_URL, tenantHeaders } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';

const { Text } = Typography;

interface SearchResult {
    id: number;
    title: string;
    slug: string;
    path: string;
    headline: string;
    rank: number;
}

interface SearchBarProps {
    onSelect?: (pageId: number) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelect }) => {
    const { token } = useAuth();
    const { currentRoom } = useRoom();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSearch = async (value: string) => {
        if (!value.trim()) {
            setResults([]);
            setOpen(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/search?q=${encodeURIComponent(value)}`, {
                headers: tenantHeaders(token, currentRoom)
            });
            const data = await res.json();
            setResults(data.results || []);
            setOpen(true);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div style={{ width: 340, maxHeight: 300, overflow: 'auto' }}>
            {results.length > 0 ? (
                <List
                    size="small"
                    dataSource={results}
                    renderItem={(item: SearchResult) => (
                        <List.Item
                            style={{ cursor: 'pointer', padding: '8px 12px' }}
                            onClick={() => {
                                if (onSelect) onSelect(item.id);
                                setOpen(false);
                            }}
                        >
                            <div>
                                <Text strong>{item.title}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    <span dangerouslySetInnerHTML={{ __html: item.headline }} />
                                </Text>
                            </div>
                        </List.Item>
                    )}
                />
            ) : (
                <div style={{ padding: 16, textAlign: 'center' }}>
                    <Text type="secondary">No results</Text>
                </div>
            )}
        </div>
    );

    return (
        <Popover content={content} open={open && results.length > 0} placement="bottomRight" trigger={[]}>
            <Input.Search
                placeholder="Поиск страниц..."
                onSearch={handleSearch}
                onChange={(e) => {
                    if (!e.target.value) { setOpen(false); setResults([]); }
                }}
                loading={loading}
                allowClear
            />
        </Popover>
    );
};

export default SearchBar;
