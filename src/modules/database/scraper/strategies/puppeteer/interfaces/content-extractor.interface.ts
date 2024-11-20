import { ContentType } from './content-type.enum'
import * as puppeteer from 'puppeteer'

export interface IContentExtractor {
    extract(
        page: puppeteer.Page,
        url: string
    ): Promise<{
        content: any
        metadata: any
    }>
    detectContentType(page: puppeteer.Page, url: string): Promise<ContentType>
}
