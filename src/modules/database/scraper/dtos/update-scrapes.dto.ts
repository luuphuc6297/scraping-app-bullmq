import { IsEnum, IsNumber, IsOptional } from 'class-validator'
import { ScrapeStatus } from 'src/infrastructure/constants/scrape.enum'

export class UpdateScrapeDto {
    @IsOptional()
    @IsEnum(ScrapeStatus)
    status?: ScrapeStatus

    @IsOptional()
    @IsNumber()
    total_urls?: number

    updated_at: Date
}
