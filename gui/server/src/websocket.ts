type WSMessage = {
  type: 'progress' | 'complete' | 'error';
  stage?: string;
  message: string;
};

// Store WebSocket clients (Bun WebSocket)
const clients = new Set<any>();

export function addClient(ws: any) {
  clients.add(ws);
}

export function removeClient(ws: any) {
  clients.delete(ws);
}

export function broadcastProgress(message: WSMessage) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(data);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      clients.delete(client);
    }
  }
}
