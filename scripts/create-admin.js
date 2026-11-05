import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool, initializeDatabase } from '../db.js';

const [emailArg, nameArg = 'Mannin Admin'] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!pool) {
  console.error('Set DATABASE_URL in .env to create a persistent PostgreSQL admin. Local demo login works without a database.');
  process.exitCode = 1;
} else if (!email || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(email) || email.length > 254) {
  console.error('Usage: npm run create-admin -- admin@example.com [Display Name]');
  process.exitCode = 1;
} else if (!password || password.length < 8 || password.length > 12) {
  console.error('Set ADMIN_PASSWORD to a password between 8 and 12 characters, then run this command again.');
  process.exitCode = 1;
} else {
  try {
    await initializeDatabase();
    const passwordHash = await bcrypt.hash(password, 12);
    const { rowCount } = await pool.query(
      `INSERT INTO app_users (id, email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [randomUUID(), email, passwordHash, nameArg.trim() || 'Mannin Admin'],
    );
    if (!rowCount) throw new Error(`An account for ${email} already exists; it was not changed.`);
    console.log(`Created admin account for ${email}.`);
  } catch (error) {
    console.error(`Could not create admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool?.end();
  }
}
