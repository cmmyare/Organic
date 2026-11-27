// One-time bootstrap of the first general admin (type 0) and the indexes for admins/menus.
// The password is read from ADMIN_SEED_PASSWORD (never a default, never printed).
//
// PowerShell:
//   $env:ADMIN_SEED_PASSWORD = '<strong password>'
//   npm run seed:admin -- --email owner@example.com --name "Owner"
//   Remove-Item Env:ADMIN_SEED_PASSWORD
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { get_config } from '../../shared/config/env.js';
import { Admin } from '../../shared/models/admin.js';
import { Menu } from '../../shared/models/menu.js';

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
const email = (values.email || '').trim().toLowerCase();
const name = (values.name || '').trim();
const password = process.env.ADMIN_SEED_PASSWORD || '';

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
  console.error('Usage: npm run seed:admin -- --email <email> --name "<name>"');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Set ADMIN_SEED_PASSWORD (at least 12 characters) in the environment first.');
  process.exit(1);
}

const config = get_config();
await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10_000, autoIndex: false });

try {
  await Admin.createIndexes();
  await Menu.createIndexes();

  if (await Admin.exists({ type: 0 })) {
    console.error('A general admin (type 0) already exists. Seed is one-time only; nothing changed.');
    process.exitCode = 1;
  } else {
    await Admin.create({ name, email_normalized: email, password_hash: await bcrypt.hash(password, 12), type: 0 });
    console.log(`General admin created: ${email}`);
  }
} finally {
  await mongoose.disconnect();
}
