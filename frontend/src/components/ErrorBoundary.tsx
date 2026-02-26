import React from 'react';
import { Result, Button } from 'antd';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <Result
                        status="error"
                        title="Произошла ошибка"
                        subTitle={this.state.error?.message || 'Неизвестная ошибка при отображении страницы'}
                        extra={
                            <Button type="primary" onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}>
                                Перезагрузить
                            </Button>
                        }
                    />
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
