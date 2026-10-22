import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const YAXIYA_LOGO_URL = '/assets/aistudio/LOGO_YAXIYA_Pink_-_Copy_c18e8ec2.png';

export const YaxiyaLogo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'full', 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: { height: 26, text: 'text-sm', sub: 'text-[9px]' },
    md: { height: 38, text: 'text-lg', sub: 'text-[10px]' },
    lg: { height: 48, text: 'text-2xl', sub: 'text-xs' },
    xl: { height: 64, text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // Authentic Yaxiya Jewelry Color: Rich Deep Magenta / Pink
  const primaryColor = variant === 'monochrome' ? '#0f172a' : '#be185d';

  const logoMark = (
    <img
      src={YAXIYA_LOGO_URL}
      alt="Yaxiya Jewelry Logo"
      style={{
        height: `${currentSize.height}px`,
        width: 'auto',
        objectFit: 'contain',
        filter: variant === 'monochrome' ? 'grayscale(100%) contrast(140%)' : undefined,
      }}
      className="shrink-0 drop-shadow-2xs select-none transition-transform hover:scale-105 duration-200"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.includes('logo-yaxiya-pink.png')) {
          target.src = '/logo-yaxiya-pink.png';
        }
      }}
    />
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{logoMark}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {logoMark}
      <div className="flex flex-col leading-tight select-none">
        <span 
          className={`font-display font-extrabold tracking-wider ${currentSize.text}`}
          style={{ color: primaryColor, letterSpacing: '0.12em' }}
        >
          YAXIYA
        </span>
        <span 
          className={`font-semibold tracking-[0.28em] text-slate-500 uppercase ${currentSize.sub}`}
          style={{ color: variant === 'monochrome' ? '#475569' : '#9d174d' }}
        >
          JEWELRY
        </span>
      </div>
    </div>
  );
};

