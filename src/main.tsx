
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById("root");
if (!container) {
  console.error("Root element not found - this will cause the app to fail");
  throw new Error("Root element not found");
}

console.log("Root container found, attempting to render App component...");

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log("App component rendering initiated successfully");
