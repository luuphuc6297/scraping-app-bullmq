import { Injectable, Logger } from '@nestjs/common'
import { IContentExtractor } from '../interfaces/content-extractor.interface'
import { ContentType } from '../interfaces/content-type.enum'
import { VideoContentExtractor } from './video-content.extractor'
import { ImageContentExtractor } from './image-content.extractor'
import { TextContentExtractor } from './text-content.extractor'
import * as puppeteer from 'puppeteer'

@Injectable()
export class ContentExtractorFactory {
    private readonly logger = new Logger(ContentExtractorFactory.name)

    constructor(
        private readonly videoExtractor: VideoContentExtractor,
        private readonly imageExtractor: ImageContentExtractor,
        private readonly textExtractor: TextContentExtractor
    ) {}

    async detectContentType(page: puppeteer.Page, url: string): Promise<ContentType> {
        this.logger.debug(`Detecting content type for URL: ${url}`)

        try {
            // Try each extractor's detection method
            const contentTypes = await Promise.all([
                this.videoExtractor.detectContentType(page, url),
                this.imageExtractor.detectContentType(page, url),
                this.textExtractor.detectContentType(page, url),
            ])

            // Return first non-DEFAULT content type, or DEFAULT if none found
            const detectedType = contentTypes.find((type) => type !== ContentType.DEFAULT)

            this.logger.debug(`Detected content type: ${detectedType || ContentType.DEFAULT}`)
            return detectedType || ContentType.DEFAULT
        } catch (error) {
            this.logger.error(`Error detecting content type: ${error.message}`)
            return ContentType.DEFAULT
        }
    }

    getExtractor(contentType: ContentType): IContentExtractor {
        switch (contentType) {
            case ContentType.VIDEO:
                return this.videoExtractor
            case ContentType.IMAGE:
                return this.imageExtractor
            case ContentType.TEXT:
                return this.textExtractor
            default:
                return this.textExtractor
        }
    }
}
