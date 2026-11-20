import { useState } from 'react';
import { BUSINESS_INFO } from '../types';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
};

export function BrandLogo({ size = 'md', className = '' }: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        aria-label={BUSINESS_INFO.brandName}
        className={`${SIZE_CLASSES[size]} ${className} rounded-full bg-[#8b1e24] border-2 border-[#a82930] flex items-center justify-center shrink-0 select-none`}
      >
        <span className="font-brand-serif font-bold tracking-tight text-white">DR</span>
      </div>
    );
  }

  return (
    <img
      src={BUSINESS_INFO.logoPath}
      alt={`Logo de ${BUSINESS_INFO.brandName}`}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${SIZE_CLASSES[size]} ${className} rounded-full object-contain shrink-0 bg-white`}
    />
  );
}
