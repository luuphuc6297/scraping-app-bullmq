import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'
import { ScrapeStatus } from 'src/infrastructure/constants/scrape.enum'

export class CreateScrapeDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    urls: string[]

    @IsOptional()
    @IsEnum(ScrapeStatus)
    status?: ScrapeStatus

    @IsOptional()
    @IsObject()
    options?: Record<string, any>

    created_at: Date
}
