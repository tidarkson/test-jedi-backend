import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { RunMetrics } from '../types/testRun';

// Map of runId -> set of websocket clients
const runClients: Map<string, Set<WebSocket>> = new Map();
let wss: WebSocketServer | null = null;

export function attachWebSocketServer(server: http.Server) {
  if (wss) return wss;

  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // Expect path like /ws/runs/:runId
    const url = request.url || '';
    const match = url.match(/^\/ws\/runs\/(.+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const runId = match[1];

    wss!.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss!.emit('connection', ws, request, runId);
    });
  });

  wss.on('connection', (ws: WebSocket, request: http.IncomingMessage, runId?: string) => {
    const id = runId || (request.url || '').split('/').pop() || '';
    if (!runClients.has(id)) runClients.set(id, new Set());
    runClients.get(id)!.add(ws);

    ws.on('close', () => {
      const s = runClients.get(id);
      if (s) {
        s.delete(ws);
        if (s.size === 0) runClients.delete(id);
      }
    });

    ws.on('error', () => {
      ws.close();
    });
  });

  return wss;
}

export function broadcastRunMetrics(runId: string, metrics: RunMetrics) {
  const clients = runClients.get(runId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({ type: 'metrics', data: metrics });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
