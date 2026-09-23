// src/client/components/Header.tsx
import React, { useEffect, useState } from 'react';

const Header: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="w-full flex items-center justify-between py-4 mb-6 border-b border-gray-300 dark:border-gray-700">
      <h1 className="text-2xl font-semibold text-primary">BSC USDT Rescue</h1>
      <button
        onClick={toggleTheme}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition"
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </header>
  );
};

export default Header;
