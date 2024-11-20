import { Injectable, Logger } from '@nestjs/common'
import * as puppeteer from 'puppeteer'
import { ContentType } from '../interfaces/content-type.enum'

@Injectable()
export class PageConfigService {
    private readonly logger = new Logger(PageConfigService.name)

    private readonly popupSelectors = [
        // Common consent buttons
        'button[aria-label="Accept all"]',
        '.modal-close',
        '.popup-close',
        '.consent-button',
        '[data-testid="close-button"]',
        // Cookie consent
        '#accept-cookie-consent',
        '.cookie-accept',
        '[aria-label*="cookie"]',
        'button[class*="cookie"]',
        // Age verification
        '.age-verification-yes',
        '#age-gate-button',
        // GDPR related
        '.gdpr-accept',
        '#gdpr-consent-accept',
        '[aria-label*="gdpr"]',
        // Newsletter popups
        '.newsletter-popup-close',
        '.subscribe-popup-close',
        '#newsletter-modal .close',
        // Generic close buttons
        '.close-button',
        '.dismiss-button',
        '[aria-label="Close"]',
        '.modal .close',
        // YouTube specific
        '.ytp-ad-skip-button',
        '.ytp-ad-overlay-close-button',
        // Social media popups
        '.social-popup-close',
        '.share-modal-close',
    ]

    private readonly contentTypeSelectors = {
        [ContentType.VIDEO]: [
            'video',
            'iframe[src*="youtube"]',
            'iframe[src*="vimeo"]',
            '#movie_player',
            '.html5-video-container',
            '.video-js',
            '[data-video-id]',
            '.plyr',
            '.jwplayer',
        ],
        [ContentType.IMAGE]: [
            'img[src]',
            'picture',
            '[style*="background-image"]',
            '.gallery',
            '.slideshow',
            '[data-fancybox]',
            '.lightbox',
        ],
        [ContentType.TEXT]: [
            'article',
            'main',
            '.content',
            '#content',
            '.post-content',
            '.entry-content',
            '.article-body',
            '.blog-post',
        ],
        [ContentType.DEFAULT]: ['body'],
    }

    async configurePage(page: puppeteer.Page, contentType: ContentType): Promise<void> {
        try {
            await this.setUserAgent(page)
            await this.configureViewport(page)
            await this.setupRequestInterception(page, contentType)
            await this.setupPageBehavior(page)
            await this.setupPerformanceOptimizations(page)
        } catch (error) {
            this.logger.warn(`Error configuring page: ${error.message}`)
        }
    }

    private async setupPageBehavior(page: puppeteer.Page): Promise<void> {
        // Set default timeouts
        page.setDefaultTimeout(30000)
        page.setDefaultNavigationTimeout(30000)

        // Handle dialog events
        page.on('dialog', async (dialog) => {
            this.logger.debug(`Handling dialog: ${dialog.type()} with message: ${dialog.message()}`)
            await dialog.dismiss().catch(() => {})
        })

        // Handle frame events
        page.on('frameattached', (frame) => {
            this.logger.debug(`New frame attached: ${frame.url()}`)
        })

        page.on('framedetached', (frame) => {
            this.logger.debug(`Frame detached: ${frame.url()}`)
        })

        // Handle console messages
        page.on('console', (msg) => {
            const type = msg.type()
            if (type === 'error' || type === 'warn') {
                this.logger.debug(`Console ${type}: ${msg.text()}`)
            }
        })

        // Handle page errors
        page.on('error', (error) => {
            this.logger.error(`Page error: ${error.message}`)
        })

        // Handle request failures
        page.on('requestfailed', (request) => {
            this.logger.debug(`Request failed: ${request.url()} ${request.failure()?.errorText}`)
        })
    }

    private async setupPerformanceOptimizations(page: puppeteer.Page): Promise<void> {
        // Disable unnecessary features
        await page.evaluate(() => {
            window.scrollTo = function (x: number | ScrollToOptions, y?: number) {
                if (typeof x === 'object') {
                    document.documentElement.scrollTop = x.top || 0
                    document.body.scrollTop = x.top || 0
                } else {
                    document.documentElement.scrollTop = y || 0
                    document.body.scrollTop = y || 0
                }
            }
        })

        // Block unnecessary resource types
        await page.setRequestInterception(true)
        page.on('request', (request) => {
            const resourceType = request.resourceType()
            if (['font', 'image', 'media'].includes(resourceType)) {
                request.abort()
            } else {
                request.continue()
            }
        })

        // Enable JavaScript execution
        await page.setJavaScriptEnabled(true)

        // Set cache enabled
        const session = await page.target().createCDPSession()
        await session.send('Network.enable')
        await session.send('Network.setCacheDisabled', { cacheDisabled: false })
    }

