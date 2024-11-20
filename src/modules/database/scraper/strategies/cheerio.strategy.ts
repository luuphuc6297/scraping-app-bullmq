import { Injectable, Logger } from '@nestjs/common'
import { ProcessingStatus } from 'src/infrastructure/constants/status.enum'

import axios from 'axios'
import { CheerioAPI, load } from 'cheerio'
import {
    IErrorScrapingResult,
    IScrapeStrategy,
    ISuccessScrapingResult,
} from 'src/infrastructure/constants/scraping-result.interface'

@Injectable()
export class CheerioStrategy implements IScrapeStrategy {
    private readonly logger = new Logger(CheerioStrategy.name)

    async scrape(url: string) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    Connection: 'keep-alive',
                },
                timeout: 10000,
                maxRedirects: 5,
            })

            const html = response.data
            const $ = load(html, {
                xml: false,
            })

            const content = this.getMainContent($)

            const successResult: ISuccessScrapingResult = {
                status: ProcessingStatus.SUCCESS,
                content: content,
                metadata: {
                    title: this.getTitle($) || '',
                    description: this.getDescription($) || '',
                    keywords: this.getKeywords($) || '',
                    contentType: this.getContentType($) || 'text/html',
                    ogTitle: this.getOpenGraphData($, 'og:title') || '',
                    ogDescription: this.getOpenGraphData($, 'og:description') || '',
                    ogImage: this.getOpenGraphData($, 'og:image') || '',
                    lastModified: response.headers['last-modified'] || '',
                    contentLength: parseInt(response.headers['content-length'] || '0'),
                },
            }
            return successResult
        } catch (error) {
            this.logger.error(`CheerioStrategy scraping failed for ${url}: ${error.message}`)
            const errorResult: IErrorScrapingResult = {
                status: ProcessingStatus.ERROR,
                content: null,
                metadata: {
                    errorType: error.name || 'UnknownError',
                    errorMessage: error.message || 'An unknown error occurred',
                    stackTrace: error.stack || '',
                },
            }

            return errorResult
        }
    }

    private getTitle($: CheerioAPI): string {
        return (
            $('title').text().trim() ||
            $('h1').first().text().trim() ||
            $('meta[property="og:title"]').attr('content')?.trim()
        )
    }

    private getDescription($: CheerioAPI): string {
        return (
            $('meta[name="description"]').attr('content')?.trim() ||
            $('meta[property="og:description"]').attr('content')?.trim()
        )
    }

    private getKeywords($: CheerioAPI): string {
        return $('meta[name="keywords"]').attr('content')?.trim()
    }

    private getContentType($: CheerioAPI): string {
        return (
            $('meta[http-equiv="Content-Type"]').attr('content')?.trim() ||
            $('meta[name="content-type"]').attr('content')?.trim()
        )
    }

    private getOpenGraphData($: CheerioAPI, property: string): string {
        return $(`meta[property="${property}"]`).attr('content')?.trim()
    }

    private getMainContent($: CheerioAPI): string {
        // Xóa các phần tử không cần thiết
        $('script').remove()
        $('style').remove()
        $('noscript').remove()
        $('iframe').remove()
        $('nav').remove()
        $('header').remove()
        $('footer').remove()
        $('.advertisement').remove()
        $('#sidebar').remove()
        $('.sidebar').remove()
        $('.menu').remove()
        $('.navigation').remove()

        // Tìm main content container
        let mainContent = ''
        const possibleContainers = [
            'article',
            'main',
            '[role="main"]',
            '#main-content',
            '.main-content',
            '.post-content',
            '.article-content',
            '.entry-content',
        ]

        for (const container of possibleContainers) {
            const $container = $(container)
            if ($container.length) {
                mainContent = $container.text().trim()
                break
            }
        }

        // Fallback nếu không tìm thấy container
        if (!mainContent) {
            mainContent = $('body').text().trim()
        }

        // Xử lý text
        return this.cleanText(mainContent)
    }

    private cleanText(text: string): string {
        return text
            .replace(/\s+/g, ' ') // Thay thế nhiều khoảng trắng bằng 1 khoảng trắng
            .replace(/\n+/g, '\n') // Thay thế nhiều dòng trống bằng 1 dòng trống
            .replace(/[^\S\r\n]+/g, ' ') // Giữ lại line breaks nhưng xóa khoảng trắng thừa
            .trim()
    }
}
