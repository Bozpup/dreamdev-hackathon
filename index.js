import express from "express";
import { Client } from "pg";
import fs from "fs";
import csv from "csv-parser";

const app = express();
app.use(express.json());

const client = new Client({
  host: "localhost",
  user: "postgres",
  password: "1234567",
  database: "dreamdev",
  port: 5432,
});

await client.connect();
// console.log("Connected to PostgreSQL");

// await client.query(`
// CREATE TABLE IF NOT EXISTS activities (
//   event_id UUID PRIMARY KEY,
//   merchant_id VARCHAR(20),
//   event_timestamp TIMESTAMP,
//   product VARCHAR(50),
//   event_type VARCHAR(50),
//   amount DECIMAL,
//   status VARCHAR(20),
//   channel VARCHAR(20),
//   region VARCHAR(50),
//   merchant_tier VARCHAR(20)
// );
// `);
// console.log("Table activities is ready");

function importCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        try {
          for (const r of rows) {
            const timestamp =
              r.event_timestamp && r.event_timestamp.trim() !== ""
                ? r.event_timestamp
                : null;
            const amount = isNaN(Number(r.amount)) ? null : Number(r.amount);
            await client.query(
              `INSERT INTO activities(
                event_id, merchant_id, event_timestamp, product, event_type,
                amount, status, channel, region, merchant_tier
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
              ON CONFLICT (event_id) DO NOTHING`,
              [
                r.event_id,
                r.merchant_id,
                timestamp,
                r.product,
                r.event_type,
                amount,
                r.status,
                r.channel,
                r.region,
                r.merchant_tier,
              ],
            );
          }
          console.log(`Imported ${rows.length} rows from ${filePath}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

const dataFolder = "./data";
if (fs.existsSync(dataFolder)) {
  fs.readdirSync(dataFolder).forEach((file) => {
    if (file.endsWith(".csv")) {
      importCSV(`${dataFolder}/${file}`);
    }
  });
} else {
  console.log(
    "Data folder not found. Create 'data/' and drop your CSVs inside.",
  );
}

app.get("/analytics/top-merchant", async (req, res) => {
  const result = await client.query(`
    SELECT merchant_id, SUM(amount) AS total
    FROM activities
    WHERE status='SUCCESS'
    GROUP BY merchant_id
    ORDER BY total DESC
    LIMIT 1
  `);
  res.json(result.rows[0] || {});
});

app.get("/analytics/monthly-active-merchants", async (req, res) => {
  const result = await client.query(`
    SELECT DATE_TRUNC('month', event_timestamp) AS month, COUNT(DISTINCT merchant_id) AS active_merchants
    FROM activities
    GROUP BY month
    ORDER BY month
  `);
  res.json(result.rows);
});

app.get("/analytics/product-adoption", async (req, res) => {
  const result = await client.query(`
    SELECT product, COUNT(DISTINCT merchant_id) AS merchant_count
    FROM activities
    GROUP BY product
    ORDER BY merchant_count DESC
  `);
  res.json(result.rows);
});

// app.get("/analytics/kyc-funnel", async (req, res) => {
//   const result = await client.query(`
//     SELECT
//       COUNT(*) FILTER (WHERE event_type='KYC_STARTED') AS started,
//       COUNT(*) FILTER (WHERE event_type='KYC_SUBMITTED') AS submitted,
//       COUNT(*) FILTER (WHERE event_type='KYC_APPROVED') AS approved
//     FROM activities
//   `);
//   res.json(result.rows[0] || {});
// });

app.get("/analytics/kyc-funnel", async (req, res) => {
  const result = await client.query(`
    SELECT
      COUNT(DISTINCT merchant_id) FILTER (
        WHERE event_type = 'DOCUMENT_SUBMITTED'
      ) AS documents_submitted,

      COUNT(DISTINCT merchant_id) FILTER (
        WHERE event_type = 'VERIFICATION_COMPLETED'
      ) AS verifications_completed,

      COUNT(DISTINCT merchant_id) FILTER (
        WHERE event_type = 'TIER_UPGRADE'
      ) AS tier_upgrades

    FROM activities
    WHERE product = 'KYC'
    AND status = 'SUCCESS'
  `);

  res.json({
    documents_submitted: Number(result.rows[0].documents_submitted),
    verifications_completed: Number(result.rows[0].verifications_completed),
    tier_upgrades: Number(result.rows[0].tier_upgrades),
  });
});

app.get("/analytics/failure-rates", async (req, res) => {
  try {
    const result = await client.query(`
      SELECT product,
             COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_count,
             COUNT(*) AS total_count,
             ROUND(
               COUNT(*) FILTER (WHERE status = 'FAILED')::decimal / NULLIF(COUNT(*),0) * 100
             , 1) AS failure_rate
      FROM activities
      GROUP BY product
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