    async navigateAndWait(
        page: puppeteer.Page,
        url: string,
        contentType: ContentType
    ): Promise<void> {
        try {
            // Set up navigation promise
            const navigationPromise = page.goto(url, {
                waitUntil: ['domcontentloaded', 'networkidle0'],
                timeout: 30000,
            })

            // Handle race condition with navigation and popup
            await Promise.all([navigationPromise, this.handleInitialPopups(page)])

            // Wait for specific content
            await this.waitForContentType(page, contentType)

            // Handle post-navigation popups
            await this.handlePopups(page)

            // Scroll for lazy loading with improved error handling
            await this.enhancedAutoScroll(page)
        } catch (error) {
            this.logger.error(`Navigation error for ${url}: ${error.message}`)
        }
    }

    private async waitForContentType(
        page: puppeteer.Page,
        contentType: ContentType
    ): Promise<void> {
        const selectors = this.contentTypeSelectors[contentType]

        try {
            await Promise.race([
                ...selectors.map((selector) =>
                    page.waitForSelector(selector, { timeout: 5000 }).catch(() => null)
                ),
                new Promise((resolve) => setTimeout(resolve, 5000)),
            ])
        } catch (error) {
            this.logger.warn(`Timeout waiting for content type selectors: ${error.message}`)
        }
    }

