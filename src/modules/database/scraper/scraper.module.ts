import { Module } from '@nestjs/common'
import { SharedModule } from 'src/modules/shared.module'
import { ScraperController } from './controllers/scraper.controller'

@Module({
    imports: [SharedModule],
    controllers: [ScraperController],
})
export class ScraperModule {}
