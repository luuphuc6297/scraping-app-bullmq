import { Injectable, Logger } from '@nestjs/common'
import { TransactionStatus } from 'src/infrastructure/constants/transaction.enum'
import { Transaction } from '../entities/transaction.entity'
import { UrlValidatorService } from '../scraper/url-validator.service'
import { UrlAnalyzerService } from '../scraper/url-analyzer.service'
import { CreateTransactionDto } from './dtos/create-transaction.dto'
import { UpdateTransactionDto } from './dtos/update-transaction.dto'
import { TransactionRepository } from './repositories/transactions.repository'

type ProcessUrlsResponseWithDuplicates = {
    isDuplicates?: true
    duplicateUrls: string[]
    cheerioUrls: string[]
    puppeteerUrls: string[]
}

type ProcessUrlsResponseWithoutDuplicates = {
    isDuplicates?: false
    cheerioUrls: string[]
    puppeteerUrls: string[]
}

type ProcessUrlsResponse = ProcessUrlsResponseWithDuplicates | ProcessUrlsResponseWithoutDuplicates

@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name)

    constructor(
        private readonly transactionRepository: TransactionRepository,
        private readonly urlAnalyzer: UrlAnalyzerService,
        private readonly urlValidator: UrlValidatorService
    ) {}

    async isDuplicateUrl(url: string): Promise<boolean> {
        return await this.transactionRepository.isDuplicateUrl(url)
    }

    async isDuplicateUrls(urls: string[]): Promise<Record<string, boolean>> {
        return await this.transactionRepository.isDuplicateUrls(urls)
    }

    async processDuplicateUrls(urls: string[], scrapeId: string): Promise<ProcessUrlsResponse> {
        const allExistingUrls = await this.transactionRepository.findByUrls(urls)

        const existingUrlSet = new Set(allExistingUrls.map((t) => t.url))

        const { validUrls, invalidUrls } = this.urlValidator.validateUrls(urls)

        const newInvalidUrls = invalidUrls.filter((url) => !existingUrlSet.has(url))
        if (newInvalidUrls.length > 0) {
            await Promise.all(
                newInvalidUrls.map((url) =>
                    this.create({
                        scrapes_id: scrapeId,
                        url: url,
                        status: TransactionStatus.INVALID,
                        content: '',
                        metadata: {
                            errorType: 'VALIDATION_ERROR',
                            validationMessage: 'Invalid URL format',
                        },
                    })
                )
            )
        }

        if (validUrls.length === 0) {
            return {
                isDuplicates: false,
                cheerioUrls: [],
                puppeteerUrls: [],
            }
        }

        const duplicateResults = await this.isDuplicateUrls(validUrls)

        const { duplicateUrls, newUrls } = Object.entries(duplicateResults).reduce(
            (acc, [url, isDuplicate]) => {
                if (isDuplicate) {
                    acc.duplicateUrls.push(url)
                } else {
                    acc.newUrls.push(url)
                }
                return acc
            },
            { duplicateUrls: [], newUrls: [] } as { duplicateUrls: string[]; newUrls: string[] }
        )

        const { cheerioUrls, puppeteerUrls } = this.urlAnalyzer.analyzeUrls(newUrls)

        // const newDuplicateUrls = duplicateUrls.filter((url) => !existingUrlSet.has(url))

        if (duplicateUrls.length > 0) {
            await Promise.all(
                duplicateUrls.map((url) =>
                    this.create({
                        scrapes_id: scrapeId,
                        url: url,
                        status: TransactionStatus.DUPLICATED,
                        content: '',
                        metadata: {
                            duplicateDetectedAt: new Date().toISOString(),
                            originalUrl: url,
                            validationMessage: 'URL has already been processed previously',
                        },
                    })
                )
            )
            return {
                isDuplicates: true,
                duplicateUrls,
                cheerioUrls,
                puppeteerUrls,
            }
        }
        return {
            duplicateUrls,
            cheerioUrls,
            puppeteerUrls,
        }
    }

    async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
        return await this.transactionRepository.create(createTransactionDto)
    }
    async findOne(id: string) {
        this.logger.log(`Retrieving transaction with ID: ${id}`)
        return await this.transactionRepository.findOne(id)
    }

    async findByScrapeId(scrapeId: string) {
        this.logger.log(`Retrieving transactions for scrape ID: ${scrapeId}`)
        return await this.transactionRepository.findByScrapeId(scrapeId)
    }

    async update(id: string, updateTransactionDto: UpdateTransactionDto) {
        this.logger.log(`Updating transaction with ID: ${id}`)
        return await this.transactionRepository.update(id, updateTransactionDto)
    }
}
