import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import companiesRouter from './routes/companies';
import materialsRouter from './routes/materials';
import bidsRouter from './routes/bids';
import aiRouter from './routes/ai';
import statsRouter from './routes/stats';
import './db';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/companies', companiesRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/bids', bidsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/stats', statsRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});


