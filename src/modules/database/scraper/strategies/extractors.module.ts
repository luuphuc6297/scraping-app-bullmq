import { Module } from '@nestjs/common'
import { ContentExtractorFactory } from './puppeteer/extractors/content-extractor.factory'
import { ImageContentExtractor } from './puppeteer/extractors/image-content.extractor'
import { TextContentExtractor } from './puppeteer/extractors/text-content.extractor'
import { VideoContentExtractor } from './puppeteer/extractors/video-content.extractor'

@Module({
    providers: [
        VideoContentExtractor,
        ImageContentExtractor,
        TextContentExtractor,
        ContentExtractorFactory,
    ],
    exports: [
        VideoContentExtractor,
        ImageContentExtractor,
        TextContentExtractor,
        ContentExtractorFactory,
    ],
})
export class ExtractorsModule {}
