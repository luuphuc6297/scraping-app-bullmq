export const configs = {
    postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DB || 'scraper_db',
    },
    redis: {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        cacheTTL: 3600,
    },
    server: {
        port: parseInt(process.env.PORT || '3000'),
    },
    scraper: {
        concurrency: parseInt(process.env.SCRAPER_CONCURRENCY || '10'),
        timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000'),
        retries: parseInt(process.env.SCRAPER_RETRIES || '3'),
        batchSize: parseInt(process.env.SCRAPER_BATCH_SIZE || '100'),
    },
    auth: {
        apiKey: process.env.API_KEY || 'momos-api-key',
    },
}
