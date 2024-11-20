import { Injectable, Logger } from '@nestjs/common'
import { makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus'
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client'

const METRIC_PREFIX = 'scraper_'

@Injectable()
export class MonitoringService {
    private readonly logger = new Logger(MonitoringService.name)
    private registry: Registry
    private metricsInterval?: ReturnType<typeof setInterval>

    private cpuUsage: Gauge
    private memoryUsage: Gauge
    private eventLoopLag: Histogram
    private gcDuration: Histogram
    private activeHandles: Gauge
    private activeRequests: Gauge

    private httpRequestsTotal: Counter
    private httpRequestDuration: Histogram

    private scrapeRequestsTotal: Counter
    private scrapeRequestDuration: Histogram
    private activeScrapes: Gauge
    private scrapeErrors: Counter

    private queueSize: Gauge
    private jobsProcessed: Counter
    private jobsFailedTotal: Counter
    private jobsRetried: Counter
    private activeWorkers: Gauge

    private cacheHits: Counter
    private cacheMisses: Counter
    private cacheSize: Gauge
    private cacheLatency: Histogram

    private dbConnectionPool: Gauge
    private dbQueryDuration: Histogram
    private dbErrors: Counter
    private dbTransactions: Counter

    private readonly systemMetrics: {
        cpu: Gauge<string>
        memory: Gauge<string>
        eventLoop: Histogram<string>
        gc: Histogram<string>
    }

    constructor() {
        this.registry = new Registry()
        collectDefaultMetrics({
            register: this.registry,
            prefix: METRIC_PREFIX,
        })

        this.initializeSystemMetrics()
        this.initializeHttpMetrics()
        this.initializeScrapingMetrics()
        this.initializeQueueMetrics()
        this.initializeCacheMetrics()
        this.initializeDatabaseMetrics()

        this.startCollectingMetrics()

        this.systemMetrics = {
            cpu: new Gauge({
                name: `${METRIC_PREFIX}system_cpu_usage`,
                help: 'CPU usage percentage',
                labelNames: ['type'],
                registers: [this.registry],
            }),
            memory: new Gauge({
                name: `${METRIC_PREFIX}system_memory_usage_bytes`,
                help: 'Memory usage in bytes',
                labelNames: ['type'],
                registers: [this.registry],
            }),
            eventLoop: new Histogram({
                name: `${METRIC_PREFIX}system_event_loop_lag_seconds`,
                help: 'Event loop lag in seconds',
                buckets: [0.001, 0.01, 0.1, 1],
                registers: [this.registry],
            }),
            gc: new Histogram({
                name: `${METRIC_PREFIX}system_gc_duration_seconds`,
                help: 'Garbage collection duration',
                buckets: [0.001, 0.01, 0.1, 1],
                registers: [this.registry],
            }),
        }
    }

    public static providers = [
        makeGaugeProvider({
            name: 'system_cpu_usage',
            help: 'CPU usage percentage',
            labelNames: ['type'],
        }),
        makeGaugeProvider({
            name: 'system_memory_usage_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type'],
        }),
        makeHistogramProvider({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'path'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
        }),
    ]

    private startCollectingMetrics(): void {
        try {
            this.collectSystemMetrics()

            this.metricsInterval = setInterval(() => {
                this.collectSystemMetrics()
            }, 5000) as NodeJS.Timeout

            this.logger.log('Started collecting metrics')
        } catch (error) {
            this.logger.error(`Error starting metrics collection: ${error.message}`)
        }
    }

    private initializeSystemMetrics() {
        this.cpuUsage = new Gauge({
            name: 'system_cpu_usage',
            help: 'CPU usage percentage',
            labelNames: ['type'],
            registers: [this.registry],
        })

        this.memoryUsage = new Gauge({
            name: 'system_memory_usage_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type'],
            registers: [this.registry],
        })

        this.eventLoopLag = new Histogram({
            name: 'system_event_loop_lag_seconds',
            help: 'Event loop lag in seconds',
            buckets: [0.001, 0.01, 0.1, 1],
            registers: [this.registry],
        })

        this.gcDuration = new Histogram({
            name: 'system_gc_duration_seconds',
            help: 'Garbage collection duration',
            buckets: [0.001, 0.01, 0.1, 1],
            registers: [this.registry],
        })

        this.activeHandles = new Gauge({
            name: 'system_active_handles',
            help: 'Number of active handles',
            registers: [this.registry],
        })

        this.activeRequests = new Gauge({
            name: 'system_active_requests',
            help: 'Number of active requests',
            registers: [this.registry],
        })
    }

    private initializeHttpMetrics() {
        this.httpRequestsTotal = new Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'path', 'status'],
            registers: [this.registry],
        })

        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'path'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
            registers: [this.registry],
        })
    }

    private initializeScrapingMetrics() {
        this.scrapeRequestsTotal = new Counter({
            name: `${METRIC_PREFIX}scraping_requests_total`,
            help: 'Total number of scrape requests',
            labelNames: ['status', 'type', 'domain', 'content_type'],
            registers: [this.registry],
        })

        this.scrapeRequestDuration = new Histogram({
            name: `${METRIC_PREFIX}scraping_duration_seconds`,
            help: 'Duration of scraping requests',
            labelNames: ['type', 'domain', 'success'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
            registers: [this.registry],
        })
    }

    private initializeQueueMetrics() {
        this.queueSize = new Gauge({
            name: 'queue_size',
            help: 'Current size of the queue',
            labelNames: ['queue'],
            registers: [this.registry],
        })

        this.jobsProcessed = new Counter({
            name: 'jobs_processed_total',
            help: 'Total number of processed jobs',
            labelNames: ['queue', 'status'],
            registers: [this.registry],
        })

        this.jobsFailedTotal = new Counter({
            name: 'jobs_failed_total',
            help: 'Total number of failed jobs',
            labelNames: ['queue', 'error'],
            registers: [this.registry],
        })

        this.jobsRetried = new Counter({
            name: 'jobs_retried_total',
            help: 'Total number of retried jobs',
            labelNames: ['queue'],
            registers: [this.registry],
        })

        this.activeWorkers = new Gauge({
            name: 'active_workers',
            help: 'Number of active workers',
            labelNames: ['queue'],
            registers: [this.registry],
        })
    }

    private initializeCacheMetrics() {
        this.cacheHits = new Counter({
            name: 'cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['cache'],
            registers: [this.registry],
        })

        this.cacheMisses = new Counter({
            name: 'cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['cache'],
            registers: [this.registry],
        })

        this.cacheSize = new Gauge({
            name: 'cache_size_bytes',
            help: 'Current size of cache in bytes',
            labelNames: ['cache'],
            registers: [this.registry],
        })

        this.cacheLatency = new Histogram({
            name: 'cache_operation_duration_seconds',
            help: 'Duration of cache operations',
            labelNames: ['operation', 'cache'],
            buckets: [0.001, 0.01, 0.1, 0.5, 1],
            registers: [this.registry],
        })
    }

    private initializeDatabaseMetrics() {
        this.dbConnectionPool = new Gauge({
            name: 'db_connection_pool_size',
            help: 'Database connection pool size',
            labelNames: ['database'],
            registers: [this.registry],
        })

        this.dbQueryDuration = new Histogram({
            name: 'db_query_duration_seconds',
            help: 'Database query duration',
            labelNames: ['query', 'database'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
            registers: [this.registry],
        })

        this.dbErrors = new Counter({
            name: 'db_errors_total',
            help: 'Total number of database errors',
            labelNames: ['operation', 'database'],
            registers: [this.registry],
        })

        this.dbTransactions = new Counter({
            name: 'db_transactions_total',
            help: 'Total number of database transactions',
            labelNames: ['status', 'database'],
            registers: [this.registry],
        })
    }

    private collectSystemMetrics() {
        try {
            // CPU Usage
            const cpuUsage = process.cpuUsage()
            this.systemMetrics.cpu.labels({ type: 'user' }).set(cpuUsage.user / 1000000)
            this.systemMetrics.cpu.labels({ type: 'system' }).set(cpuUsage.system / 1000000)

            // Memory Usage
            const memUsage = process.memoryUsage()
            this.systemMetrics.memory.labels({ type: 'heapTotal' }).set(memUsage.heapTotal)
            this.systemMetrics.memory.labels({ type: 'heapUsed' }).set(memUsage.heapUsed)
            this.systemMetrics.memory.labels({ type: 'rss' }).set(memUsage.rss)
            this.systemMetrics.memory.labels({ type: 'external' }).set(memUsage.external)

            // Event Loop Lag
            const start = Date.now()
            setImmediate(() => {
                const lag = Date.now() - start
                this.systemMetrics.eventLoop.observe(lag / 1000)
            })
        } catch (error) {
            this.logger.error(`Error collecting system metrics: ${error.message}`)
        }
    }

    async getCpuUsage(): Promise<{ user: number; system: number }> {
        try {
            const metrics = await this.registry.getMetricsAsJSON()
            const cpuMetrics = metrics.find((m) => m.name === `${METRIC_PREFIX}system_cpu_usage`)

            const userValue = cpuMetrics?.values?.find((v) => v.labels?.type === 'user')?.value || 0
            const systemValue =
                cpuMetrics?.values?.find((v) => v.labels?.type === 'system')?.value || 0

            return {
                user: Number(userValue),
                system: Number(systemValue),
            }
        } catch (error) {
            this.logger.error(`Error getting CPU usage: ${error.message}`)
            return {
                user: 0,
                system: 0,
            }
        }
    }

    async getMemoryUsage(): Promise<{
        heapTotal: number
        heapUsed: number
        rss: number
        external: number
    }> {
        try {
            const metrics = await this.registry.getMetricsAsJSON()
            const memoryMetrics = metrics.find(
                (m) => m.name === `${METRIC_PREFIX}system_memory_usage_bytes`
            )

            const heapTotal =
                memoryMetrics?.values?.find((v) => v.labels?.type === 'heapTotal')?.value || 0
            const heapUsed =
                memoryMetrics?.values?.find((v) => v.labels?.type === 'heapUsed')?.value || 0
            const rss = memoryMetrics?.values?.find((v) => v.labels?.type === 'rss')?.value || 0
            const external =
                memoryMetrics?.values?.find((v) => v.labels?.type === 'external')?.value || 0

            return {
                heapTotal: Number(heapTotal),
                heapUsed: Number(heapUsed),
                rss: Number(rss),
                external: Number(external),
            }
        } catch (error) {
            this.logger.error(`Error getting memory usage: ${error.message}`)
            return {
                heapTotal: 0,
                heapUsed: 0,
                rss: 0,
                external: 0,
            }
        }
    }

    async getActiveScrapes(): Promise<{ [key: string]: number }> {
        const types = ['cheerio', 'puppeteer']
        const result: { [key: string]: number } = {}
        for (const type of types) {
            result[type] = Number(await this.activeScrapes.labels(type))
        }
        return result
    }

    recordHttpRequest(method: string, path: string, status: number, duration: number) {
        this.httpRequestsTotal.labels(method, path, status.toString()).inc()
        this.httpRequestDuration.labels(method, path).observe(duration)
    }

    recordScrapeRequest(status: string, type: string) {
        this.scrapeRequestsTotal.labels(status, type).inc()
    }

    startScrapeTimer(type: string) {
        return this.scrapeRequestDuration.labels(type).startTimer()
    }

    incrementActiveScrapes(type: string) {
        this.activeScrapes.labels(type).inc()
    }

    decrementActiveScrapes(type: string) {
        this.activeScrapes.labels(type).dec()
    }

    recordScrapeError(type: string, error: string) {
        this.scrapeErrors.labels(type, error).inc()
    }

    setQueueSize(queue: string, size: number) {
        this.queueSize.labels(queue).set(size)
    }

    recordJobProcessed(queue: string, status: string) {
        this.jobsProcessed.labels(queue, status).inc()
    }

    recordJobFailed(queue: string, error: string) {
        this.jobsFailedTotal.labels(queue, error).inc()
    }

    recordJobRetry(queue: string) {
        this.jobsRetried.labels(queue).inc()
    }

    setActiveWorkers(queue: string, count: number) {
        this.activeWorkers.labels(queue).set(count)
    }

    recordCacheHit(cache: string) {
        this.cacheHits.labels(cache).inc()
    }

    recordCacheMiss(cache: string) {
        this.cacheMisses.labels(cache).inc()
    }

    setCacheSize(cache: string, size: number) {
        this.cacheSize.labels(cache).set(size)
    }

    startCacheOperationTimer(operation: string, cache: string) {
        return this.cacheLatency.labels(operation, cache).startTimer()
    }

    recordDbQuery(query: string, database: string) {
        return this.dbQueryDuration.labels(query, database).startTimer()
    }

    recordDbError(operation: string, database: string) {
        this.dbErrors.labels(operation, database).inc()
    }

    recordDbTransaction(status: string, database: string) {
        this.dbTransactions.labels(status, database).inc()
    }

    trackScraping(domain: string, type: string) {
        const timer = this.scrapeRequestDuration.startTimer()

        return {
            success: () => {
                this.scrapeRequestsTotal.labels('success', type, domain).inc()
                timer({ success: 'true' })
            },
            error: (error: string) => {
                this.scrapeRequestsTotal.labels('error', type, domain).inc()
                this.scrapeErrors.labels(type, error, domain).inc()
                timer({ success: 'false' })
            },
        }
    }

    trackQueueOperation(queueName: string) {
        return {
            addJob: () => this.queueSize.labels(queueName).inc(),
            completeJob: () => {
                this.queueSize.labels(queueName).dec()
                this.jobsProcessed.labels(queueName, 'success').inc()
            },
            failJob: (error: string) => {
                this.queueSize.labels(queueName).dec()
                this.jobsFailedTotal.labels(queueName, error).inc()
            },
        }
    }

    async getMetrics(): Promise<string> {
        return this.registry.metrics()
    }

    onModuleDestroy() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval)
            this.metricsInterval = undefined
            this.logger.log('Stopped collecting metrics')
        }
    }
}
