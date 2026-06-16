import { useEffect } from 'react';

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;

    const timeoutId = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export default Toast;
