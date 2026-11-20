import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { ATTENDANCE_MODES } from '../constants/enums.ts';

// Legacy names below are intentional: this migration renames the old MongoDB
// collection/fields to the current participant terminology.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env first, then fall back to the repository-root .env.
dotenv.config({ path: path.join(scriptDir, '../.env') });
dotenv.config({ path: path.join(scriptDir, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI (or MONGO_URI) is not set in the environment.');
  process.exit(1);
}

type Db = NonNullable<typeof mongoose.connection.db>;

async function renameField(db: Db, collectionName: string, from: string, to: string) {
  const result = await db.collection(collectionName).updateMany(
    { [from]: { $exists: true } },
    [
      { $set: { [to]: { $ifNull: [`$${to}`, `$${from}`] } } },
      { $unset: from },
    ]
  );

  if (result.matchedCount > 0) {
    console.log(`  ✓ ${collectionName}.${from} → ${to} (${result.matchedCount} document${result.matchedCount === 1 ? '' : 's'})`);
  }
}

async function defaultAttendanceMode(db: Db, collectionName: string) {
  const result = await db.collection(collectionName).updateMany(
    {
      $or: [
        { attendanceMode: { $exists: false } },
        { attendanceMode: null },
        { attendanceMode: { $nin: ATTENDANCE_MODES } },
      ],
    },
    { $set: { attendanceMode: 'not_sure' } }
  );

  if (result.matchedCount > 0) {
    console.log(`  ✓ ${collectionName}.attendanceMode defaulted to not_sure (${result.matchedCount} document${result.matchedCount === 1 ? '' : 's'})`);
  }
}

async function migrate() {
  await mongoose.connect(MONGO_URI);

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection is not available.');

    const collections = new Set(
      (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
    );

    if (collections.has('attendees') && collections.has('participants')) {
      throw new Error(
        'Both "attendees" and "participants" collections exist. Resolve the duplicate manually before running this migration.'
      );
    }

    if (collections.has('attendees')) {
      console.log('⏳ Renaming collection attendees → participants...');
      await db.renameCollection('attendees', 'participants');
      console.log('  ✓ Collection renamed.');
    } else {
      console.log('• Collection attendees not found; participants collection is already in place.');
    }

    console.log('⏳ Renaming participant fields...');
    await renameField(db, 'participants', 'attendeeId', 'participantId');
    await renameField(db, 'participants', 'parish', 'chapterZone');
    await renameField(db, 'participants', 'churchOrParishName', 'chapterZoneName');
    await defaultAttendanceMode(db, 'participants');

    console.log('⏳ Renaming related collection fields...');
    await renameField(db, 'groups', 'churchOrParishName', 'chapterZoneName');
    await renameField(db, 'group_seats', 'attendeeId', 'participantId');
    await renameField(db, 'notification_jobs', 'attendeeId', 'participantId');
    await renameField(db, 'notification_jobs', 'payload.attendeeName', 'payload.participantName');
    await renameField(db, 'scan_events', 'attendeeId', 'participantId');
    await renameField(db, 'orders', 'attendeeCount', 'participantCount');
    await renameField(db, 'orders', 'attendees', 'participants');
    await defaultAttendanceMode(db, 'orders');

    console.log('🎉 Participant terminology migration complete.');
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exitCode = 1;
});
