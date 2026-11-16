"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function resolveDatabaseUrl() {
    // If explicitly configured with postgres / mysql, keep as is
    const envUrl = process.env.DATABASE_URL;
    if (envUrl && !envUrl.startsWith('file:') && (envUrl.startsWith('postgresql://') || envUrl.startsWith('mysql://'))) {
        return envUrl;
    }
    // Candidate locations where dev.db may be found
    const candidates = [
        path_1.default.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/dev.db'),
        path_1.default.resolve(process.cwd(), 'dev.db'),
        path_1.default.resolve(__dirname, '../../server/prisma/dev.db'),
        path_1.default.resolve(__dirname, '../prisma/dev.db'),
        path_1.default.resolve(__dirname, '../prisma/prisma/dev.db'),
        path_1.default.resolve(__dirname, '../../prisma/dev.db'),
        path_1.default.resolve(__dirname, '../dev.db'),
    ];
    if (envUrl && envUrl.startsWith('file:')) {
        const rawPath = envUrl.replace(/^file:/, '').trim();
        if (!path_1.default.isAbsolute(rawPath)) {
            candidates.unshift(path_1.default.resolve(process.cwd(), 'server/prisma', rawPath));
            candidates.unshift(path_1.default.resolve(process.cwd(), 'server', rawPath));
            candidates.unshift(path_1.default.resolve(process.cwd(), rawPath));
        }
        else {
            candidates.unshift(rawPath);
        }
    }
    // Find the first existing database with valid size (> 10KB)
    let foundDb = candidates.find((p) => {
        try {
            return fs_1.default.existsSync(p) && fs_1.default.statSync(p).size > 10000;
        }
        catch {
            return false;
        }
    });
    if (!foundDb) {
        foundDb = candidates.find((p) => {
            try {
                return fs_1.default.existsSync(p);
            }
            catch {
                return false;
            }
        });
    }
    // Define critical sync locations so any path has the file
    const syncLocations = [
        path_1.default.resolve(process.cwd(), 'server/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/prisma/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'server/dev.db'),
        path_1.default.resolve(process.cwd(), 'dev.db'),
    ];
    if (foundDb) {
        for (const target of syncLocations) {
            try {
                const dir = path_1.default.dirname(target);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
                if (target !== foundDb) {
                    if (!fs_1.default.existsSync(target) || fs_1.default.statSync(target).size === 0) {
                        fs_1.default.copyFileSync(foundDb, target);
                    }
                }
            }
            catch (err) {
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
            const dir = path_1.default.dirname(target);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
        }
        catch (err) {
            // ignore
        }
    }
    const fallback = syncLocations[0].replace(/\\/g, '/');
    const finalUrl = `file:${fallback}`;
    process.env.DATABASE_URL = finalUrl;
    return finalUrl;
}
const resolvedDbUrl = resolveDatabaseUrl();
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        datasources: {
            db: {
                url: resolvedDbUrl,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map