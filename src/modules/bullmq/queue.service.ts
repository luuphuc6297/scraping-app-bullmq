import { InjectFlowProducer, InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { FlowProducer, Queue } from 'bullmq'
import { QUEUE_SCRAPING_CONFIG } from 'src/infrastructure/constants/queue.constants'
import { TransactionService } from '../database/transaction/transactions.service'

@Injectable()
export class QueueService {
    private readonly logger = new Logger(QueueService.name)

    constructor(
        @InjectQueue(QUEUE_SCRAPING_CONFIG.QUEUE_NAME)
        private readonly queue: Queue,
        @InjectFlowProducer(QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.MAIN)
        private readonly flowProducer: FlowProducer,
        private readonly transactionService: TransactionService
    ) {}

    private createUrlBatches(urls: string[]): string[][] {
        const batchSize = QUEUE_SCRAPING_CONFIG.RATE_LIMIT.BATCH_SIZE
        const batches: string[][] = []

        for (let i = 0; i < urls.length; i += batchSize) {
            batches.push(urls.slice(i, i + batchSize))
        }

        return batches
    }

    async addScrapingFlow(urls: string[], scrapeId: string) {
        try {
            const batches = this.createUrlBatches(urls)
            const timestamp = Date.now()

            for (const batch of batches) {
                await this.processBatch(batch, scrapeId, timestamp)
            }

            return {
                scrapeId,
                totalJobs: urls.length,
                batches: batches.length,
            }
        } catch (error) {
            this.logger.error(`Failed to create scraping flow: ${error.message}`)
        }
    }

    async processBatch(urls: string[], scrapeId: string, timestamp: number) {
        try {
            // const timestamp = Date.now()
            const prefixJobId = `${scrapeId}-${timestamp}`
            const result = await this.transactionService.processDuplicateUrls(urls, scrapeId)

            const childrenJobs = []

            if (result.cheerioUrls.length > 0) {
                const cheerioJobs = result.cheerioUrls.map((url, index) => ({
                    name: QUEUE_SCRAPING_CONFIG.JOB_NAME.CHILDREN_PROCESS,
                    queueName: QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.CHILDREN,
                    data: {
                        url,
                        scrapeId,
                        index: index + 1,
                        timestamp,
                        strategy: 'cheerio' as const,
                    },
                    opts: {
                        jobId: `${scrapeId}_cheerio_${index + 1}_${timestamp}`,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 3000,
                        },
                    },
                }))
                childrenJobs.push(...cheerioJobs)
            }

            if (result.puppeteerUrls.length > 0) {
                const startIndex = result.cheerioUrls.length + 1
                const puppeteerJobs = result.puppeteerUrls.map((url, index) => ({
                    name: QUEUE_SCRAPING_CONFIG.JOB_NAME.CHILDREN_PROCESS,
                    queueName: QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.CHILDREN,
                    data: {
                        url,
                        scrapeId,
                        index: startIndex + index,
                        timestamp,
                        strategy: 'puppeteer' as const,
                    },
                    opts: {
                        jobId: `${scrapeId}_puppeteer_${index + 1}_${timestamp}`,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 3000,
                        },
                    },
                }))
                childrenJobs.push(...puppeteerJobs)
            }

            const parentJob = {
                name: QUEUE_SCRAPING_CONFIG.JOB_NAME.MAIN_PROCESS,
                queueName: QUEUE_SCRAPING_CONFIG.QUEUE_NAME,
                data: {
                    scrapeId,
                    totalUrls: urls.length,
                    cheerioUrls: result.cheerioUrls.length,
                    puppeteerUrls: result.puppeteerUrls.length,
                    processedUrls: result.cheerioUrls.length + result.puppeteerUrls.length,
                    timestamp,
                },
                opts: {
                    jobId: prefixJobId,
                },
            }

            await this.flowProducer.add({
                ...parentJob,
                children: childrenJobs,
            })

            this.logger.log(`Created scraping flow for scrape ${scrapeId}`)
            return {
                scrapeId,
                totalJobs: urls.length,
            }
        } catch (error) {
            this.logger.warn(`Failed to create scraping flow: ${error.message}`)
        }
    }

    async getQueueMetrics() {
        const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
        ])

        return { waiting, active, completed, failed }
    }
}
