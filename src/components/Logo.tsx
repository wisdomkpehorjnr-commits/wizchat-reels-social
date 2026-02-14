import React, { useState, useEffect, useCallback } from 'react';

const LOGO_CACHE_KEY = 'wizchat-logo-dataurl-v2';
const LOGO_PATH = '/lovable-uploads/3af45968-ee0a-4afb-9557-c058030ab8dc.png';

// Cache the logo as a data URL on first load so it works offline forever
function useCachedLogo(): string {
  const [src, setSrc] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(LOGO_CACHE_KEY);
      if (cached && cached.startsWith('data:')) return cached;
    } catch {}
    return LOGO_PATH;
  });

  const cacheLogo = useCallback(async () => {
    // Already a data URL? Done.
    try {
      const cached = localStorage.getItem(LOGO_CACHE_KEY);
      if (cached && cached.startsWith('data:')) {
        setSrc(cached);
        return;
      }
    } catch {}

    try {
      const res = await fetch(LOGO_PATH);
      if (!res.ok) return;
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl && dataUrl.startsWith('data:')) {
          try { localStorage.setItem(LOGO_CACHE_KEY, dataUrl); } catch {}
          setSrc(dataUrl);
        }
      };
      reader.readAsDataURL(blob);
    } catch {}
  }, []);

  useEffect(() => { cacheLogo(); }, [cacheLogo]);

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
        alt=""
        className="w-full h-full object-cover rounded-full"
        style={{
          background: 'white',
          padding: '2px'
        }}
        onError={(e) => {
          // Hide broken image icon entirely - never show emoji/broken icon
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
};

export default Logo;
