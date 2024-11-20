import { Injectable, Logger } from '@nestjs/common'
import * as puppeteer from 'puppeteer'
import { IContentExtractor } from '../interfaces/content-extractor.interface'
import { ContentType } from '../interfaces/content-type.enum'
import { IImageContent, IImageMetadata } from '../interfaces/image-content.interface'

@Injectable()
export class ImageContentExtractor implements IContentExtractor {
    private readonly logger = new Logger(ImageContentExtractor.name)
    private readonly minImageSize = 100
    private readonly minSignificantImages = 5

    async extract(
        page: puppeteer.Page,
        url: string
    ): Promise<{ content: IImageContent; metadata: IImageMetadata }> {
        try {
            this.logger.debug(`Extracting images from ${url}`)

            // Wait for images to load
            await this.waitForImages(page)

            const result = await page.evaluate((minSize) => {
                const getImages = () => {
                    return Array.from(document.querySelectorAll('img'))
                        .filter((img) => {
                            const src = img.src
                            const width = img.naturalWidth || img.width
                            const height = img.naturalHeight || img.height
                            return (
                                src &&
                                width > minSize &&
                                height > minSize &&
                                !src.includes('data:image') && // Skip base64 images
                                !src.includes('favicon') && // Skip favicons
                                !src.endsWith('.svg') // Skip SVG icons
                            )
                        })
                        .map((img) => ({
                            src: img.src,
                            alt: img.alt,
                            title: img.title,
                            width: img.naturalWidth || img.width,
                            height: img.naturalHeight || img.height,
                            loading: img.loading,
                            srcset: img.srcset,
                            sizes: img.sizes,
                            aspectRatio:
                                (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
                        }))
                }

                const getBackgroundImages = () => {
                    const elements = document.querySelectorAll('*')
                    const backgroundImages = []

                    elements.forEach((el) => {
                        const style = window.getComputedStyle(el)
                        const backgroundImage = style.backgroundImage
                        if (backgroundImage && backgroundImage !== 'none') {
                            const url = backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1')
                            if (
                                !url.includes('data:image') &&
                                !url.includes('gradient') &&
                                !url.includes('favicon') &&
                                !url.endsWith('.svg')
                            ) {
                                backgroundImages.push({
                                    url,
                                    element: el.tagName.toLowerCase(),
                                    className: el.className,
                                    dimensions: {
                                        width: el.clientWidth,
                                        height: el.clientHeight,
                                    },
                                    position: {
                                        top: el.getBoundingClientRect().top,
                                        left: el.getBoundingClientRect().left,
                                    },
                                })
                            }
                        }
                    })

                    return backgroundImages
                }

                const getMetaTags = () => {
                    const selectors = {
                        ogImage: 'meta[property="og:image"]',
                        ogImageWidth: 'meta[property="og:image:width"]',
                        ogImageHeight: 'meta[property="og:image:height"]',
                        ogImageType: 'meta[property="og:image:type"]',
                        twitterImage: 'meta[name="twitter:image"]',
                        articleImage: 'meta[property="article:image"]',
                        schemaImage: 'script[type="application/ld+json"]',
                    }

                    const metadata: Record<string, any> = {}

                    for (const [key, selector] of Object.entries(selectors)) {
                        if (key === 'schemaImage') {
                            const schema = document.querySelector(selector)?.textContent
                            if (schema) {
                                try {
                                    const parsed = JSON.parse(schema)
                                    metadata.schemaImage = parsed.image || null
                                } catch (error: any) {
                                    this.logger.error(
                                        `Error parsing schema image: ${error.message}`
                                    )
                                    metadata.schemaImage = null
                                }
                            }
                        } else {
                            metadata[key] = document
                                .querySelector(selector)
                                ?.getAttribute('content')
                        }
                    }

                    return metadata
                }

                const images = getImages()
                const backgroundImages = getBackgroundImages()
                const metaTags = getMetaTags()

                const metadata = {
                    ...metaTags,
                    imageCount: images.length,
                    backgroundImageCount: backgroundImages.length,
                    hasHeroImage: images.some((img) => {
                        return img.width > 600 && img.height > 400
                    }),
                    timestamp: new Date().toISOString(),
                }

                return {
                    content: {
                        images,
                        backgroundImages,
                        metadata,
                    },
                    metadata,
                }
            }, this.minImageSize)

            return result
        } catch (error) {
            this.logger.error(`Error extracting images: ${error.message}`)
        }
    }

    async detectContentType(page: puppeteer.Page, url: string): Promise<ContentType> {
        try {
            // Check URL patterns first
            if (this.isImageGalleryUrl(url)) {
                return ContentType.IMAGE
            }

            // Then check page content
            const hasSignificantImages = await page.evaluate(
                ({ minSize, minCount }) => {
                    const images = Array.from(document.querySelectorAll('img'))
                    const significantImages = images.filter((img) => {
                        const width = img.naturalWidth || img.width
                        const height = img.naturalHeight || img.height
                        return (
                            width > minSize &&
                            height > minSize &&
                            !img.src.includes('data:image') &&
                            !img.src.includes('favicon')
                        )
                    })

                    const hasHeroImage = significantImages.some((img) => {
                        const rect = img.getBoundingClientRect()
                        return (
                            rect.top < window.innerHeight &&
                            (img.naturalWidth || img.width) > 600 &&
                            (img.naturalHeight || img.height) > 400
                        )
                    })

                    const hasGallery = document.querySelector(
                        '.gallery, .slideshow, [data-gallery]'
                    )
                    const hasMultipleImages = significantImages.length >= minCount

                    return {
                        hasHeroImage,
                        hasGallery,
                        hasMultipleImages,
                        imageCount: significantImages.length,
                    }
                },
                { minSize: this.minImageSize, minCount: this.minSignificantImages }
            )

            this.logger.debug('Image detection results:', hasSignificantImages)

            return hasSignificantImages.hasHeroImage ||
                hasSignificantImages.hasGallery ||
                hasSignificantImages.hasMultipleImages
                ? ContentType.IMAGE
                : ContentType.DEFAULT
        } catch (error) {
            this.logger.error(`Error detecting image content: ${error.message}`)
            return ContentType.DEFAULT
        }
    }

    private isImageGalleryUrl(url: string): boolean {
        const galleryPatterns = [/gallery/i, /photos?/i, /images?/i, /slideshow/i, /album/i]
        return galleryPatterns.some((pattern) => pattern.test(url))
    }

    private async waitForImages(page: puppeteer.Page): Promise<void> {
        try {
            await page.evaluate(() => {
                return Promise.all(
                    Array.from(document.images)
                        .filter((img) => !img.complete)
                        .map(
                            (img) =>
                                new Promise((resolve) => {
                                    img.onload = img.onerror = resolve
                                })
                        )
                )
            })
        } catch (error) {
            this.logger.warn(`Some images failed to load: ${error.message}`)
        }
    }
}
