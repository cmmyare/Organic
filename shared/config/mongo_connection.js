// MongoDB Atlas connection through Mongoose. One connection per process.
import mongoose from 'mongoose';
import { mask_connection_uri } from './logger.js';

mongoose.set('strictQuery', true);

export async function connect_mongo({ uri, logger }) {
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('mongo reconnected'));
  mongoose.connection.on('error', (error) => logger.error({ err: error.message }, 'mongo error'));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: false, // indexes are created deliberately by migrations, not on boot
  });
  logger.info(
    { uri: mask_connection_uri(uri), db: mongoose.connection.name },
    'mongo connected',
  );
  return mongoose.connection;
}

export async function check_mongo() {
  if (mongoose.connection.readyState !== 1) return { ok: false, detail: 'not_connected' };
  try {
    await mongoose.connection.db.admin().ping();
    return { ok: true };
  } catch {
    return { ok: false, detail: 'ping_failed' };
  }
}

export async function close_mongo() {
  await mongoose.connection.close();
}
