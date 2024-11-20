import { ExpressAdapter } from '@bull-board/express'
import { BullBoardModule } from '@bull-board/nestjs'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CoreModule } from './modules/core.module'
import { BullModule } from '@nestjs/bullmq'
import { configs } from './configs'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        BullModule.forRoot({
            connection: {
                host: configs.redis.connection.host,
                port: configs.redis.connection.port,
            },
        }),
        BullBoardModule.forRoot({
            route: '/admin/queues',
            adapter: ExpressAdapter,
        }),
        CoreModule,
    ],
})
export class AppModule {}
