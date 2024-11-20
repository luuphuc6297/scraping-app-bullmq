import { Injectable, Logger } from '@nestjs/common'
import * as puppeteer from 'puppeteer'
import {
    IScrapeStrategy,
    ISuccessScrapingResult,
    ScrapingResult,
} from 'src/infrastructure/constants/scraping-result.interface'
import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'
import { ContentExtractorFactory } from './extractors/content-extractor.factory'
import { BrowserConfigService } from './services/browser-config.service'
import { PageConfigService } from './services/page-config.service'
import { ContentType } from './interfaces/content-type.enum'

@Injectable()
export class PuppeteerStrategy implements IScrapeStrategy {
    private readonly logger = new Logger(PuppeteerStrategy.name)
    private readonly maxRetries = 3
    private readonly retryDelay = 2000
    private readonly maxProcessingTime = 30000 // 30 seconds timeout

    constructor(
        private readonly contentExtractorFactory: ContentExtractorFactory,
        private readonly browserConfig: BrowserConfigService,
        private readonly pageConfig: PageConfigService
    ) {}

    async scrape(url: string): Promise<ScrapingResult> {
        let browser: puppeteer.Browser | null = null
        let retries = 0

        const processWithTimeout = async (): Promise<ScrapingResult> => {
            return new Promise(async (resolve) => {
                const timeoutId = setTimeout(() => {
                    this.logger.warn(`Processing timeout reached for URL: ${url}`)
                    if (browser) {
                        browser
                            .close()
                            .catch((err) =>
                                this.logger.error(
                                    `Error closing browser after timeout: ${err.message}`
                                )
                            )
                    }
                    resolve({
                        status: ProcessingStatus.ERROR,
                        content: null,
                        metadata: {
                            errorType: 'ProcessingTimeout',
                            errorMessage: `Processing exceeded ${this.maxProcessingTime}ms timeout`,
                            url,
                            timestamp: new Date().toISOString(),
                            stackTrace: 'Timeout exceeded',
                        },
                    })
                }, this.maxProcessingTime)

                try {
                    browser = await this.browserConfig.createBrowser()
                    const page = await browser.newPage()
                    const contentType = await this.contentExtractorFactory.detectContentType(
                        page,
                        url
                    )
                    await this.pageConfig.configurePage(page, contentType)
                    page.setDefaultTimeout(15000)

                    await this.pageConfig.navigateAndWait(page, url, contentType)

                    this.logger.debug(`Detected content type: ${contentType}`)

                    const extractor = this.contentExtractorFactory.getExtractor(contentType)
                    const { content, metadata } = await extractor.extract(page, url)

                    // Sanitize content based on content type
                    const sanitizedContent = this.sanitizeContent(content, contentType)

                    clearTimeout(timeoutId)

                    await browser.close()
                    browser = null

                    resolve({
                        status: ProcessingStatus.SUCCESS,
                        content: sanitizedContent,
                        metadata: {
                            ...metadata,
                            url,
                            contentType,
                            timestamp: new Date().toISOString(),
                        },
                    })
                } catch (error) {
                    clearTimeout(timeoutId)

                    if (browser) {
                        await browser.close()
                        browser = null
                    }

                    if (retries < this.maxRetries - 1) {
                        this.logger.warn(
                            `Retry ${retries + 1}/${this.maxRetries} for ${url}: ${error.message}`
                        )
                        retries++
                        await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
                        resolve(await processWithTimeout())
                    } else {
                        this.logger.error(
                            `Failed after ${this.maxRetries} attempts: ${error.message}`
                        )
                        resolve({
                            status: ProcessingStatus.TIMEOUT,
                            content: null,
                            metadata: {
                                errorType: 'ProcessingTimeout',
                                errorMessage: `Processing exceeded ${this.maxProcessingTime}ms timeout`,
                                url,
                                timestamp: new Date().toISOString(),
                                stackTrace: error.stack,
                            },
                        })
                    }
                }
            })
        }

        return processWithTimeout()
    }

    private sanitizeContent(content: any, contentType: ContentType): any {
        if (!content) return null

        switch (contentType) {
            case ContentType.TEXT:
                if (typeof content === 'string') {
                    return this.sanitizeText(content)
                }
                if (content.text) {
                    content.text = this.sanitizeText(content.text)
                }
                return content

            case ContentType.VIDEO:
                if (content.videoInfo?.title) {
                    content.videoInfo.title = this.sanitizeText(content.videoInfo.title)
                }
                if (content.videoInfo?.description) {
                    content.videoInfo.description = this.sanitizeText(content.videoInfo.description)
                }
                return content

            case ContentType.IMAGE:
                if (content.images) {
                    content.images = content.images.map((img) => ({
                        ...img,
                        alt: img.alt ? this.sanitizeText(img.alt) : img.alt,
                        title: img.title ? this.sanitizeText(img.title) : img.title,
                    }))
                }
                return content

            default:
                return content
        }
    }

    private sanitizeText(text: string): string {
        return text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
            .replace(/[^\S\r\n]+/g, ' ') // Replace multiple whitespace (except newlines) with single space
            .replace(/\t/g, ' ') // Replace tabs with spaces
            .replace(/\u200B/g, '') // Remove zero-width spaces
            .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
            .trim() // Remove leading/trailing whitespace
    }

    private validateContent(content: any): void {
        if (!content) {
            throw new Error('Empty content extracted')
        }
    }

    private createSuccessResult(content: any, metadata: any): ISuccessScrapingResult {
        return {
            status: ProcessingStatus.SUCCESS,
            content,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        }
    }
}
