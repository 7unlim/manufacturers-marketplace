import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'marketplace.db');
export const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT,
  description TEXT,
  certifications TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  stock INTEGER NOT NULL,
  baseUnitPrice REAL NOT NULL,
  costPerUnit REAL NOT NULL,
  leadTimeDays INTEGER NOT NULL,
  FOREIGN KEY(companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  buyerName TEXT NOT NULL,
  buyerEmail TEXT,
  buyerPhone TEXT,
  status TEXT NOT NULL,
  totalAmount REAL NOT NULL,
  deliveryPreference TEXT DEFAULT 'standard',
  deliveryDate TEXT,
  paymentTerms TEXT DEFAULT 'net30',
  shippingAddress TEXT,
  bidJustification TEXT,
  specialRequirements TEXT,
  sellerResponse TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS bid_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bidId INTEGER NOT NULL,
  materialId INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  proposedUnitPrice REAL NOT NULL,
  itemNote TEXT,
  urgency TEXT DEFAULT 'standard',
  FOREIGN KEY(bidId) REFERENCES bids(id),
  FOREIGN KEY(materialId) REFERENCES materials(id)
);
`);

// Migration: Add new columns if they don't exist
try {
  db.exec(`ALTER TABLE bids ADD COLUMN buyerEmail TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN buyerPhone TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN deliveryPreference TEXT DEFAULT 'standard';`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN deliveryDate TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN paymentTerms TEXT DEFAULT 'net30';`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN shippingAddress TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN bidJustification TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN specialRequirements TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bids ADD COLUMN sellerResponse TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bid_line_items ADD COLUMN itemNote TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE bid_line_items ADD COLUMN urgency TEXT DEFAULT 'standard';`);
} catch {}
try {
  db.exec(`ALTER TABLE materials ADD COLUMN code TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE companies ADD COLUMN certifications TEXT;`);
} catch {}

const companySeed = [
  {
    name: 'North Forge Manufacturing',
    phone: '313-555-0100',
    email: 'sales@northforge.com',
    location: 'Detroit, MI',
    description: 'High-strength aircraft and automotive components.',
    certifications: ['ISO 9001:2015', 'AS9100D', 'NADCAP', 'ITAR Registered']
  },
  {
    name: 'Catalyst Composites',
    phone: '212-555-0180',
    email: 'contact@catalystcomposites.com',
    location: 'Newark, NJ',
    description: 'Advanced composite panels and thermal solutions.',
    certifications: ['ISO 9001:2015', 'ISO 14001', 'OHSAS 18001', 'UL Listed']
  },
  {
    name: 'Pacific Precision Metals',
    phone: '206-555-0255',
    email: 'orders@pacificprecision.com',
    location: 'Seattle, WA',
    description: 'Precision machined metals specializing in marine-grade alloys.',
    certifications: ['ISO 9001:2015', 'DNV-GL', 'ABS Certified', 'Lloyd\'s Register']
  }
];

const materialsSeed = [
  {
    companyIndex: 0,
    code: 'NF-AL6061-T6',
    name: 'Aerospace Grade Aluminum 6061-T6',
    type: 'Metal',
    description: 'Forged billets that meet AMS 4027 requirements.',
    stock: 840,
    baseUnitPrice: 48.0,
    costPerUnit: 35.0,
    leadTimeDays: 14
  },
  {
    companyIndex: 0,
    code: 'NF-TI-FST-01',
    name: 'Forged Titanium Fasteners',
    type: 'Metal',
    description: 'Precision-machined, vacuum-heat-treated hardware.',
    stock: 3200,
    baseUnitPrice: 12.5,
    costPerUnit: 8.1,
    leadTimeDays: 18
  },
  {
    companyIndex: 1,
    code: 'CC-CFB-ARM-X1',
    name: 'Carbon Fiber Armor Plate',
    type: 'Composite',
    description: 'Multi-weave composite with thermal barrier finish.',
    stock: 450,
    baseUnitPrice: 225.0,
    costPerUnit: 170.0,
    leadTimeDays: 21
  },
  {
    companyIndex: 1,
    code: 'CC-GTS-200',
    name: 'Graphene Thermal Spreaders',
    type: 'Composite',
    description: 'Ultra-thin spreaders tuned for server racks.',
    stock: 1200,
    baseUnitPrice: 18.0,
    costPerUnit: 11.5,
    leadTimeDays: 10
  },
  {
    companyIndex: 2,
    code: 'PP-SS316-BAR',
    name: 'Marine Grade Stainless Bars',
    type: 'Metal',
    description: 'S31254 polished bars for high-salt environments.',
    stock: 600,
    baseUnitPrice: 59.0,
    costPerUnit: 40.0,
    leadTimeDays: 12
  },
  {
    companyIndex: 2,
    code: 'PP-INC-718-SH',
    name: 'Heat-Treated Inconel Sheets',
    type: 'Metal',
    description: '7000-series sheet metal certified for pressure vessels.',
    stock: 220,
    baseUnitPrice: 132.0,
    costPerUnit: 95.0,
    leadTimeDays: 28
  }
];

const seedDatabase = () => {
  const existing = db.prepare<[], { count: number }>('SELECT COUNT(1) as count FROM companies').get();
  if (existing && existing.count > 0) {
    return;
  }

  const insertCompany = db.prepare(
    'INSERT INTO companies (name, phone, email, location, description, certifications) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMaterial = db.prepare(
    'INSERT INTO materials (companyId, code, name, type, description, stock, baseUnitPrice, costPerUnit, leadTimeDays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const companyIds: number[] = [];

  for (const company of companySeed) {
    const result = insertCompany.run(
      company.name,
      company.phone,
      company.email,
      company.location,
      company.description,
      JSON.stringify(company.certifications)
    );
    companyIds.push(result.lastInsertRowid as number);
  }

  for (const material of materialsSeed) {
    const companyId = companyIds[material.companyIndex];
    insertMaterial.run(
      companyId,
      material.code,
      material.name,
      material.type,
      material.description,
      material.stock,
      material.baseUnitPrice,
      material.costPerUnit,
      material.leadTimeDays
    );
  }

  // Seed sample bids for company 1 (North Forge Manufacturing)
  const insertBid = db.prepare(`
    INSERT INTO bids (
      companyId, buyerName, buyerEmail, buyerPhone, status, totalAmount,
      deliveryPreference, deliveryDate, paymentTerms, shippingAddress,
      bidJustification, specialRequirements, sellerResponse, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLineItem = db.prepare(`
    INSERT INTO bid_line_items (bidId, materialId, quantity, proposedUnitPrice, itemNote, urgency)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Bid 1: Submitted bid from Apex Industries
  const bid1Date = new Date();
  bid1Date.setDate(bid1Date.getDate() - 2);
  const bid1Result = insertBid.run(
    companyIds[0], // North Forge Manufacturing
    'Apex Industries',
    'procurement@apexind.com',
    '+1 (312) 555-0199',
    'submitted',
    2340.00,
    'expedited',
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'net30',
    '1500 Industrial Pkwy, Suite 200\nChicago, IL 60614',
    'We are expanding our aerospace manufacturing line and need reliable aluminum suppliers. This initial order represents our quarterly needs, with potential for 3x volume as we scale. Our engineering team has approved North Forge based on your quality certifications.',
    'Please include material test certificates (MTC) with shipment. Packaging must be moisture-resistant for warehouse storage.',
    null,
    bid1Date.toISOString()
  );
  const bid1Id = bid1Result.lastInsertRowid as number;
  
  // Line items for bid 1 (materials 1 and 2 belong to company 1)
  insertLineItem.run(bid1Id, 1, 40, 44.50, 'Prefer 4x8 sheet format if available', 'expedited');
  insertLineItem.run(bid1Id, 2, 200, 11.50, null, 'standard');

  // Bid 2: Submitted bid from TechCore Solutions  
  const bid2Date = new Date();
  bid2Date.setDate(bid2Date.getDate() - 5);
  const bid2Result = insertBid.run(
    companyIds[0], // North Forge Manufacturing
    'TechCore Solutions',
    'orders@techcore.io',
    '+1 (415) 555-0234',
    'submitted',
    4800.00,
    'standard',
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'net45',
    '890 Tech Boulevard\nSan Francisco, CA 94107',
    'Long-term customer looking to establish annual contract. We\'ve been sourcing from competitors but prefer to consolidate with a single supplier. Volume commitment of 500+ units per quarter guaranteed.',
    'ISO 9001 compliance documentation required.',
    null,
    bid2Date.toISOString()
  );
  const bid2Id = bid2Result.lastInsertRowid as number;
  
  insertLineItem.run(bid2Id, 1, 100, 42.00, 'Can accept slight cosmetic imperfections at discounted rate', 'standard');
  insertLineItem.run(bid2Id, 2, 80, 11.00, null, 'standard');
};

seedDatabase();

// Seed bids separately (can run even if companies already exist)
const seedBids = () => {
  const existingBids = db.prepare<[], { count: number }>('SELECT COUNT(1) as count FROM bids').get();
  if (existingBids && existingBids.count > 0) {
    return;
  }

  // Get first company (North Forge)
  const company = db.prepare<[], { id: number }>('SELECT id FROM companies LIMIT 1').get();
  if (!company) return;

  const insertBid = db.prepare(`
    INSERT INTO bids (
      companyId, buyerName, buyerEmail, buyerPhone, status, totalAmount,
      deliveryPreference, deliveryDate, paymentTerms, shippingAddress,
      bidJustification, specialRequirements, sellerResponse, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLineItem = db.prepare(`
    INSERT INTO bid_line_items (bidId, materialId, quantity, proposedUnitPrice, itemNote, urgency)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Get materials for first company
  const materials = db.prepare<[number], { id: number; baseUnitPrice: number }>('SELECT id, baseUnitPrice FROM materials WHERE companyId = ?').all(company.id);
  if (materials.length < 2) return;

  // Bid 1: Submitted bid from Apex Industries
  const bid1Date = new Date();
  bid1Date.setDate(bid1Date.getDate() - 2);
  const bid1Result = insertBid.run(
    company.id,
    'Apex Industries',
    'procurement@apexind.com',
    '+1 (312) 555-0199',
    'submitted',
    2340.00,
    'expedited',
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'net30',
    '1500 Industrial Pkwy, Suite 200\nChicago, IL 60614',
    'We are expanding our aerospace manufacturing line and need reliable aluminum suppliers. This initial order represents our quarterly needs, with potential for 3x volume as we scale. Our engineering team has approved North Forge based on your quality certifications.',
    'Please include material test certificates (MTC) with shipment. Packaging must be moisture-resistant for warehouse storage.',
    null,
    bid1Date.toISOString()
  );
  const bid1Id = bid1Result.lastInsertRowid as number;
  
  insertLineItem.run(bid1Id, materials[0].id, 40, materials[0].baseUnitPrice * 0.93, 'Prefer 4x8 sheet format if available', 'expedited');
  insertLineItem.run(bid1Id, materials[1].id, 200, materials[1].baseUnitPrice * 0.92, null, 'standard');

  // Bid 2: Submitted bid from TechCore Solutions  
  const bid2Date = new Date();
  bid2Date.setDate(bid2Date.getDate() - 5);
  const bid2Result = insertBid.run(
    company.id,
    'TechCore Solutions',
    'orders@techcore.io',
    '+1 (415) 555-0234',
    'submitted',
    4800.00,
    'standard',
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'net45',
    '890 Tech Boulevard\nSan Francisco, CA 94107',
    'Long-term customer looking to establish annual contract. We\'ve been sourcing from competitors but prefer to consolidate with a single supplier. Volume commitment of 500+ units per quarter guaranteed.',
    'ISO 9001 compliance documentation required.',
    null,
    bid2Date.toISOString()
  );
  const bid2Id = bid2Result.lastInsertRowid as number;
  
  insertLineItem.run(bid2Id, materials[0].id, 100, materials[0].baseUnitPrice * 0.875, 'Can accept slight cosmetic imperfections at discounted rate', 'standard');
  insertLineItem.run(bid2Id, materials[1].id, 80, materials[1].baseUnitPrice * 0.88, null, 'standard');

  // Update total amounts
  const updateTotal = db.prepare('UPDATE bids SET totalAmount = (SELECT SUM(quantity * proposedUnitPrice) FROM bid_line_items WHERE bidId = ?) WHERE id = ?');
  updateTotal.run(bid1Id, bid1Id);
  updateTotal.run(bid2Id, bid2Id);
};

seedBids();

