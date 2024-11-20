import { ProcessingStatus } from './status.enum'

export interface IScrapeRequest {
    urls: string[]
    tag?: string
}

export interface IScrapeResponse {
    [x: string]: string
    scrapeId: string
    status: ProcessingStatus
    message: string
}

export interface IScrapingMetadata {
    title?: string
    description?: string
    keywords?: string
    contentType?: string
    ogTitle?: string
    ogDescription?: string
    errorType?: string
    stackTrace?: string
    validationError?: string
    [key: string]: any
}
