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
  },
  {
    name: 'SteelCraft Industries',
    phone: '412-555-0300',
    email: 'info@steelcraft.com',
    location: 'Pittsburgh, PA',
    description: 'Industrial steel fabrication and structural components for construction and infrastructure.',
    certifications: ['ISO 9001:2015', 'AISC Certified', 'AWS Certified', 'OSHA Compliant']
  },
  {
    name: 'Advanced Polymers Co.',
    phone: '713-555-0355',
    email: 'sales@advancedpolymers.com',
    location: 'Houston, TX',
    description: 'High-performance polymer materials for automotive, aerospace, and medical applications.',
    certifications: ['ISO 9001:2015', 'ISO 13485', 'FDA Registered', 'REACH Compliant']
  },
  {
    name: 'Titanium Works',
    phone: '303-555-0400',
    email: 'orders@titaniumworks.com',
    location: 'Denver, CO',
    description: 'Specialized titanium alloys and custom machining for aerospace and medical industries.',
    certifications: ['ISO 9001:2015', 'AS9100D', 'ISO 13485', 'NADCAP']
  },
  {
    name: 'Ceramic Solutions Inc.',
    phone: '614-555-0455',
    email: 'contact@ceramicsolutions.com',
    location: 'Columbus, OH',
    description: 'Advanced ceramic materials for high-temperature applications and electronics.',
    certifications: ['ISO 9001:2015', 'UL Listed', 'RoHS Compliant', 'IPC Standards']
  },
  {
    name: 'Copper Valley Metals',
    phone: '602-555-0500',
    email: 'sales@coppervalley.com',
    location: 'Phoenix, AZ',
    description: 'Copper and brass products for electrical, plumbing, and industrial applications.',
    certifications: ['ISO 9001:2015', 'UL Listed', 'NSF Certified', 'ASTM Compliant']
  },
  {
    name: 'FiberTech Materials',
    phone: '404-555-0555',
    email: 'info@fibertech.com',
    location: 'Atlanta, GA',
    description: 'Carbon fiber and fiberglass composites for automotive and sporting goods.',
    certifications: ['ISO 9001:2015', 'ISO 14001', 'SAE Standards', 'ASTM Compliant']
  },
  {
    name: 'Precision Alloys Group',
    phone: '617-555-0600',
    email: 'orders@precisionalloys.com',
    location: 'Boston, MA',
    description: 'Nickel, cobalt, and specialty alloys for power generation and chemical processing.',
    certifications: ['ISO 9001:2015', 'ASME Certified', 'ASTM Compliant', 'NACE Standards']
  },
  {
    name: 'Plastic Innovations',
    phone: '714-555-0655',
    email: 'sales@plasticinnovations.com',
    location: 'Irvine, CA',
    description: 'Engineering plastics and injection molding materials for consumer and industrial products.',
    certifications: ['ISO 9001:2015', 'UL Listed', 'FDA Approved', 'REACH Compliant']
  },
  {
    name: 'Magnesium Specialists',
    phone: '801-555-0700',
    email: 'contact@magnesiumspecialists.com',
    location: 'Salt Lake City, UT',
    description: 'Lightweight magnesium alloys for automotive and aerospace weight reduction.',
    certifications: ['ISO 9001:2015', 'AS9100D', 'IATF 16949', 'SAE Standards']
  },
  {
    name: 'Stainless Steel Works',
    phone: '214-555-0755',
    email: 'orders@stainlessworks.com',
    location: 'Dallas, TX',
    description: 'Food-grade and medical-grade stainless steel products and custom fabrication.',
    certifications: ['ISO 9001:2015', 'ISO 13485', 'FDA Registered', '3-A Sanitary Standards']
  },
  {
    name: 'Aluminum Extrusions Plus',
    phone: '503-555-0800',
    email: 'sales@aluextrusions.com',
    location: 'Portland, OR',
    description: 'Custom aluminum extrusions and profiles for architectural and industrial applications.',
    certifications: ['ISO 9001:2015', 'AAMA Certified', 'LEED Compliant', 'ASTM Standards']
  },
  {
    name: 'Advanced Refractories',
    phone: '412-555-0855',
    email: 'info@advancedrefractories.com',
    location: 'Pittsburgh, PA',
    description: 'Refractory materials and linings for furnaces, kilns, and high-temperature industrial processes.',
    certifications: ['ISO 9001:2015', 'ASTM Standards', 'API Standards', 'ASME Certified']
  }
];

