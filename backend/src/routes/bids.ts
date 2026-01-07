import { Router } from 'express';
import { db } from '../db';

const router = Router();

const getBidStatus = (bidId: number) =>
  db.prepare<[number], { status: string }>('SELECT status FROM bids WHERE id = ?').get(bidId);

type LineItemPayload = {
  materialId: number;
  quantity: number;
  proposedUnitPrice: number;
  itemNote?: string;
  urgency?: 'standard' | 'expedited' | 'rush';
};

type BidTerms = {
  buyerEmail?: string;
  buyerPhone?: string;
  deliveryPreference?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  shippingAddress?: string;
  bidJustification?: string;
  specialRequirements?: string;
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
  const { companyId, buyerName, lineItems, terms } = req.body as {
    companyId: number;
    buyerName: string;
    lineItems: LineItemPayload[];
    terms?: BidTerms;
  };

  if (!companyId || !buyerName || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'companyId, buyerName, and lineItems are required' });
  }

  const totalAmount = calculateTotal(lineItems);
  const createdAt = new Date().toISOString();

  const transaction = db.transaction(() => {
    const bidResult = db
      .prepare(`
        INSERT INTO bids (
          companyId, buyerName, buyerEmail, buyerPhone, status, totalAmount,
          deliveryPreference, deliveryDate, paymentTerms, shippingAddress,
          bidJustification, specialRequirements, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        companyId,
        buyerName,
        terms?.buyerEmail || null,
        terms?.buyerPhone || null,
        'draft',
        totalAmount,
        terms?.deliveryPreference || 'standard',
        terms?.deliveryDate || null,
        terms?.paymentTerms || 'net30',
        terms?.shippingAddress || null,
        terms?.bidJustification || null,
        terms?.specialRequirements || null,
        createdAt
      );

    const bidId = bidResult.lastInsertRowid as number;

    const insertLine = db.prepare(
      'INSERT INTO bid_line_items (bidId, materialId, quantity, proposedUnitPrice, itemNote, urgency) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const item of lineItems) {
      insertLine.run(
        bidId,
        item.materialId,
        item.quantity,
        item.proposedUnitPrice,
        item.itemNote || null,
        item.urgency || 'standard'
      );
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

// Seller respond to bid (accept/reject/counter)
router.post('/:id/respond', (req, res) => {
  const bidId = Number(req.params.id);
  const { action, sellerResponse } = req.body as {
    action: 'accept' | 'reject' | 'counter';
    sellerResponse?: string;
  };

  const existing = getBidStatus(bidId);
  if (!existing) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  if (existing.status !== 'submitted') {
    return res.status(400).json({ error: 'Can only respond to submitted bids' });
  }

  const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';
  
  db.prepare('UPDATE bids SET status = ?, sellerResponse = ? WHERE id = ?')
    .run(newStatus, sellerResponse || null, bidId);
  
  res.json({ bidId, status: newStatus, sellerResponse });
});

// Update seller response / notes
router.put('/:id/seller-notes', (req, res) => {
  const bidId = Number(req.params.id);
  const { sellerResponse } = req.body as { sellerResponse: string };

  const existing = getBidStatus(bidId);
  if (!existing) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  db.prepare('UPDATE bids SET sellerResponse = ? WHERE id = ?')
    .run(sellerResponse || null, bidId);
  
  res.json({ bidId, sellerResponse });
});

export default router;

