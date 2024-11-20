import { ScrapeStatus } from 'src/infrastructure/constants/scrape.enum'
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { Log } from './log.entity'
import { Transaction } from './transaction.entity'

@Entity('scrapes')
export class Scrape {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text', { array: true })
    urls: string[]

    @Column({
        type: 'enum',
        enum: ScrapeStatus,
        default: ScrapeStatus.PROCESSING,
    })
    status: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @OneToMany(() => Transaction, (transaction) => transaction.scrape)
    transactions: Transaction[]

    @OneToMany(() => Log, (log) => log.scrape)
    logs: Log[]
}
