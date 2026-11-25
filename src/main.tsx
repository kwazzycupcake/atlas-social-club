import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts ship with the site (no requests to Google): Fraunces with its soft and
// wonky axes, Figtree for the wordmark, Nunito for text, Caveat for notes.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/figtree';
import '@fontsource-variable/nunito';
import '@fontsource-variable/caveat';
import App from './App';
import './styles/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
