import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { notificationService } from './services/notificationService'
import { initializeOrderNotificationTriggers, startPeriodicReminders } from './utils/orderNotificationTrigger'

// Initialize notifications in the background after the app is rendered
function initializeNotifications() {
  // Use requestIdleCallback for better performance, fallback to setTimeout
  const init = async () => {
    try {
      // Only initialize if we're in a browser environment
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        await notificationService.registerServiceWorker();
        console.log('✅ Notification service initialized');
      }

      // Initialize store notification triggers
      initializeOrderNotificationTriggers();

      // Start periodic reminder system
      startPeriodicReminders();

      console.log('✅ Store notification systems initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize notifications:', error);
    }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    setTimeout(init, 1000);
  }
}

// Render the app immediately
createRoot(document.getElementById("root")!).render(<App />);

// Initialize notifications after the initial render
initializeNotifications();
