import express from "express"
import cors from "cors"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Setup PostgreSQL pool
const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
	// Use SSL if required (e.g. for AWS RDS)
	ssl: process.env.DATABASE_URL?.includes("amazonaws.com")
		? { rejectUnauthorized: false }
		: false,
})

app.use(cors())
app.use(express.json())

/**
 * @api {get} /health Health Check
 */
app.get("/health", (req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() })
})

/**
 * @api {get} /api/transfers/:address Get transfer history for an address
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 */
app.get("/api/transfers/:address", async (req, res) => {
	const address = req.params.address.toLowerCase()
	const page = Math.max(1, parseInt(req.query.page as string) || 1)
	let limit = Math.max(1, parseInt(req.query.limit as string) || 20)
	limit = Math.min(limit, 100) // Caps limit at 100
	const offset = (page - 1) * limit

	try {
		// Query to find transfers where the address is either sender or receiver
		const query = `
			SELECT 
				tx_hash, 
				log_index, 
				from_address, 
				to_address, 
				amount, 
				block_number, 
				block_timestamp,
				created_at
			FROM rch_transfers 
			WHERE from_address = $1 OR to_address = $1
			ORDER BY block_number DESC, log_index DESC
			LIMIT $2 OFFSET $3
		`
		const result = await pool.query(query, [address, limit, offset])

		// Optional: Get total count for pagination metadata
		const countQuery = `SELECT COUNT(*) FROM rch_transfers WHERE from_address = $1 OR to_address = $1`
		const countResult = await pool.query(countQuery, [address])
		const totalItems = parseInt(countResult.rows[0].count)

		res.json({
			data: result.rows,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages: Math.ceil(totalItems / limit),
			},
		})
	} catch (err) {
		console.error("API Error:", err)
		res.status(500).json({ error: "Internal Server Error" })
	}
})

/**
 * @api {get} /api/sync-status Get indexer sync progress
 */
app.get("/api/sync-status", async (req, res) => {
	try {
		const result = await pool.query(
			"SELECT contract_address, last_synced_block FROM sync_progress",
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch sync status" })
	}
})

app.listen(port, () => {
	console.log(`--- RCH API Server running on http://localhost:${port} ---`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
	pool.end(() => {
		console.log("Database pool has ended")
		process.exit(0)
	})
})
