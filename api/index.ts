import express from 'express';
import { apiRouter } from '../server/routes.js';
import { syncService } from '../server/syncService.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API Router
app.use('/api', apiRouter);

// Start sync worker
syncService.start();

export default app;
