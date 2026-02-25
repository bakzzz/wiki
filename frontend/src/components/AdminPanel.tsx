import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Typography, Popconfirm, Tooltip, Switch, Upload, theme as antTheme } from 'antd';
import Icon from './Icon';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useThemeContext } from '../theme';

const { Title } = Typography;

interface RoomItem {
    name: string;
    display_name: string;
    public_slug: string | null;
    logo_url: string | null;
}

interface UserRoomEntry {
    room: string;
    role: string;
}

interface UserItem {
    id: number;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string | null;
    rooms: UserRoomEntry[];
}

const ROLES = ['Owner', 'Admin', 'Editor', 'Viewer'];
const ROLE_COLORS: Record<string, string> = { Owner: 'gold', Admin: 'red', Editor: 'blue', Viewer: 'green' };

// ── Theme Switcher ──
const ThemeSwitcher: React.FC = () => {
    const { modeName, setMode } = useThemeContext();
    const { token } = antTheme.useToken();
    return (
        <div>
            <Title level={4}><Icon name="palette" /> Тема</Title>
            <Space size={8} align="center">
                <Icon name="light_mode" style={{ fontSize: 16, color: modeName === 'light' ? token.colorPrimary : undefined }} />
                <Switch
                    checked={modeName === 'dark'}
                    onChange={(checked) => setMode(checked ? 'dark' : 'light')}
                />
                <Icon name="dark_mode" style={{ fontSize: 16, color: modeName === 'dark' ? token.colorPrimary : undefined }} />
                <span style={{ marginLeft: 8 }}>{modeName === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</span>
            </Space>
        </div>
    );
};

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { token } = useAuth();
    const { refreshRooms } = useRoom();
    const [allRooms, setAllRooms] = useState<RoomItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [roomModalOpen, setRoomModalOpen] = useState(false);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
    const [roomForm] = Form.useForm();
    const [userForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const loadRooms = async () => {
        setLoadingRooms(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms`, { headers });
            if (res.ok) setAllRooms(await res.json());
        } catch { }
        setLoadingRooms(false);
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users-with-rooms`, { headers });
            if (res.ok) setUsers(await res.json());
        } catch { }
        setLoadingUsers(false);
    };

    useEffect(() => { loadRooms(); loadUsers(); }, []);

    // ── Room actions ─────────────────────────────────
    const handleCreateRoom = async (values: { name: string; display_name: string }) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms`, {
                method: 'POST', headers, body: JSON.stringify(values),
            });
            if (res.ok) {
                message.success('Продукт создан');
                setRoomModalOpen(false);
                roomForm.resetFields();
                loadRooms();
                refreshRooms();
            } else {
                const err = await res.json();
                message.error(err.detail || 'Ошибка');
            }
        } catch { message.error('Ошибка сети'); }
    };

    const handleDeleteRoom = async (name: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${name}`, { method: 'DELETE', headers });
            if (res.ok) { message.success('Продукт удалён'); loadRooms(); loadUsers(); refreshRooms(); }
            else { const err = await res.json(); message.error(err.detail || 'Ошибка'); }
        } catch { message.error('Ошибка сети'); }
    };

    const handleTogglePublic = async (roomName: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${roomName}/toggle-public`, { method: 'POST', headers });
            if (res.ok) { loadRooms(); message.success('Публичная ссылка обновлена'); }
        } catch { message.error('Ошибка сети'); }
    };

    const handleUploadLogo = async (roomName: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${roomName}/logo`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (res.ok) { message.success('Лого загружено'); loadRooms(); refreshRooms(); }
            else { const err = await res.json(); message.error(err.detail || 'Ошибка загрузки'); }
        } catch { message.error('Ошибка сети'); }
    };

    const copyPublicLink = (slug: string) => {
        const url = `${window.location.origin}/public/${slug}`;
        navigator.clipboard.writeText(url);
        message.success('Ссылка скопирована');
    };

    // ── User actions ─────────────────────────────────
    const handleCreateUser = async (values: { email: string; password: string }) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
                method: 'POST', headers, body: JSON.stringify(values),
            });
            if (res.ok) {
                message.success('Пользователь создан');
                setUserModalOpen(false);
                userForm.resetFields();
                loadUsers();
            } else {
                const err = await res.json();
                message.error(err.detail || 'Ошибка');
            }
        } catch { message.error('Ошибка сети'); }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, { method: 'DELETE', headers });
            if (res.ok) { message.success('Пользователь удалён'); loadUsers(); }
            else { const err = await res.json(); message.error(err.detail || 'Ошибка'); }
        } catch { message.error('Ошибка сети'); }
    };

    const handleResetPassword = async (values: { password: string }) => {
        if (!passwordUserId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${passwordUserId}/password`, {
                method: 'PUT', headers, body: JSON.stringify(values),
            });
            if (res.ok) {
                message.success('Пароль обновлён');
                setPasswordModalOpen(false);
                passwordForm.resetFields();
            } else {
                const err = await res.json();
                message.error(err.detail || 'Ошибка');
            }
        } catch { message.error('Ошибка сети'); }
    };

    const handleUserRoomAdd = async (userId: number, roomName: string, currentRooms: UserRoomEntry[]) => {
        if (roomName === '__all__') {
            // Replace everything with a single __all__ entry
            await saveUserRooms(userId, [{ room: '__all__', role: 'Viewer' }]);
        } else {
            const newRooms = [...currentRooms, { room: roomName, role: 'Viewer' }];
            await saveUserRooms(userId, newRooms);
        }
    };

    const handleUserRoomRemove = async (userId: number, roomName: string, currentRooms: UserRoomEntry[]) => {
        const newRooms = currentRooms.filter(r => r.room !== roomName);
        await saveUserRooms(userId, newRooms);
    };

    const handleUserRoleChange = async (userId: number, roomName: string, newRole: string, currentRooms: UserRoomEntry[]) => {
        const newRooms = currentRooms.map(r => r.room === roomName ? { ...r, role: newRole } : r);
        await saveUserRooms(userId, newRooms);
    };

    const saveUserRooms = async (userId: number, rooms: UserRoomEntry[]) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/rooms`, {
                method: 'PUT', headers, body: JSON.stringify({ rooms }),
            });
            if (res.ok) { loadUsers(); }
            else { const err = await res.json(); message.error(err.detail || 'Ошибка'); }
        } catch { message.error('Ошибка сети'); }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const { token: themeToken } = antTheme.useToken();

    return (
        <div style={{ padding: '32px 48px', minHeight: 'calc(100vh - 56px)', overflow: 'auto', maxWidth: 1200, margin: '0 auto' }}>
            {/* ─── HEADER ──────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0 }}>Панель управления</Title>
                <Button size="large" onClick={onClose}>← Назад</Button>
            </div>

            {/* ─── THEME ─────────────────────────────────── */}
            <div style={{
                background: themeToken.colorBgContainer,
                borderRadius: themeToken.borderRadiusLG,
                border: `1px solid ${themeToken.colorBorderSecondary}`,
                padding: '20px 24px',
                marginBottom: 24,
            }}>
                <ThemeSwitcher />
            </div>

            {/* ─── ROOMS ─────────────────────────────────── */}
            <div style={{
                background: themeToken.colorBgContainer,
                borderRadius: themeToken.borderRadiusLG,
                border: `1px solid ${themeToken.colorBorderSecondary}`,
                padding: '24px 28px',
                marginBottom: 24,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Title level={4} style={{ margin: 0 }}><Icon name="inventory_2" /> Продукты</Title>
                    <Button type="primary" size="large" icon={<Icon name="add" />} onClick={() => setRoomModalOpen(true)}>
                        Создать продукт
                    </Button>
                </div>
                <Table
                    dataSource={allRooms}
                    rowKey="name"
                    size="middle"
                    loading={loadingRooms}
                    pagination={false}
                    columns={[
                        {
                            title: 'Лого', key: 'logo', width: 150, align: 'center' as const,
                            render: (_: any, r: RoomItem) => (
                                <Upload
                                    showUploadList={false}
                                    accept="image/*"
                                    beforeUpload={(file) => { handleUploadLogo(r.name, file); return false; }}
                                >
                                    <Tooltip title="Нажмите для замены лого">
                                        <div style={{
                                            width: 120,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px dashed ${themeToken.colorBorderSecondary}`,
                                            borderRadius: themeToken.borderRadius,
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                        }}>
                                            <img
                                                src={r.logo_url ? `${API_BASE_URL}${r.logo_url}` : '/logo.svg'}
                                                alt={r.display_name}
                                                style={{ maxWidth: 110, maxHeight: 40, objectFit: 'contain' }}
                                            />
                                        </div>
                                    </Tooltip>
                                </Upload>
                            ),
                        },
                        { title: 'ID', dataIndex: 'name', key: 'name', width: 160 },
                        { title: 'Название', dataIndex: 'display_name', key: 'display_name', width: 220 },
                        {
                            title: 'Публичная ссылка', key: 'public',
                            render: (_: any, r: RoomItem) => r.public_slug ? (
                                <Space size="middle">
                                    <Tag
                                        color="green"
                                        style={{ fontSize: 13, padding: '4px 10px', lineHeight: '22px' }}
                                    >
                                        <Icon name="link" /> {window.location.origin}/public/{r.public_slug}
                                    </Tag>
                                    <Tooltip title="Копировать ссылку">
                                        <Button icon={<Icon name="content_copy" />} onClick={() => copyPublicLink(r.public_slug!)} />
                                    </Tooltip>
                                    <Tooltip title="Отключить публичную ссылку">
                                        <Button danger icon={<Icon name="block" />} onClick={() => handleTogglePublic(r.name)} />
                                    </Tooltip>
                                </Space>
                            ) : (
                                <Button icon={<Icon name="link" />} onClick={() => handleTogglePublic(r.name)}>
                                    Включить публичную ссылку
                                </Button>
                            ),
                        },
                        {
                            title: '', key: 'actions', width: 60, align: 'center' as const,
                            render: (_: any, r: RoomItem) => (
                                <Popconfirm title="Удалить продукт?" onConfirm={() => handleDeleteRoom(r.name)}>
                                    <Button danger icon={<Icon name="delete" />} />
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </div>

            {/* ─── USERS ─────────────────────────────────── */}
            <div style={{
                background: themeToken.colorBgContainer,
                borderRadius: themeToken.borderRadiusLG,
                border: `1px solid ${themeToken.colorBorderSecondary}`,
                padding: '24px 28px',
                marginBottom: 24,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Title level={4} style={{ margin: 0 }}><Icon name="group" /> Пользователи</Title>
                    <Button type="primary" size="large" icon={<Icon name="add" />} onClick={() => setUserModalOpen(true)}>
                        Добавить
                    </Button>
                </div>
                <Table
                    dataSource={users}
                    rowKey="id"
                    size="middle"
                    loading={loadingUsers}
                    pagination={false}
                    columns={[
                        {
                            title: 'Почта', dataIndex: 'email', key: 'email', width: 260,
                            render: (email: string, record: UserItem) => (
                                <Space size="small">
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{email}</span>
                                    {record.is_superuser && <Tag color="gold" style={{ fontSize: 11 }}>SU</Tag>}
                                </Space>
                            ),
                        },
                        {
                            title: 'Продукты', key: 'rooms', width: 240,
                            render: (_: any, record: UserItem) => {
                                const hasAll = record.rooms.some(r => r.room === '__all__');
                                if (hasAll) {
                                    return (
                                        <Tag
                                            color="green"
                                            closable
                                            onClose={() => handleUserRoomRemove(record.id, '__all__', record.rooms)}
                                            style={{ margin: 0, fontSize: 13, padding: '2px 10px', lineHeight: '26px' }}
                                        >
                                            Все продукты
                                        </Tag>
                                    );
                                }
                                const assignedRoomNames = record.rooms.map(r => r.room);
                                const availableRooms = allRooms.filter(r => !assignedRoomNames.includes(r.name));
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {record.rooms.map(entry => (
                                            <Tag
                                                key={entry.room}
                                                color="blue"
                                                closable
                                                onClose={() => handleUserRoomRemove(record.id, entry.room, record.rooms)}
                                                style={{ margin: 0, fontSize: 13, padding: '2px 10px', lineHeight: '26px' }}
                                            >
                                                {allRooms.find(r => r.name === entry.room)?.display_name || entry.room}
                                            </Tag>
                                        ))}
                                        <Select
                                            placeholder="+ Добавить продукт"
                                            style={{ width: '100%' }}
                                            value={undefined as unknown as string}
                                            onChange={(val: string) => handleUserRoomAdd(record.id, val, record.rooms)}
                                            options={[
                                                { label: 'Все продукты', value: '__all__' },
                                                ...availableRooms.map(r => ({ label: r.display_name, value: r.name })),
                                            ]}
                                        />
                                    </div>
                                );
                            },
                        },
                        {
                            title: 'Роль', key: 'role', width: 140,
                            render: (_: any, record: UserItem) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {record.rooms.map(entry => (
                                        <Select
                                            key={entry.room}
                                            value={entry.role}
                                            style={{ width: 130 }}
                                            onChange={(val) => handleUserRoleChange(record.id, entry.room, val, record.rooms)}
                                            options={ROLES.map(r => ({
                                                label: <Tag color={ROLE_COLORS[r]} style={{ margin: 0 }}>{r}</Tag>,
                                                value: r,
                                            }))}
                                        />
                                    ))}
                                </div>
                            ),
                        },
                        {
                            title: 'Регистрация', key: 'created_at', width: 120,
                            render: (_: any, record: UserItem) => (
                                <span style={{ fontSize: 13 }}>{formatDate(record.created_at)}</span>
                            ),
                        },
                        {
                            title: 'Пароль', key: 'password', width: 120,
                            render: (_: any, record: UserItem) => (
                                <Button
                                    icon={<Icon name="lock" />}
                                    onClick={() => { setPasswordUserId(record.id); setPasswordModalOpen(true); }}
                                >
                                    Сбросить
                                </Button>
                            ),
                        },
                        {
                            title: '', key: 'actions', width: 60, align: 'center' as const,
                            render: (_: any, record: UserItem) => (
                                record.is_superuser ? null : (
                                    <Popconfirm title="Удалить пользователя?" onConfirm={() => handleDeleteUser(record.id)}>
                                        <Button danger icon={<Icon name="delete" />} />
                                    </Popconfirm>
                                )
                            ),
                        },
                    ]}
                />
            </div>

            {/* ─── Create Room Modal ─────────────────────── */}
            <Modal title="Создать продукт" open={roomModalOpen} onCancel={() => setRoomModalOpen(false)} footer={null} width={480}>
                <Form form={roomForm} layout="vertical" onFinish={handleCreateRoom} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="ID продукта (латиница, нижний регистр)" rules={[{ required: true }, { pattern: /^[a-z0-9_]+$/, message: 'Только строчные латинские буквы, цифры и _' }]}>
                        <Input size="large" placeholder="my_team" />
                    </Form.Item>
                    <Form.Item name="display_name" label="Отображаемое название" rules={[{ required: true }]}>
                        <Input size="large" placeholder="Моя команда" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block>Создать</Button>
                </Form>
            </Modal>

            {/* ─── Add User Modal ────────────────────────── */}
            <Modal title="Добавить пользователя" open={userModalOpen} onCancel={() => setUserModalOpen(false)} footer={null} width={480}>
                <Form form={userForm} layout="vertical" onFinish={handleCreateUser} style={{ marginTop: 16 }}>
                    <Form.Item name="email" label="Почта" rules={[{ required: true, message: 'Введите email' }]}>
                        <Input size="large" placeholder="user@company.com" />
                    </Form.Item>
                    <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}>
                        <Input.Password size="large" placeholder="Пароль" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block>Создать</Button>
                </Form>
            </Modal>

            {/* ─── Reset Password Modal ──────────────────── */}
            <Modal title="Сброс пароля" open={passwordModalOpen} onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields(); }} footer={null} width={480}>
                <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
                    <Form.Item name="password" label="Новый пароль" rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}>
                        <Input.Password size="large" placeholder="Новый пароль" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block>Обновить пароль</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminPanel;
