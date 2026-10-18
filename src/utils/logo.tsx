import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const YaxiyaLogo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'full', 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: { icon: 24, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 36, text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 48, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 64, text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // Authentic Yaxiya Jewelry Color: Rich Deep Magenta
  const primaryColor = variant === 'monochrome' ? '#0f172a' : '#be185d';
  const accentColor = variant === 'monochrome' ? '#334155' : '#9d174d';

  const logoMark = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Outer Diamond Facet Hexagon / Crown Silhouette */}
      <path
        d="M50 8L86 28V72L50 92L14 72V28L50 8Z"
        stroke={primaryColor}
        strokeWidth="5"
        strokeLinejoin="round"
        fill={variant === 'monochrome' ? 'none' : '#fdf2f8'}
      />
      {/* Crown / Diamond facets */}
      <path
        d="M50 8L50 92M14 28L86 28M14 72L86 72"
        stroke={primaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Internal gem crown peaks */}
      <path
        d="M26 28L50 60L74 28"
        stroke={accentColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="45" r="4" fill={primaryColor} />
      <circle cx="26" cy="28" r="3" fill={primaryColor} />
      <circle cx="74" cy="28" r="3" fill={primaryColor} />
      <circle cx="50" cy="74" r="3.5" fill={primaryColor} />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{logoMark}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {logoMark}
      <div className="flex flex-col leading-none">
        <span 
          className={`font-display font-extrabold tracking-wider ${currentSize.text}`}
          style={{ color: primaryColor, letterSpacing: '0.12em' }}
        >
          YAXIYA
        </span>
        <span 
          className={`font-semibold tracking-[0.28em] text-slate-500 uppercase mt-0.5 ${currentSize.sub}`}
          style={{ color: variant === 'monochrome' ? '#475569' : '#831843' }}
        >
          JEWELRY
        </span>
      </div>
    </div>
  );
};
