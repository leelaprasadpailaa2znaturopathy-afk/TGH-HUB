import React from 'react';

const WelcomeScreen = ({ navGroups, loadTool }) => {
    return (
        <div className="welcome-screen">
            <div className="welcome-header">
                <h1>Welcome to TGH Command Center</h1>
                <p>Your integrated suite for logistics optimization and data management.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                        <h4>Status</h4>
                        <p>System Online</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🛡️</div>
                    <div className="stat-info">
                        <h4>Security</h4>
                        <p>Verified</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-info">
                        <h4>Speed</h4>
                        <p>Optimized</p>
                    </div>
                </div>
            </div>

            <div className="grid-preview">
                {navGroups.map(group =>
                    group.items.slice(0, 2).map((item, idx) => (
                        <div key={`${group.title}-${idx}`} className="tool-card" onClick={() => loadTool(item.url, item.name)}>
                            <span className="icon">{item.icon}</span>
                            <h3>{item.name}</h3>
                            <p>Specialized {group.title.toLowerCase()} tool</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WelcomeScreen;
