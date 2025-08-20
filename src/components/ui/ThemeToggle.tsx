import React from 'react';
import { Button } from './button';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sun, Moon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { t } = useLanguage();

  const themeText = {
    ar: {
      light: 'وضع فاتح',
      dark: 'وضع مظلم',
      toggle: 'تبديل الوضع'
    },
    en: {
      light: 'Light Mode',
      dark: 'Dark Mode',
      toggle: 'Toggle Theme'
    }
  };

  const currentLang = t('language.toggle').includes('تبديل') ? 'ar' : 'en';
  const tooltipText = isDark
    ? `${themeText[currentLang].toggle} (${themeText[currentLang].light})`
    : `${themeText[currentLang].toggle} (${themeText[currentLang].dark})`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            )}
            <span className="text-sm font-medium">
              {isDark ? (
                currentLang === 'ar' ? 'فاتح' : 'Light'
              ) : (
                currentLang === 'ar' ? 'مظلم' : 'Dark'
              )}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
