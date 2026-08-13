// Minimal event bus for cross-screen communication
const listeners = {};

export function subscribe(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
}

export function publish(event, data) {
  console.log('[EventBus] Publishing event:', event, 'with', listeners[event]?.length || 0, 'listeners');
  if (listeners[event]) listeners[event].forEach(cb => cb(data));
}
