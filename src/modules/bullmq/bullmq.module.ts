import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { BullBoardModule } from '@bull-board/nestjs'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { QUEUE_SCRAPING_CONFIG } from 'src/infrastructure/constants/queue.constants'
import { SharedModule } from '../shared.module'
import { ChildrenProcessor } from './children.processor'
import { MainProcessor } from './main.processor'
import { QueueService } from './queue.service'
import { ResourceMonitorService } from './services/resource-monitor.service'

@Module({
    imports: [
        SharedModule,
        BullModule.registerQueue(
            {
                name: QUEUE_SCRAPING_CONFIG.QUEUE_NAME,
                defaultJobOptions: {
                    attempts: QUEUE_SCRAPING_CONFIG.JOB_ATTEMPTS,
                    backoff: {
                        type: QUEUE_SCRAPING_CONFIG.BACKOFF.TYPE,
                        delay: QUEUE_SCRAPING_CONFIG.BACKOFF.DELAY,
                    },
                    removeOnComplete: QUEUE_SCRAPING_CONFIG.REMOVE_ON_COMPLETE,
                    removeOnFail: QUEUE_SCRAPING_CONFIG.REMOVE_ON_FAIL,
                },
            },
            {
                name: QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.CHILDREN,
            }
        ),
        BullModule.registerQueue({
            name: QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.CHILDREN,
        }),
        BullModule.registerFlowProducer({
            name: QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.MAIN,
        }),
        BullBoardModule.forFeature({
            name: QUEUE_SCRAPING_CONFIG.QUEUE_NAME,
            adapter: BullMQAdapter,
        }),
        BullBoardModule.forFeature({
            name: QUEUE_SCRAPING_CONFIG.FLOW_PRODUCER.CHILDREN,
            adapter: BullMQAdapter,
        }),
    ],
    providers: [QueueService, MainProcessor, ChildrenProcessor, ResourceMonitorService],
    exports: [QueueService],
})
export class BullMQModule {}
