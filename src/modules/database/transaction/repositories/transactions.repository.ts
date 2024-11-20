import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Transaction } from '../../entities/transaction.entity'
import { CreateTransactionDto } from '../dtos/create-transaction.dto'
import { UpdateTransactionDto } from '../dtos/update-transaction.dto'

@Injectable()
export class TransactionRepository {
    constructor(
        @InjectRepository(Transaction)
        private readonly repository: Repository<Transaction>
    ) {}

    async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
        const transaction = this.repository.create(createTransactionDto)
        return await this.repository.save(transaction)
    }

    async findOne(id: string): Promise<Transaction> {
        return await this.repository.findOne({ where: { id } })
    }

    async findByScrapeId(scrapeId: string): Promise<Transaction[]> {
        return await this.repository.find({ where: { scrapes_id: scrapeId } })
    }

    async update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
        await this.repository.update(id, updateTransactionDto)
        return await this.findOne(id)
    }

    async findByUrl(url: string): Promise<Transaction | null> {
        return await this.repository.findOne({ where: { url } })
    }

    async findByUrls(urls: string[]): Promise<Transaction[]> {
        if (!urls.length) return []

        return await this.repository
            .createQueryBuilder('transaction')
            .where('transaction.url IN (:...urls)', { urls })
            .getMany()
    }

    async isDuplicateUrl(url: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { url },
        })
        return count > 0
    }

    async isDuplicateUrls(urls: string[]): Promise<Record<string, boolean>> {
        const existingUrls = await this.repository
            .createQueryBuilder('transaction')
            .select('transaction.url')
            .where('transaction.url IN (:...urls)', { urls })
            .getRawMany()

        const duplicateMap = existingUrls.reduce(
            (acc, { transaction_url }) => {
                acc[transaction_url] = true
                return acc
            },
            {} as Record<string, boolean>
        )

        return urls.reduce(
            (acc, url) => {
                acc[url] = !!duplicateMap[url]
                return acc
            },
            {} as Record<string, boolean>
        )
    }
}
