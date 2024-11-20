import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { configs } from './configs'
import * as express from 'express'

async function bootstrap() {
    const logger = new Logger('Bootstrap')

    try {
        logger.log('Starting application...')
        const app = await NestFactory.create(AppModule)

        // Enable express middleware
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        // Database connection check
        logger.log(
            `Connecting to PostgreSQL at ${configs.postgres.host}:${configs.postgres.port}...`
        )
        logger.log(
            `Connecting to Redis at ${configs.redis.connection.host}:${configs.redis.connection.port}...`
        )

        await app.listen(configs.server.port)

        logger.log('🚀 Application is running on:')
        logger.log(`📝 Local: http://localhost:${configs.server.port}`)
        logger.log(`🔧 Environment: ${process.env.NODE_ENV}`)
        logger.log('📊 Service Status:')
        logger.log(`   - PostgreSQL: Connected (${configs.postgres.host}:${configs.postgres.port})`)
        logger.log(
            `   - Redis: Connected (${configs.redis.connection.host}:${configs.redis.connection.port})`
        )
        logger.log(`   - Bull Dashboard: http://localhost:${configs.server.port}/admin/queues`)
        logger.log('🛠️ Configuration:')
        logger.log(`   - Scraper Concurrency: ${configs.scraper.concurrency}`)
        logger.log(`   - Scraper Batch Size: ${configs.scraper.batchSize}`)
        logger.log(`   - Scraper Retries: ${configs.scraper.retries}`)
        logger.log(`   - Scraper Timeout: ${configs.scraper.timeout}ms`)
    } catch (error) {
        logger.error('❌ Failed to start application:')
        logger.error(`   - Error: ${error.message}`)
        process.exit(1)
    }
}

bootstrap()
