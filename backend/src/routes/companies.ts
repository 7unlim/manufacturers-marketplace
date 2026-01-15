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

router.put('/:id', (req, res) => {
  const companyId = Number(req.params.id);
  const { name, phone, email, location, description, certifications } = req.body;

  // Check if company exists
  const existingCompany = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(companyId);

  if (!existingCompany) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Update company
  const stmt = db.prepare(`
    UPDATE companies 
    SET name = ?, phone = ?, email = ?, location = ?, description = ?, certifications = ?
    WHERE id = ?
  `);
  
  const certificationsJson = certifications ? JSON.stringify(certifications) : null;
  stmt.run(name, phone, email, location, description, certificationsJson, companyId);

  // Fetch updated company
  const updatedCompany = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(companyId);

  res.json(updatedCompany);
});

export default router;


