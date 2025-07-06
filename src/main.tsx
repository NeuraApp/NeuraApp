import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SupabaseProvider } from './contexts/SupabaseProvider';
import { ThemeProvider } from './contexts/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SupabaseProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SupabaseProvider>
  </React.StrictMode>,
);