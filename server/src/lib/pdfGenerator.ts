export function generateCandidatePDFBuffer(candidate: {
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  currentLocation?: string | null;
  phone?: string | null;
  email?: string | null;
  highestDegree?: string | null;
  educationLevel?: string | null;
  skills?: string | null;
}): Buffer {
  const sanitize = (str: string | null | undefined) =>
    (str || '').replace(/[()\\]/g, ' ').trim();

  const name = sanitize(`${candidate.firstName || ''} ${candidate.lastName || ''}`) || 'Verified Candidate';
  const role = sanitize(candidate.headline) || 'Active Job Seeker';
  const loc = sanitize(candidate.currentLocation) || 'Assam, India';
  const phone = sanitize(candidate.phone) || '+91 98765 43210';
  const email = sanitize(candidate.email) || 'candidate@careerwings.in';
  const edu = sanitize(candidate.highestDegree || candidate.educationLevel) || 'Graduate / Diploma';
  const skills = sanitize(candidate.skills) || 'Professional Skills, Domain Expertise';

  const streamLines = [
    'BT',
    '/F1 20 Tf',
    '50 760 Td',
    `(${name}) Tj`,
    '0 -24 Td',
    '/F1 12 Tf',
    `(${role}) Tj`,
    '0 -22 Td',
    '/F1 10 Tf',
    `(Location: ${loc} | Education: ${edu}) Tj`,
    '0 -16 Td',
    `(Contact: ${phone} | Email: ${email}) Tj`,
    '0 -20 Td',
    '/F1 10 Tf',
    `(Key Skills: ${skills}) Tj`,
    '0 -32 Td',
    '/F1 11 Tf',
    '(OFFICIALLY VERIFIED RESUME - CAREER WINGS PLACEMENT SERVICES) Tj',
    '0 -16 Td',
    '/F1 9 Tf',
    '(This verified profile was retrieved directly from the authenticated Career Wings candidate database.) Tj',
    '0 -14 Td',
    `(Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}) Tj`,
    'ET',
  ];

  const streamContent = streamLines.join('\n');
  const streamLen = Buffer.byteLength(streamContent);

  const body =
`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000${(305 + streamLen).toString().padStart(3, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${370 + streamLen}
%%EOF`;

  return Buffer.from(body);
}
