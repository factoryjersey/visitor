import type { NextConfig } from 'next';

const config: NextConfig = {
  // Postgres is only ever reached from the server.
  serverExternalPackages: ['postgres'],
  // One address: www.visitor.je points here too, and sends people on to visitor.je.
  async redirects() {
    return [{ source: '/:path*', has: [{ type: 'host', value: 'www.visitor.je' }], destination: 'https://visitor.je/:path*', permanent: true }];
  },
};

export default config;
