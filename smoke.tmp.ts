import http from 'node:http';
import express from 'express';
import { createMonitorApi } from './server/api.ts';
const httpServer = http.createServer();
const api = createMonitorApi(httpServer);
const app = express();
app.use('/api', api.router);
httpServer.on('request', app);
httpServer.listen(5997, '127.0.0.1', () => { api.start(); console.log('listening'); });
