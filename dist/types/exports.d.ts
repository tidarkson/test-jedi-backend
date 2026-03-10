/**
 * Export Engine Types
 * Defines all types and interfaces for the export functionality
 */
export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'json' | 'xml';
export interface ExportRequest {
    format: ExportFormat;
    sections?: string[];
    filters?: ExportFilters;
    branding?: BrandingConfig;
}
export interface ExportFilters {
    status?: string[];
    priority?: string[];
    type?: string[];
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    assignee?: string[];
    [key: string]: any;
}
export interface BrandingConfig {
    companyName?: string;
    companyLogo?: string;
    includeWatermark?: boolean;
    watermarkText?: string;
    themeColor?: string;
    footerText?: string;
    showPageNumbers?: boolean;
}
export interface ExportJobData {
    jobId: string;
    format: ExportFormat;
    entityType: 'cases' | 'runs' | 'analytics';
    entityId: string;
    userId: string;
    projectId: string;
    request: ExportRequest;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    status: ExportJobStatus;
    fileUrl?: string;
    error?: string;
    fileSize?: number;
}
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface ExportResponse {
    jobId: string;
    status: ExportJobStatus;
    format: ExportFormat;
    downloadUrl?: string;
    fileSize?: number;
    createdAt: Date;
    completedAt?: Date;
    error?: string;
}
/**
 * PDF Export specific interfaces
 */
export interface PDFExportConfig extends ExportRequest {
    format: 'pdf';
    pageSize?: 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
}
export interface PDFExecutiveSummary {
    projectName: string;
    reportDate: Date;
    dateRange: {
        start: Date;
        end: Date;
    };
    totalCases: number;
    passedCases: number;
    failedCases: number;
    blockedCases: number;
    skippedCases: number;
    passRate: number;
    executionTime?: string;
    environment: string;
    executedBy?: string;
}
export interface PDFChart {
    type: 'pie' | 'bar' | 'line';
    title: string;
    data: Record<string, number>;
    imageData?: string;
}
/**
 * Excel Export specific interfaces
 */
export interface ExcelWorksheet {
    name: string;
    columns: ExcelColumn[];
    rows: any[];
    freezePane?: {
        row: number;
        column: number;
    };
}
export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
    format?: string;
    conditionalFormatting?: ConditionalFormat[];
}
export interface ConditionalFormat {
    type: 'fill' | 'font' | 'border';
    condition: (value: any) => boolean;
    style: {
        fill?: {
            fgColor?: {
                rgb?: string;
            };
        };
        font?: {
            color?: {
                rgb?: string;
            };
            bold?: boolean;
        };
    };
}
/**
 * CSV Export specific interfaces
 */
export interface CSVConfig extends ExportRequest {
    format: 'csv';
    includeFormulas?: boolean;
    delimiter?: ',' | ';' | '\t';
    quoting?: 'minimal' | 'all' | 'non_numeric' | 'none';
}
/**
 * Job Queue related types
 */
export interface QueueJob {
    id: string;
    data: ExportJobData;
    status: ExportJobStatus;
    progress: number;
    attempts: number;
    failedReason?: string;
}
export interface QueueConfig {
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
}
/**
 * S3 Integration types
 */
export interface S3UploadConfig {
    bucket: string;
    region: string;
    prefix: string;
    expiresIn: number;
}
export interface S3SignedUrl {
    url: string;
    expiresAt: Date;
    bucket: string;
    key: string;
}
/**
 * Analytics Export specific
 */
export interface AnalyticsExportData {
    reportPeriod: {
        start: Date;
        end: Date;
    };
    projectMetrics: {
        totalCases: number;
        totalRuns: number;
        totalDefects: number;
        automationRate: number;
        avgPassRate: number;
    };
    trendData: {
        date: Date;
        passRate: number;
        executedCases: number;
        defectsFound: number;
    }[];
    topFailingCases: {
        caseId: string;
        title: string;
        failureCount: number;
        failureRate: number;
    }[];
    topDefectCategories: {
        category: string;
        count: number;
        percentage: number;
    }[];
}
/**
 * Template data for HTML PDF generation
 */
export interface PDFTemplateData {
    executiveSummary: PDFExecutiveSummary;
    charts: PDFChart[];
    cases: any[];
    results: any[];
    branding: BrandingConfig;
    generatedAt: Date;
    generatedBy?: string;
}
//# sourceMappingURL=exports.d.ts.map