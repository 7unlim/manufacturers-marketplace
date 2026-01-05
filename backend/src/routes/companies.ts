import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (_, res) => {
  const companies = db
    .prepare('SELECT * FROM companies ORDER BY name')
    .all();
  res.json(companies);
});

router.get('/:id', (req, res) => {
  const companyId = Number(req.params.id);
  const company = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const materials = db
    .prepare('SELECT * FROM materials WHERE companyId = ? ORDER BY name')
    .all(companyId);

  res.json({
    ...company,
    materials
  });
});

export default router;

