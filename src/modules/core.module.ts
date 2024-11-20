import { Global, Module } from '@nestjs/common'
import { BullMQModule } from './bullmq/bullmq.module'
import { DatabaseModule } from './database/database.module'
import { LogsModule } from './database/logs/logs.module'
import { ScraperModule } from './database/scraper/scraper.module'
import { TransactionsModule } from './database/transaction/transactions.module'
import { MonitoringModule } from './monitoring/monitoring.module'
import { SharedModule } from './shared.module'

@Global()
@Module({
    imports: [
        DatabaseModule,
        SharedModule,
        BullMQModule,
        ScraperModule,
        TransactionsModule,
        LogsModule,
        MonitoringModule,
    ],
    exports: [
        DatabaseModule,
        SharedModule,
        BullMQModule,
        ScraperModule,
        TransactionsModule,
        LogsModule,
        MonitoringModule,
    ],
})
export class CoreModule {}