    private async handleInitialPopups(page: puppeteer.Page): Promise<void> {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const frames = await page.frames()
            for (const frame of frames) {
                if (!frame.isDetached()) {
                    for (const selector of this.popupSelectors) {
                        try {
                            const element = await frame.$(selector)
                            if (element) {
                                await element.click().catch(() => {})
                                await new Promise((resolve) => setTimeout(resolve, 500))
                            }
                        } catch (error) {
                            this.logger.debug(`Popup handling for ${selector}: ${error.message}`)
                            continue
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.warn(`Initial popup handling error: ${error.message}`)
        }
    }

    private async handlePopups(page: puppeteer.Page): Promise<void> {
        try {
            // Handle main frame popups
            for (const selector of this.popupSelectors) {
                try {
                    const element = await page.$(selector)
                    if (element) {
                        await element.evaluate((el: HTMLElement) => {
                            el.click()
                            el.remove()
                        })
                        await new Promise((resolve) => setTimeout(resolve, 500))
                        this.logger.debug(`Closed popup with selector: ${selector}`)
                    }
                } catch (error) {
                    this.logger.debug(`Popup handling for ${selector}: ${error.message}`)
                    continue
                }
            }

            // Handle shadow DOM
            await page.evaluate(() => {
                function findAndClickInShadowDOM(root: Document | ShadowRoot) {
                    const closeButtons = root.querySelectorAll('button, [role="button"]')
                    closeButtons.forEach((button) => {
                        const text = button.textContent?.toLowerCase() || ''
                        if (
                            text.includes('accept') ||
                            text.includes('close') ||
                            text.includes('got it')
                        ) {
                            ;(button as HTMLElement).click()
                        }
                    })

                    root.querySelectorAll('*').forEach((element) => {
                        if (element.shadowRoot) {
                            findAndClickInShadowDOM(element.shadowRoot)
                        }
                    })
                }
                findAndClickInShadowDOM(document)
            })

            // Handle iframes
            const frames = page.frames()
            for (const frame of frames) {
                if (!frame.isDetached()) {
                    await this.handleFramePopups(frame)
                }
            }
        } catch (error) {
            this.logger.warn(`Error in popup handling: ${error.message}`)
        }
    }

    private async handleFramePopups(frame: puppeteer.Frame): Promise<void> {
        try {
            for (const selector of this.popupSelectors) {
                const element = await frame.$(selector)
                if (element) {
                    await element.click().catch(() => {})
                    await new Promise((resolve) => setTimeout(resolve, 500))
                }
            }
        } catch (error) {
            this.logger.debug(`Frame popup handling error: ${error.message}`)
        }
    }

    private async enhancedAutoScroll(page: puppeteer.Page): Promise<void> {
        try {
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let totalHeight = 0
                    let distance = 100
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight
                        window.scrollBy(0, distance)
                        totalHeight += distance

                        // Dynamic scroll adjustment
                        if (totalHeight > scrollHeight / 2) {
                            distance = 50 // Slow down for better content loading
                        }

                        // Check if we've reached the bottom
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer)
                            // Scroll back up partially to trigger any missed lazy loading
                            window.scrollTo(0, scrollHeight / 2)
                            setTimeout(() => {
                                window.scrollTo(0, scrollHeight)
                                resolve()
                            }, 1000)
                        }
                    }, 100)

                    // Timeout after 30 seconds
                    setTimeout(() => {
                        clearInterval(timer)
                        resolve()
                    }, 30000)
                })
            })
            // Additional wait for lazy loaded content
            await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (error) {
            this.logger.warn(`Auto-scroll error: ${error.message}`)
        }
    }

    private async setUserAgent(page: puppeteer.Page): Promise<void> {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        ]
        await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)])
    }

    private async configureViewport(page: puppeteer.Page): Promise<void> {
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        })
    }

    private async setupRequestInterception(
        page: puppeteer.Page,
        contentType: ContentType
    ): Promise<void> {
        await page.setRequestInterception(true)

        const urls = new Set<string>()

        page.on('request', (request) => {
            const resourceType = request.resourceType()
            const url = request.url()

            if (this.shouldInterceptRequest(resourceType, url, contentType)) {
                urls.add(url)
                this.logger.debug(`Found ${contentType} URL: ${url}`)
                request.continue()
            } else if (this.shouldBlockResource(resourceType, contentType)) {
                request.abort()
            } else {
                request.continue()
            }
        })

        this.setupResponseMonitoring(page, contentType, urls)
    }

    private shouldInterceptRequest(
        resourceType: string,
        url: string,
        contentType: ContentType
    ): boolean {
        const videoPatterns = [/\.(mp4|webm|ogg)$/i, /videoplayback/, /manifest\.m3u8/, /\.ts\?/]

        const imagePatterns = [/\.(jpg|jpeg|png|gif|webp|svg)$/i, /image\//, /\.cdn\./]

        switch (contentType) {
            case ContentType.VIDEO:
                return (
                    resourceType === 'media' || videoPatterns.some((pattern) => pattern.test(url))
                )
            case ContentType.IMAGE:
                return (
                    resourceType === 'image' || imagePatterns.some((pattern) => pattern.test(url))
                )
            default:
                return false
        }
    }

    private shouldBlockResource(resourceType: string, contentType: ContentType): boolean {
        const commonBlockedTypes = ['font', 'stylesheet', 'media']

        switch (contentType) {
            case ContentType.VIDEO:
                return [...commonBlockedTypes, 'image'].includes(resourceType)
            case ContentType.IMAGE:
                return [...commonBlockedTypes, 'media'].includes(resourceType)
            case ContentType.TEXT:
                return [...commonBlockedTypes, 'image', 'media'].includes(resourceType)
            default:
                return commonBlockedTypes.includes(resourceType)
        }
    }

    private setupResponseMonitoring(
        page: puppeteer.Page,
        contentType: ContentType,
        urls: Set<string>
    ): void {
        page.on('response', async (response) => {
            try {
                const url = response.url()
                const headers = response.headers()
                const status = response.status()

                if (status === 200 && this.isContentTypeResponse(headers, url, contentType)) {
                    this.logger.debug(`${contentType} response detected: ${url}`)
                    urls.add(url)
                }
            } catch (error) {
                this.logger.warn(`Error monitoring response: ${error.message}`)
            }
        })
    }

    private isContentTypeResponse(
        headers: Record<string, string>,
        url: string,
        contentType: ContentType
    ): boolean {
        const contentTypeHeader = headers['content-type'] || ''

        switch (contentType) {
            case ContentType.VIDEO:
                return (
                    contentTypeHeader.includes('video') ||
                    url.includes('videoplayback') ||
                    /\.(mp4|webm|ogg)$/i.test(url) ||
                    /manifest\.m3u8/.test(url)
                )
            case ContentType.IMAGE:
                return (
                    contentTypeHeader.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                )
            default:
                return false
        }
    }
}
