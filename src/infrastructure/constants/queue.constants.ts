export const QUEUE_SCRAPING_CONFIG = {
    QUEUE_NAME: 'scraping-queue',
    SIZE_LIMIT: 100000000,
    STACK_TRACE_LIMIT: 100000000,
    PRODUCER_NAME: 'scraping-queue-producer',
    FLOW_PRODUCER: {
        MAIN: 'scraping-queue-flow-producer-main',
        CHILDREN: 'scraping-queue-flow-producer-children',
    },
    JOB_NAME: {
        MAIN_PROCESS: 'main-scraping-process',
        CHILDREN_PROCESS: 'children-scraping-process',
    },
    WORKER_CONFIG: {
        MAIN: {
            COUNT: 1,
            CONCURRENCY: 10,
        },
        CHILDREN: {
            COUNT: 1,
            CONCURRENCY: 50,
            LIMITER: {
                DURATION: 60000,
                MAX: 50,
            },
        },
    },
    RATE_LIMIT: {
        MAX_JOBS: 100,
        DURATION: 60000,
        BATCH_SIZE: 500,
    },
    MEMORY_LIMIT: {
        MAX_MEMORY_PERCENT: 80,
        CHECK_INTERVAL: 5000,
        PAUSE_DURATION: 10000,
    },
    JOB_ATTEMPTS: 3,
    BACKOFF: {
        TYPE: 'exponential',
        DELAY: 60000,
    },
    CPU_LIMIT: {
        MAX_CPU_PERCENT: 80,
        CHECK_INTERVAL: 5000,
    },
    REMOVE_ON_COMPLETE: 100,
    REMOVE_ON_FAIL: 100,
}

export const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
}
