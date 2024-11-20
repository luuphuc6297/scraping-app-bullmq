import { Process } from '@nestjs/bull'
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { forwardRef, Inject, Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { QUEUE_SCRAPING_CONFIG } from 'src/infrastructure/constants/queue.constants'
import { ScrapeStatus } from 'src/infrastructure/constants/scrape.enum'
import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'
import { LogType } from '../database/logs/dtos/create-logs.dto'
import { LogService } from '../database/logs/logs.service'
import { ScrapeService } from '../database/scraper/services/scraper.services'

@Processor(QUEUE_SCRAPING_CONFIG.QUEUE_NAME)
export class MainProcessor extends WorkerHost {
    private readonly logger = new Logger(MainProcessor.name)

    constructor(
        @Inject(forwardRef(() => ScrapeService))
        private readonly scrapeService: ScrapeService,
        @Inject(forwardRef(() => LogService))
        private readonly logService: LogService
    ) {
        super()
        this.logger.debug('MainProcessor initialized')
    }
    // async onModuleInit() {
    //     if (this.worker) {
    //         Object.assign(this.worker.opts)
    //     }

    //     // Add event listeners để debug
    //     this.worker.on('active', (job) => {
    //         this.logger.debug(`[MainProcessor] Job ${job.id} started processing`)
    //     })

    //     this.worker.on('completed', (job) => {
    //         this.logger.debug(`[MainProcessor] Job ${job.id} completed successfully`)
    //     })

    //     this.worker.on('failed', (job, error) => {
    //         this.logger.error(`[MainProcessor] Job ${job.id} failed:`, error)
    //     })

    //     this.worker.on('error', (error) => {
    //         this.logger.error(`[MainProcessor] Worker error:`, error)
    //     })
    // }

    @Process(QUEUE_SCRAPING_CONFIG.JOB_NAME.MAIN_PROCESS)
    async process(job: Job): Promise<any> {
        const startTime = Date.now()
        this.logger.log(`Processing main job ${job.id} for scrape ${job.data.scrapeId}`)

        // if (job.name === QUEUE_SCRAPING_CONFIG.JOB_NAME.CHILDREN_PROCESS) {}
        try {
            const childrenValues = await job.getChildrenValues()

            if (!childrenValues) {
                throw new Error('No children values found')
            }

            if (childrenValues) {
                const totalJobs = Object.keys(childrenValues).length
                const completedJobs = Object.values(childrenValues).filter(
                    (v) => v !== undefined
                ).length

                await job.updateProgress(Math.floor((completedJobs / totalJobs) * 100))

                if (completedJobs === totalJobs) {
                    const successJobs = Object.values(childrenValues).filter(
                        (v) => v && (v as any).success
                    ).length

                    await this.scrapeService.update(job.data.scrapeId, {
                        status: ScrapeStatus.COMPLETED,
                        updated_at: new Date(),
                    })

                    await this.logService.create({
                        scrapes_id: job.data.scrapeId,
                        duration: Date.now() - startTime,
                        length: totalJobs,
                        succeed: successJobs,
                        failed: totalJobs - successJobs,
                        completed_at: new Date(),
                        type: LogType.INIT,
                        status: ProcessingStatus.PROCESSING,
                        message: 'Scraping completed',
                    })

                    return {
                        success: true,
                        stats: {
                            total: totalJobs,
                            success: successJobs,
                            failed: totalJobs - successJobs,
                        },
                    }
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to process main job ${job.id}: ${error.message}`)
        }
    }

    @OnWorkerEvent('active')
    onActive(job: Job) {
        this.logger.log(`Main job ${job.id} is now active`)
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job, result: any) {
        this.logger.log(`Main job ${job.id} completed with result:`, result)
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`Main job ${job.id} failed: ${error.message}`)
    }
}
