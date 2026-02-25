import React from 'react';
import { Typography, Card, Row, Col, Statistic, theme } from 'antd';
import { useRoom } from '../contexts/RoomContext';
import Icon from './Icon';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
    const { currentRoom, rooms } = useRoom();
    const { token } = theme.useToken();

    const roomName = currentRoom === 'public'
        ? 'Общее пространство'
        : (rooms.find(r => r.name === currentRoom)?.display_name || currentRoom);

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingTop: 24 }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ marginBottom: 8 }}>Дашборд продукта</Title>
                <Paragraph type="secondary" style={{ fontSize: 16 }}>
                    Добро пожаловать в пространство <strong>{roomName}</strong>. Выберите страницу в меню слева для просмотра или редактирования.
                </Paragraph>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                    <Card bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                        <Statistic
                            title="Активное пространство"
                            value={roomName}
                            prefix={<Icon name="folder" />}
                            valueStyle={{ fontSize: 18, marginTop: 8 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={16}>
                    <Card bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}`, height: '100%' }}>
                        <Title level={5}>Быстрый старт</Title>
                        <Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
                            Для начала работы вы можете:
                            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                                <li><strong>Создать новую страницу</strong> с помощью кнопки в левой панели</li>
                                <li><strong>Воспользоваться поиском</strong> в верхней части экрана (Search)</li>
                                <li>Управлять пространствами и доступом через <strong>Панель управления</strong> (иконка настроек), если у вас есть права администратора</li>
                            </ul>
                        </Paragraph>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
