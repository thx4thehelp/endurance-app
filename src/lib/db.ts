import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export interface WalletRecord {
  id: string;
  address: string;
  privateKey: string;
  balance: string;
  balanceEth: string;
  source: 'random' | 'mnemonic' | 'privatekey';
  timestamp: number;
  hasBalance: number; // SQLite는 boolean 없음, 0 or 1
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load('sqlite:endurance_wallets.db');

  // 테이블 생성
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      privateKey TEXT NOT NULL,
      balance TEXT NOT NULL,
      balanceEth TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      hasBalance INTEGER DEFAULT 0
    )
  `);

  // 인덱스 생성 (빠른 조회용)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_hasBalance ON wallets(hasBalance)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_timestamp ON wallets(timestamp DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_address ON wallets(address)`);

  return db;
}

export async function saveWallet(wallet: Omit<WalletRecord, 'hasBalance'>): Promise<void> {
  const database = await initDatabase();
  const hasBalance = parseFloat(wallet.balanceEth) > 0 ? 1 : 0;

  await database.execute(
    `INSERT OR IGNORE INTO wallets (id, address, privateKey, balance, balanceEth, source, timestamp, hasBalance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [wallet.id, wallet.address, wallet.privateKey, wallet.balance, wallet.balanceEth, wallet.source, wallet.timestamp, hasBalance]
  );
}

export async function getAllWallets(limit = 100, offset = 0): Promise<WalletRecord[]> {
  const database = await initDatabase();
  return await database.select<WalletRecord[]>(
    `SELECT * FROM wallets ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function getWalletsWithBalance(limit = 100, offset = 0): Promise<WalletRecord[]> {
  const database = await initDatabase();
  return await database.select<WalletRecord[]>(
    `SELECT * FROM wallets WHERE hasBalance = 1 ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function getTotalCount(): Promise<number> {
  const database = await initDatabase();
  const result = await database.select<[{ count: number }]>(`SELECT COUNT(*) as count FROM wallets`);
  return result[0]?.count ?? 0;
}

export async function getBalanceCount(): Promise<number> {
  const database = await initDatabase();
  const result = await database.select<[{ count: number }]>(`SELECT COUNT(*) as count FROM wallets WHERE hasBalance = 1`);
  return result[0]?.count ?? 0;
}

export async function exportAllWallets(): Promise<WalletRecord[]> {
  const database = await initDatabase();
  return await database.select<WalletRecord[]>(`SELECT * FROM wallets ORDER BY timestamp DESC`);
}

export async function exportWalletsWithBalance(): Promise<WalletRecord[]> {
  const database = await initDatabase();
  return await database.select<WalletRecord[]>(`SELECT * FROM wallets WHERE hasBalance = 1 ORDER BY timestamp DESC`);
}

export async function clearAllWallets(): Promise<void> {
  const database = await initDatabase();
  await database.execute(`DELETE FROM wallets`);
}

// 검색 기능
export async function searchWallets(query: string, limit = 100, offset = 0): Promise<WalletRecord[]> {
  const database = await initDatabase();
  const searchPattern = `%${query}%`;
  return await database.select<WalletRecord[]>(
    `SELECT * FROM wallets WHERE address LIKE $1 OR privateKey LIKE $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3`,
    [searchPattern, limit, offset]
  );
}

export async function searchWalletsCount(query: string): Promise<number> {
  const database = await initDatabase();
  const searchPattern = `%${query}%`;
  const result = await database.select<[{ count: number }]>(
    `SELECT COUNT(*) as count FROM wallets WHERE address LIKE $1 OR privateKey LIKE $1`,
    [searchPattern]
  );
  return result[0]?.count ?? 0;
}
