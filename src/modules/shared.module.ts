import { forwardRef, Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Log } from './database/entities/log.entity'
import { Scrape } from './database/entities/scrape.entity'
import { Transaction } from './database/entities/transaction.entity'
import { LogService } from './database/logs/logs.service'
import { LogRepository } from './database/logs/repositories/logs.repository'
import { ScrapeRepository } from './database/scraper/repositories/scraper.repository'
import { ScrapeService } from './database/scraper/services/scraper.services'
import { ExtractorsModule } from './database/scraper/strategies/extractors.module'
import { BrowserConfigService } from './database/scraper/strategies/puppeteer/services/browser-config.service'
import { PageConfigService } from './database/scraper/strategies/puppeteer/services/page-config.service'
import { UrlAnalyzerService } from './database/scraper/url-analyzer.service'
import { UrlValidatorService } from './database/scraper/url-validator.service'
import { TransactionRepository } from './database/transaction/repositories/transactions.repository'
import { TransactionService } from './database/transaction/transactions.service'
import { MonitoringService } from './monitoring/services/monitoring.services'

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
