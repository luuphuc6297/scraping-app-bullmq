import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'
import { LogType } from 'src/modules/database/logs/dtos/create-logs.dto'
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { Scrape } from './scrape.entity'

@Entity('logs')
export class Log {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    scrapes_id: string

    @Column({
        type: 'enum',
        enum: LogType,
    })
    type: LogType

    @Column({
        type: 'enum',
        enum: ProcessingStatus,
    })
    status: ProcessingStatus

    @Column()
    message: string

    @Column('jsonb', { nullable: true })
    metadata: Record<string, any>

    @Column('integer', { nullable: true })
    duration?: number

    @Column('integer', { nullable: true })
    length?: number

    @Column('integer', { nullable: true })
    succeed?: number

    @Column('integer', { nullable: true })
    failed?: number

    @Column({ nullable: true })
    completed_at?: Date

    @CreateDateColumn()
    created_at: Date

    @ManyToOne(() => Scrape, (scrape) => scrape.logs)
    @JoinColumn({ name: 'scrapes_id' })
    scrape: Scrape
}
