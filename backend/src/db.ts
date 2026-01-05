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
  description TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
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
  status TEXT NOT NULL,
  totalAmount REAL NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS bid_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bidId INTEGER NOT NULL,
  materialId INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  proposedUnitPrice REAL NOT NULL,
  FOREIGN KEY(bidId) REFERENCES bids(id),
  FOREIGN KEY(materialId) REFERENCES materials(id)
);
`);

const companySeed = [
  {
    name: 'North Forge Manufacturing',
    phone: '313-555-0100',
    email: 'sales@northforge.com',
    location: 'Detroit, MI',
    description: 'High-strength aircraft and automotive components.'
  },
  {
    name: 'Catalyst Composites',
    phone: '212-555-0180',
    email: 'contact@catalystcomposites.com',
    location: 'Newark, NJ',
    description: 'Advanced composite panels and thermal solutions.'
  },
  {
    name: 'Pacific Precision Metals',
    phone: '206-555-0255',
    email: 'orders@pacificprecision.com',
    location: 'Seattle, WA',
    description: 'Precision machined metals specializing in marine-grade alloys.'
  }
];

const materialsSeed = [
  {
    companyIndex: 0,
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
    'INSERT INTO companies (name, phone, email, location, description) VALUES (?, ?, ?, ?, ?)'
  );
  const insertMaterial = db.prepare(
    'INSERT INTO materials (companyId, name, type, description, stock, baseUnitPrice, costPerUnit, leadTimeDays) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const companyIds: number[] = [];

  for (const company of companySeed) {
    const result = insertCompany.run(
      company.name,
      company.phone,
      company.email,
      company.location,
      company.description
    );
    companyIds.push(result.lastInsertRowid as number);
  }

  for (const material of materialsSeed) {
    const companyId = companyIds[material.companyIndex];
    insertMaterial.run(
      companyId,
      material.name,
      material.type,
      material.description,
      material.stock,
      material.baseUnitPrice,
      material.costPerUnit,
      material.leadTimeDays
    );
  }
};

seedDatabase();

