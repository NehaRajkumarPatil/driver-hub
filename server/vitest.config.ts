import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/driver_hub_test?schema=public',
      JWT_SECRET: 'test-jwt-secret-with-at-least-thirty-two-characters',
      JWT_EXPIRES_IN: '15m',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
    include: ['tests/**/*.test.ts'],
  },
})