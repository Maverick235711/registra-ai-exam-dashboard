import React from 'react';

interface RegistraLogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon-only';
  theme?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const RegistraIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 32, 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="REGISTRA Document and Checkmark Symbol"
    >
      {/* Geometric Document Outline */}
      <rect
        x="5"
        y="4"
        width="21"
        height="28"
        rx="2.5"
        stroke="#4563F5"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Effortless Application Checkmark */}
      <path
        d="M11 18.5L16.5 24L29 10"
        stroke="#4563F5"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const RegistraLogo: React.FC<RegistraLogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 22, text: 'text-sm tracking-wider', gap: 'gap-2' },
    md: { icon: 28, text: 'text-lg tracking-wider', gap: 'gap-2.5' },
    lg: { icon: 36, text: 'text-2xl tracking-widest', gap: 'gap-3' },
    xl: { icon: 48, text: 'text-4xl tracking-widest', gap: 'gap-4' },
  };

  const currentSize = sizeMap[size];

  // Font color based on theme
  const textColor = theme === 'dark' ? 'text-white' : 'text-[#172554]';

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <RegistraIcon size={currentSize.icon} />
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}>
        <RegistraIcon size={currentSize.icon * 1.5} />
        <span className={`font-extrabold uppercase font-sans ${textColor} ${currentSize.text}`}>
          REGISTRA
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${currentSize.gap} ${className}`}>
      <RegistraIcon size={currentSize.icon} />
      <span className={`font-black uppercase font-sans select-none leading-none ${textColor} ${currentSize.text}`}>
        REGISTRA
      </span>
    </div>
  );
};
