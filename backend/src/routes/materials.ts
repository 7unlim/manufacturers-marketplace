import { Router } from 'express';
import { db } from '../db';

const router = Router();

const allowedSorts = new Set(['name', 'type', 'stock', 'baseUnitPrice']);

router.get('/', (req, res) => {
  const { search, type, companyId, sortBy = 'name', sortOrder = 'asc' } = req.query;
  const params: Array<string | number> = [];
  let query = `
    SELECT
      m.*,
      c.name AS companyName
    FROM materials m
    JOIN companies c ON c.id = m.companyId
    WHERE 1=1
  `;

  if (search && typeof search === 'string' && search.trim()) {
    query += ' AND (m.name LIKE ? OR m.description LIKE ? OR m.code LIKE ?)';
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  if (type && typeof type === 'string' && type.trim()) {
    query += ' AND m.type = ?';
    params.push(type.trim());
  }

  if (companyId && !Number.isNaN(Number(companyId))) {
    query += ' AND m.companyId = ?';
    params.push(Number(companyId));
  }

  const sortField = allowedSorts.has(sortBy as string) ? sortBy : 'name';
  const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';
  query += ` ORDER BY m.${sortField} ${direction}`;

  const materials = db.prepare(query).all(...params);
  res.json(materials);
});

// Helper function to find similar material code
const findSimilarMaterialCode = (name: string, type: string): string | null => {
  // Search for materials with similar name or type
  const similarMaterials = db.prepare(`
    SELECT code FROM materials 
    WHERE (name LIKE ? OR type = ?) AND code IS NOT NULL AND code != ''
    LIMIT 1
  `).all(`%${name}%`, type) as Array<{ code: string }>;
  
  if (similarMaterials.length > 0) {
    return similarMaterials[0].code;
  }
  
  // If no similar found, get any material code of the same type
  const sameTypeMaterials = db.prepare(`
    SELECT code FROM materials 
    WHERE type = ? AND code IS NOT NULL AND code != ''
    LIMIT 1
  `).get(type) as { code: string } | undefined;
  
  if (sameTypeMaterials) {
    return sameTypeMaterials.code;
  }
  
  // If still nothing, get any material code
  const anyMaterial = db.prepare(`
    SELECT code FROM materials 
    WHERE code IS NOT NULL AND code != ''
    LIMIT 1
  `).get() as { code: string } | undefined;
  
  return anyMaterial?.code || null;
};

router.post('/', (req, res) => {
  try {
    const { companyId, code, name, type, description, stock, baseUnitPrice, costPerUnit, leadTimeDays } = req.body;

    if (!companyId || !name || !type || stock === undefined || baseUnitPrice === undefined || leadTimeDays === undefined) {
      return res.status(400).json({ error: 'Missing required fields: companyId, name, type, stock, baseUnitPrice, leadTimeDays' });
    }

    // Auto-map material code if not provided
    let finalCode = code;
    let autoMapped = false;
    
    if (!finalCode || finalCode.trim() === '') {
      const similarCode = findSimilarMaterialCode(name, type);
      if (similarCode) {
        finalCode = similarCode;
        autoMapped = true;
      }
    }

    const insertMaterial = db.prepare(`
      INSERT INTO materials (companyId, code, name, type, description, stock, baseUnitPrice, costPerUnit, leadTimeDays)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const costPerUnitValue = costPerUnit !== undefined ? costPerUnit : baseUnitPrice * 0.7; // Default to 70% of base price

    const result = insertMaterial.run(
      companyId,
      finalCode || null,
      name,
      type,
      description || null,
      stock,
      baseUnitPrice,
      costPerUnitValue,
      leadTimeDays
    );

    // Get the created material
    const createdMaterial = db.prepare(`
      SELECT m.*, c.name AS companyName
      FROM materials m
      JOIN companies c ON c.id = m.companyId
      WHERE m.id = ?
    `).get(result.lastInsertRowid) as any;

    res.json({
      ...createdMaterial,
      autoMappedCode: autoMapped,
      mappedToCode: autoMapped ? finalCode : null
    });
  } catch (error: any) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

export default router;


