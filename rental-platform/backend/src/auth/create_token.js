#!/usr/bin/env node
// Usage: node src/auth/create_token.js --id=admin1 --name=Admin --email=admin@example.com --roles=admin,user
import { createToken } from './index.js';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const id = argv.id || 'local';
const name = argv.name || 'Local';
const email = argv.email || 'local@example.com';
const roles = argv.roles ? String(argv.roles).split(',').map(s=>s.trim()) : ['admin'];

try {
  const token = createToken({ id, name, email, roles });
  console.log(token);
} catch (err) {
  console.error('Failed to create token:', err.message);
  process.exit(1);
}
