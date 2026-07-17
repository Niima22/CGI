import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/kpi-app">
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#FFFFFF', color: '#111827', border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
