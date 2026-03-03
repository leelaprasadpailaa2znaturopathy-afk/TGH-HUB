import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ToolIframe from './components/ToolIframe';
import './App.css';

const App = () => {
    const [currentTool, setCurrentTool] = useState({
        url: '',
        title: 'Operational Dashboard'
    });
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [visitedUrls, setVisitedUrls] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    const loadTool = (url, title) => {
        if (!visitedUrls.has(url)) {
            setLoading(true);
        } else {
            setLoading(false);
        }
        setCurrentTool({ url, title });
        setVisitedUrls(prev => new Set(prev).add(url));
        setSidebarOpen(false); // Close sidebar on selection (mobile)
    };

    const preloadTool = (url) => {
        if (!visitedUrls.has(url)) {
            setVisitedUrls(prev => new Set(prev).add(url));
        }
    };

    const handleIframeLoad = () => {
        setLoading(false);
    };

    const navGroups = [
        {
            title: 'Logistics & Scanning',
            items: [
                { name: 'AWB Multi-Scanner', icon: '🔍', url: 'projects/AWb scanning amazon.html' },
                { name: 'Master Order Matcher', icon: '⚖️', url: 'projects/Master Order Matcher.html' },
                { name: 'Master Data Merger', icon: '🧬', url: 'projects/Master Data Merger.html' },
                { name: 'AWB Data Matcher', icon: '🔄', url: 'projects/AWB Data Matcher.html' },
                { name: 'Shipping Label Extractor', icon: '🏷️', url: 'projects/shipping-label-extractor/index.html' },
                { name: 'Barcode Essentials', icon: '║█', url: 'projects/Barcode Essentials.html' },
            ]
        },
        {
            title: 'Data & Validation',
            items: [
                { name: 'Address Corrector', icon: '📍', url: 'projects/Address Corrector.html' },
                { name: 'Discount & Royalty', icon: '📊', url: 'projects/Discount-and-Royalty.html' },
            ]
        },
        {
            title: 'AI & Productivity',
            items: [

                { name: 'PDF Merger', icon: '📑', url: 'projects/TGH_PDF Merger.html' },
                { name: 'Image PDF Merger', icon: '🖼️', url: 'projects/Merge Multiple Images • Single Page.html' },
                { name: 'Gmail Generator', icon: '📧', url: 'projects/gmail generator.html' },
            ]
        }
    ];

    return (
        <div className={`app-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar
                navGroups={navGroups}
                currentTool={currentTool}
                loadTool={loadTool}
                preloadTool={preloadTool}
                isOpen={sidebarOpen}
            />

            <main className="main-content">
                <Header
                    currentTitle={currentTool.title}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    toggleSidebar={toggleSidebar}
                />

                <div className="content-wrapper">
                    {loading && <div className="loader"><div className="spinner"></div></div>}

                    {!currentTool.url && (
                        <WelcomeScreen
                            navGroups={navGroups}
                            loadTool={loadTool}
                        />
                    )}

                    {navGroups.flatMap(g => g.items).map((item) => {
                        if (!visitedUrls.has(item.url)) return null;

                        return (
                            <ToolIframe
                                key={item.url}
                                item={item}
                                isVisible={currentTool.url === item.url}
                                loading={loading}
                                onIframeLoad={handleIframeLoad}
                            />
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default App;
