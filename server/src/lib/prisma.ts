import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function resolveDatabaseUrl(): string {
  // If explicitly configured with postgres / mysql, keep as is
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
    return envUrl;
  }

  // Candidate locations where dev.db may be found
  const candidates: string[] = [
    path.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
    path.resolve(process.cwd(), 'server/prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma/dev.db'),
    path.resolve(process.cwd(), 'server/dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
    path.resolve(__dirname, '../../server/prisma/dev.db'),
    path.resolve(__dirname, '../prisma/dev.db'),
    path.resolve(__dirname, '../prisma/prisma/dev.db'),
    path.resolve(__dirname, '../../prisma/dev.db'),
    path.resolve(__dirname, '../dev.db'),
  ];

  if (envUrl && envUrl.startsWith('file:')) {
    const rawPath = envUrl.replace(/^file:/, '').trim();
    if (!path.isAbsolute(rawPath)) {
      candidates.unshift(path.resolve(process.cwd(), 'server/prisma', rawPath));
      candidates.unshift(path.resolve(process.cwd(), 'server', rawPath));
      candidates.unshift(path.resolve(process.cwd(), rawPath));
    } else {
      candidates.unshift(rawPath);
    }
  }

  // Find the first existing database with valid size (> 10KB)
  let foundDb = candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).size > 10000;
    } catch {
      return false;
    }
  });

  if (!foundDb) {
    foundDb = candidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
  }

  // Define critical sync locations so any path has the file
  const syncLocations = [
    path.resolve(process.cwd(), 'server/prisma/dev.db'),
    path.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma/dev.db'),
    path.resolve(process.cwd(), 'server/dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
  ];

  if (foundDb) {
    for (const target of syncLocations) {
      try {
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (target !== foundDb) {
          if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
            fs.copyFileSync(foundDb, target);
          }
        }
      } catch (err) {
        // ignore
      }
    }
    console.log(`🔌 [Prisma] Connected to database: ${foundDb}`);
    const normalized = foundDb.replace(/\\/g, '/');
    const finalUrl = `file:${normalized}`;
    process.env.DATABASE_URL = finalUrl;
    return finalUrl;
  }

  // Fallback: ensure directories exist
  for (const target of syncLocations) {
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      // ignore
    }
  }

  const fallback = syncLocations[0].replace(/\\/g, '/');
  const finalUrl = `file:${fallback}`;
  process.env.DATABASE_URL = finalUrl;
  return finalUrl;
}

const resolvedDbUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
