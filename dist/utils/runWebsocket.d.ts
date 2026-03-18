import http from 'http';
import { RunMetrics } from '../types/testRun';
export declare function attachWebSocketServer(server: http.Server): any;
export declare function broadcastRunMetrics(runId: string, metrics: RunMetrics): void;
//# sourceMappingURL=runWebsocket.d.ts.map