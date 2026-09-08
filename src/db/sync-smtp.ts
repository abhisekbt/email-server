import { pool } from "./pool";
import { env } from "../config/env";

async function sync() {
  const res = await pool.query(
    `UPDATE smtp_config SET 
      host = $1, 
      port = $2, 
      username = $3, 
      password = $4, 
      encryption = $5, 
      sender_email = $6, 
      sender_name = $7`,
    [
      env.smtp.host,
      env.smtp.port,
      env.smtp.username,
      env.smtp.password,
      env.smtp.encryption,
      env.smtp.senderEmail,
      env.smtp.senderName,
    ]
  );
  console.log("Updated smtp_config rows:", res.rowCount);
  await pool.end();
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
