import React from 'react';

const ToolIframe = ({ item, isVisible, loading, onIframeLoad }) => {
    return (
        <iframe
            key={item.url}
            src={item.url}
            className="tool-iframe"
            title={item.name}
            onLoad={onIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups"
            style={{
                position: 'absolute',
                top: (isVisible && !loading) ? '0' : '-9999px',
                left: (isVisible && !loading) ? '0' : '-9999px',
                width: '100%',
                height: '100%',
                visibility: (isVisible && !loading) ? 'visible' : 'hidden',
                opacity: (isVisible && !loading) ? '1' : '0',
                transition: 'opacity 0.3s ease-in-out',
                zIndex: (isVisible && !loading) ? '1' : '-1'
            }}
        />
    );
};

export default ToolIframe;
