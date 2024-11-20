import { Global, Module } from '@nestjs/common'
import { BullMQModule } from 'src/modules/bullmq/bullmq.module'
import { DatabaseModule } from 'src/modules/database/database.module'
import { LogsModule } from 'src/modules/database/logs/logs.module'
import { ScraperModule } from 'src/modules/database/scraper/scraper.module'
import { TransactionsModule } from 'src/modules/database/transaction/transactions.module'
import { MonitoringModule } from 'src/modules/monitoring/monitoring.module'
import { SharedModule } from 'src/modules/shared.module'

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
