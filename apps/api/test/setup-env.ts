import { config } from 'dotenv';

// Load the repo-root .env so DATABASE_URL (and other secrets) are available
// to jest test contexts, which don't go through Nest's ConfigModule bootstrap.
config({ path: '../../.env' });