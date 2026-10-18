import type { NextConfig } from 'next';

const config: NextConfig = {
  // Postgres is only ever reached from the server.
  serverExternalPackages: ['postgres'],
};

export default config;
