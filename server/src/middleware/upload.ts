import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../lib/errors';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10);

// Ensure upload directories exist
const resumeDir = path.join(process.cwd(), uploadDir, 'resumes');
const imageDir = path.join(process.cwd(), uploadDir, 'images');
[resumeDir, imageDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Resume storage
const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// Image storage
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, imageDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// Resume file filter
const resumeFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedExts = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF, DOC, and DOCX files are allowed for resumes.', 400) as unknown as null, false);
  }
};

// Image file filter
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/pjpeg', 'image/x-png', 'image/jpg'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype.toLowerCase()) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPG, PNG, and WEBP images are allowed.', 400) as unknown as null, false);
  }
};

export const resumeUpload = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
}).single('resume');

export const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for company images
}).single('image');

export const candidatePhotoUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for candidate profile photo
}).any();

export const heroImageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for high-res hero banners
}).single('image');

export const companyLogoUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();

export const employerCompanyLogoUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max size strictly enforced
}).any();

// Spreadsheet storage for AI Smart Import
const importDir = path.join(process.cwd(), uploadDir, 'imports');
const reportDir = path.join(process.cwd(), uploadDir, 'reports');
[importDir, reportDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const spreadsheetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, importDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import-${uniqueSuffix}${ext}`);
  },
});

const spreadsheetFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExts = ['.xlsx', '.xls', '.csv', '.ods'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Only .xlsx, .xls, .csv, and .ods files are supported for import.', 400) as unknown as null, false);
  }
};

export const spreadsheetUpload = multer({
  storage: spreadsheetStorage,
  fileFilter: spreadsheetFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}).single('file');


