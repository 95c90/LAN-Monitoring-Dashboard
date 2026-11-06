import express from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Plugin } from 'vite';
import { createMonitorApi } from './api';

export function monitorApiPlugin(): Plugin {
  return {
    name: 'lan-monitor-api',
    configureServer(server) {
      if (!server.httpServer) return;
      const api = createMonitorApi(server.httpServer as HttpServer);
      const app = express();
      app.use(api.router);
      server.middlewares.use('/api', app);
      api.start();
    },
  };
}
