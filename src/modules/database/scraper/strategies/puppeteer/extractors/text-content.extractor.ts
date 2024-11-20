import { Injectable, Logger } from '@nestjs/common'
import * as puppeteer from 'puppeteer'
import { IContentExtractor } from '../interfaces/content-extractor.interface'
import { ContentType } from '../interfaces/content-type.enum'

@Injectable()
export class TextContentExtractor implements IContentExtractor {
    private readonly logger = new Logger(TextContentExtractor.name)
    private readonly minTextLength = 1000
    private readonly excludedTags = ['script', 'style', 'noscript', 'iframe', 'svg']

    async extract(page: puppeteer.Page, url: string): Promise<{ content: any; metadata: any }> {
        try {
            this.logger.debug(`Extracting text content from ${url}`)

            const result = await page.evaluate((excludedTags) => {
                const getCleanText = (element: Element): string => {
                    if (excludedTags.includes(element.tagName.toLowerCase())) {
                        return ''
                    }

                    let text = ''
                    element.childNodes.forEach((node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            text += node.textContent?.trim() + ' '
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            text += getCleanText(node as Element)
                        }
                    })
                    return text
                }

                const getMainContent = () => {
                    // Try to find main content area
                    const mainSelectors = [
                        'article',
                        'main',
                        '.content',
                        '.post-content',
                        '.article-content',
                        '#content',
                        '.entry-content',
                    ]

                    for (const selector of mainSelectors) {
                        const element = document.querySelector(selector)
                        if (element) {
                            return getCleanText(element)
                        }
                    }

                    // Fallback to body if no main content found
                    return getCleanText(document.body)
                }

                const getMetaTags = () => {
                    const selectors = {
                        title: [
                            'meta[property="og:title"]',
                            'meta[name="twitter:title"]',
                            'meta[itemprop="name"]',
                        ],
                        description: [
                            'meta[property="og:description"]',
                            'meta[name="description"]',
                            'meta[name="twitter:description"]',
                        ],
                        keywords: ['meta[name="keywords"]', 'meta[property="article:tag"]'],
                        author: ['meta[name="author"]', 'meta[property="article:author"]'],
                        publishedTime: [
                            'meta[property="article:published_time"]',
                            'meta[property="og:published_time"]',
                        ],
                    }

                    const metadata: Record<string, any> = {}

                    for (const [key, selectorList] of Object.entries(selectors)) {
                        for (const selector of selectorList) {
                            const content = document
                                .querySelector(selector)
                                ?.getAttribute('content')
                            if (content) {
                                metadata[key] = content
                                break
                            }
                        }
                    }

                    return metadata
                }

                const content = getMainContent()
                const metadata = {
                    ...getMetaTags(),
                    wordCount: content.split(/\s+/).length,
                    characterCount: content.length,
                    paragraphCount: document.querySelectorAll('p').length,
                    hasHeadings: document.querySelectorAll('h1, h2, h3').length > 0,
                    readingTime: Math.ceil(content.split(/\s+/).length / 200), // Assuming 200 words per minute
                    timestamp: new Date().toISOString(),
                }

                return {
                    content: {
                        text: content,
                        metadata,
                    },
                    metadata,
                }
            }, this.excludedTags)

            return result
        } catch (error) {
            this.logger.error(`Error extracting text content: ${error.message}`)
            throw error
        }
    }

    async detectContentType(page: puppeteer.Page, url: string): Promise<ContentType> {
        try {
            // Check URL patterns first
            if (this.isArticleUrl(url)) {
                return ContentType.TEXT
            }

            // Then check content
            const textAnalysis = await page.evaluate(
                ({ excludedTags }) => {
                    const getTextContent = () => {
                        const elements = document.querySelectorAll('body *')
                        let text = ''

                        elements.forEach((el) => {
                            if (!excludedTags.includes(el.tagName.toLowerCase())) {
                                const content = el.textContent?.trim()
                                if (content) text += content + ' '
                            }
                        })

                        return text.trim()
                    }

                    const text = getTextContent()
                    const wordCount = text.split(/\s+/).length
                    const hasArticleStructure = document.querySelectorAll('p').length > 3
                    const hasHeadings = document.querySelectorAll('h1, h2, h3').length > 0

                    return {
                        textLength: text.length,
                        wordCount,
                        hasArticleStructure,
                        hasHeadings,
                    }
                },
                { excludedTags: this.excludedTags, minLength: this.minTextLength }
            )

            this.logger.debug('Text analysis results:', textAnalysis)

            return textAnalysis.textLength > this.minTextLength &&
                textAnalysis.hasArticleStructure &&
                textAnalysis.hasHeadings
                ? ContentType.TEXT
                : ContentType.DEFAULT
        } catch (error) {
            this.logger.error(`Error detecting text content: ${error.message}`)
            return ContentType.DEFAULT
        }
    }

    private isArticleUrl(url: string): boolean {
        const articlePatterns = [/article/i, /blog/i, /news/i, /post/i, /story/i]
        return articlePatterns.some((pattern) => pattern.test(url))
    }
}
