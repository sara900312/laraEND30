import React from 'react';
import { cn } from '@/lib/utils';
import { ensureArabicEncoding, getTextDirection } from '@/utils/arabicTextUtils';

interface ArabicTextProps {
  children: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const ArabicText: React.FC<ArabicTextProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => {
  const encodedText = ensureArabicEncoding(children);
  const direction = getTextDirection(encodedText);
  
  return (
    <Component 
      className={cn('font-cairo', className)}
      dir={direction}
      style={{
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
      {encodedText}
    </Component>
  );
};
