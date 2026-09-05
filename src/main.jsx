import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

const storeSlug = location.pathname.match(/^\/loja\/([^/]+)/)?.[1];
if (storeSlug) {
  document.querySelector('link[rel="manifest"]')?.setAttribute(
    'href',
    `/.netlify/functions/store-manifest?slug=${encodeURIComponent(storeSlug)}`,
  );
}

// O navegador pode liberar o instalador antes de a loja terminar de carregar.
// Guardamos o evento para que o botão da vitrine possa usá-lo depois.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__tvInstallPrompt = event;
  window.dispatchEvent(new Event('tvinstallpromptready'));
});

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
