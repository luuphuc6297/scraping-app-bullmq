import { Process } from '@nestjs/bull'
import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { forwardRef, Inject, Logger } from '@nestjs/common'
import { Job, Queue } from 'bullmq'
import { QUEUE_SCRAPING_CONFIG } from 'src/infrastructure/constants/queue.constants'
import { isSuccessResult } from 'src/infrastructure/constants/scraping-result.interface'
import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'
import { TransactionStatus } from 'src/infrastructure/constants/transaction.enum'
import { CheerioStrategy } from '../database/scraper/strategies/cheerio.strategy'
import { ContentExtractorFactory } from '../database/scraper/strategies/puppeteer/extractors/content-extractor.factory'
import { PuppeteerStrategy } from '../database/scraper/strategies/puppeteer/puppeteer-v2.strategy'
import { BrowserConfigService } from '../database/scraper/strategies/puppeteer/services/browser-config.service'
import { PageConfigService } from '../database/scraper/strategies/puppeteer/services/page-config.service'
import { TransactionService } from '../database/transaction/transactions.service'
import { ResourceMonitorService } from './services/resource-monitor.service'

interface JobMetrics {
    attempts: number
    duration: number
    memory: NodeJS.MemoryUsage
    timestamp: number
}

const mapStatusToTransactionStatus = (status: ProcessingStatus): TransactionStatus => {
    switch (status) {
        case ProcessingStatus.SUCCESS:
            return TransactionStatus.SUCCESS
        case ProcessingStatus.TIMEOUT:
            return TransactionStatus.TIMEOUT
        default:
            return TransactionStatus.ERROR
    }
}

@Processor(QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.CHILDREN)
export class ChildrenProcessor extends WorkerHost {
    private readonly logger = new Logger(ChildrenProcessor.name)
    private readonly cheerioStrategy: CheerioStrategy
    private readonly puppeteerStrategy: PuppeteerStrategy
    private metrics: Map<string, JobMetrics> = new Map()

    constructor(
        @Inject(forwardRef(() => TransactionService))
        private readonly transactionService: TransactionService,
        private readonly contentExtractorFactory: ContentExtractorFactory,
        private readonly browserConfig: BrowserConfigService,
        private readonly pageConfig: PageConfigService,
        @InjectQueue(QUEUE_SCRAPING_CONFIG.QUEUE_NAME)
        private readonly queue: Queue,
        private readonly resourceMonitor: ResourceMonitorService
    ) {
        super()
        this.logger.debug('ChildrenProcessor initialized')
        this.cheerioStrategy = new CheerioStrategy()
        this.puppeteerStrategy = new PuppeteerStrategy(
            this.contentExtractorFactory,
            this.browserConfig,
            this.pageConfig
        )
    }

    private async checkRateLimit(): Promise<void> {
        const worker = this.worker
        if (worker) {
            await worker.rateLimit(QUEUE_SCRAPING_CONFIG.WORKER_CONFIG.CHILDREN.LIMITER.DURATION)
        }
        const ttl = await this.queue.getRateLimitTtl(
            QUEUE_SCRAPING_CONFIG.WORKER_CONFIG.CHILDREN.LIMITER.MAX
        )

        if (ttl > 0) {
            this.logger.warn(`Rate limit reached, waiting for ${ttl}ms`)
            await new Promise((resolve) => setTimeout(resolve, ttl))
        }
    }

    private async checkResourceUsage(): Promise<void> {
        const resourceStatus = await this.resourceMonitor.checkResources()

        if (!resourceStatus.canProcess) {
            this.logger.warn(
                `Resource limits exceeded - Memory: ${resourceStatus.memoryUsage.toFixed(2)}%, ` +
                    `CPU: ${resourceStatus.cpuUsage.toFixed(2)}%`
            )

            await new Promise((resolve) =>
                setTimeout(resolve, QUEUE_SCRAPING_CONFIG.MEMORY_LIMIT.PAUSE_DURATION)
            )

            throw new Error(
                `Resource limits exceeded (Memory: ${resourceStatus.memoryUsage}%, CPU: ${resourceStatus.cpuUsage}%)`
            )
        }
    }

    private updateJobMetrics(jobId: string, duration: number): void {
        const metrics = this.metrics.get(jobId) || {
            attempts: 0,
            duration: 0,
            memory: process.memoryUsage(),
            timestamp: Date.now(),
        }

        metrics.attempts++
        metrics.duration += duration
        metrics.memory = process.memoryUsage()

        this.metrics.set(jobId, metrics)
    }

    @Process({
        name: QUEUE_SCRAPING_CONFIG.JOB_NAME.CHILDREN_PROCESS,
        // concurrency: QUEUE_SCRAPING_CONFIG.WORKER_CONFIG.CHILDREN.CONCURRENCY,
    })
    async process(job: Job): Promise<any> {
        this.logger.log(`Processing child job ${job.id} for URL: ${job.data.url}`)

        const startTime = process.hrtime()
        const jobStartTimestamp = Date.now()

        try {
            const { url, scrapeId, strategy } = job.data

            await this.checkRateLimit()
            await this.checkResourceUsage()

            await job.updateProgress(10)

            const result =
                strategy === 'cheerio'
                    ? await this.cheerioStrategy.scrape(url)
                    : await this.puppeteerStrategy.scrape(url)

            await job.updateProgress(50)

            await this.transactionService.create({
                scrapes_id: scrapeId,
                url: url,
                status: mapStatusToTransactionStatus(result.status),
                content: result.content || '',
                metadata: {
                    ...result.metadata,
                    processingTime: process.hrtime(startTime)[0],
                    strategy,
                    attempts: job.attemptsMade + 1,
                },
            })

            const [seconds, nanoseconds] = process.hrtime(startTime)
            const duration = seconds * 1000 + nanoseconds / 1e6

            return {
                success: isSuccessResult(result),
                content: result.content,
                metadata: {
                    ...result.metadata,
                    processingTime: duration,
                    memory: process.memoryUsage(),
                    timestamp: jobStartTimestamp,
                },
            }
        } catch (error) {
            this.logger.error(
                `Failed to process child job ${job.id} (Attempt: ${job.attemptsMade + 1}): ${error.message}`
            )

            const [seconds, nanoseconds] = process.hrtime(startTime)
            const duration = seconds * 1000 + nanoseconds / 1e6
            this.updateJobMetrics(job.id, duration)

            if (job.attemptsMade >= QUEUE_SCRAPING_CONFIG.JOB_ATTEMPTS - 1) {
                await this.transactionService.create({
                    scrapes_id: job.data.scrapeId,
                    url: job.data.url,
                    status: TransactionStatus.ERROR,
                    content: '',
                    metadata: {
                        error: error.message,
                        attempts: job.attemptsMade + 1,
                        lastAttemptDuration: duration,
                    },
                })
            }
        }
    }

    @OnWorkerEvent('active')
    onActive(job: Job) {
        this.logger.log(`Child job ${job.id} is now active`)
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job, result: any) {
        this.logger.log(`Child job ${job.id} completed with result:`, result)
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`Child job ${job.id} failed: ${error.message}`)
    }

    @OnWorkerEvent('progress')
    onProgress(job: Job, progress: number) {
        this.logger.log(`Child job ${job.id} progress: ${progress}%`)
    }
}
