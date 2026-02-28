import React from 'react';

const Header = ({ currentTitle, theme, toggleTheme, toggleSidebar }) => {
    return (
        <header className="header">
            <div className="header-left">
                <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
                <div className="header-title">{currentTitle}</div>
            </div>
            <div className="header-actions">
                <button className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
                <button className="refresh-btn" onClick={() => window.location.reload()}>
                    Refresh Center
                </button>
            </div>
        </header>
    );
};

export default Header;
