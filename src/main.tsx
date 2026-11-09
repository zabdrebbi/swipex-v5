import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/cairo';
import './index.css';
import App from './app/App';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './lib/theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
