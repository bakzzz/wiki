import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeConfig } from 'antd';
import { theme as antTheme } from 'antd';
import { RefineThemes } from '@refinedev/antd';

// ══════════════════════════════════════════════
// RefineThemes.Blue + darkAlgorithm
// Все цвета — через дизайн-токены Ant Design 5.
// Компоненты читают токены через theme.useToken().
// Никакого hardcode в компонентах!
// Документация: https://refine.dev/docs/ui-integrations/ant-design/theming/
// ══════════════════════════════════════════════

export type ModeName = 'light' | 'dark';

function buildTheme(mode: ModeName): ThemeConfig {
    const isDark = mode === 'dark';
    return {
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
            ...RefineThemes.Blue.token,
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif",
            borderRadius: 6,
        },
        components: {
            // Header — белый в light, elevated в dark (как в Refine ThemedLayout)
            Layout: {
                headerBg: undefined,   // наследует colorBgElevated
                headerHeight: 56,
                headerPadding: '0 24px',
            },
            Menu: { itemBg: 'transparent' },
            Button: { borderRadius: 6 },
            Input: { borderRadius: 6 },
            Select: { borderRadius: 6 },
            Card: { borderRadiusLG: 8 },
            Modal: { borderRadiusLG: 8 },
        },
    };
}

// ── Context ──
interface ThemeContextValue {
    modeName: ModeName;
    themeConfig: ThemeConfig;
    setMode: (m: ModeName) => void;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    modeName: 'light',
    themeConfig: buildTheme('light'),
    setMode: () => { },
    toggleMode: () => { },
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modeName, setModeName] = useState<ModeName>(() => {
        return (localStorage.getItem('wiki_theme_mode') as ModeName) || 'light';
    });

    const themeConfig = buildTheme(modeName);

    useEffect(() => {
        localStorage.setItem('wiki_theme_mode', modeName);
        document.documentElement.setAttribute('data-theme', modeName);
    }, [modeName]);

    const toggleMode = () => setModeName(m => m === 'light' ? 'dark' : 'light');

    return (
        <ThemeContext.Provider value={{ modeName, themeConfig, setMode: setModeName, toggleMode }}>
            {children}
        </ThemeContext.Provider>
    );
};
