import React, { useRef } from 'react';

const Sidebar = ({ navGroups, currentTool, loadTool, preloadTool, isOpen }) => {
    const preloadTimeoutRef = useRef(null);

    const handleMouseEnter = (url) => {
        // Clear any existing timeout to avoid preloading if quickly moving past
        if (preloadTimeoutRef.current) {
            clearTimeout(preloadTimeoutRef.current);
        }

        // Delay preloading by 150ms to ensure user intent
        preloadTimeoutRef.current = setTimeout(() => {
            preloadTool(url);
        }, 150);
    };

    const handleMouseLeave = () => {
        if (preloadTimeoutRef.current) {
            clearTimeout(preloadTimeoutRef.current);
        }
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="logo-container">
                <img src="/tgh-logo.png" alt="TGH Logo" />
                <h1>TGH HUB</h1>
            </div>
            <nav className="nav-links">
                {navGroups.map((group, gIdx) => (
                    <div key={gIdx} className="nav-group">
                        <div className="nav-group-title">{group.title}</div>
                        {group.items.map((item, iIdx) => (
                            <div
                                key={iIdx}
                                className={`nav-item ${currentTool.url === item.url ? 'active' : ''}`}
                                onClick={() => loadTool(item.url, item.name)}
                                onMouseEnter={() => handleMouseEnter(item.url)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <div className="icon">{item.icon}</div>
                                <span>{item.name}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
