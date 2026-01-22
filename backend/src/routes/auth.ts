import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { db } from '../db';

const router = Router();

const ACCOUNTS_FILE = join(__dirname, '../../accounts.txt');

interface Account {
  email: string;
  password: string;
  role: 'buyer' | 'seller';
  name: string;
  companyId?: number; // For sellers, link to company
  onboarding?: {
    // Seller onboarding fields
    projectTypes?: string[]; // Seller project types
    role?: string[]; // Seller role/specialization
    specialCategories?: string[]; // Seller special categories
    // Buyer onboarding fields
    materialTypes?: string[]; // Buyer material preferences
    buyerProjectTypes?: string[]; // Buyer project types (renamed to avoid conflict)
    projectScale?: string[]; // Buyer project scale
    budgetRange?: string; // Buyer budget range
    urgencyLevel?: string; // Buyer urgency level
  };
}

// Initialize accounts file with seller accounts from companies
const initializeAccounts = () => {
  if (!existsSync(ACCOUNTS_FILE)) {
    // Get all companies from database
    const companies = db.prepare('SELECT id, name, email FROM companies').all() as Array<{
      id: number;
      name: string;
      email: string;
    }>;

    const accounts: Account[] = companies.map((company) => ({
      email: company.email,
      password: 'password123', // Default password for pre-populated accounts
      role: 'seller',
      name: company.name,
      companyId: company.id,
    }));

    // Add a default buyer account
    accounts.push({
      email: 'buyer@example.com',
      password: 'password123',
      role: 'buyer',
      name: 'Buyer Account',
    });

    writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
    console.log(`Initialized accounts file with ${accounts.length} accounts`);
  }
};

// Load accounts from file
const loadAccounts = (): Account[] => {
  try {
    if (!existsSync(ACCOUNTS_FILE)) {
      initializeAccounts();
    }
    const content = readFileSync(ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
};

// Save accounts to file
const saveAccounts = (accounts: Account[]) => {
  try {
    writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving accounts:', error);
    throw error;
  }
};

// Initialize on module load
initializeAccounts();

// Sign up endpoint
router.post('/signup', (req, res) => {
  try {
    const { email, password, name, role, companyId, onboarding } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }

    if (role !== 'buyer' && role !== 'seller') {
      return res.status(400).json({ error: 'Role must be "buyer" or "seller"' });
    }

    const accounts = loadAccounts();

    // Check if email already exists
    if (accounts.some((acc) => acc.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new account
    const newAccount: Account = {
      email: email.toLowerCase(),
      password, // In production, this should be hashed
      role,
      name,
      companyId: role === 'seller' ? companyId : undefined,
      onboarding: req.body.onboarding || undefined,
    };

    accounts.push(newAccount);
    saveAccounts(accounts);

    res.json({
      message: 'Account created successfully',
      account: {
        email: newAccount.email,
        name: newAccount.name,
        role: newAccount.role,
        companyId: newAccount.companyId,
        onboarding: newAccount.onboarding,
      },
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Sign in endpoint
router.post('/signin', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const accounts = loadAccounts();
    const account = accounts.find(
      (acc) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password
    );

    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Try to load preferences from database first, fallback to account file
    let onboarding = account.onboarding;
    try {
      const prefRow = db
        .prepare('SELECT onboarding FROM account_preferences WHERE email = ?')
        .get(email.toLowerCase()) as { onboarding: string } | undefined;
      
      if (prefRow && prefRow.onboarding) {
        onboarding = JSON.parse(prefRow.onboarding);
        // Update accounts.txt with database preferences
        const accountIndex = accounts.findIndex(
          (acc) => acc.email.toLowerCase() === email.toLowerCase()
        );
        if (accountIndex !== -1) {
          accounts[accountIndex].onboarding = onboarding;
          saveAccounts(accounts);
        }
      }
    } catch (error) {
      console.error('Error loading preferences from database:', error);
      // Fallback to account file preferences
    }

    // Get company info if seller
    let company = null;
    if (account.role === 'seller' && account.companyId) {
      const companyData = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(account.companyId) as any;
      if (companyData) {
        company = companyData;
      }
    }

    res.json({
      message: 'Sign in successful',
      account: {
        email: account.email,
        name: account.name,
        role: account.role,
        companyId: account.companyId,
        company,
        onboarding,
      },
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// Get all accounts (for admin/debugging)
router.get('/accounts', (req, res) => {
  try {
    const accounts = loadAccounts();
    // Don't return passwords
    const safeAccounts = accounts.map(({ password, ...rest }) => rest);
    res.json(safeAccounts);
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Get buyer leads (for sellers to see potential buyers)
router.get('/buyer-leads', (req, res) => {
  try {
    const accounts = loadAccounts();
    console.log(`[Buyer Leads API] Total accounts loaded: ${accounts.length}`);
    
    // Filter to only buyers and don't return passwords
    const buyerLeads = accounts
      .filter(acc => acc.role === 'buyer')
      .map(({ password, ...rest }) => rest);
    
    console.log(`[Buyer Leads API] Buyer accounts found: ${buyerLeads.length}`);
    
    // Log onboarding data presence
    const buyersWithOnboarding = buyerLeads.filter(lead => lead.onboarding);
    const buyersWithoutOnboarding = buyerLeads.length - buyersWithOnboarding.length;
    console.log(`[Buyer Leads API] Buyers with onboarding: ${buyersWithOnboarding.length}, without: ${buyersWithoutOnboarding}`);
    
    // Log sample buyer emails for debugging
    if (buyerLeads.length > 0) {
      console.log(`[Buyer Leads API] Sample buyer emails: ${buyerLeads.slice(0, 3).map(b => b.email).join(', ')}`);
    } else {
      console.log(`[Buyer Leads API] WARNING: No buyer accounts found! Check accounts.txt for accounts with role: 'buyer'`);
    }
    
    res.json(buyerLeads);
  } catch (error) {
    console.error('[Buyer Leads API] Error getting buyer leads:', error);
    res.status(500).json({ error: 'Failed to get buyer leads' });
  }
});

// Update account preferences (onboarding data)
router.put('/preferences', (req, res) => {
  try {
    const { email, onboarding } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!onboarding) {
      return res.status(400).json({ error: 'Onboarding data is required' });
    }

    const accounts = loadAccounts();
    const accountIndex = accounts.findIndex(
      (acc) => acc.email.toLowerCase() === email.toLowerCase()
    );

    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Update the account's onboarding data in accounts.txt
    accounts[accountIndex].onboarding = onboarding;
    saveAccounts(accounts);

    // Also save to database for persistence
    const onboardingJson = JSON.stringify(onboarding);
    const now = new Date().toISOString();
    
    const insertOrUpdate = db.prepare(`
      INSERT INTO account_preferences (email, onboarding, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        onboarding = excluded.onboarding,
        updatedAt = excluded.updatedAt
    `);
    
    insertOrUpdate.run(email.toLowerCase(), onboardingJson, now);

    // Get company info if seller
    let company = null;
    if (accounts[accountIndex].role === 'seller' && accounts[accountIndex].companyId) {
      const companyData = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(accounts[accountIndex].companyId) as any;
      if (companyData) {
        company = companyData;
      }
    }

    res.json({
      message: 'Preferences updated successfully',
      account: {
        email: accounts[accountIndex].email,
        name: accounts[accountIndex].name,
        role: accounts[accountIndex].role,
        companyId: accounts[accountIndex].companyId,
        company,
        onboarding: accounts[accountIndex].onboarding,
      },
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
