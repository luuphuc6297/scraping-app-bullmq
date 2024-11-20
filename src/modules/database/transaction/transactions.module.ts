import { Module } from '@nestjs/common'
import { SharedModule } from 'src/modules/shared.module'

@Module({
    imports: [SharedModule],
})
export class TransactionsModule {}
