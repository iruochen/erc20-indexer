-- store RCH token transfer events and sync progress
CREATE TABLE IF NOT EXISTS rch_transfers (
    id SERIAL PRIMARY KEY,
    tx_hash CHAR(66) NOT NULL,
    log_index INT NOT NULL,
    from_address CHAR(42) NOT NULL,
    to_address CHAR(42) NOT NULL,
    amount NUMERIC(38, 0) NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash CHAR(66) NOT NULL,
    block_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure uniqueness of each transfer event
    UNIQUE(tx_hash, log_index)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rch_transfers_from_address ON rch_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_rch_transfers_to_address ON rch_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_rch_transfers_block_number ON rch_transfers(block_number);

-- 2. Store sync progress (bookmark)
CREATE TABLE IF NOT EXISTS sync_progress (
    contract_address CHAR(42) PRIMARY KEY,
    last_synced_block BIGINT NOT NULL
);