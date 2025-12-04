import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun } from 'lucide-react';

const ThemeToggle = () => {
  React.useEffect(() => {
    // Always set light mode
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="p-2 hover:bg-muted"
      aria-label="Light theme"
      disabled
    >
      <Sun className="h-5 w-5" />
    </Button>
  );
};

export default ThemeToggle;