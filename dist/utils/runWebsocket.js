"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachWebSocketServer = attachWebSocketServer;
exports.broadcastRunMetrics = broadcastRunMetrics;
const ws_1 = __importStar(require("ws"));
// Map of runId -> set of websocket clients
const runClients = new Map();
let wss = null;
function attachWebSocketServer(server) {
    if (wss)
        return wss;
    wss = new ws_1.WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        // Expect path like /ws/runs/:runId
        const url = request.url || '';
        const match = url.match(/^\/ws\/runs\/(.+)$/);
        if (!match) {
            socket.destroy();
            return;
        }
        const runId = match[1];
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, runId);
        });
    });
    wss.on('connection', (ws, request, runId) => {
        const id = runId || (request.url || '').split('/').pop() || '';
        if (!runClients.has(id))
            runClients.set(id, new Set());
        runClients.get(id).add(ws);
        ws.on('close', () => {
            const s = runClients.get(id);
            if (s) {
                s.delete(ws);
                if (s.size === 0)
                    runClients.delete(id);
            }
        });
        ws.on('error', () => {
            ws.close();
        });
    });
    return wss;
}
function broadcastRunMetrics(runId, metrics) {
    const clients = runClients.get(runId);
    if (!clients || clients.size === 0)
        return;
    const payload = JSON.stringify({ type: 'metrics', data: metrics });
    for (const ws of clients) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(payload);
        }
    }
}
//# sourceMappingURL=runWebsocket.js.map