// Parse CSV data and convert to materials
const csvData = `Category,Material / Component,Standard / Code
Metals,Carbon steel,ASTM A36
Metals,Stainless steel,ASTM A240
Metals,Steel pipe,ASTM A53
Metals,Copper pipe,ASTM B88
Metals,Aluminum,ASTM B221
Electrical Equipment,Disconnect,UL 98
Electrical Equipment,Transfer switch,UL 1008
Electrical Equipment,Switchgear,UL 1558
Electrical Equipment,Control panels,UL 508A
Electrical Equipment,Wires,UL 83
Electrical Equipment,Copper conductors,ASTM B3
Electrical Equipment,Aluminum conductors,ASTM B231
Electrical Equipment,EMT conduit,ANSI C80.3
Electrical Equipment,Rigid metal conduit,ANSI C80.1
Electrical Equipment,Cable trays,NEMA VE1
Electrical Equipment,Breakers,UL 489
Fire Protection,Sprinkler heads,NFPA 13
Fire Protection,Fire pumps,NFPA 20
Fire Protection,Fire alarms,NFPA 72
Fire Protection,Fire sprinkler pipe,ASTM A795
Fire Protection,Fire alarm cable,UL 2196
Fire Protection,Firestop sealants,ASTM E814
Concrete & Masonry,Ready-mix concrete,ASTM C94
Concrete & Masonry,Portland cement,ASTM C150
Concrete & Masonry,Concrete aggregates,ASTM C33
Concrete & Masonry,Concrete blocks (CMU),ASTM C90
Concrete & Masonry,Mortar,ASTM C270
Concrete & Masonry,Grout,ASTM C476
Concrete & Masonry,Reinforcing bar (rebar),ASTM A615
Concrete & Masonry,Welded wire mesh,ASTM A1064
Wood & Framing,Structural lumber,ASTM D1990
Wood & Framing,Plywood,PS 1
Wood & Framing,OSB sheathing,PS 2
Wood & Framing,Pressure treated wood,AWPA U1
Wood & Framing,LVL beams,ASTM D5456
Wood & Framing,Glulam beams,ANSI A190.1
Structural Steel & Fasteners,Structural steel shapes,ASTM A992
Structural Steel & Fasteners,High strength bolts,ASTM A325
Structural Steel & Fasteners,Anchor bolts,ASTM F1554
Structural Steel & Fasteners,Structural plates,ASTM A572
Structural Steel & Fasteners,Galvanized steel,ASTM A123
Structural Steel & Fasteners,Welding electrodes,AWS A5
Plumbing,PVC pipe,ASTM D1785
Plumbing,CPVC pipe,ASTM F441
Plumbing,Copper tubing,ASTM B88
Plumbing,Cast iron pipe,ASTM A888
Plumbing,PEX pipe,ASTM F876
Plumbing,Plumbing fixtures,ASME A112
HVAC / Mechanical,Pressure vessels,ASME BPVC
HVAC / Mechanical,Chillers,AHRI Certified
HVAC / Mechanical,Compressors,UL / ASME
HVAC / Mechanical,Refrigeration,ASHRAE
HVAC / Mechanical,Ductwork,SMACNA
HVAC / Mechanical,Boilers,ASME BPVC
HVAC / Mechanical,Air handlers,UL 1995
HVAC / Mechanical,Refrigerant piping,ASTM B280
HVAC / Mechanical,Chillers (rating),AHRI 550/590
Insulation & Envelope,Fiberglass insulation,ASTM C665
Insulation & Envelope,Spray foam,ASTM E84
Insulation & Envelope,Rigid foam board,ASTM C578
Insulation & Envelope,Vapor barrier,ASTM E96
Insulation & Envelope,Roofing membrane,ASTM D6878
Glass & Finishes,Tempered glass,ANSI Z97.1
Glass & Finishes,Laminated glass,ASTM C1172
Glass & Finishes,Gypsum board,ASTM C1396
Glass & Finishes,Ceiling tiles,ASTM E84
Glass & Finishes,Flooring,ASTM F710
Specialty Systems,Expansion joints,ASTM E1399
Specialty Systems,Seismic restraints,ASCE 7
Specialty Systems,Curtain walls,AAMA 501
Specialty Systems,Waterproofing,ASTM C836
Specialty Systems,Roofing fasteners,FM 4470`;

// Helper function to map category to type
const mapCategoryToType = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'Metals': 'Metal',
    'Electrical Equipment': 'Electrical',
    'Fire Protection': 'Fire Protection',
    'Concrete & Masonry': 'Concrete',
    'Wood & Framing': 'Wood',
    'Structural Steel & Fasteners': 'Metal',
    'Plumbing': 'Plumbing',
    'HVAC / Mechanical': 'HVAC',
    'Insulation & Envelope': 'Insulation',
    'Glass & Finishes': 'Glass',
    'Specialty Systems': 'Specialty'
  };
  return categoryMap[category] || 'Other';
};

