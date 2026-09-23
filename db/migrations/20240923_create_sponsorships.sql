-- db/migrations/20240923_create_sponsorships.sql
CREATE TABLE IF NOT EXISTS sponsorships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    network INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING','SUBMITTED','CONFIRMED','FAILED')),
    sponsorship_amount TEXT NOT NULL,
    transaction_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Unique index to enforce one sponsor per wallet+network
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_network ON sponsorships (wallet_address, network);
