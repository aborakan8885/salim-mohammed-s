import React from 'react';

interface MinistryLogoProps {
  className?: string;
  variant?: string;
}

export const MinistryLogo: React.FC<MinistryLogoProps> = ({
  className = "h-10 sm:h-12",
}) => {
  return (
    <div className={`flex items-center justify-start shrink-0 ${className}`}>
      <img 
        src="/moe-logo-horizontal.svg" 
        alt="وزارة التعليم" 
        className="h-full w-auto object-contain block"
        style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
