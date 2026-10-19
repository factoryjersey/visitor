import type { NextConfig } from 'next';

const config: NextConfig = {
  // Postgres is only ever reached from the server.
  serverExternalPackages: ['postgres'],
  // One address: www.visitor.je points here too, and sends people on to visitor.je.
  async redirects() {
    return [
      { source: '/:path*', has: [{ type: 'host', value: 'www.visitor.je' }], destination: 'https://visitor.je/:path*', permanent: true },
      // Railway's own address, from old links and Supabase's Site URL: on to visitor.je, query and all.
      { source: '/:path*', has: [{ type: 'host', value: 'visitor-production-bdb2.up.railway.app' }], destination: 'https://visitor.je/:path*', permanent: false },
    ];
  },
};

export default config;
