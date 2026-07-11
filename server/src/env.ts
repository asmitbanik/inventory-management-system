import dotenv from 'dotenv';
import path from 'path';

if (process.env.VERCEL !== '1') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}
