import { Module } from '@nestjs/common'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'
import { SharedModule } from '../shared.module'
import { MonitoringController } from './controllers/monitoring.controller'

@Module({
    imports: [
        SharedModule,
        PrometheusModule.register({
            defaultMetrics: {
                enabled: true,
                config: {
                    prefix: 'scraper_',
                },
            },
        }),
    ],
    controllers: [MonitoringController],
    exports: [PrometheusModule],
})
export class MonitoringModule {}