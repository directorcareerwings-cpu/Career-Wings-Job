export declare const sendWelcomeEmail: (to: string, name: string) => Promise<void>;
export declare const sendPasswordResetEmail: (to: string, name: string, token: string) => Promise<void>;
export declare const sendApplicationReceivedEmail: (to: string, candidateName: string, jobTitle: string, companyName: string) => Promise<void>;
export declare const sendApplicationStatusEmail: (to: string, candidateName: string, jobTitle: string, status: string, employerMessage?: string) => Promise<void>;
export declare const sendJobAlertEmail: (to: string, name: string, jobs: Array<{
    title: string;
    company: string;
    location: string;
    slug: string;
}>) => Promise<void>;
export declare const sendPackageExpiryEmail: (to: string, name: string, packageName: string, daysLeft: number) => Promise<void>;
//# sourceMappingURL=email.service.d.ts.map