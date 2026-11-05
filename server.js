import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import bcrypt from 'bcryptjs';
import { initializeDatabase, pool } from './db.js';

const app = Fastify({
  logger: true,
  trustProxy: process.env.TRUST_PROXY === 'true',
  bodyLimit: 16 * 1024,
});
const root = path.dirname(fileURLToPath(import.meta.url));
const sessionCookie = 'mannin_session';
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const dummyHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
});
await app.register(cookie);
await app.register(rateLimit, { global: false });

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: sessionLifetimeMs / 1000,
  };
}

function isValidEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(email.trim());
}

function checkOrigin(request, reply) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const expectedOrigin = process.env.APP_ORIGIN || `${request.protocol}://${request.headers.host}`;
  if (origin === expectedOrigin) return true;
  reply.code(403).send({ error: 'Request origin is not allowed.' });
  return false;
}

async function findSession(token) {
  if (!token || token.length > 200) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.display_name AS name, u.role
       FROM app_sessions s
       JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  return rows[0] || null;
}

app.post('/api/login', {
  config: { rateLimit: { max: 5, timeWindow: 15 * 60 * 1000 } },
}, async (request, reply) => {
  if (!checkOrigin(request, reply)) return;
  const { email, password } = request.body || {};
  if (!isValidEmail(email)) {
    return reply.code(400).send({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 12) {
    return reply.code(400).send({ error: 'Password must be 8–12 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, display_name, role FROM app_users WHERE email = $1',
    [normalizedEmail],
  );
  const user = rows[0];
  const validPassword = await bcrypt.compare(password, user?.password_hash || dummyHash);
  if (!user || !validPassword) {
    return reply.code(401).send({ error: 'Email or password is incorrect.' });
  }

  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO app_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [hashToken(token), user.id],
  );
  await pool.query('DELETE FROM app_sessions WHERE expires_at <= NOW()');
  reply.setCookie(sessionCookie, token, cookieOptions());
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.display_name || user.email,
      role: user.role,
    },
  };
});

app.get('/api/session', async (request, reply) => {
  try {
    const user = await findSession(request.cookies[sessionCookie]);
    if (!user) {
      reply.clearCookie(sessionCookie, cookieOptions());
      return { user: null };
    }
    return { user };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Unable to check the login session.' });
  }
});

app.post('/api/logout', async (request, reply) => {
  if (!checkOrigin(request, reply)) return;
  const token = request.cookies[sessionCookie];
  if (token) {
    await pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  reply.clearCookie(sessionCookie, cookieOptions());
  return { ok: true };
});

await app.register(staticFiles, { root: path.join(root, 'public'), prefix: '/' });

app.setErrorHandler((error, request, reply) => {
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  request.log.error(error);
  return reply.code(500).send({ error: 'An unexpected server error occurred.' });
});

async function start() {
  await initializeDatabase();
  await app.listen({
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '0.0.0.0',
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}

start().catch(async (error) => {
  app.log.error(error);
  await app.close();
  await pool.end();
  process.exit(1);
});
