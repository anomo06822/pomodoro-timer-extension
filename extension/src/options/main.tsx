import React from 'react';
import ReactDOM from 'react-dom/client';
import OptionsApp from './OptionsApp';
import '../shared/theme.css';
import { ThemeProvider } from '../shared/theme-context';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <OptionsApp />
    </ThemeProvider>
  </React.StrictMode>,
);
