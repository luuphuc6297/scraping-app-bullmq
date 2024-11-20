import {
    IScrapingResult,
    ScrapingResult,
} from 'src/infrastructure/constants/scraping-result.interface'

import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'

export abstract class BaseScrapingStrategy {
    abstract scrape(url: string): Promise<ScrapingResult>

    protected validateUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url)
            return ['http:', 'https:'].includes(parsedUrl.protocol)
        } catch {
            return false
        }
    }

    protected async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    protected getRandomUserAgent(): string {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        ]
        return userAgents[Math.floor(Math.random() * userAgents.length)]
    }

    protected createInvalidUrlResult(url: string): IScrapingResult {
        return {
            url,
            content: '',
            status: ProcessingStatus.INVALID,
            error: 'Invalid URL format',
            metadata: { validationError: 'Invalid URL protocol or format' },
        }
    }

    protected createErrorResult(url: string, error: Error): IScrapingResult {
        return {
            url,
            content: '',
            status: ProcessingStatus.ERROR,
            error: error.message,
            metadata: {
                errorType: error.name,
                stackTrace: error.stack,
            },
        }
    }

    protected sanitizeContent(content: string): string {
        return content
            .replace(/\s+/g, ' ')
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, '') // Remove non-printable characters
            .trim()
    }
}
