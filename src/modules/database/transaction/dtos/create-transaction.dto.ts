import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator'
import { TransactionStatus } from 'src/infrastructure/constants/transaction.enum'

export class CreateTransactionDto {
    @IsNotEmpty()
    @IsUUID()
    scrapes_id: string

    @IsNotEmpty()
    @IsString()
    url: string

    @IsEnum(TransactionStatus)
    @IsOptional()
    status?: TransactionStatus

    @IsString()
    @IsOptional()
    tag?: string

    @IsString()
    @IsOptional()
    content?: string

    @IsOptional()
    @IsObject()
    metadata?: {
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
}
