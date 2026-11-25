import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { prisma, isMysqlConfigured, getPersistentUploadsDir } from '../lib/prisma';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';
import {
  AIImportService,
  TARGET_FIELDS,
  cleanPhoneNumber,
  cleanEmail,
  isInvalidOrJunkSkill,
  sanitizeCleanText,
} from '../services/aiImport.service';

const persistentUploads = getPersistentUploadsDir();
const importsDir = persistentUploads.imports;
const reportsDir = persistentUploads.reports;

// Ensure directories exist
[importsDir, reportsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Ensure ImportJob table exists in SQLite database (zero-dependency fail-safe)
 */
export const ensureImportJobTable = async (): Promise<void> => {
  if (isMysqlConfigured()) return;
  try {
    await prisma.$executeRawUnsafe(`
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
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_status_idx" ON "ImportJob"("status");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");`);
  } catch (err) {
    console.warn('[ImportJob Table Ensure Notice]:', err);
  }
};

// GET /api/admin/smart-import/target-fields
export const getTargetFieldsHandler = async (_req: Request, res: Response) => {
  return sendSuccess(res, { fields: TARGET_FIELDS });
};

// GET /api/admin/smart-import/download-template
export const downloadTemplateHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = AIImportService.generateSampleTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="CareerWings_Candidate_Import_Template.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/smart-import/upload
export const uploadAndPreviewHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No spreadsheet file uploaded. Please upload a .xlsx, .xls, .csv, or .ods file.', 400);
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const tempFileId = path.basename(filePath);

    // 1. Parse spreadsheet into sheets and rows
    const { sheets, selectedSheet, headers, rawRows } = AIImportService.parseUploadedFile(fileBuffer);

    if (rawRows.length === 0) {
      throw new AppError('The selected spreadsheet contains no data rows.', 400);
    }

    // 2. Auto-detect column mappings using AI synonym matching + heuristics
    const { mappings, confidence, unmapped } = AIImportService.autoDetectColumnMapping(headers, rawRows);

    // 3. Process first 25 rows for live interactive preview
    const previewSampleCount = Math.min(25, rawRows.length);
    const previewCleaned: any[] = [];
    let validSampleCount = 0;
    let invalidPhoneCount = 0;
    let invalidEmailCount = 0;

    for (let i = 0; i < previewSampleCount; i++) {
      const cleaned = AIImportService.cleanAndValidateRow(rawRows[i], mappings, i + 1);
      if (cleaned.isValid) validSampleCount++;
      if (!cleaned.data.isPhoneValid) invalidPhoneCount++;
      if (!cleaned.data.isEmailValid && !cleaned.data.isGeneratedEmail) invalidEmailCount++;
      previewCleaned.push(cleaned.data);
    }

    // 4. Duplicate check on preview sample
    const { duplicateMap, duplicateCount } = await AIImportService.checkDuplicates(previewCleaned);

    const previewRows = previewCleaned.map((row, idx) => {
      const dupInfo = duplicateMap.get(idx);
      let status: 'READY' | 'DUPLICATE' | 'INVALID' = 'READY';
      if (dupInfo?.isDuplicate) {
        status = 'DUPLICATE';
      } else if (!row.isPhoneValid && !row.isEmailValid) {
        status = 'INVALID';
      }
      return {
        ...row,
        status,
        duplicateInfo: dupInfo,
      };
    });

    return sendSuccess(res, {
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
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/smart-import/parse-sheet
export const parseSheetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempFileId, sheetName } = req.body;
    if (!tempFileId || !sheetName) {
      throw new AppError('tempFileId and sheetName are required.', 400);
    }

    const filePath = path.join(importsDir, tempFileId);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Uploaded file not found or expired. Please upload again.', 404);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const { sheets, selectedSheet, headers, rawRows } = AIImportService.parseUploadedFile(fileBuffer, sheetName);
    const { mappings, confidence, unmapped } = AIImportService.autoDetectColumnMapping(headers, rawRows);

    const previewSampleCount = Math.min(25, rawRows.length);
    const previewCleaned: any[] = [];
    for (let i = 0; i < previewSampleCount; i++) {
      const cleaned = AIImportService.cleanAndValidateRow(rawRows[i], mappings, i + 1);
      previewCleaned.push(cleaned.data);
    }

    const { duplicateMap } = await AIImportService.checkDuplicates(previewCleaned);
    const previewRows = previewCleaned.map((row, idx) => {
      const dupInfo = duplicateMap.get(idx);
      let status: 'READY' | 'DUPLICATE' | 'INVALID' = 'READY';
      if (dupInfo?.isDuplicate) {
        status = 'DUPLICATE';
      } else if (!row.isPhoneValid && !row.isEmailValid) {
        status = 'INVALID';
      }
      return {
        ...row,
        status,
        duplicateInfo: dupInfo,
      };
    });

    return sendSuccess(res, {
      sheets,
      selectedSheet,
      headers,
      mappings,
      confidence,
      unmapped,
      totalRows: rawRows.length,
      previewRows,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/smart-import/execute
export const executeImportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempFileId, sheetName, mappings, duplicateStrategy = 'SKIP' } = req.body;
    if (!tempFileId) {
      throw new AppError('tempFileId is required to execute import.', 400);
    }
    if (!mappings || typeof mappings !== 'object') {
      throw new AppError('Column mappings are required.', 400);
    }

    const filePath = path.join(importsDir, tempFileId);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Uploaded file not found or session expired. Please re-upload.', 404);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const { selectedSheet, rawRows } = AIImportService.parseUploadedFile(fileBuffer, sheetName);

    if (rawRows.length === 0) {
      throw new AppError('No data rows found in this sheet.', 400);
    }

    // Ensure ImportJob table exists in current database before creating record
    await ensureImportJobTable();

    // Create persistent ImportJob
    const job = await prisma.importJob.create({
      data: {
        fileName: tempFileId,
        fileSize: fs.statSync(filePath).size,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filePath,
        status: 'PROCESSING',
        totalRows: rawRows.length,
        processedRows: 0,
        duplicateStrategy,
        mappings: JSON.stringify(mappings),
        createdBy: (req as any).user?.id || 'admin',
      },
    });

    // Start background processing so response returns immediately and UI can track progress
    setImmediate(async () => {
      try {
        await runBatchImport(job.id, rawRows, mappings, duplicateStrategy, tempFileId);
      } catch (err: any) {
        console.error(`❌ Background Import Job #${job.id} failed:`, err);
        await prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorLog: JSON.stringify([err?.message || String(err)]),
          },
        });
      }
    });

    return sendSuccess(res, {
      jobId: job.id,
      status: 'PROCESSING',
      totalRows: rawRows.length,
      message: 'Candidate database import started in the background.',
    });
  } catch (err) {
    next(err);
  }
};

