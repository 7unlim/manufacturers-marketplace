import { Router } from 'express';
import { db } from '../db';

const router = Router();

const getBidStatus = (bidId: number) =>
  db.prepare<[number], { status: string }>('SELECT status FROM bids WHERE id = ?').get(bidId);

type LineItemPayload = {
  materialId: number;
  quantity: number;
  proposedUnitPrice: number;
};

const calculateTotal = (lineItems: LineItemPayload[]) =>
  lineItems.reduce((sum, item) => sum + item.quantity * item.proposedUnitPrice, 0);

router.get('/', (_, res) => {
  const bids = db
    .prepare(`
      SELECT
        b.*,
        c.name AS companyName
      FROM bids b
      JOIN companies c ON c.id = b.companyId
      ORDER BY b.createdAt DESC
      LIMIT 20
    `)
    .all();
  res.json(bids);
});

router.get('/:id', (req, res) => {
  const bidId = Number(req.params.id);
  const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId);
  if (!bid) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  const lineItems = db
    .prepare(
      `
      SELECT
        bli.*,
        m.name AS materialName,
        m.type AS materialType,
        m.companyId
      FROM bid_line_items bli
      JOIN materials m ON m.id = bli.materialId
      WHERE bli.bidId = ?
    `
    )
    .all(bidId);

  res.json({ ...bid, lineItems });
});

router.post('/', (req, res) => {
  const { companyId, buyerName, lineItems } = req.body as {
    companyId: number;
    buyerName: string;
    lineItems: LineItemPayload[];
  };

  if (!companyId || !buyerName || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'companyId, buyerName, and lineItems are required' });
  }

  const totalAmount = calculateTotal(lineItems);
  const createdAt = new Date().toISOString();

  const transaction = db.transaction(() => {
    const bidResult = db
      .prepare(
        'INSERT INTO bids (companyId, buyerName, status, totalAmount, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(companyId, buyerName, 'draft', totalAmount, createdAt);

    const bidId = bidResult.lastInsertRowid as number;

    const insertLine = db.prepare(
      'INSERT INTO bid_line_items (bidId, materialId, quantity, proposedUnitPrice) VALUES (?, ?, ?, ?)'
    );

    for (const item of lineItems) {
      insertLine.run(bidId, item.materialId, item.quantity, item.proposedUnitPrice);
    }

    return bidId;
  });

  const bidId = transaction();
  res.status(201).json({ bidId, totalAmount });
});

router.put('/:id', (req, res) => {
  const bidId = Number(req.params.id);
  const { lineItems } = req.body as { lineItems: LineItemPayload[] };

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'lineItems are required' });
  }

  const existing = getBidStatus(bidId);
  if (!existing) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  if (existing.status === 'submitted') {
    return res.status(400).json({ error: 'Cannot edit a submitted bid' });
  }

  const totalAmount = calculateTotal(lineItems);

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM bid_line_items WHERE bidId = ?').run(bidId);
    const insertLine = db.prepare(
      'INSERT INTO bid_line_items (bidId, materialId, quantity, proposedUnitPrice) VALUES (?, ?, ?, ?)'
    );
    for (const item of lineItems) {
      insertLine.run(bidId, item.materialId, item.quantity, item.proposedUnitPrice);
    }
    db.prepare('UPDATE bids SET totalAmount = ? WHERE id = ?').run(totalAmount, bidId);
  });

  transaction();
  res.json({ bidId, totalAmount });
});

router.post('/:id/submit', (req, res) => {
  const bidId = Number(req.params.id);
  const existing = getBidStatus(bidId);
  if (!existing) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  if (existing.status === 'submitted') {
    return res.status(400).json({ error: 'Bid already submitted' });
  }

  db.prepare('UPDATE bids SET status = ? WHERE id = ?').run('submitted', bidId);
  res.json({ bidId, status: 'submitted' });
});

export default router;

