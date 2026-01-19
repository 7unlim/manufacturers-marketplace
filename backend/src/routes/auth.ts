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
    const { email, password, name, role, companyId } = req.body;

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

export default router;
