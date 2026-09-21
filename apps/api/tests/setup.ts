import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';
process.env.TZ = 'Asia/Kolkata';
