import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../shared/theme.css';
import { ThemeProvider } from '../shared/theme-context';

document.body.classList.add('fullscreen-root');

const root = document.getElementById('root');

if (!root) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <App mode="fullscreen" />
    </ThemeProvider>
  </React.StrictMode>,
);
