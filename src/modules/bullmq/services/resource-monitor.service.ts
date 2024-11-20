import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Queue } from 'bullmq'
import * as os from 'os'
import { QUEUE_SCRAPING_CONFIG } from 'src/infrastructure/constants/queue.constants'

@Injectable()
export class ResourceMonitorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ResourceMonitorService.name)
    private memoryCheckInterval: NodeJS.Timeout
    private cpuCheckInterval: NodeJS.Timeout
    private isQueuePaused = false

    constructor(
        @InjectQueue(QUEUE_SCRAPING_CONFIG.QUEUE_NAME)
        private readonly queue: Queue
    ) {}

    async onModuleInit() {
        await this.startMonitoring()
    }

    onModuleDestroy() {
        this.stopMonitoring()
    }

    private async startMonitoring() {
        this.startMemoryMonitor()

        this.startCpuMonitor()

        this.logger.log('Resource monitoring started')
    }

    private stopMonitoring() {
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval)
        }
        if (this.cpuCheckInterval) {
            clearInterval(this.cpuCheckInterval)
        }
        this.logger.log('Resource monitoring stopped')
    }

    private startMemoryMonitor() {
        this.memoryCheckInterval = setInterval(async () => {
            const { memoryUsage } = await this.checkResources()

            if (memoryUsage > QUEUE_SCRAPING_CONFIG.MEMORY_LIMIT.MAX_MEMORY_PERCENT) {
                this.logger.warn(`High memory usage: ${memoryUsage.toFixed(2)}%`)
                await this.handleHighResourceUsage('memory')
            } else if (this.isQueuePaused) {
                await this.resumeQueue('memory')
            }
        }, QUEUE_SCRAPING_CONFIG.MEMORY_LIMIT.CHECK_INTERVAL)
    }

    private startCpuMonitor() {
        this.cpuCheckInterval = setInterval(async () => {
            const { cpuUsage } = await this.checkResources()

            if (cpuUsage > QUEUE_SCRAPING_CONFIG.CPU_LIMIT.MAX_CPU_PERCENT) {
                this.logger.warn(`High CPU usage: ${cpuUsage.toFixed(2)}%`)
                await this.handleHighResourceUsage('cpu')
            } else if (this.isQueuePaused) {
                await this.resumeQueue('cpu')
            }
        }, QUEUE_SCRAPING_CONFIG.CPU_LIMIT.CHECK_INTERVAL)
    }

    private async handleHighResourceUsage(type: 'memory' | 'cpu') {
        if (!this.isQueuePaused) {
            try {
                // await this.queue.pause()
                this.isQueuePaused = false
                this.logger.log(`Queue paused due to high ${type} usage`)
            } catch (error) {
                this.logger.error(`Error pausing queue: ${error.message}`)
            }
        }
    }

    private async resumeQueue(type: 'memory' | 'cpu') {
        try {
            await this.queue.resume()
            this.isQueuePaused = false
            this.logger.log(`Queue resumed after ${type} stabilization`)
        } catch (error) {
            this.logger.error(`Error resuming queue: ${error.message}`)
        }
    }

    async checkResources(): Promise<{
        canProcess: boolean
        memoryUsage: number
        cpuUsage: number
    }> {
        const memoryUsage = process.memoryUsage()
        const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        const cpuUsage = os.loadavg()[0] * 100

        return {
            canProcess:
                memoryPercent <= QUEUE_SCRAPING_CONFIG.MEMORY_LIMIT.MAX_MEMORY_PERCENT &&
                cpuUsage <= QUEUE_SCRAPING_CONFIG.CPU_LIMIT.MAX_CPU_PERCENT,
            memoryUsage: memoryPercent,
            cpuUsage: cpuUsage,
        }
    }
    async getQueueStatus() {
        return {
            isPaused: this.isQueuePaused,
            resourceStatus: await this.checkResources(),
        }
    }
}
