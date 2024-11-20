import { Controller, Get } from '@nestjs/common'
import { MonitoringService } from '../services/monitoring.services'

@Controller('monitoring')
export class MonitoringController {
    constructor(private readonly monitoringService: MonitoringService) {}

    @Get('metrics')
    async getMetrics(): Promise<string> {
        return this.monitoringService.getMetrics()
    }

    @Get('summary')
    async getMetricsSummary() {
        const [cpu, memory] = await Promise.all([
            this.monitoringService.getCpuUsage(),
            this.monitoringService.getMemoryUsage(),
            // this.monitoringService.getActiveScrapes(),
        ])

        return {
            system: {
                cpu,
                memory,
            },
            timestamp: new Date().toISOString(),
        }
    }

    @Get('health')
    async getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        }
    }
}
