import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createMonitorApi } from './api';

const port = Number(process.env.PORT ?? 5173);
const host = process.env.HOST ?? '127.0.0.1';
const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('لم يتم العثور على ملفات الواجهة. شغّل الأمر npm run build أولًا.');
  process.exit(1);
}

const httpServer = http.createServer();
const api = createMonitorApi(httpServer);

const app = express();
app.disable('x-powered-by');
app.use('/api', api.router);
app.use(express.static(distDir));
app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});
httpServer.on('request', app);

httpServer.listen(port, host, () => {
  console.log(`لوحة مراقبة الشبكة المحلية تعمل على http://${host}:${port}`);
  api.start();
});
