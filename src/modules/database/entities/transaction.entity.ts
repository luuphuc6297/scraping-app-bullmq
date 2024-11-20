import { TransactionStatus } from 'src/infrastructure/constants/transaction.enum'
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { Scrape } from './scrape.entity'

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    scrapes_id: string

    @Index('idx_transaction_url_scrape', ['url', 'scrapes_id'], { unique: true })
    @Column('text', { unique: true })
    url: string

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PROCESSING,
    })
    status: string

    @Column({ nullable: true })
    tag: string

    @Column('text', { nullable: true })
    content: string

    @Column('jsonb', {
        nullable: true,
        default: () => `'{
            "title": null,
            "description": null,
            "keywords": null,
            "contentType": null,
            "ogTitle": null,
            "ogDescription": null
        }'::jsonb`,
    })
    metadata: {
        title?: string
        description?: string
        keywords?: string
        contentType?: string
        ogTitle?: string
        ogDescription?: string
        errorType?: string
        stackTrace?: string
        validationError?: string
        [key: string]: any
    }

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @ManyToOne(() => Scrape, (scrape) => scrape.transactions)
    @JoinColumn({ name: 'scrapes_id' })
    scrape: Scrape
}
