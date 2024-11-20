import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { ScrapeStatus } from 'src/infrastructure/constants/scrape.enum'
import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'
import { QueueService } from 'src/modules/bullmq/queue.service'
import { LogType } from '../../logs/dtos/create-logs.dto'
import { LogService } from '../../logs/logs.service'
import { TransactionService } from '../../transaction/transactions.service'
import { CreateScrapeDto } from '../dtos/create-scrapes.dto'
import { UpdateScrapeDto } from '../dtos/update-scrapes.dto'
import { ScrapeRepository } from '../repositories/scraper.repository'
import { MonitoringService } from 'src/modules/monitoring/services/monitoring.services'

@Injectable()
export class ScrapeService {
    private readonly logger = new Logger(ScrapeService.name)

    constructor(
        private readonly monitoringService: MonitoringService,
        private readonly scrapeRepository: ScrapeRepository,
        @Inject(forwardRef(() => QueueService))
        private readonly queueService: QueueService,
        @Inject(forwardRef(() => TransactionService))
        private readonly transactionService: TransactionService,
        @Inject(forwardRef(() => LogService))
        private readonly logService: LogService
    ) {}

    async create(createScrapeDto: CreateScrapeDto) {
        this.logger.log(`Creating new scrape with ${createScrapeDto.urls.length} URLs`)
        return await this.scrapeRepository.create({
            ...createScrapeDto,
            status: ScrapeStatus.PROCESSING,
            created_at: new Date(),
        })
    }

    async update(id: string, updateScrapeDto: UpdateScrapeDto) {
        this.logger.log(`Updating scrape with ID: ${id}`)
        return await this.scrapeRepository.update(id, {
            ...updateScrapeDto,
            updated_at: new Date(),
        })
    }

    async initiateScraping(createScrapeDto: CreateScrapeDto) {
        const timer = this.monitoringService.startScrapeTimer('cheerio')

        try {
            this.monitoringService.recordScrapeRequest('success', 'cheerio')

            // Create new scrape record
            const scrape = await this.create({
                ...createScrapeDto,
                status: ScrapeStatus.PROCESSING,
            })

            // Create initial log
            await this.logService.create({
                scrapes_id: scrape.id,
                type: LogType.INIT,
                status: ProcessingStatus.PROCESSING,
                message: `Initiated scraping for ${createScrapeDto.urls.length} URLs`,
                metadata: {
                    urls: createScrapeDto.urls,
                    options: createScrapeDto.options,
                },
                length: createScrapeDto.urls.length,
                succeed: 0,
                failed: 0,
            })

            // Add scraping flow
            await this.queueService.addScrapingFlow(createScrapeDto.urls, scrape.id)

            return {
                message: 'Scraping initiated successfully',
                scrape_id: scrape.id,
                total_urls: createScrapeDto.urls.length,
            }
        } catch (error) {
            this.logger.error(`Failed to initiate scraping: ${error.message}`)
            this.monitoringService.recordScrapeError('cheerio', error.message)
        } finally {
            timer()
            this.monitoringService.decrementActiveScrapes('cheerio')
        }
    }
}
