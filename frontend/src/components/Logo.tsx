import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'mark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  className = '',
}) => {
  // Dimension mappings
  const heightMap = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  };

  const iconSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  if (variant === 'icon') {
    return (
      <img
        src="/logo-icon.png"
        alt="Rodstar PayOps"
        className={`${iconSizeMap[size]} object-contain drop-shadow-md select-none ${className}`}
      />
    );
  }

  return (
    <div className={`inline-flex items-center space-x-3 select-none ${className}`}>
      <img
        src="/logo-icon.png"
        alt="Rodstar PayOps Logo Icon"
        className={`${iconSizeMap[size]} object-contain drop-shadow-md flex-shrink-0`}
      />
      <div className={`font-bold tracking-tight ${textSizes[size]} leading-none flex items-center`}>
        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
          Rodstar
        </span>
        <span className="text-[#16A6D9] ml-1.5 font-extrabold">
          PayOps
        </span>
      </div>
    </div>
  );
};
