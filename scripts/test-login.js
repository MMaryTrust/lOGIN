import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 3000);
const baseUrl = `http://127.0.0.1:${port}`;
const email = process.env.DEMO_EMAIL || 'admin@sample.com';
const password = process.env.DEMO_PASSWORD || 'sample123';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function waitForServer(server, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not become ready within ${timeoutMs}ms`)), timeoutMs);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Server listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

function parseSetCookie(headers) {
  const raw = headers.get('set-cookie');
  if (!raw) return null;
  return raw.split(';')[0];
}

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, DEMO_EMAIL: email, DEMO_PASSWORD: password, PORT: String(port) },
  });
  server.stdout.setEncoding('utf8');
  server.stderr.setEncoding('utf8');
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer(server);
    console.log(`PASS: server is listening on ${baseUrl}`);

    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await loginRes.json();
    if (loginRes.status !== 200 || loginBody.user?.email !== email.toLowerCase()) {
      fail(`login did not succeed (status ${loginRes.status}): ${JSON.stringify(loginBody)}`);
      return;
    }
    console.log(`PASS: logged in as ${loginBody.user.email}`);
    const cookie = parseSetCookie(loginRes.headers);
    if (!cookie) {
      fail('login response did not set a session cookie');
      return;
    }

    const sessionRes = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } });
    const sessionBody = await sessionRes.json();
    if (sessionRes.status !== 200 || sessionBody.user?.email !== email.toLowerCase()) {
      fail(`session was not recognized after login: ${JSON.stringify(sessionBody)}`);
      return;
    }
    console.log('PASS: session persists after login');

    const logoutRes = await fetch(`${baseUrl}/api/logout`, { method: 'POST', headers: { Cookie: cookie } });
    if (logoutRes.status !== 200) {
      fail(`logout did not succeed (status ${logoutRes.status})`);
      return;
    }
    const afterLogout = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } });
    const afterLogoutBody = await afterLogout.json();
    if (afterLogoutBody.user !== null) {
      fail(`session should be cleared after logout: ${JSON.stringify(afterLogoutBody)}`);
      return;
    }
    console.log('PASS: logout clears the session');

    console.log('RESULT: all login checks passed');
  } catch (error) {
    fail(error.message);
  } finally {
    server.kill();
  }
}

await run();
