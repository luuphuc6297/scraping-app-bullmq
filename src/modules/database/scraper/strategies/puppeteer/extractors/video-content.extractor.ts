import { Injectable, Logger } from '@nestjs/common'
import * as puppeteer from 'puppeteer'
import { IContentExtractor } from '../interfaces/content-extractor.interface'
import { ContentType } from '../interfaces/content-type.enum'
import { IVideoContent, IVideoMetadata } from '../interfaces/video-content.interface'

type Platform = 'youtube' | 'vimeo' | 'dailymotion' | 'default'

@Injectable()
export class VideoContentExtractor implements IContentExtractor {
    private readonly logger = new Logger(VideoContentExtractor.name)

    private readonly platformPatterns = {
        youtube: [/youtube\.com\/watch\?v=/, /youtube\.com\/embed\//, /youtu\.be\//],
        vimeo: [/vimeo\.com\//],
        dailymotion: [/dailymotion\.com\/video\//],
    }

    private readonly platformSelectors = {
        youtube: {
            title: [
                'h1.ytd-video-primary-info-renderer',
                '#container h1.ytd-watch-metadata',
                'meta[property="og:title"]',
                'meta[name="twitter:title"]',
            ],
            views: [
                'span.ytd-video-view-count-renderer',
                '#count .ytd-video-view-count-renderer',
                '#info-container .ytd-video-view-count-renderer',
            ],
            likes: [
                'ytd-menu-renderer span.ytd-toggle-button-renderer',
                '#top-level-buttons-computed span.ytd-toggle-button-renderer',
            ],
            channelName: [
                'ytd-channel-name yt-formatted-string',
                '#channel-name yt-formatted-string',
                '#owner-name a',
            ],
            videoElement: ['video', '.html5-main-video', '#movie_player video', '.video-stream'],
            container: ['ytd-watch-flexy', '#movie_player', '.html5-video-player'],
        },
        vimeo: {
            title: ['.vp-title', 'meta[property="og:title"]', 'meta[name="twitter:title"]'],
            views: ['.vp-stats'],
            likes: ['.vp-likes'],
            channelName: ['.vp-creator'],
            videoElement: ['.vp-video', 'video'],
            container: ['.vp-player-ui', '#player'],
        },
        dailymotion: {
            title: ['.video-title', 'meta[property="og:title"]', 'meta[name="twitter:title"]'],
            views: ['.video-views'],
            likes: ['.video-likes'],
            channelName: ['.video-channel'],
            videoElement: ['video', '.dm-video'],
            container: ['.video-player'],
        },
        default: {
            title: [
                'meta[property="og:title"]',
                'meta[name="twitter:title"]',
                'meta[itemprop="name"]',
            ],
            videoElement: ['video'],
            container: ['.video-player', '.video-container', '[data-video-id]'],
        },
    }

    async extract(
        page: puppeteer.Page,
        url: string
    ): Promise<{ content: IVideoContent; metadata: IVideoMetadata }> {
        try {
            const platform = this.detectPlatform(url)
            this.logger.debug(`Detected platform: ${platform} for URL: ${url}`)

            await this.waitForVideoElements(page, platform)

            const result = await page.evaluate(
                (data) => {
                    const { platform, selectors } = data

                    const getFirstMatch = (selectorList: string[]) => {
                        for (const selector of selectorList) {
                            const element = document.querySelector(selector)
                            if (element) {
                                const content = selector.includes('meta')
                                    ? element.getAttribute('content')
                                    : element.textContent
                                return content?.trim() || null
                            }
                        }
                        return null
                    }

                    const getVideoElement = () => {
                        const videoSelectors = selectors[platform].videoElement
                        for (const selector of videoSelectors) {
                            const element = document.querySelector(selector)
                            if (element) return element as HTMLVideoElement
                        }
                        return null
                    }

                    const getQualities = () => {
                        const qualitySelectors = {
                            youtube: [
                                '.ytp-quality-menu .ytp-menuitem',
                                '.ytp-settings-menu .ytp-menuitem',
                            ],
                            vimeo: ['.vp-quality-menu button'],
                            dailymotion: ['.quality-menu button'],
                            default: [],
                        }

                        const platformSelectors =
                            qualitySelectors[platform] || qualitySelectors.default
                        for (const selector of platformSelectors) {
                            const elements = document.querySelectorAll(selector)
                            if (elements.length) {
                                return Array.from(elements)
                                    .map((el) => el.textContent)
                                    .filter(Boolean)
                            }
                        }
                        return []
                    }

                    const videoElement = getVideoElement()
                    const platformSelectors = selectors[platform]

                    const videoInfo = {
                        title: getFirstMatch(platformSelectors.title),
                        ...('views' in platformSelectors && {
                            views: getFirstMatch(platformSelectors.views),
                        }),
                        ...('likes' in platformSelectors && {
                            likes: getFirstMatch(platformSelectors.likes),
                        }),
                        ...('channelName' in platformSelectors && {
                            channelName: getFirstMatch(platformSelectors.channelName),
                        }),
                        videoSrc: videoElement?.src || '',
                        poster: videoElement?.poster || '',
                        duration: videoElement?.duration || 0,
                        qualities: getQualities(),
                        dimensions: {
                            width: videoElement?.videoWidth || 0,
                            height: videoElement?.videoHeight || 0,
                        },
                    }

                    const metadata = {
                        ogVideo: document
                            .querySelector('meta[property="og:video"]')
                            ?.getAttribute('content'),
                        ogVideoUrl: document
                            .querySelector('meta[property="og:video:url"]')
                            ?.getAttribute('content'),
                        ogVideoType: document
                            .querySelector('meta[property="og:video:type"]')
                            ?.getAttribute('content'),
                        ogVideoWidth: document
                            .querySelector('meta[property="og:video:width"]')
                            ?.getAttribute('content'),
                        ogVideoHeight: document
                            .querySelector('meta[property="og:video:height"]')
                            ?.getAttribute('content'),
                        twitterPlayer: document
                            .querySelector('meta[name="twitter:player"]')
                            ?.getAttribute('content'),
                        uploadDate: document
                            .querySelector('meta[itemprop="uploadDate"]')
                            ?.getAttribute('content'),
                        embedUrl: document
                            .querySelector('link[itemprop="embedUrl"]')
                            ?.getAttribute('href'),
                        platform,
                    }

                    return {
                        content: {
                            videoInfo,
                            platform,
                            url: window.location.href,
                        },
                        metadata,
                    }
                },
                { platform, selectors: this.platformSelectors }
            )

            return {
                content: {
                    ...result.content,
                    iframeVideos: [],
                    metadata: result.metadata,
                },
                metadata: result.metadata,
            }
        } catch (error) {
            this.logger.error(`Error extracting video content: ${error.message}`)
        }
    }

    async detectContentType(page: puppeteer.Page, url: string): Promise<ContentType> {
        try {
            const platform = this.detectPlatform(url)
            this.logger.debug(`Detecting content type for platform: ${platform}`)

            // Early return if URL matches video patterns
            if (platform !== 'default') {
                return ContentType.VIDEO
            }

            // Check for video elements and meta tags
            const hasVideo = await page.evaluate((selectors) => {
                const videoElements = selectors.default.videoElement
                    .map((selector) => document.querySelector(selector))
                    .some((el) => el !== null)

                const metaTags = {
                    ogType: document
                        .querySelector('meta[property="og:type"]')
                        ?.getAttribute('content'),
                    twitterCard: document
                        .querySelector('meta[name="twitter:card"]')
                        ?.getAttribute('content'),
                    schemaType: document.querySelector('script[type="application/ld+json"]')
                        ?.textContent,
                }

                const hasVideoMeta =
                    metaTags.ogType?.includes('video') ||
                    metaTags.twitterCard?.includes('player') ||
                    (metaTags.schemaType && metaTags.schemaType.includes('VideoObject'))

                return videoElements || hasVideoMeta
            }, this.platformSelectors)

            return hasVideo ? ContentType.VIDEO : ContentType.DEFAULT
        } catch (error) {
            this.logger.error(`Error detecting content type: ${error.message}`)
            return ContentType.DEFAULT
        }
    }

    private detectPlatform(url: string): Platform {
        for (const [platform, patterns] of Object.entries(this.platformPatterns)) {
            if (patterns.some((pattern) => pattern.test(url))) {
                return platform as Platform
            }
        }
        return 'default'
    }

    private async waitForVideoElements(page: puppeteer.Page, platform: Platform): Promise<void> {
        const selectors = this.platformSelectors[platform]
        const containerSelectors = selectors.container

        try {
            await Promise.race([
                ...containerSelectors.map((selector) =>
                    page.waitForSelector(selector, {
                        visible: true,
                        timeout: 10000,
                    })
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout waiting for video elements')), 10000)
                ),
            ])
        } catch (error) {
            this.logger.warn(`Timeout waiting for video elements: ${error.message}`)
            // Continue execution, as some elements might still be available
        }
    }
}
