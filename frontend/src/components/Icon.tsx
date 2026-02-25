import React from 'react';

interface IconProps {
    name: string;
    size?: number;
    style?: React.CSSProperties;
    className?: string;
}

/**
 * Material Symbols Rounded icon wrapper.
 * Uses Google's Material Symbols Rounded variable font (weight 400, outline).
 * 
 * @param name - Material Symbol name, e.g. "format_bold", "delete", "settings"
 * @param size - Icon size in px (default: 20)
 */
const Icon: React.FC<IconProps> = ({ name, size = 20, style, className }) => (
    <span
        className={`material-symbols-rounded${className ? ` ${className}` : ''}`}
        style={{
            fontSize: size,
            lineHeight: 1,
            verticalAlign: 'middle',
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
            ...style,
        }}
    >
        {name}
    </span>
);

export default Icon;