// Background chunked processing function
async function runBatchImport(
  jobId: string,
  rawRows: Record<string, any>[],
  mappings: Record<string, string>,
  duplicateStrategy: string,
  originalFileName: string
) {
  const CHUNK_SIZE = 500;
  let successCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;
  let failedCount = 0;

  const successRecords: any[] = [];
  const skippedRecords: any[] = [];
  const failedRecords: any[] = [];

  // Generate standard default candidate password hash once for maximum bulk performance
  const defaultPasswordHash = await bcrypt.hash('Candidate@123', 10);

  for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
    const chunk = rawRows.slice(i, i + CHUNK_SIZE);

    for (let c = 0; c < chunk.length; c++) {
      const rowIndex = i + c + 1;
      const rawRow = chunk[c];

      try {
        const cleaned = AIImportService.cleanAndValidateRow(rawRow, mappings, rowIndex);
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
          existingCandidate = await prisma.candidate.findFirst({
            where: { phone: data.phone },
            include: { user: true },
          });
          if (existingCandidate) {
            existingUser = existingCandidate.user;
          }
        }

        if (!existingCandidate && data.email && !data.isGeneratedEmail) {
          existingUser = await prisma.user.findUnique({
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
            const updatePayload: Record<string, any> = {};
            if (data.firstName && (!existingCandidate.firstName || existingCandidate.firstName === 'Candidate')) {
              updatePayload.firstName = data.firstName;
            }
            if (data.lastName && (!existingCandidate.lastName || existingCandidate.lastName === '.')) {
              updatePayload.lastName = data.lastName;
            }
            if (data.gender && !existingCandidate.gender) updatePayload.gender = data.gender;
            if (data.dateOfBirth && !existingCandidate.dateOfBirth) updatePayload.dateOfBirth = data.dateOfBirth;
            if (data.currentLocation && !existingCandidate.currentLocation) updatePayload.currentLocation = data.currentLocation;
            if (data.city && !existingCandidate.city) updatePayload.city = data.city;
            if (data.state && !existingCandidate.state) updatePayload.state = data.state;
            if (data.currentRole && !existingCandidate.currentRole) updatePayload.currentRole = data.currentRole;
            else if (data.jobAppliedFor && !existingCandidate.currentRole) updatePayload.currentRole = data.jobAppliedFor;
            if (data.currentCompany && !existingCandidate.currentCompany) updatePayload.currentCompany = data.currentCompany;
            if (data.highestDegree && !existingCandidate.highestDegree) updatePayload.highestDegree = data.highestDegree;
            if (data.college && !existingCandidate.college) updatePayload.college = data.college;
            if (data.totalExperience && !existingCandidate.totalExperience) updatePayload.totalExperience = data.totalExperience;
            if (data.currentSalary && !existingCandidate.currentSalary) updatePayload.currentSalary = data.currentSalary;
            if (data.expectedSalary && !existingCandidate.expectedSalaryMin) updatePayload.expectedSalaryMin = data.expectedSalary;
            if (data.preferredLocations && !existingCandidate.preferredLocations) updatePayload.preferredLocations = data.preferredLocations;
            if (data.jobAppliedFor && !existingCandidate.headline) {
              updatePayload.headline = `Applied for: ${data.jobAppliedFor}`;
            }
            if (data.summary && !existingCandidate.summary) {
              updatePayload.summary = data.jobAppliedFor ? `${data.summary} | Job Applied For: ${data.jobAppliedFor}` : data.summary;
            } else if (data.jobAppliedFor && !existingCandidate.summary) {
              updatePayload.summary = `Job Applied For: ${data.jobAppliedFor}`;
            }

            if (Object.keys(updatePayload).length > 0) {
              await prisma.candidate.update({
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
        const emailCheck = await prisma.user.findUnique({ where: { email: userEmail } });
        if (emailCheck) {
          userEmail = `candidate.${data.phone || Date.now()}.${Math.round(Math.random() * 10000)}@candidate.careerwings.in`;
        }

        const newUser = await prisma.user.create({
          data: {
            email: userEmail,
            passwordHash: defaultPasswordHash,
            role: 'CANDIDATE',
            isActive: true,
            isVerified: true,
          },
        });

        const newCandidate = await prisma.candidate.create({
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
            currentRole: data.currentRole || data.jobAppliedFor || null,
            currentCompany: data.currentCompany || null,
            highestDegree: data.highestDegree || null,
            college: data.college || null,
            totalExperience: data.totalExperience || 0,
            currentSalary: data.currentSalary || null,
            expectedSalaryMin: data.expectedSalary || null,
            preferredLocations: data.preferredLocations || null,
            summary: data.summary
              ? (data.jobAppliedFor ? `${data.summary} | Job Applied For: ${data.jobAppliedFor}` : data.summary)
              : (data.jobAppliedFor ? `Job Applied For: ${data.jobAppliedFor}` : null),
            headline: data.currentRole
              ? `${data.currentRole} at ${data.currentCompany || 'Company'}`
              : (data.jobAppliedFor ? `Applied for: ${data.jobAppliedFor}` : null),
            noticePeriod: data.noticePeriod || null,
            availabilityStatus: 'ACTIVELY_LOOKING',
            profileCompletion: 70,
          },
        });

        // Add skills if provided
        if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
          for (const skillName of data.skills.slice(0, 10)) {
            const cleanSkill = skillName.trim();
            if (!cleanSkill || isInvalidOrJunkSkill(cleanSkill)) continue;
            const skillSlug = slugify(cleanSkill, { lower: true, strict: true }) || cleanSkill.toLowerCase();
            const skill = await prisma.skill.upsert({
              where: { slug: skillSlug },
              update: {},
              create: { name: cleanSkill, slug: skillSlug },
            });
            await prisma.candidateSkill.upsert({
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
          await prisma.education.create({
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
          await prisma.experience.create({
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
      } catch (err: any) {
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
    await prisma.importJob.update({
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
  const reportBuffer = AIImportService.generateExcelReport(
    {
      fileName: originalFileName,
      totalRows: rawRows.length,
      successCount,
      updatedCount,
      skippedCount,
      invalidCount,
      failedCount,
      duplicateStrategy,
      createdAt: new Date(),
    },
    successRecords,
    skippedRecords,
    failedRecords
  );

  const reportFileName = `import_report_${jobId}.xlsx`;
  const reportPath = path.join(reportsDir, reportFileName);
  fs.writeFileSync(reportPath, reportBuffer);

  // Mark job COMPLETED
  await prisma.importJob.update({
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
export const getJobProgressHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureImportJobTable();
    const job = await prisma.importJob.findUnique({
      where: { id: req.params.id },
    });
    if (!job) {
      throw new AppError('Import job not found.', 404);
    }
    return sendSuccess(res, { job });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/smart-import/history
export const getImportHistoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureImportJobTable();
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, jobs] = await Promise.all([
      prisma.importJob.count(),
      prisma.importJob.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return sendSuccess(res, {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/smart-import/report/:id
export const downloadReportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.importJob.findUnique({
      where: { id: req.params.id },
    });
    if (!job || !job.reportPath || !fs.existsSync(job.reportPath)) {
      throw new AppError('Report file not found or import has not completed yet.', 404);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Import_Report_${job.id}.xlsx"`);
    const fileStream = fs.createReadStream(job.reportPath);
    return fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/smart-import/original/:id
export const downloadOriginalFileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.importJob.findUnique({
      where: { id: req.params.id },
    });
    if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
      throw new AppError('Original file not found.', 404);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
    const fileStream = fs.createReadStream(job.filePath);
    return fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};
