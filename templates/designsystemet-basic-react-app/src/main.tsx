/**
 * @file src/main.tsx
 * @description Entry point for the React application
 * @author [@helpers-no]
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Create root element and render the app
 * Wrapped in StrictMode for development safety checks
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
