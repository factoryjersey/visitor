/** Scripts run outside Next, so they load .env themselves. A missing file is fine. */
try {
  process.loadEnvFile('.env');
} catch {
  // Rely on the real environment.
}
