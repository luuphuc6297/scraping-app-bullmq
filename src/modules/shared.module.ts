import { forwardRef, Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Log } from 'src/modules/database/entities/log.entity'
import { Scrape } from 'src/modules/database/entities/scrape.entity'
import { Transaction } from 'src/modules/database/entities/transaction.entity'
import { LogService } from 'src/modules/database/logs/logs.service'
import { LogRepository } from 'src/modules/database/logs/repositories/logs.repository'
import { ScrapeRepository } from 'src/modules/database/scraper/repositories/scraper.repository'
import { ScrapeService } from 'src/modules/database/scraper/services/scraper.services'
import { ExtractorsModule } from 'src/modules/database/scraper/strategies/extractors.module'
import { BrowserConfigService } from 'src/modules/database/scraper/strategies/puppeteer/services/browser-config.service'
import { PageConfigService } from 'src/modules/database/scraper/strategies/puppeteer/services/page-config.service'
import { UrlAnalyzerService } from 'src/modules/database/scraper/url-analyzer.service'
import { UrlValidatorService } from 'src/modules/database/scraper/url-validator.service'
import { TransactionRepository } from 'src/modules/database/transaction/repositories/transactions.repository'
import { TransactionService } from 'src/modules/database/transaction/transactions.service'
import { MonitoringService } from 'src/modules/monitoring/services/monitoring.services'

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Scrape, Transaction, Log]),
        forwardRef(() => ExtractorsModule),
    ],
    providers: [
        // Services
        ScrapeService,
        UrlAnalyzerService,
        UrlValidatorService,
        TransactionService,
        LogService,
        MonitoringService,
        ...MonitoringService.providers,

        // Repositories
        ScrapeRepository,
        TransactionRepository,
        LogRepository,

        // Puppeteer Services
        BrowserConfigService,
        PageConfigService,
    ],
    exports: [
        // Services
        ScrapeService,
        UrlAnalyzerService,
        UrlValidatorService,
        TransactionService,
        LogService,
        MonitoringService,
        ...MonitoringService.providers,

        // Repositories
        ScrapeRepository,
        TransactionRepository,
        LogRepository,

        // Puppeteer Services
        BrowserConfigService,
        PageConfigService,
        ExtractorsModule,
    ],
})
export class SharedModule {}
