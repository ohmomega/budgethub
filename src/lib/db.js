import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let prisma;

// Prevent multiple instances of Prisma Client in development (hot-reload)
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.globalPrisma) {
    global.globalPrisma = createPrismaClient();
  }
  prisma = global.globalPrisma;
}

export { prisma };
