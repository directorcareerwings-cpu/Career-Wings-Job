"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadsheetUpload = exports.employerCompanyLogoUpload = exports.companyLogoUpload = exports.heroImageUpload = exports.candidatePhotoUpload = exports.imageUpload = exports.resumeUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errors_1 = require("../lib/errors");
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10);
// Ensure upload directories exist
const resumeDir = path_1.default.join(process.cwd(), uploadDir, 'resumes');
const imageDir = path_1.default.join(process.cwd(), uploadDir, 'images');
[resumeDir, imageDir].forEach((dir) => {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
});
// Resume storage
const resumeStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, resumeDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `resume-${uniqueSuffix}${path_1.default.extname(file.originalname).toLowerCase()}`);
    },
});
// Image storage
const imageStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, imageDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `img-${uniqueSuffix}${path_1.default.extname(file.originalname).toLowerCase()}`);
    },
});
// Resume file filter
const resumeFilter = (_req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new errors_1.AppError('Only PDF, DOC, and DOCX files are allowed for resumes.', 400), false);
    }
};
// Image file filter
const imageFilter = (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/pjpeg', 'image/x-png', 'image/jpg'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || allowedExts.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new errors_1.AppError('Only JPG, PNG, and WEBP images are allowed.', 400), false);
    }
};
exports.resumeUpload = (0, multer_1.default)({
    storage: resumeStorage,
    fileFilter: resumeFilter,
    limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
}).single('resume');
exports.imageUpload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for company images
}).single('image');
exports.candidatePhotoUpload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for candidate profile photo
}).any();
exports.heroImageUpload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for high-res hero banners
}).single('image');
exports.companyLogoUpload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
}).any();
exports.employerCompanyLogoUpload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max size strictly enforced
}).any();
// Spreadsheet storage for AI Smart Import
const importDir = path_1.default.join(process.cwd(), uploadDir, 'imports');
const reportDir = path_1.default.join(process.cwd(), uploadDir, 'reports');
[importDir, reportDir].forEach((dir) => {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
});
const spreadsheetStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, importDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `import-${uniqueSuffix}${ext}`);
    },
});
const spreadsheetFilter = (_req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls', '.csv', '.ods'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new errors_1.AppError('Only .xlsx, .xls, .csv, and .ods files are supported for import.', 400), false);
    }
};
exports.spreadsheetUpload = (0, multer_1.default)({
    storage: spreadsheetStorage,
    fileFilter: spreadsheetFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}).single('file');
//# sourceMappingURL=upload.js.map