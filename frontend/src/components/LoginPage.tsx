import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Tabs, message, Space, theme } from 'antd';
import Icon from './Icon';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
    const { login, register } = useAuth();
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();

    const handleLogin = async (values: { email: string; password: string }) => {
        setLoading(true);
        const err = await login(values.email, values.password);
        if (err) message.error(err);
        setLoading(false);
    };

    const handleRegister = async (values: { email: string; password: string }) => {
        setLoading(true);
        const err = await register(values.email, values.password);
        if (err) message.error(err);
        else message.success('Регистрация успешна!');
        setLoading(false);
    };

    const items = [
        {
            key: 'login',
            label: <Space><Icon name="login" /> Вход</Space>,
            children: (
                <Form layout="vertical" onFinish={handleLogin}>
                    <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}>
                        <Input prefix={<Icon name="person" size={16} />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
                        <Input.Password prefix={<Icon name="lock" size={16} />} placeholder="Пароль" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large">Войти</Button>
                </Form>
            ),
        },
        {
            key: 'register',
            label: <Space><Icon name="person_add" /> Регистрация</Space>,
            children: (
                <Form layout="vertical" onFinish={handleRegister}>
                    <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}>
                        <Input prefix={<Icon name="person" size={16} />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}>
                        <Input.Password prefix={<Icon name="lock" size={16} />} placeholder="Пароль" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large">Зарегистрироваться</Button>
                </Form>
            ),
        },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: token.colorBgLayout,
        }}>
            <Card style={{ width: 420, boxShadow: token.boxShadowSecondary }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>Wiki</Title>
                    <Text type="secondary">База знаний</Text>
                </div>
                <Tabs items={items} centered />
            </Card>
        </div>
    );
};

export default LoginPage;
