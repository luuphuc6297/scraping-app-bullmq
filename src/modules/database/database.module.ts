import { Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Log } from './entities/log.entity'
import { Scrape } from './entities/scrape.entity'
import { Transaction } from './entities/transaction.entity'
import { configs } from 'src/configs'

@Global()
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: () => ({
                type: 'postgres',
                host: configs.postgres.host,
                port: configs.postgres.port,
                username: configs.postgres.username,
                password: configs.postgres.password,
                database: configs.postgres.database,
                entities: [Scrape, Transaction, Log],
                synchronize: process.env.NODE_ENV !== 'production',
                ssl: process.env.NODE_ENV === 'production',
                logging: ['error'],
                logger: 'advanced-console',
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([Scrape, Transaction, Log]),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule {}
