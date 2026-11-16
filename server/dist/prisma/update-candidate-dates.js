"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function updateCandidateDates() {
    const candidates = await prisma.candidate.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, firstName: true, lastName: true },
    });
    console.log(`Found ${candidates.length} candidates in database to distribute activity dates across 7d, 15d, 1m, 6m, 1y buckets.`);
    const now = Date.now();
    // We distribute across realistic intervals:
    // 0 - 25: 1 to 6 days ago (Active in 7 days, 15 days, 1 month, 6 months, 1 year)
    // 26 - 45: 8 to 14 days ago (Active in 15 days, 1 month, 6 months, 1 year)
    // 46 - 70: 16 to 28 days ago (Active in 1 month, 6 months, 1 year)
    // 71 - 95: 35 to 160 days ago (Active in 6 months, 1 year)
    // 96 - 108: 190 to 340 days ago (Active in 1 year)
    // 109+: 380 to 450 days ago (Only in All Profiles)
    for (let i = 0; i < candidates.length; i++) {
        let daysAgo = 2;
        if (i < 25) {
            daysAgo = 1 + (i % 6); // 1 to 6 days ago
        }
        else if (i < 48) {
            daysAgo = 8 + (i % 7); // 8 to 14 days ago
        }
        else if (i < 73) {
            daysAgo = 16 + (i % 13); // 16 to 28 days ago
        }
        else if (i < 98) {
            daysAgo = 35 + ((i * 5) % 130); // 35 to 165 days ago
        }
        else if (i < 110) {
            daysAgo = 190 + ((i * 11) % 150); // 190 to 340 days ago
        }
        else {
            daysAgo = 380 + (i % 50); // > 1 year ago
        }
        const updatedDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        await prisma.candidate.update({
            where: { id: candidates[i].id },
            data: {
                updatedAt: updatedDate,
            },
        });
    }
    console.log(`Successfully updated activity dates for all ${candidates.length} candidates!`);
}
updateCandidateDates()
    .catch((e) => {
    console.error('Error updating dates:', e);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=update-candidate-dates.js.map