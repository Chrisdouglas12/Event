import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { seedBooklet } from '../lib/booklet.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(scriptDir, '../.env') });
dotenv.config({ path: path.join(scriptDir, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI (or MONGO_URI) is not set in the environment.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const size = await seedBooklet();
  console.log(`✅ Seeded 'conference-booklet' (${size.toLocaleString()} bytes).`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to seed booklet:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
