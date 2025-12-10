import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Setup code before all tests
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup code after all tests
  console.log('✅ Tests completed, cleaning up...');
});
