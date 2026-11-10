import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/cairo';
import './index.css';
import App from './app/App';
import ConfigMissing from './app/ConfigMissing';
import { AuthProvider } from './features/auth/AuthProvider';
import { I18nProvider } from './i18n';
import { isFirebaseConfigured, missingFirebaseEnv } from './lib/firebase';
import { ThemeProvider } from './lib/theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        {isFirebaseConfigured ? (
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        ) : (
          <ConfigMissing missing={missingFirebaseEnv} />
        )}
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
