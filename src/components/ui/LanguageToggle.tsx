import React from 'react';
import { Button } from './button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

export const LanguageToggle: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm font-medium">
              {language === 'ar' ? 'EN' : 'ع'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('language.toggle')} ({language === 'ar' ? 'English' : 'العربية'})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
