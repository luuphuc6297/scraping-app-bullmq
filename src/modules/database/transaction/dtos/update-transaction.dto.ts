import { IsEnum, IsOptional, IsString } from 'class-validator'
import { TransactionStatus } from 'src/infrastructure/constants/transaction.enum'

export class UpdateTransactionDto {
    @IsEnum(TransactionStatus)
    @IsOptional()
    status?: TransactionStatus

    @IsString()
    @IsOptional()
    tag?: string

    @IsString()
    @IsOptional()
    content?: string
}
