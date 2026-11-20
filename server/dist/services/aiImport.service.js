"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIImportService = exports.TARGET_FIELDS = void 0;
exports.normalizeToken = normalizeToken;
exports.levenshteinDistance = levenshteinDistance;
exports.stringSimilarity = stringSimilarity;
exports.cleanPhoneNumber = cleanPhoneNumber;
exports.cleanEmail = cleanEmail;
exports.isInvalidOrJunkSkill = isInvalidOrJunkSkill;
exports.sanitizeCleanText = sanitizeCleanText;
exports.parseExperience = parseExperience;
exports.parseSalary = parseSalary;
exports.normalizeGender = normalizeGender;
exports.splitFullName = splitFullName;
exports.standardizeQualification = standardizeQualification;
const XLSX = __importStar(require("xlsx"));
const prisma_1 = require("../lib/prisma");
exports.TARGET_FIELDS = [
    {
        field: 'fullName',
        label: 'Full Name',
        description: 'Complete name of candidate',
        required: true,
        synonyms: ['fullname', 'candidatename', 'applicantname', 'name', 'applicant', 'studentname', 'personname', 'jobseeker', 'candidate', 'naam', 'candidatefullname'],
    },
    {
        field: 'firstName',
        label: 'First Name',
        description: 'First or given name',
        synonyms: ['firstname', 'fname', 'givenname', 'first'],
    },
    {
        field: 'lastName',
        label: 'Last Name',
        description: 'Last name or surname',
        synonyms: ['lastname', 'lname', 'surname', 'familyname', 'last'],
    },
    {
        field: 'phone',
        label: 'Mobile / Phone Number',
        description: '10-digit primary mobile number',
        required: true,
        synonyms: ['phone', 'mobile', 'mobileno', 'contact', 'contactno', 'cell', 'cellno', 'whatsapp', 'tel', 'telephone', 'phonenumber', 'mobilenumber', 'primaryphone', 'contactnumber'],
    },
    {
        field: 'alternatePhone',
        label: 'Alternate Mobile',
        description: 'Secondary or alternate contact number',
        synonyms: ['altphone', 'altmobile', 'alternateno', 'secondaryphone', 'alternatemobile', 'emergencycontact', 'altcontact', 'whatsappnumber', 'otherphone'],
    },
    {
        field: 'email',
        label: 'Email Address',
        description: 'Primary email address',
        required: false,
        synonyms: ['email', 'emailid', 'mail', 'mailid', 'emailaddress', 'gmail', 'contactemail', 'candidateemail', 'personalemail'],
    },
    {
        field: 'gender',
        label: 'Gender',
        description: 'Male / Female / Other',
        synonyms: ['gender', 'sex', 'mf'],
    },
    {
        field: 'dateOfBirth',
        label: 'Date of Birth',
        description: 'DOB or birth date',
        synonyms: ['dob', 'dateofbirth', 'birthdate', 'birth', 'd_o_b'],
    },
    {
        field: 'highestDegree',
        label: 'Highest Qualification',
        description: 'E.g. B.Tech, MBA, B.Sc, Diploma, 12th',
        synonyms: ['qualification', 'highestdegree', 'degree', 'course', 'stream', 'education', 'highestqualification', 'academicqualification', 'educationalqualification', 'qual'],
    },
    {
        field: 'educationLevel',
        label: 'Education Level',
        description: 'Bachelor, Master, Doctorate, High School, Diploma',
        synonyms: ['educationlevel', 'levelofeducation', 'gradlevel', 'edu_level'],
    },
    {
        field: 'college',
        label: 'College / University',
        description: 'Institute, University, or College name',
        synonyms: ['college', 'university', 'institute', 'campus', 'institution', 'school', 'collegename', 'universityname', 'collegename_uni'],
    },
    {
        field: 'passingYear',
        label: 'Passing Year',
        description: 'Year of graduation / completion',
        synonyms: ['passingyear', 'yearofpassing', 'yop', 'batch', 'graduationyear', 'passoutyear', 'completionyear', 'passyear'],
    },
    {
        field: 'totalExperience',
        label: 'Total Experience (Years)',
        description: 'Work experience in years (e.g. 2.5)',
        synonyms: ['totalexperience', 'experience', 'workexp', 'exp', 'totalexp', 'yearsofexp', 'yearsofexperience', 'expinyears', 'experienceyears', 'workexperience', 'relexp'],
    },
    {
        field: 'currentRole',
        label: 'Current Role / Designation',
        description: 'Job profile or title (e.g. Sales Executive, Java Developer)',
        synonyms: ['currentrole', 'currentdesignation', 'designation', 'jobprofile', 'role', 'profile', 'position', 'currentposition', 'currenttitle', 'jobtitle', 'post', 'designationrole'],
    },
    {
        field: 'currentCompany',
        label: 'Current Company / Employer',
        description: 'Current or latest organization',
        synonyms: ['currentcompany', 'company', 'organization', 'employer', 'currentemployer', 'firm', 'currentorg', 'companyname', 'currentorganization'],
    },
    {
        field: 'currentSalary',
        label: 'Current Salary / CTC (₹)',
        description: 'Present annual or monthly compensation',
        synonyms: ['currentsalary', 'presentsalary', 'currentctc', 'presentctc', 'existingctc', 'salary', 'ctc', 'annualctc', 'currentpay', 'presentpackage', 'salaryinr'],
    },
    {
        field: 'expectedSalary',
        label: 'Expected Salary / CTC (₹)',
        description: 'Expected compensation',
        synonyms: ['expectedsalary', 'expectedctc', 'targetctc', 'desiredsalary', 'expctc', 'desiredctc', 'expectedpay', 'targetpackage', 'desiredctc'],
    },
    {
        field: 'currentLocation',
        label: 'Current City / Location',
        description: 'City, town, or location (e.g. Guwahati, Shillong, Kolkata)',
        synonyms: ['currentlocation', 'location', 'currentcity', 'city', 'town', 'address', 'nativeplace', 'residence', 'candidatecity', 'currlocation'],
    },
    {
        field: 'state',
        label: 'State',
        description: 'State / Province (e.g. Assam, Meghalaya)',
        synonyms: ['state', 'province', 'region', 'candidatestate'],
    },
    {
        field: 'preferredLocations',
        label: 'Preferred Location(s)',
        description: 'Preferred cities or regions',
        synonyms: ['preferredlocations', 'preferredlocation', 'preferredcity', 'desiredlocation', 'targetlocation', 'joblocation', 'prefcity'],
    },
    {
        field: 'skills',
        label: 'Key Skills',
        description: 'Comma-separated skills (e.g. Excel, Sales, React, Python)',
        synonyms: ['skills', 'keyskills', 'technicalskills', 'itskills', 'corecompetencies', 'technologies', 'skillset', 'competencies', 'techskills'],
    },
    {
        field: 'noticePeriod',
        label: 'Notice Period',
        description: 'Immediate, 15 Days, 30 Days, 60 Days',
        synonyms: ['noticeperiod', 'notice', 'availability', 'daystojoin', 'joinperiod', 'noticeperioddays'],
    },
    {
        field: 'summary',
        label: 'Profile Summary / Headline',
        description: 'Brief career summary or headline',
        synonyms: ['summary', 'headline', 'profilesummary', 'about', 'bio', 'objective', 'profileheadline'],
    },
    {
        field: 'resumeUrl',
        label: 'Resume Link / CV URL',
        description: 'Link to resume or portfolio document',
        synonyms: ['resume', 'cv', 'resumelink', 'resumeurl', 'cvlink', 'portfolio', 'drivefile', 'cvurl'],
    },
    {
        field: 'source',
        label: 'Candidate Source',
        description: 'Source or agency (e.g. Walk-in, Job Fair, Excel Import)',
        synonyms: ['source', 'candidatesource', 'portal', 'vendor', 'campus', 'agency', 'datasource'],
    },
];
// Helper: Normalize string token for fuzzy header matching
function normalizeToken(str) {
    if (!str)
        return '';
    return String(str)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
// Levenshtein distance calculation for spelling mistake detection
function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0)
        return n;
    if (n === 0)
        return m;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return dp[m][n];
}
function stringSimilarity(a, b) {
    const normA = normalizeToken(a);
    const normB = normalizeToken(b);
    if (normA === normB)
        return 1.0;
    if (!normA || !normB)
        return 0.0;
    const maxLen = Math.max(normA.length, normB.length);
    const dist = levenshteinDistance(normA, normB);
    return Math.max(0, (maxLen - dist) / maxLen);
}
// Phone Number Cleaner for Indian & International Numbers
function cleanPhoneNumber(raw) {
    if (!raw)
        return { phone: '', isValid: false };
    let str = String(raw).trim();
    // Strip out spaces, dashes, parentheses, dots
    str = str.replace(/[\s\-\(\)\.]/g, '');
    // Strip country code if +91 or 91 with 12 digits total
    if (str.startsWith('+91') && str.length === 13) {
        str = str.slice(3);
    }
    else if (str.startsWith('91') && str.length === 12) {
        str = str.slice(2);
    }
    else if (str.startsWith('0') && str.length === 11) {
        str = str.slice(1);
    }
    // Pure digits only
    const digitsOnly = str.replace(/\D/g, '');
    // Indian standard valid mobile: 10 digits starting with 6, 7, 8, or 9
    const isIndianMobile = /^[6-9]\d{9}$/.test(digitsOnly);
    const isValidGeneric = digitsOnly.length >= 7 && digitsOnly.length <= 15;
    return {
        phone: digitsOnly || str,
        isValid: isIndianMobile || isValidGeneric,
    };
}
// Email Validator & Cleaner
function cleanEmail(raw) {
    if (!raw)
        return { email: '', isValid: false };
    const str = String(raw).trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(str);
    return { email: str, isValid };
}
// Check if a skill string is actually junk, URL, job link, or section heading
function isInvalidOrJunkSkill(raw) {
    if (!raw)
        return true;
    const s = String(raw).trim();
    if (!s || s.length < 2 || s.length > 50)
        return true;
    const lower = s.toLowerCase();
    // 1. URLs, web addresses, or competitor links
    if (lower.includes('http:') ||
        lower.includes('https:') ||
        lower.includes('apna.co') ||
        lower.includes('employer.apna.co') ||
        lower.includes('naukri.com') ||
        lower.includes('indeed.com') ||
        lower.includes('linkedin.com') ||
        lower.includes('workindia') ||
        lower.includes('www.') ||
        lower.includes('.com') ||
        lower.includes('.in/') ||
        lower.includes('.org') ||
        lower.includes('jobs/') ||
        lower.includes('job/') ||
        /https?:\/\//i.test(s)) {
        return true;
    }
    // 2. Numerical strings, tracking IDs, or URL fragments (e.g. "476774388", "1874907429")
    if (/^\d+$/.test(s) || s.includes('476774388') || s.includes('1874907429')) {
        return true;
    }
    // 3. Section headings, generic column headers, or labels
    const blockedPhrases = [
        'key skills & competencies',
        'key skills and competencies',
        'key skills & competency',
        'key skills',
        'competencies',
        'core competencies',
        'technical skills',
        'it skills',
        'skills & abilities',
        'skills & knowledge',
        'skills',
        'skill',
        'skillset',
        'key competencies',
        'job profile',
        'job details',
        'job description',
        'job link',
        'apna link',
        'application link',
        'candidate skills',
        'all skills',
        'responsibilities',
        'work experience',
        'qualification',
    ];
    if (blockedPhrases.includes(lower)) {
        return true;
    }
    // 4. Must contain at least one letter
    if (!/[a-zA-Z]/.test(s)) {
        return true;
    }
    return false;
}
// Clean text by stripping competitor links, URLs, and junk headings
function sanitizeCleanText(raw) {
    if (!raw)
        return null;
    let str = String(raw).trim();
    // Strip apna links, competitor URLs, tracking URLs
    str = str.replace(/https?:\/\/[^\s]+/gi, '');
    str = str.replace(/https?:\s*[^\s]+/gi, '');
    str = str.replace(/employer\.apna\.co[^\s]*/gi, '');
    str = str.replace(/apna\.co[^\s]*/gi, '');
    str = str.replace(/476774388|1874907429/g, '');
    str = str.replace(/key\s*skills\s*(&|and)?\s*competencies/gi, '');
    str = str.replace(/\s{2,}/g, ' ').trim();
    return str || null;
}
// Experience Parser
function parseExperience(raw) {
    if (raw === null || raw === undefined || raw === '')
        return 0;
    if (typeof raw === 'number')
        return Math.max(0, Number(raw.toFixed(1)));
    const str = String(raw).trim().toLowerCase();
    if (str.includes('fresh') || str === '0' || str === 'none' || str === 'nil')
        return 0;
    // Check for month notation e.g. "36 months" -> 3 years
    const monthMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:month|mth|mo)/i);
    if (monthMatch) {
        const months = parseFloat(monthMatch[1]);
        return Math.max(0, Number((months / 12).toFixed(1)));
    }
    // Check for years notation e.g. "3.5 yrs", "4 years", "2 - 3 yrs"
    const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[-to]+\s*(\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
        const avg = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
        return Math.max(0, Number(avg.toFixed(1)));
    }
    const numMatch = str.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
        return Math.max(0, Number(parseFloat(numMatch[1]).toFixed(1)));
    }
    return 0;
}
// Salary Parser
function parseSalary(raw) {
    if (raw === null || raw === undefined || raw === '')
        return 0;
    if (typeof raw === 'number') {
        if (raw < 100) {
            // Could be LPA e.g. 4.5 -> 450,000
            return Math.round(raw * 100000);
        }
        return Math.round(raw);
    }
    let str = String(raw).trim().toLowerCase().replace(/[,₹]/g, '');
    // E.g. "4.5 lpa", "4.5 lakhs", "4.5 lac", "4.5l"
    const lpaMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lac|lacs|l)/i);
    if (lpaMatch) {
        const lacs = parseFloat(lpaMatch[1]);
        return Math.round(lacs * 100000);
    }
    // E.g. "35k" -> 35,000 monthly or annual
    const kMatch = str.match(/(\d+(?:\.\d+)?)\s*k/i);
    if (kMatch) {
        const val = parseFloat(kMatch[1]) * 1000;
        return Math.round(val);
    }
    // E.g. "25000 / month" -> 300,000
    if (str.includes('/month') || str.includes('per month') || str.includes('p.m') || str.includes('pm')) {
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        if (!isNaN(num))
            return Math.round(num * 12);
    }
    // Standard numeric string
    const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(cleanNum)) {
        if (cleanNum > 0 && cleanNum <= 100) {
            // Assumed in LPA
            return Math.round(cleanNum * 100000);
        }
        return Math.round(cleanNum);
    }
    return 0;
}
// Gender Normalizer
function normalizeGender(raw) {
    if (!raw)
        return null;
    const str = String(raw).trim().toUpperCase();
    if (['M', 'MALE', 'MAN', 'BOY'].includes(str))
        return 'MALE';
    if (['F', 'FEMALE', 'WOMAN', 'GIRL'].includes(str))
        return 'FEMALE';
    if (['O', 'OTHER', 'TRANSGENDER', 'PREFER_NOT_TO_SAY'].includes(str))
        return 'OTHER';
    return null;
}
// Name Splitting Helper
function splitFullName(fullName) {
    if (!fullName)
        return { firstName: 'Candidate', lastName: '.' };
    // Remove salutations: Mr., Ms., Mrs., Dr., etc.
    let clean = fullName.replace(/^(mr\.|mrs\.|ms\.|dr\.|shri|smt\.)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return { firstName: 'Candidate', lastName: '.' };
    if (parts.length === 1)
        return { firstName: parts[0], lastName: '.' };
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
}
// Clean and standardize qualification
function standardizeQualification(raw) {
    if (!raw)
        return '';
    const str = String(raw).trim();
    const lower = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['btech', 'be', 'bacheloroftechnology', 'bachelorofengineering'].includes(lower))
        return 'B.Tech / B.E';
    if (['mtech', 'me', 'masteroftechnology'].includes(lower))
        return 'M.Tech / M.E';
    if (['mca', 'masterofcomputerapplications'].includes(lower))
        return 'MCA';
    if (['bca', 'bachelorofcomputerapplications'].includes(lower))
        return 'BCA';
    if (['mba', 'masterofbusinessadministration', 'pgdm'].includes(lower))
        return 'MBA / PGDM';
    if (['bba', 'bachelorofbusinessadministration'].includes(lower))
        return 'BBA';
    if (['bsc', 'bachelorofscience'].includes(lower))
        return 'B.Sc';
    if (['msc', 'masterofscience'].includes(lower))
        return 'M.Sc';
    if (['bcom', 'bachelorofcommerce'].includes(lower))
        return 'B.Com';
    if (['mcom', 'masterofcommerce'].includes(lower))
        return 'M.Com';
    if (['ba', 'bachelorofarts'].includes(lower))
        return 'B.A';
    if (['ma', 'masterofarts'].includes(lower))
        return 'M.A';
    if (['diploma', 'polytechnic'].includes(lower))
        return 'Diploma';
    if (['12th', 'highersecondary', 'hs', '102', 'inter'].includes(lower))
        return '12th / Higher Secondary';
    if (['10th', 'matric', 'matriculation', 'hslc'].includes(lower))
        return '10th / Matriculation';
    if (['phd', 'doctorate'].includes(lower))
        return 'Ph.D';
    return str;
}
// Core AI Import Service
class AIImportService {
    // Read and parse file buffer into sheets and raw rows
    static parseUploadedFile(buffer, requestedSheet) {
        const workbook = XLSX.read(buffer, {
            type: 'buffer',
            cellDates: true,
            raw: false,
            dense: true,
        });
        const sheets = workbook.SheetNames;
        if (!sheets || sheets.length === 0) {
            throw new Error('The uploaded spreadsheet contains no readable sheets.');
        }
        const selectedSheet = requestedSheet && sheets.includes(requestedSheet) ? requestedSheet : sheets[0];
        const worksheet = workbook.Sheets[selectedSheet];
        if (!worksheet) {
            throw new Error(`Sheet "${selectedSheet}" is empty or could not be read.`);
        }
        // Convert sheet to JSON array of objects
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
            blankrows: false,
        });
        // Detect headers from the first few rows or raw sheet range
        const headers = [];
        if (rawRows.length > 0) {
            const keys = Object.keys(rawRows[0]);
            headers.push(...keys);
        }
        else {
            // Attempt header extraction from worksheet range
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
                if (cell && cell.v)
                    headers.push(String(cell.v).trim());
            }
        }
        return {
            sheets,
            selectedSheet,
            headers: headers.map((h) => String(h).trim()).filter(Boolean),
            rawRows,
        };
    }
    // Automatic AI Column Mapping using Synonyms, Fuzzy Levenshtein, and Sample Heuristics
    static autoDetectColumnMapping(headers, sampleRows = []) {
        const mappings = {};
        const confidence = {};
        const mappedTargets = new Set();
        // Pass 1: Exact and Normalized Synonym Matching
        for (const header of headers) {
            const normHeader = normalizeToken(header);
            if (!normHeader)
                continue;
            let bestMatch = null;
            for (const target of exports.TARGET_FIELDS) {
                if (mappedTargets.has(target.field))
                    continue;
                // Check if normHeader exactly matches any synonym
                for (const syn of target.synonyms) {
                    if (normHeader === syn) {
                        bestMatch = { field: target.field, score: 1.0 };
                        break;
                    }
                    if (normHeader.includes(syn) || syn.includes(normHeader)) {
                        const score = 0.85;
                        if (!bestMatch || score > bestMatch.score) {
                            bestMatch = { field: target.field, score };
                        }
                    }
                    const sim = stringSimilarity(normHeader, syn);
                    if (sim > 0.8 && (!bestMatch || sim > bestMatch.score)) {
                        bestMatch = { field: target.field, score: sim };
                    }
                }
                if (bestMatch && bestMatch.score === 1.0)
                    break;
            }
            if (bestMatch && bestMatch.score >= 0.75) {
                mappings[header] = bestMatch.field;
                confidence[header] = Math.round(bestMatch.score * 100) / 100;
                mappedTargets.add(bestMatch.field);
            }
        }
        // Pass 2: Value-Based Inspection Heuristics for remaining unmapped headers
        for (const header of headers) {
            if (mappings[header])
                continue;
            // Inspect first 20 sample values for this header
            const sampleValues = sampleRows
                .slice(0, 20)
                .map((r) => String(r[header] || '').trim())
                .filter(Boolean);
            if (sampleValues.length === 0)
                continue;
            // Heuristic 1: Email check
            if (!mappedTargets.has('email')) {
                const emailMatches = sampleValues.filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
                if (emailMatches.length >= Math.min(2, sampleValues.length * 0.4)) {
                    mappings[header] = 'email';
                    confidence[header] = 0.95;
                    mappedTargets.add('email');
                    continue;
                }
            }
            // Heuristic 2: Phone check (10 digits starting with 6-9)
            if (!mappedTargets.has('phone')) {
                const phoneMatches = sampleValues.filter((v) => cleanPhoneNumber(v).isValid);
                if (phoneMatches.length >= Math.min(2, sampleValues.length * 0.4)) {
                    mappings[header] = 'phone';
                    confidence[header] = 0.92;
                    mappedTargets.add('phone');
                    continue;
                }
            }
            // Heuristic 3: Salary check
            if (!mappedTargets.has('currentSalary')) {
                const salaryMatches = sampleValues.filter((v) => /lpa|ctc|lakh|inr|per annum/i.test(v) || (!isNaN(Number(v)) && Number(v) >= 50000));
                if (salaryMatches.length >= Math.min(2, sampleValues.length * 0.4)) {
                    mappings[header] = 'currentSalary';
                    confidence[header] = 0.88;
                    mappedTargets.add('currentSalary');
                    continue;
                }
            }
            // Heuristic 4: Experience check
            if (!mappedTargets.has('totalExperience')) {
                const expMatches = sampleValues.filter((v) => /yrs?|years?|months?|fresher/i.test(v));
                if (expMatches.length >= Math.min(2, sampleValues.length * 0.4)) {
                    mappings[header] = 'totalExperience';
                    confidence[header] = 0.85;
                    mappedTargets.add('totalExperience');
                    continue;
                }
            }
            // Heuristic 5: Gender check
            if (!mappedTargets.has('gender')) {
                const genderMatches = sampleValues.filter((v) => ['male', 'female', 'm', 'f', 'other'].includes(v.toLowerCase()));
                if (genderMatches.length >= Math.min(2, sampleValues.length * 0.5)) {
                    mappings[header] = 'gender';
                    confidence[header] = 0.9;
                    mappedTargets.add('gender');
                    continue;
                }
            }
        }
        const unmapped = headers.filter((h) => !mappings[h]);
        return {
            mappings,
            confidence,
            unmapped,
        };
    }
    // Clean a single row using the established mapping
    static cleanAndValidateRow(row, mapping, rowIndex) {
        const data = {};
        const errors = [];
        // Reverse lookup from targetField to sourceHeader
        const fieldValues = {};
        for (const [sourceHeader, targetField] of Object.entries(mapping)) {
            if (targetField && row[sourceHeader] !== undefined) {
                fieldValues[targetField] = row[sourceHeader];
            }
        }
        // 1. Name parsing
        let fullName = String(fieldValues.fullName || '').trim();
        let firstName = String(fieldValues.firstName || '').trim();
        let lastName = String(fieldValues.lastName || '').trim();
        if (!firstName && fullName) {
            const split = splitFullName(fullName);
            firstName = split.firstName;
            lastName = split.lastName;
        }
        else if (firstName && !lastName) {
            lastName = '.';
        }
        if (!firstName) {
            errors.push('Candidate name is missing');
        }
        data.firstName = firstName || 'Candidate';
        data.lastName = lastName || '.';
        data.fullName = `${data.firstName} ${data.lastName}`.trim();
        // 2. Phone cleaning
        const rawPhone = fieldValues.phone || fieldValues.contact || '';
        const phoneRes = cleanPhoneNumber(rawPhone);
        data.phone = phoneRes.phone;
        data.isPhoneValid = phoneRes.isValid;
        if (!data.phone) {
            errors.push('Phone number is missing');
        }
        // Alternate phone
        if (fieldValues.alternatePhone) {
            const altRes = cleanPhoneNumber(fieldValues.alternatePhone);
            data.alternatePhone = altRes.phone;
        }
        // 3. Email cleaning
        const rawEmail = fieldValues.email || '';
        const emailRes = cleanEmail(rawEmail);
        data.email = emailRes.email;
        data.isEmailValid = emailRes.isValid;
        // If candidate has no email in the file, generate a system candidate alias
        if (!data.email) {
            if (data.phone) {
                data.email = `candidate.${data.phone}@candidate.careerwings.in`;
                data.isGeneratedEmail = true;
            }
            else {
                data.email = `candidate.${Date.now()}.${Math.round(Math.random() * 10000)}@candidate.careerwings.in`;
                data.isGeneratedEmail = true;
            }
        }
        // 4. Gender
        data.gender = normalizeGender(fieldValues.gender);
        // 5. Date of Birth
        if (fieldValues.dateOfBirth) {
            data.dateOfBirth = String(fieldValues.dateOfBirth).trim();
        }
        // 6. Experience
        data.totalExperience = parseExperience(fieldValues.totalExperience);
        // 7. Salary
        data.currentSalary = parseSalary(fieldValues.currentSalary);
        data.expectedSalary = parseSalary(fieldValues.expectedSalary);
        // 8. Education & Qualification
        data.highestDegree = standardizeQualification(fieldValues.highestDegree);
        data.educationLevel = fieldValues.educationLevel ? String(fieldValues.educationLevel).trim() : null;
        data.college = fieldValues.college ? String(fieldValues.college).trim() : null;
        data.passingYear = fieldValues.passingYear ? parseInt(String(fieldValues.passingYear).replace(/\D/g, ''), 10) || null : null;
        // 9. Current Role & Company
        data.currentRole = sanitizeCleanText(fieldValues.currentRole);
        data.currentCompany = sanitizeCleanText(fieldValues.currentCompany);
        // 10. Location
        data.currentLocation = sanitizeCleanText(fieldValues.currentLocation);
        data.city = data.currentLocation;
        data.state = sanitizeCleanText(fieldValues.state);
        if (fieldValues.preferredLocations) {
            const prefLocs = String(fieldValues.preferredLocations)
                .split(/[,;|/]/)
                .map((s) => sanitizeCleanText(s))
                .filter(Boolean);
            data.preferredLocations = JSON.stringify(prefLocs);
        }
        // 11. Skills (Strip unwanted URLs, competitor links, and section headings)
        if (fieldValues.skills) {
            let rawSkills = String(fieldValues.skills).trim();
            // Strip section prefix e.g. "KEY SKILLS & COMPETENCIES: Java, SQL"
            rawSkills = rawSkills.replace(/^(key\s*skills\s*(&|and)?\s*competencies|key\s*skills|competencies|technical\s*skills|skills)\s*[:\-\—\|]\s*/i, '');
            const skillList = rawSkills
                .split(/[,;|/\n]/)
                .map((s) => s.trim())
                .filter((s) => !isInvalidOrJunkSkill(s));
            data.skills = skillList;
        }
        else {
            data.skills = [];
        }
        // 12. Notice Period & Summary
        data.noticePeriod = fieldValues.noticePeriod ? String(fieldValues.noticePeriod).trim() : null;
        data.summary = sanitizeCleanText(fieldValues.summary);
        data.resumeUrl = fieldValues.resumeUrl ? String(fieldValues.resumeUrl).trim() : null;
        data.source = fieldValues.source ? String(fieldValues.source).trim() : 'AI Excel Import';
        data.rowIndex = rowIndex;
        const isValid = errors.length === 0 && (phoneRes.isValid || emailRes.isValid);
        return {
            isValid,
            data,
            errors,
        };
    }
    // Check duplicate status against existing database candidates
    static async checkDuplicates(cleanedRows) {
        const phones = cleanedRows.map((r) => r.phone).filter(Boolean);
        const emails = cleanedRows.map((r) => r.email).filter(Boolean);
        // Query existing candidates by phone or email
        const [existingCandidates, existingUsers] = await Promise.all([
            prisma_1.prisma.candidate.findMany({
                where: {
                    phone: { in: phones },
                },
                select: {
                    id: true,
                    userId: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                },
            }),
            prisma_1.prisma.user.findMany({
                where: {
                    email: { in: emails },
                },
                select: {
                    id: true,
                    email: true,
                    candidate: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                },
            }),
        ]);
        const phoneToCandidate = new Map();
        for (const cand of existingCandidates) {
            if (cand.phone)
                phoneToCandidate.set(cand.phone, cand);
        }
        const emailToUser = new Map();
        for (const u of existingUsers) {
            if (u.email)
                emailToUser.set(u.email, u);
        }
        const duplicateMap = new Map();
        let duplicateCount = 0;
        for (let i = 0; i < cleanedRows.length; i++) {
            const row = cleanedRows[i];
            let matchedBy = '';
            let existingCandidate = null;
            if (row.phone && phoneToCandidate.has(row.phone)) {
                matchedBy = 'phone';
                existingCandidate = phoneToCandidate.get(row.phone);
            }
            else if (row.email && emailToUser.has(row.email)) {
                matchedBy = 'email';
                const user = emailToUser.get(row.email);
                existingCandidate = user.candidate;
            }
            if (matchedBy) {
                duplicateCount++;
                duplicateMap.set(i, {
                    isDuplicate: true,
                    matchedBy,
                    existingCandidateId: existingCandidate?.id,
                    existingName: existingCandidate ? `${existingCandidate.firstName} ${existingCandidate.lastName}` : undefined,
                });
            }
            else {
                duplicateMap.set(i, { isDuplicate: false, matchedBy: '' });
            }
        }
        return { duplicateMap, duplicateCount };
    }
    // Generate multi-tab Excel import report
    static generateExcelReport(summary, successRecords, skippedRecords, failedRecords) {
        const wb = XLSX.utils.book_new();
        // Sheet 1: Summary
        const summaryData = [
            ['Career Wings - AI Jobseeker Database Import Report'],
            ['Generated On', new Date().toLocaleString()],
            ['Original File Name', summary.fileName],
            ['Duplicate Strategy Used', summary.duplicateStrategy],
            [''],
            ['METRIC', 'COUNT'],
            ['Total Rows Processed', summary.totalRows],
            ['Successfully Imported (New Candidates)', summary.successCount],
            ['Existing Records Updated', summary.updatedCount],
            ['Duplicate Records Skipped', summary.skippedCount],
            ['Invalid / Incomplete Records', summary.invalidCount],
            ['Failed Records', summary.failedCount],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        // Sheet 2: Successfully Imported
        if (successRecords.length > 0) {
            const wsSuccess = XLSX.utils.json_to_sheet(successRecords);
            XLSX.utils.book_append_sheet(wb, wsSuccess, 'Imported');
        }
        // Sheet 3: Skipped Duplicates
        if (skippedRecords.length > 0) {
            const wsSkipped = XLSX.utils.json_to_sheet(skippedRecords);
            XLSX.utils.book_append_sheet(wb, wsSkipped, 'Skipped');
        }
        // Sheet 4: Failed / Invalid Records
        if (failedRecords.length > 0) {
            const wsFailed = XLSX.utils.json_to_sheet(failedRecords);
            XLSX.utils.book_append_sheet(wb, wsFailed, 'Failed & Invalid');
        }
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    // Generate standard downloadable template for admins
    static generateSampleTemplate() {
        const wb = XLSX.utils.book_new();
        const sampleHeaders = [
            'Candidate Name',
            'Mobile Number',
            'Alternate Contact',
            'Email Address',
            'Gender',
            'Date of Birth',
            'Highest Qualification',
            'College / University',
            'Passing Year',
            'Total Experience (Years)',
            'Current Designation',
            'Current Company',
            'Current Salary (LPA / INR)',
            'Expected Salary (LPA / INR)',
            'Current City',
            'State',
            'Preferred Locations',
            'Key Skills',
            'Notice Period',
            'Candidate Source',
            'Profile Summary',
        ];
        const sampleRows = [
            [
                'Rahul Kumar Sharma',
                '9876543210',
                '9876543211',
                'rahul.sharma@example.com',
                'Male',
                '1996-05-14',
                'B.Tech in Computer Science',
                'Assam Engineering College',
                '2018',
                '4.5',
                'Senior Software Engineer',
                'Wipro Technologies',
                '8.5 LPA',
                '12 LPA',
                'Guwahati',
                'Assam',
                'Guwahati, Shillong, Kolkata',
                'React, Node.js, TypeScript, SQL',
                '30 Days',
                'Campus Drive',
                'Experienced full-stack engineer specializing in modern web applications and cloud deployments.',
            ],
            [
                'Priyanka Das',
                '9123456780',
                '',
                'priyanka.das@example.com',
                'Female',
                '1998-11-20',
                'MBA Marketing',
                'Gauhati University',
                '2021',
                '2.5',
                'Area Sales Executive',
                'Amul India',
                '4.2 LPA',
                '6 LPA',
                'Silchar',
                'Assam',
                'Guwahati, Silchar, Jorhat',
                'B2B Sales, FMCG, Channel Management, Client Servicing',
                'Immediate',
                'Job Fair 2026',
                'Goal-driven sales professional with proven track record in FMCG distribution and territory expansion.',
            ],
            [
                'Bikash Chandra Roy',
                '9988776655',
                '',
                'bikash.roy@example.com',
                'Male',
                '2000-01-10',
                'Diploma in Mechanical',
                'Silchar Polytechnic',
                '2022',
                'Fresher',
                'Trainee Engineer',
                '',
                '2 LPA',
                '3 LPA',
                'Dibrugarh',
                'Assam',
                'Dibrugarh, Tinsukia',
                'AutoCAD, Machine Maintenance, Quality Inspection',
                'Immediate',
                'Walk-In',
                'Fresh diploma graduate eager to contribute technical skills to manufacturing and production operations.',
            ],
        ];
        const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
        // Set auto column width
        ws['!cols'] = sampleHeaders.map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(wb, ws, 'Jobseekers Template');
        // Instructions Sheet
        const instructions = [
            ['Career Wings - Candidate Database Import Guidelines'],
            [''],
            ['1. The AI importer is flexible and recognizes various column headers automatically.'],
            ['2. Mobile Number and Name are the primary identifiers.'],
            ['3. If Email is missing, the system will automatically create an internal candidate login.'],
            ['4. Experience can be entered as "4.5", "3 yrs", "36 months", or "Fresher".'],
            ['5. Salary can be entered as "5 LPA", "500000", or "35000 / month".'],
            ['6. Skills should be separated by commas (e.g. Sales, Excel, Tally).'],
            ['7. Duplicate records can be Skipped, Updated, or Imported as New during import confirmation.'],
        ];
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}
exports.AIImportService = AIImportService;
//# sourceMappingURL=aiImport.service.js.map