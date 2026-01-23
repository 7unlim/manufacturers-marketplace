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

router.post('/', (req, res) => {
  try {
    const { name, phone, email, location, description, certifications } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Name, phone, and email are required' });
    }

    // Create new company
    const stmt = db.prepare(`
      INSERT INTO companies (name, phone, email, location, description, certifications)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const certificationsJson = certifications ? JSON.stringify(certifications) : null;
    const result = stmt.run(name, phone, email, location || null, description || null, certificationsJson);

    // Fetch created company
    const newCompany = db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .get(result.lastInsertRowid);

    res.json(newCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
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


