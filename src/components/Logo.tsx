import React, { useState, useEffect } from 'react';
import logoSrc from '/lovable-uploads/3af45968-ee0a-4afb-9557-c058030ab8dc.png';

const LOGO_CACHE_KEY = 'wizchat-logo-dataurl';

// Cache the logo as a data URL on first load so it works offline forever
function useCachedLogo(): string {
  const [src, setSrc] = useState<string>(() => {
    try {
      return localStorage.getItem(LOGO_CACHE_KEY) || logoSrc;
    } catch { return logoSrc; }
  });

  useEffect(() => {
    // If already cached as data URL, skip
    if (src.startsWith('data:')) return;

    (async () => {
      try {
        const res = await fetch(logoSrc);
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          try { localStorage.setItem(LOGO_CACHE_KEY, dataUrl); } catch {}
          setSrc(dataUrl);
        };
        reader.readAsDataURL(blob);
      } catch {}
    })();
  }, []);

  return src;
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const cachedSrc = useCachedLogo();
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-white ${className}`}>
      <img 
        src={cachedSrc} 
        alt="WizchatPro Logo"
        className="w-full h-full object-cover rounded-full"
        style={{
          background: 'white',
          padding: '2px'
        }}
      />
    </div>
  );
};

export default Logo;
