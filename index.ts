import dotenv from "dotenv"
import { createPublicClient, parseAbiItem, webSocket } from "viem"
import { sepolia } from "viem/chains"
import { Pool } from "pg"

dotenv.config()

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: { rejectUnauthorized: false },
})

const client = createPublicClient({
	chain: sepolia,
	transport: webSocket(process.env.RPC_WSS_URL!),
})

const CONTRACT_ADDR = process.env.CONTRACT_ADDRESS as `0x${string}`
const TRANSFER_EVENT = parseAbiItem(
	"event Transfer(address indexed from, address indexed to, uint256 value)",
)

/**
 * Save the transfer logs to the database and update the sync progress.
 * @param {any[]} logs - The array of transfer logs to save.
 * @param {bigint} targetBlock - The block number to update sync progress to.
 */
async function saveLogs(logs: any[], targetBlock: bigint) {
	const dbClient = await pool.connect()
	if (logs.length === 0) {
		await dbClient.query(
			`INSERT INTO sync_progress (contract_address, last_synced_block) VALUES ($1, $2)
             ON CONFLICT (contract_address) DO UPDATE SET last_synced_block = $2`,
			[CONTRACT_ADDR, targetBlock],
		)
		return
	}
	try {
		await dbClient.query("BEGIN")

		// Pre-fetch timestamps for all unique blocks in this batch
		const uniqueBlocks = [...new Set(logs.map((l: any) => l.blockNumber))]
		const blockMap = new Map<bigint, bigint>()

		// Process blocks in small chunks to avoid rate limiting
		const CHUNK_SIZE = 10
		for (let i = 0; i < uniqueBlocks.length; i += CHUNK_SIZE) {
			const chunk = uniqueBlocks.slice(i, i + CHUNK_SIZE)
			await Promise.all(
				chunk.map(async (bn) => {
					const block = await client.getBlock({ blockNumber: bn })
					blockMap.set(bn, block.timestamp)
				}),
			)
			if (i + CHUNK_SIZE < uniqueBlocks.length) {
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
		}

		for (const log of logs) {
			const { from, to, value } = log.args
			// Insert transfer log into rch_transfers table
			await dbClient.query(
				`INSERT INTO rch_transfers (tx_hash, log_index, from_address, to_address, amount, block_number, block_hash, block_timestamp) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
				[
					log.transactionHash,
					log.logIndex,
					from.toLowerCase(),
					to.toLowerCase(),
					value.toString(),
					log.blockNumber,
					log.blockHash,
					blockMap.get(log.blockNumber)?.toString(),
				],
			)
		}

		// Always update sync progress to targetBlock
		await dbClient.query(
			`INSERT INTO sync_progress (contract_address, last_synced_block) VALUES ($1, $2)
             ON CONFLICT (contract_address) DO UPDATE SET last_synced_block = $2`,
			[CONTRACT_ADDR, targetBlock],
		)

		await dbClient.query("COMMIT")
		console.log(`Saved batch up to block ${targetBlock}`)
	} catch (err) {
		await dbClient.query("ROLLBACK")
		console.error("Error saving logs:", err)
		throw err
	} finally {
		dbClient.release()
	}
}

async function main() {
	console.log("--- RCH Indexer Starting ---")

	// Sync historical data
	const syncRes = await pool.query(
		"SELECT last_synced_block FROM sync_progress WHERE contract_address = $1",
		[CONTRACT_ADDR],
	)

	let currentPointer: bigint
	if (syncRes.rows.length === 0) {
		// No progress in DB, use START_BLOCK from .env
		currentPointer = BigInt(process.env.START_BLOCK || "0")
		console.log(
			`No progress found. Initializing from START_BLOCK: ${currentPointer}`,
		)
	} else {
		// Progress found, start from next block
		currentPointer = BigInt(syncRes.rows[0].last_synced_block) + 1n
		console.log(`Resuming from block: ${currentPointer}`)
	}

	const latestBlock = await client.getBlockNumber()
	console.log(`Chain head is at: ${latestBlock}`)

	const BATCH_SIZE = 9n
	while (currentPointer <= latestBlock) {
		const toBlock =
			currentPointer + BATCH_SIZE > latestBlock
				? latestBlock
				: currentPointer + BATCH_SIZE

		console.log(`[Query] ${currentPointer} -> ${toBlock}...`)

		const logs = await client.getLogs({
			address: CONTRACT_ADDR,
			event: TRANSFER_EVENT,
			fromBlock: currentPointer,
			toBlock: toBlock,
		})

		console.log(`[Result] Found ${logs.length} logs in this range.`)
		await saveLogs(logs, toBlock)
		currentPointer = toBlock + 1n
	}

	// Start real-time watching
	console.log("History synced. Entering Real-time mode...")
	client.watchEvent({
		address: CONTRACT_ADDR,
		event: TRANSFER_EVENT,
		onLogs: async (logs) => {
			const maxBlock = logs.reduce(
				(max, log) => (log.blockNumber > max ? log.blockNumber : max),
				0n,
			)
			console.log(`New event detected in block ${maxBlock}`)
			await saveLogs(logs, maxBlock)
		},
		onError: (err) => {
			console.error("Watch error:", err)
			process.exit(1)
		},
	})
}

main().catch((err) => {
	pool.end()
	console.error("Main crash: ", err)
	process.exit(1)
})
