import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

interface PageControlsProps {
  position?: 'fixed' | 'relative';
  className?: string;
}

export const PageControls: React.FC<PageControlsProps> = ({ 
  position = 'fixed', 
  className = '' 
}) => {
  const baseClasses = position === 'fixed' 
    ? 'fixed top-4 left-4 z-50' 
    : 'relative';
    
  return (
    <div className={`${baseClasses} flex gap-2 ${className}`}>
      <ThemeToggle />
      <LanguageToggle />
    </div>
  );
};
