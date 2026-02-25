import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, theme } from 'antd';
import Icon from './Icon';
import { useAuth } from '../contexts/AuthContext';

const { Text } = Typography;

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();

    const handleLogin = async (values: { email: string; password: string }) => {
        setLoading(true);
        const err = await login(values.email, values.password);
        if (err) message.error(err);
        setLoading(false);
    };

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
                    <img
                        src="/logo.svg"
                        alt="Wiki Logo"
                        style={{ height: 48, width: 'auto', marginBottom: 8 }}
                    />
                    <div>
                        <Text type="secondary">Вход в систему</Text>
                    </div>
                </div>

                <Form layout="vertical" onFinish={handleLogin}>
                    <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}>
                        <Input prefix={<Icon name="person" size={16} />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
                        <Input.Password prefix={<Icon name="lock" size={16} />} placeholder="Пароль" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large">Войти</Button>
                </Form>
            </Card>
        </div>
    );
};

export default LoginPage;
