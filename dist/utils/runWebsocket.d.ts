import http from 'http';
import WebSocket from 'ws';
import { RunMetrics } from '../types/testRun';
export declare function attachWebSocketServer(server: http.Server): WebSocket.WebSocketServer;
export declare function broadcastRunMetrics(runId: string, metrics: RunMetrics): void;
//# sourceMappingURL=runWebsocket.d.ts.map