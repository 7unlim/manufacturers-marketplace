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
    query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern);
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

export default router;