// Helper function to generate realistic pricing based on category
const generatePricing = (category: string, materialName: string): { baseUnitPrice: number; costPerUnit: number; stock: number; leadTimeDays: number } => {
  const name = materialName.toLowerCase();
  let basePrice = 1.0;
  let stock = 500;
  let leadTime = 14;
  
  if (category === 'Metals' || category === 'Structural Steel & Fasteners') {
    if (name.includes('steel')) {
      basePrice = Math.random() * 5 + 0.5; // $0.50 - $5.50
      stock = Math.floor(Math.random() * 3000 + 500);
      leadTime = Math.floor(Math.random() * 14 + 7);
    } else if (name.includes('aluminum')) {
      basePrice = Math.random() * 8 + 2; // $2 - $10
      stock = Math.floor(Math.random() * 2000 + 300);
      leadTime = Math.floor(Math.random() * 21 + 10);
    } else if (name.includes('copper')) {
      basePrice = Math.random() * 10 + 5; // $5 - $15
      stock = Math.floor(Math.random() * 1500 + 200);
      leadTime = Math.floor(Math.random() * 14 + 7);
    } else {
      basePrice = Math.random() * 15 + 2; // $2 - $17
      stock = Math.floor(Math.random() * 1000 + 200);
      leadTime = Math.floor(Math.random() * 21 + 10);
    }
  } else if (category === 'Electrical Equipment') {
    if (name.includes('breaker') || name.includes('switch') || name.includes('panel')) {
      basePrice = Math.random() * 200 + 50; // $50 - $250
      stock = Math.floor(Math.random() * 500 + 50);
      leadTime = Math.floor(Math.random() * 21 + 14);
    } else if (name.includes('wire') || name.includes('conductor')) {
      basePrice = Math.random() * 5 + 1; // $1 - $6
      stock = Math.floor(Math.random() * 2000 + 500);
      leadTime = Math.floor(Math.random() * 14 + 7);
    } else {
      basePrice = Math.random() * 50 + 10; // $10 - $60
      stock = Math.floor(Math.random() * 1000 + 100);
      leadTime = Math.floor(Math.random() * 21 + 10);
    }
  } else if (category === 'Fire Protection') {
    basePrice = Math.random() * 100 + 20; // $20 - $120
    stock = Math.floor(Math.random() * 800 + 100);
    leadTime = Math.floor(Math.random() * 28 + 14);
  } else if (category === 'Concrete & Masonry') {
    basePrice = Math.random() * 3 + 0.5; // $0.50 - $3.50
    stock = Math.floor(Math.random() * 5000 + 1000);
    leadTime = Math.floor(Math.random() * 7 + 3);
  } else if (category === 'Wood & Framing') {
    basePrice = Math.random() * 2 + 0.5; // $0.50 - $2.50
    stock = Math.floor(Math.random() * 3000 + 500);
    leadTime = Math.floor(Math.random() * 14 + 7);
  } else if (category === 'Plumbing') {
    if (name.includes('pipe') || name.includes('tubing')) {
      basePrice = Math.random() * 10 + 2; // $2 - $12
      stock = Math.floor(Math.random() * 2000 + 300);
      leadTime = Math.floor(Math.random() * 14 + 7);
    } else {
      basePrice = Math.random() * 200 + 50; // $50 - $250
      stock = Math.floor(Math.random() * 500 + 50);
      leadTime = Math.floor(Math.random() * 21 + 14);
    }
  } else if (category === 'HVAC / Mechanical') {
    basePrice = Math.random() * 500 + 100; // $100 - $600
    stock = Math.floor(Math.random() * 300 + 50);
    leadTime = Math.floor(Math.random() * 28 + 21);
  } else if (category === 'Insulation & Envelope') {
    basePrice = Math.random() * 20 + 3; // $3 - $23
    stock = Math.floor(Math.random() * 1500 + 200);
    leadTime = Math.floor(Math.random() * 14 + 7);
  } else if (category === 'Glass & Finishes') {
    basePrice = Math.random() * 15 + 2; // $2 - $17
    stock = Math.floor(Math.random() * 1000 + 100);
    leadTime = Math.floor(Math.random() * 21 + 10);
  } else if (category === 'Specialty Systems') {
    basePrice = Math.random() * 150 + 25; // $25 - $175
    stock = Math.floor(Math.random() * 600 + 50);
    leadTime = Math.floor(Math.random() * 28 + 14);
  } else {
    basePrice = Math.random() * 10 + 1; // $1 - $11
    stock = Math.floor(Math.random() * 1000 + 100);
    leadTime = Math.floor(Math.random() * 21 + 10);
  }
  
  const costPerUnit = basePrice * (0.6 + Math.random() * 0.2); // 60-80% of base price
  return {
    baseUnitPrice: Math.round(basePrice * 100) / 100,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    stock: stock,
    leadTimeDays: leadTime
  };
};

