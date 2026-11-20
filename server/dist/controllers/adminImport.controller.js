"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadOriginalFileHandler = exports.downloadReportHandler = exports.getImportHistoryHandler = exports.getJobProgressHandler = exports.executeImportHandler = exports.parseSheetHandler = exports.uploadAndPreviewHandler = exports.downloadTemplateHandler = exports.getTargetFieldsHandler = exports.ensureImportJobTable = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const slugify_1 = __importDefault(require("slugify"));
const prisma_1 = require("../lib/prisma");
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const aiImport_service_1 = require("../services/aiImport.service");
const prisma_2 = require("../lib/prisma");
const persistentUploads = (0, prisma_2.getPersistentUploadsDir)();
const importsDir = persistentUploads.imports;
const reportsDir = persistentUploads.reports;
// Ensure directories exist
[importsDir, reportsDir].forEach((dir) => {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
});
/**
 * Ensure ImportJob table exists in SQLite database (zero-dependency fail-safe)
 */
const ensureImportJobTable = async () => {
    try {
        await prisma_1.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ImportJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "fileName" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL DEFAULT 0,
        "mimeType" TEXT,
        "filePath" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalRows" INTEGER NOT NULL DEFAULT 0,
        "processedRows" INTEGER NOT NULL DEFAULT 0,
        "successCount" INTEGER NOT NULL DEFAULT 0,
        "updatedCount" INTEGER NOT NULL DEFAULT 0,
        "skippedCount" INTEGER NOT NULL DEFAULT 0,
        "invalidCount" INTEGER NOT NULL DEFAULT 0,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "duplicateStrategy" TEXT NOT NULL DEFAULT 'SKIP',
        "mappings" TEXT,
        "reportPath" TEXT,
        "errorLog" TEXT,
        "summary" TEXT,
        "createdBy" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await prisma_1.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_status_idx" ON "ImportJob"("status");`);
        await prisma_1.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");`);
    }
    catch (err) {
        console.warn('[ImportJob Table Ensure Notice]:', err);
    }
};
exports.ensureImportJobTable = ensureImportJobTable;
// GET /api/admin/smart-import/target-fields
const getTargetFieldsHandler = async (_req, res) => {
    return (0, response_1.sendSuccess)(res, { fields: aiImport_service_1.TARGET_FIELDS });
};
exports.getTargetFieldsHandler = getTargetFieldsHandler;
// GET /api/admin/smart-import/download-template
const downloadTemplateHandler = async (_req, res, next) => {
    try {
        const buffer = aiImport_service_1.AIImportService.generateSampleTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="CareerWings_Candidate_Import_Template.xlsx"');
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
    }
    catch (err) {
        next(err);
    }
};
exports.downloadTemplateHandler = downloadTemplateHandler;
// POST /api/admin/smart-import/upload
const uploadAndPreviewHandler = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errors_1.AppError('No spreadsheet file uploaded. Please upload a .xlsx, .xls, .csv, or .ods file.', 400);
        }
        const filePath = req.file.path;
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const originalName = req.file.originalname;
        const fileSize = req.file.size;
        const tempFileId = path_1.default.basename(filePath);
        // 1. Parse spreadsheet into sheets and rows
        const { sheets, selectedSheet, headers, rawRows } = aiImport_service_1.AIImportService.parseUploadedFile(fileBuffer);
        if (rawRows.length === 0) {
            throw new errors_1.AppError('The selected spreadsheet contains no data rows.', 400);
        }
        // 2. Auto-detect column mappings using AI synonym matching + heuristics
        const { mappings, confidence, unmapped } = aiImport_service_1.AIImportService.autoDetectColumnMapping(headers, rawRows);
        // 3. Process first 25 rows for live interactive preview
        const previewSampleCount = Math.min(25, rawRows.length);
        const previewCleaned = [];
        let validSampleCount = 0;
        let invalidPhoneCount = 0;
        let invalidEmailCount = 0;
        for (let i = 0; i < previewSampleCount; i++) {
            const cleaned = aiImport_service_1.AIImportService.cleanAndValidateRow(rawRows[i], mappings, i + 1);
            if (cleaned.isValid)
                validSampleCount++;
            if (!cleaned.data.isPhoneValid)
                invalidPhoneCount++;
            if (!cleaned.data.isEmailValid && !cleaned.data.isGeneratedEmail)
                invalidEmailCount++;
            previewCleaned.push(cleaned.data);
        }
        // 4. Duplicate check on preview sample
        const { duplicateMap, duplicateCount } = await aiImport_service_1.AIImportService.checkDuplicates(previewCleaned);
        const previewRows = previewCleaned.map((row, idx) => {
            const dupInfo = duplicateMap.get(idx);
            let status = 'READY';
            if (dupInfo?.isDuplicate) {
                status = 'DUPLICATE';
            }
            else if (!row.isPhoneValid && !row.isEmailValid) {
                status = 'INVALID';
            }
            return {
                ...row,
                status,
                duplicateInfo: dupInfo,
            };
        });
        return (0, response_1.sendSuccess)(res, {
            tempFileId,
            originalName,
            fileSize,
            sheets,
            selectedSheet,
            headers,
            mappings,
            confidence,
            unmapped,
            totalRows: rawRows.length,
            previewRows,
            stats: {
                totalRows: rawRows.length,
                previewCount: previewSampleCount,
                validSampleCount,
                duplicateSampleCount: duplicateCount,
                invalidPhoneCount,
                invalidEmailCount,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.uploadAndPreviewHandler = uploadAndPreviewHandler;
// POST /api/admin/smart-import/parse-sheet
const parseSheetHandler = async (req, res, next) => {
    try {
        const { tempFileId, sheetName } = req.body;
        if (!tempFileId || !sheetName) {
            throw new errors_1.AppError('tempFileId and sheetName are required.', 400);
        }
        const filePath = path_1.default.join(importsDir, tempFileId);
        if (!fs_1.default.existsSync(filePath)) {
            throw new errors_1.AppError('Uploaded file not found or expired. Please upload again.', 404);
        }
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const { sheets, selectedSheet, headers, rawRows } = aiImport_service_1.AIImportService.parseUploadedFile(fileBuffer, sheetName);
        const { mappings, confidence, unmapped } = aiImport_service_1.AIImportService.autoDetectColumnMapping(headers, rawRows);
        const previewSampleCount = Math.min(25, rawRows.length);
        const previewCleaned = [];
        for (let i = 0; i < previewSampleCount; i++) {
            const cleaned = aiImport_service_1.AIImportService.cleanAndValidateRow(rawRows[i], mappings, i + 1);
            previewCleaned.push(cleaned.data);
        }
        const { duplicateMap } = await aiImport_service_1.AIImportService.checkDuplicates(previewCleaned);
        const previewRows = previewCleaned.map((row, idx) => {
            const dupInfo = duplicateMap.get(idx);
            let status = 'READY';
            if (dupInfo?.isDuplicate) {
                status = 'DUPLICATE';
            }
            else if (!row.isPhoneValid && !row.isEmailValid) {
                status = 'INVALID';
            }
            return {
                ...row,
                status,
                duplicateInfo: dupInfo,
            };
        });
        return (0, response_1.sendSuccess)(res, {
            sheets,
            selectedSheet,
            headers,
            mappings,
            confidence,
            unmapped,
            totalRows: rawRows.length,
            previewRows,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.parseSheetHandler = parseSheetHandler;
// POST /api/admin/smart-import/execute
const executeImportHandler = async (req, res, next) => {
    try {
        const { tempFileId, sheetName, mappings, duplicateStrategy = 'SKIP' } = req.body;
        if (!tempFileId) {
            throw new errors_1.AppError('tempFileId is required to execute import.', 400);
        }
        if (!mappings || typeof mappings !== 'object') {
            throw new errors_1.AppError('Column mappings are required.', 400);
        }
        const filePath = path_1.default.join(importsDir, tempFileId);
        if (!fs_1.default.existsSync(filePath)) {
            throw new errors_1.AppError('Uploaded file not found or session expired. Please re-upload.', 404);
        }
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const { selectedSheet, rawRows } = aiImport_service_1.AIImportService.parseUploadedFile(fileBuffer, sheetName);
        if (rawRows.length === 0) {
            throw new errors_1.AppError('No data rows found in this sheet.', 400);
        }
        // Ensure ImportJob table exists in current database before creating record
        await (0, exports.ensureImportJobTable)();
        // Create persistent ImportJob
        const job = await prisma_1.prisma.importJob.create({
            data: {
                fileName: tempFileId,
                fileSize: fs_1.default.statSync(filePath).size,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                filePath,
                status: 'PROCESSING',
                totalRows: rawRows.length,
                processedRows: 0,
                duplicateStrategy,
                mappings: JSON.stringify(mappings),
                createdBy: req.user?.id || 'admin',
            },
        });
        // Start background processing so response returns immediately and UI can track progress
        setImmediate(async () => {
            try {
                await runBatchImport(job.id, rawRows, mappings, duplicateStrategy, tempFileId);
            }
            catch (err) {
                console.error(`❌ Background Import Job #${job.id} failed:`, err);
                await prisma_1.prisma.importJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'FAILED',
                        errorLog: JSON.stringify([err?.message || String(err)]),
                    },
                });
            }
        });
        return (0, response_1.sendSuccess)(res, {
            jobId: job.id,
            status: 'PROCESSING',
            totalRows: rawRows.length,
            message: 'Candidate database import started in the background.',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.executeImportHandler = executeImportHandler;
// Background chunked processing function
async function runBatchImport(jobId, rawRows, mappings, duplicateStrategy, originalFileName) {
    const CHUNK_SIZE = 500;
    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;
    let failedCount = 0;
    const successRecords = [];
    const skippedRecords = [];
    const failedRecords = [];
    // Generate standard default candidate password hash once for maximum bulk performance
    const defaultPasswordHash = await bcryptjs_1.default.hash('Candidate@123', 10);
    for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
        const chunk = rawRows.slice(i, i + CHUNK_SIZE);
        for (let c = 0; c < chunk.length; c++) {
            const rowIndex = i + c + 1;
            const rawRow = chunk[c];
            try {
                const cleaned = aiImport_service_1.AIImportService.cleanAndValidateRow(rawRow, mappings, rowIndex);
                const { data, isValid, errors } = cleaned;
                if (!isValid) {
                    invalidCount++;
                    failedRecords.push({
                        Row: rowIndex,
                        Name: data.fullName,
                        Phone: data.phone,
                        Email: data.email,
                        Reason: errors.join(', ') || 'Invalid phone and email',
                    });
                    continue;
                }
                // Duplicate check against database
                let existingUser = null;
                let existingCandidate = null;
                if (data.phone) {
                    existingCandidate = await prisma_1.prisma.candidate.findFirst({
                        where: { phone: data.phone },
                        include: { user: true },
                    });
                    if (existingCandidate) {
                        existingUser = existingCandidate.user;
                    }
                }
                if (!existingCandidate && data.email && !data.isGeneratedEmail) {
                    existingUser = await prisma_1.prisma.user.findUnique({
                        where: { email: data.email },
                        include: { candidate: true },
                    });
                    if (existingUser?.candidate) {
                        existingCandidate = existingUser.candidate;
                    }
                }
                const isDuplicate = !!existingCandidate;
                if (isDuplicate) {
                    if (duplicateStrategy === 'SKIP') {
                        skippedCount++;
                        skippedRecords.push({
                            Row: rowIndex,
                            Name: data.fullName,
                            Phone: data.phone,
                            Email: data.email,
                            Reason: `Duplicate candidate already registered (ID: ${existingCandidate.id})`,
                        });
                        continue;
                    }
                    if (duplicateStrategy === 'UPDATE') {
                        // Update non-blank fields only to avoid wiping existing candidate data!
                        const updatePayload = {};
                        if (data.firstName && (!existingCandidate.firstName || existingCandidate.firstName === 'Candidate')) {
                            updatePayload.firstName = data.firstName;
                        }
                        if (data.lastName && (!existingCandidate.lastName || existingCandidate.lastName === '.')) {
                            updatePayload.lastName = data.lastName;
                        }
                        if (data.gender && !existingCandidate.gender)
                            updatePayload.gender = data.gender;
                        if (data.dateOfBirth && !existingCandidate.dateOfBirth)
                            updatePayload.dateOfBirth = data.dateOfBirth;
                        if (data.currentLocation && !existingCandidate.currentLocation)
                            updatePayload.currentLocation = data.currentLocation;
                        if (data.city && !existingCandidate.city)
                            updatePayload.city = data.city;
                        if (data.state && !existingCandidate.state)
                            updatePayload.state = data.state;
                        if (data.currentRole && !existingCandidate.currentRole)
                            updatePayload.currentRole = data.currentRole;
                        if (data.currentCompany && !existingCandidate.currentCompany)
                            updatePayload.currentCompany = data.currentCompany;
                        if (data.highestDegree && !existingCandidate.highestDegree)
                            updatePayload.highestDegree = data.highestDegree;
                        if (data.college && !existingCandidate.college)
                            updatePayload.college = data.college;
                        if (data.totalExperience && !existingCandidate.totalExperience)
                            updatePayload.totalExperience = data.totalExperience;
                        if (data.currentSalary && !existingCandidate.currentSalary)
                            updatePayload.currentSalary = data.currentSalary;
                        if (data.expectedSalary && !existingCandidate.expectedSalaryMin)
                            updatePayload.expectedSalaryMin = data.expectedSalary;
                        if (data.preferredLocations && !existingCandidate.preferredLocations)
                            updatePayload.preferredLocations = data.preferredLocations;
                        if (data.summary && !existingCandidate.summary)
                            updatePayload.summary = data.summary;
                        if (Object.keys(updatePayload).length > 0) {
                            await prisma_1.prisma.candidate.update({
                                where: { id: existingCandidate.id },
                                data: updatePayload,
                            });
                        }
                        updatedCount++;
                        successRecords.push({
                            Row: rowIndex,
                            Name: data.fullName,
                            Phone: data.phone,
                            Email: data.email,
                            Action: 'UPDATED',
                            Details: 'Existing record updated with new info',
                        });
                        continue;
                    }
                    // If strategy is IMPORT_NEW, we create a fresh candidate.
                    // If email is already taken by User table, make a unique alias
                    if (existingUser) {
                        data.email = `candidate.${data.phone || Date.now()}.${Math.round(Math.random() * 10000)}@candidate.careerwings.in`;
                    }
                }
                // Create new candidate and user
                let userEmail = data.email;
                // Verify unique email in User table
                const emailCheck = await prisma_1.prisma.user.findUnique({ where: { email: userEmail } });
                if (emailCheck) {
                    userEmail = `candidate.${data.phone || Date.now()}.${Math.round(Math.random() * 10000)}@candidate.careerwings.in`;
                }
                const newUser = await prisma_1.prisma.user.create({
                    data: {
                        email: userEmail,
                        passwordHash: defaultPasswordHash,
                        role: 'CANDIDATE',
                        isActive: true,
                        isVerified: true,
                    },
                });
                const newCandidate = await prisma_1.prisma.candidate.create({
                    data: {
                        userId: newUser.id,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phone: data.phone || null,
                        gender: data.gender || null,
                        dateOfBirth: data.dateOfBirth || null,
                        currentLocation: data.currentLocation || null,
                        city: data.city || null,
                        state: data.state || null,
                        country: 'India',
                        currentRole: data.currentRole || null,
                        currentCompany: data.currentCompany || null,
                        highestDegree: data.highestDegree || null,
                        college: data.college || null,
                        totalExperience: data.totalExperience || 0,
                        currentSalary: data.currentSalary || null,
                        expectedSalaryMin: data.expectedSalary || null,
                        preferredLocations: data.preferredLocations || null,
                        summary: data.summary || null,
                        headline: data.currentRole ? `${data.currentRole} at ${data.currentCompany || 'Company'}` : null,
                        noticePeriod: data.noticePeriod || null,
                        availabilityStatus: 'ACTIVELY_LOOKING',
                        profileCompletion: 70,
                    },
                });
                // Add skills if provided
                if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
                    for (const skillName of data.skills.slice(0, 10)) {
                        const cleanSkill = skillName.trim();
                        if (!cleanSkill || (0, aiImport_service_1.isInvalidOrJunkSkill)(cleanSkill))
                            continue;
                        const skillSlug = (0, slugify_1.default)(cleanSkill, { lower: true, strict: true }) || cleanSkill.toLowerCase();
                        const skill = await prisma_1.prisma.skill.upsert({
                            where: { slug: skillSlug },
                            update: {},
                            create: { name: cleanSkill, slug: skillSlug },
                        });
                        await prisma_1.prisma.candidateSkill.upsert({
                            where: {
                                id: `${newCandidate.id}_${skill.id}`,
                            },
                            update: {},
                            create: {
                                id: `${newCandidate.id}_${skill.id}`,
                                candidateId: newCandidate.id,
                                skillId: skill.id,
                                proficiency: 'INTERMEDIATE',
                            },
                        }).catch(() => { });
                    }
                }
                // Add Education if highestDegree provided
                if (data.highestDegree) {
                    await prisma_1.prisma.education.create({
                        data: {
                            candidateId: newCandidate.id,
                            institution: data.college || 'University / Institution',
                            degree: data.highestDegree,
                            startYear: data.passingYear ? data.passingYear - 3 : 2018,
                            endYear: data.passingYear || 2021,
                        },
                    }).catch(() => { });
                }
                // Add Experience if currentRole / company provided
                if (data.currentRole || data.currentCompany) {
                    await prisma_1.prisma.experience.create({
                        data: {
                            candidateId: newCandidate.id,
                            company: data.currentCompany || 'Previous Organization',
                            title: data.currentRole || 'Designation',
                            startDate: '2022-01-01',
                            isCurrent: true,
                        },
                    }).catch(() => { });
                }
                successCount++;
                successRecords.push({
                    Row: rowIndex,
                    Name: data.fullName,
                    Phone: data.phone,
                    Email: userEmail,
                    Action: 'IMPORTED',
                    Details: `${data.currentRole || 'Candidate'} - ${data.currentLocation || 'India'}`,
                });
            }
            catch (err) {
                failedCount++;
                failedRecords.push({
                    Row: rowIndex,
                    Name: rawRow.Name || rawRow['Candidate Name'] || 'Candidate',
                    Error: err?.message || String(err),
                });
            }
        }
        // Periodic progress update in DB
        const processed = Math.min(i + CHUNK_SIZE, rawRows.length);
        await prisma_1.prisma.importJob.update({
            where: { id: jobId },
            data: {
                processedRows: processed,
                successCount,
                updatedCount,
                skippedCount,
                invalidCount,
                failedCount,
            },
        });
    }
    // Generate downloadable Excel report
    const reportBuffer = aiImport_service_1.AIImportService.generateExcelReport({
        fileName: originalFileName,
        totalRows: rawRows.length,
        successCount,
        updatedCount,
        skippedCount,
        invalidCount,
        failedCount,
        duplicateStrategy,
        createdAt: new Date(),
    }, successRecords, skippedRecords, failedRecords);
    const reportFileName = `import_report_${jobId}.xlsx`;
    const reportPath = path_1.default.join(reportsDir, reportFileName);
    fs_1.default.writeFileSync(reportPath, reportBuffer);
    // Mark job COMPLETED
    await prisma_1.prisma.importJob.update({
        where: { id: jobId },
        data: {
            status: 'COMPLETED',
            processedRows: rawRows.length,
            successCount,
            updatedCount,
            skippedCount,
            invalidCount,
            failedCount,
            reportPath,
            summary: JSON.stringify({
                total: rawRows.length,
                success: successCount,
                updated: updatedCount,
                skipped: skippedCount,
                invalid: invalidCount,
                failed: failedCount,
                completedAt: new Date().toISOString(),
            }),
        },
    });
    console.log(`✅ AI Import Job #${jobId} completed! Success: ${successCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
}
// GET /api/admin/smart-import/job/:id
const getJobProgressHandler = async (req, res, next) => {
    try {
        await (0, exports.ensureImportJobTable)();
        const job = await prisma_1.prisma.importJob.findUnique({
            where: { id: req.params.id },
        });
        if (!job) {
            throw new errors_1.AppError('Import job not found.', 404);
        }
        return (0, response_1.sendSuccess)(res, { job });
    }
    catch (err) {
        next(err);
    }
};
exports.getJobProgressHandler = getJobProgressHandler;
// GET /api/admin/smart-import/history
const getImportHistoryHandler = async (req, res, next) => {
    try {
        await (0, exports.ensureImportJobTable)();
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const [total, jobs] = await Promise.all([
            prisma_1.prisma.importJob.count(),
            prisma_1.prisma.importJob.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return (0, response_1.sendSuccess)(res, {
            jobs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getImportHistoryHandler = getImportHistoryHandler;
// GET /api/admin/smart-import/report/:id
const downloadReportHandler = async (req, res, next) => {
    try {
        const job = await prisma_1.prisma.importJob.findUnique({
            where: { id: req.params.id },
        });
        if (!job || !job.reportPath || !fs_1.default.existsSync(job.reportPath)) {
            throw new errors_1.AppError('Report file not found or import has not completed yet.', 404);
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Import_Report_${job.id}.xlsx"`);
        const fileStream = fs_1.default.createReadStream(job.reportPath);
        return fileStream.pipe(res);
    }
    catch (err) {
        next(err);
    }
};
exports.downloadReportHandler = downloadReportHandler;
// GET /api/admin/smart-import/original/:id
const downloadOriginalFileHandler = async (req, res, next) => {
    try {
        const job = await prisma_1.prisma.importJob.findUnique({
            where: { id: req.params.id },
        });
        if (!job || !job.filePath || !fs_1.default.existsSync(job.filePath)) {
            throw new errors_1.AppError('Original file not found.', 404);
        }
        res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
        const fileStream = fs_1.default.createReadStream(job.filePath);
        return fileStream.pipe(res);
    }
    catch (err) {
        next(err);
    }
};
exports.downloadOriginalFileHandler = downloadOriginalFileHandler;
//# sourceMappingURL=adminImport.controller.js.map