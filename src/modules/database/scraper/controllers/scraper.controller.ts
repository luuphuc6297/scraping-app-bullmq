import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from 'src/infrastructure/guards/auth.guard'
import { CreateScrapeDto } from '../dtos/create-scrapes.dto'
import { ScrapeService } from '../services/scraper.services'

@Controller('scraper')
@UseGuards(AuthGuard)
export class ScraperController {
    private readonly logger = new Logger(ScraperController.name)

    constructor(private readonly scrapeService: ScrapeService) {}

    @Post('bulk')
    async bulkScrape(@Body() createScrapeDto: CreateScrapeDto) {
        this.logger.log(`Received bulk scraping request for ${createScrapeDto.urls.length} URLs`)
        return await this.scrapeService.initiateScraping(createScrapeDto)
    }
}