// Parse CSV and create materials seed
const csvLines = csvData.trim().split('\n').slice(1); // Skip header
const materialsSeed = csvLines.map((line, index) => {
  const [category, materialName, standardCode] = line.split(',');
  
  // Randomly assign to a company (0-14, since there are 15 companies)
  const companyIndex = Math.floor(Math.random() * 15);
  
  const type = mapCategoryToType(category);
  const pricing = generatePricing(category, materialName);
  const description = `Compliant with ${standardCode} standard. ${category} material for construction and industrial applications.`;
  
  return {
    companyIndex,
    code: standardCode.trim(), // Use the standard code exactly as provided
    name: materialName.trim(),
    type,
    description,
    stock: pricing.stock,
    baseUnitPrice: pricing.baseUnitPrice,
    costPerUnit: pricing.costPerUnit,
    leadTimeDays: pricing.leadTimeDays
  };
});

const seedDatabase = () => {
  // Get existing company names to avoid duplicates
  const existingCompanies = db.prepare<[], { name: string }>('SELECT name FROM companies').all();
  const existingNames = new Set(existingCompanies.map(c => c.name));
  
  // Filter out companies that already exist
  const companiesToAdd = companySeed.filter(c => !existingNames.has(c.name));
  
  // Delete all existing bids and materials to replace with new ones
  // Must delete in order due to foreign key constraints: bid_line_items -> bids -> materials
  db.prepare('DELETE FROM bid_line_items').run();
  db.prepare('DELETE FROM bids').run();
  db.prepare('DELETE FROM materials').run();
  console.log('Deleted all existing bids and materials');
  
  const insertCompany = db.prepare(
    'INSERT INTO companies (name, phone, email, location, description, certifications) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMaterial = db.prepare(
    'INSERT INTO materials (companyId, code, name, type, description, stock, baseUnitPrice, costPerUnit, leadTimeDays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Get all existing companies to map indices correctly
  const allCompanies = db.prepare<[], { id: number; name: string }>('SELECT id, name FROM companies ORDER BY id').all();
  const companyNameToId = new Map(allCompanies.map(c => [c.name, c.id]));

  // Add new companies
  if (companiesToAdd.length > 0) {
    for (const company of companiesToAdd) {
      const result = insertCompany.run(
        company.name,
        company.phone,
        company.email,
        company.location,
        company.description,
        JSON.stringify(company.certifications)
      );
      const newId = result.lastInsertRowid as number;
      companyNameToId.set(company.name, newId);
    }
    
    // Refresh company list after adding new ones
    const updatedCompanies = db.prepare<[], { id: number; name: string }>('SELECT id, name FROM companies ORDER BY id').all();
    companyNameToId.clear();
    updatedCompanies.forEach(c => companyNameToId.set(c.name, c.id));
  }

  // Build complete company ID array matching companySeed order
  const fullCompanyIds: number[] = [];
  for (const company of companySeed) {
    const id = companyNameToId.get(company.name);
    if (id) {
      fullCompanyIds.push(id);
    }
  }

  // Add new materials
  let materialsAdded = 0;
  for (const material of materialsSeed) {
    const companyId = fullCompanyIds[material.companyIndex];
    if (companyId) {
      try {
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
        materialsAdded++;
      } catch (err) {
        // Skip duplicate or invalid entries
        console.warn(`Failed to add material ${material.code}:`, err);
      }
    }
  }

  if (companiesToAdd.length > 0 || materialsAdded > 0) {
    console.log(`Seeded ${companiesToAdd.length} new companies and ${materialsAdded} new materials`);
  }
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

// Seed accepted bids for revenue data (for North Forge Manufacturing)
const seedRevenueData = () => {
  // Get North Forge Manufacturing (should be company ID 1)
  const northForge = db.prepare<[string], { id: number }>('SELECT id FROM companies WHERE name = ?').get('North Forge Manufacturing');
  if (!northForge) return;

  // Check if we already have accepted bids
  const existingAccepted = db.prepare<[number, string], { count: number }>('SELECT COUNT(1) as count FROM bids WHERE companyId = ? AND status = ?').get(northForge.id, 'accepted');
  if (existingAccepted && existingAccepted.count > 10) {
    return; // Already have enough revenue data
  }

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

  // Get materials for North Forge
  const materials = db.prepare<[number], { id: number; baseUnitPrice: number }>('SELECT id, baseUnitPrice FROM materials WHERE companyId = ?').all(northForge.id);
  if (materials.length === 0) return;

  const now = new Date();
  
  // Generate accepted bids over the past 12 months with specific dates
  const acceptedBids = [
    // Recent bids (last month)
    { daysAgo: 2, amount: 12500, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 5, amount: 8700, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 8, amount: 15400, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    { daysAgo: 12, amount: 9200, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 15, amount: 11800, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    { daysAgo: 18, amount: 13500, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    { daysAgo: 22, amount: 9800, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 28, amount: 14200, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    
    // Last 2 months
    { daysAgo: 35, amount: 11200, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    { daysAgo: 42, amount: 16500, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    { daysAgo: 50, amount: 8900, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 55, amount: 12400, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 60, amount: 10800, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    
    // Last 3 months
    { daysAgo: 70, amount: 13800, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    { daysAgo: 78, amount: 9500, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 85, amount: 11600, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 90, amount: 13200, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    
    // Past 4-6 months
    { daysAgo: 100, amount: 10200, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    { daysAgo: 120, amount: 14800, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 140, amount: 9100, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 160, amount: 12600, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    { daysAgo: 180, amount: 11400, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    
    // Past 6-9 months
    { daysAgo: 200, amount: 13900, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 220, amount: 9700, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 240, amount: 12100, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    { daysAgo: 260, amount: 10700, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    
    // Past 9-12 months
    { daysAgo: 280, amount: 14300, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
    { daysAgo: 300, amount: 9300, buyer: 'Skyward Industries', email: 'procurement@skyward.io', phone: '+1 (206) 555-0102' },
    { daysAgo: 320, amount: 12800, buyer: 'JetStream Manufacturing', email: 'orders@jetstream.com', phone: '+1 (714) 555-0104' },
    { daysAgo: 340, amount: 11500, buyer: 'Precision Airframes', email: 'sales@precisionair.com', phone: '+1 (425) 555-0103' },
    { daysAgo: 360, amount: 10100, buyer: 'Aerospace Dynamics', email: 'orders@aerodyn.com', phone: '+1 (310) 555-0101' },
  ];

  for (const bidInfo of acceptedBids) {
    const bidDate = new Date(now.getTime() - bidInfo.daysAgo * 24 * 60 * 60 * 1000);
    
    const result = insertBid.run(
      northForge.id,
      bidInfo.buyer,
      bidInfo.email,
      bidInfo.phone,
      'accepted',
      bidInfo.amount,
      'standard',
      new Date(bidDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'net30',
      `123 Manufacturing Drive\n${bidInfo.buyer.includes('Aerospace') ? 'Los Angeles, CA' : bidInfo.buyer.includes('Skyward') ? 'Seattle, WA' : bidInfo.buyer.includes('Precision') ? 'Bellevue, WA' : 'Irvine, CA'} 90210`,
      `Regular order for aerospace components. Quality certification required.`,
      'Standard packaging and handling required.',
      'Thank you for your order! We appreciate your business.',
      bidDate.toISOString()
    );
    
    const bidId = result.lastInsertRowid as number;
    
    // Add line items (split amount across materials)
    const material1 = materials[0];
    const material2 = materials[Math.min(1, materials.length - 1)];
    const qty1 = Math.floor(bidInfo.amount / 2 / (material1.baseUnitPrice * 0.95));
    const qty2 = Math.floor(bidInfo.amount / 2 / (material2.baseUnitPrice * 0.95));
    
    if (qty1 > 0 && material1) {
      insertLineItem.run(bidId, material1.id, qty1, material1.baseUnitPrice * 0.95, null, 'standard');
    }
    if (qty2 > 0 && material2 && material2.id !== material1.id) {
      insertLineItem.run(bidId, material2.id, qty2, material2.baseUnitPrice * 0.95, null, 'standard');
    }
    
    // Update total amount
    const updateTotal = db.prepare('UPDATE bids SET totalAmount = (SELECT SUM(quantity * proposedUnitPrice) FROM bid_line_items WHERE bidId = ?) WHERE id = ?');
    updateTotal.run(bidId, bidId);
  }
  
  console.log(`Seeded ${acceptedBids.length} accepted bids for revenue data`);
};

seedRevenueData();

