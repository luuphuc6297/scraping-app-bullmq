import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'

export interface IScrapeStrategy {
    scrape(url: string): Promise<{
        status: ProcessingStatus
        content: string | null
        metadata: Record<string, any>
    }>
}

export interface IScrapingMetadata {
    title?: string
    description?: string
    keywords?: string
    contentType?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    lastModified?: string
    contentLength?: number
    errorType?: string
    errorMessage?: string
    stackTrace?: string
    validationError?: string
    duplicateDetectedAt?: string
    originalUrl?: string
    [key: string]: any
}

export interface ISuccessMetadata extends IScrapingMetadata {
    title: string
    description: string
    keywords: string
    contentType: string
    ogTitle: string
    ogDescription: string
    ogImage: string
    lastModified: string
    contentLength: number
}

export interface IErrorMetadata extends IScrapingMetadata {
    errorType: string
    errorMessage: string
    stackTrace: string
}

export interface IScrapingResult {
    url: string
    status: ProcessingStatus
    content: string | null
    metadata: IScrapingMetadata
    error?: string
}

export interface ISuccessScrapingResult {
    status: ProcessingStatus.SUCCESS
    content: string
    metadata: ISuccessMetadata
}

export interface IErrorScrapingResult {
    status: ProcessingStatus.ERROR | ProcessingStatus.TIMEOUT
    content: null
    metadata: IErrorMetadata
}

export type ScrapingResult = ISuccessScrapingResult | IErrorScrapingResult

export const isSuccessResult = (result: ScrapingResult): result is ISuccessScrapingResult => {
    return result.status === ProcessingStatus.SUCCESS
}

export const isErrorResult = (result: ScrapingResult): result is IErrorScrapingResult => {
    return result.status === ProcessingStatus.ERROR
}
