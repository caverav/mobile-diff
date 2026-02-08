import { useEffect, useState } from 'react';

export function useWebSocket() {
  const [status, setStatus] = useState('Idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setStatus(data.stage || 'In Progress');
          setMessage(data.message);
        } else if (data.type === 'complete') {
          setStatus('Complete');
          setMessage(data.message);
        } else if (data.type === 'error') {
          setStatus('Error');
          setMessage(data.message);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { status, message };
}
