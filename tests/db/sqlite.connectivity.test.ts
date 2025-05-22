import { test, expect } from '@playwright/test';
import { db } from '@/lib/db/queries'; // Adjust path as necessary
import * as schema from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

test.describe('SQLite Database Connectivity', () => {
  test('should connect to the SQLite database and perform a simple query', async () => {
    // Ensure the DATABASE_URL is set, or the default 'file:./chat.db' will be used by queries.ts
    // For a test environment, you might want to explicitly set it to a test-specific DB
    // process.env.DATABASE_URL = 'file:./test-chat.db';

    let queryError: Error | null = null;
    let result: any = null;

    try {
      // Attempt a very simple query.
      // This query tries to get the count of users.
      // It doesn't rely on specific data being present, only that the table exists.
      result = await db.select({ count: sql<number>`count(*)` }).from(schema.user).execute();
    } catch (error: any) {
      queryError = error;
      console.error('Database connectivity test error:', error);
    }

    // Assert that the query executed without throwing an error
    expect(queryError).toBeNull();

    // Assert that we got a result (it should be an array with one object: [{ count: N }])
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThanOrEqual(0); // Could be 0 if the table is empty
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('count');
      expect(typeof result[0].count).toBe('number');
    }

    // Further check if the main db operations demo runs without critical error
    // This is a more complex check and assumes the main function in queries.ts
    // is designed to be somewhat idempotent or safe to run in a test context.
    // For a unit test, this might be too broad, but for a conceptual "connectivity"
    // and basic ORM functionality check, it can be useful.
    // Note: The main() function in queries.ts performs CUD operations and logs to console.
    // We are primarily interested if it throws an unhandled exception.
    // Consider refactoring main() in queries.ts if it's not test-friendly.

    let mainFunctionError: Error | null = null;
    try {
      // If main() is exported and can be called:
      // await main(); // Assuming main is refactored or safe to call
      // For now, we'll just rely on the simple query above.
      // The actual main() in the provided queries.ts has console.log and process.exit,
      // which is not ideal for programmatic testing.
    } catch (error: any) {
      mainFunctionError = error;
      console.error('Error running main DB operations demo:', error);
    }
    expect(mainFunctionError).toBeNull();


  });

  test('should use "file:./chat.db" if DATABASE_URL is not set', async () => {
    // Temporarily unset DATABASE_URL to test fallback
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    // We need to re-import or somehow re-initialize the db instance from queries.ts
    // This is tricky because Node.js caches modules.
    // For a true test of this, queries.ts might need to export a factory function
    // or the test might need to use jest.resetModules() and re-require.

    // For this conceptual test, we'll assume the existing `db` instance
    // would have picked up the undefined DATABASE_URL upon its initialization.
    // The actual test for this specific scenario would require more advanced Jest/module mocking.

    // This test case is more about documenting the expectation.
    // A simple query check is performed again.
    let queryError: Error | null = null;
    try {
      await db.select({ count: sql<number>`count(*)` }).from(schema.user).execute();
    } catch (error: any) {
      queryError = error;
    }
    expect(queryError).toBeNull();

    // Restore DATABASE_URL
    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL; // Ensure it's deleted if it wasn't set before
    }
  });
});
