import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Scrape } from '../../entities/scrape.entity'
import { CreateScrapeDto } from '../dtos/create-scrapes.dto'
import { UpdateScrapeDto } from '../dtos/update-scrapes.dto'

@Injectable()
export class ScrapeRepository {
    constructor(
        @InjectRepository(Scrape)
        private readonly repository: Repository<Scrape>
    ) {}

    async create(createScrapeDto: CreateScrapeDto): Promise<Scrape> {
        const scrape = this.repository.create(createScrapeDto)
        return await this.repository.save(scrape)
    }

    async findAll(filters?: Record<string, any>): Promise<Scrape[]> {
        return await this.repository.find()
    }

    async findOne(id: string): Promise<Scrape> {
        return await this.repository.findOne({ where: { id } })
    }

    async update(id: string, updateScrapeDto: UpdateScrapeDto): Promise<Scrape> {
        await this.repository.update(id, updateScrapeDto)
        return await this.findOne(id)
    }

    async remove(id: string): Promise<void> {
        await this.repository.delete(id)
    }
}
