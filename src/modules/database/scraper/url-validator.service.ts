import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UrlValidatorService {
    private readonly logger = new Logger(UrlValidatorService.name)

    private readonly urlPattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$',
        'i' // fragment locator
    )

    validateUrls(urls: string[]): {
        validUrls: string[]
        invalidUrls: string[]
    } {
        return urls.reduce(
            (acc, url) => {
                if (this.isValidUrl(url)) {
                    acc.validUrls.push(url)
                } else {
                    acc.invalidUrls.push(url)
                    this.logger.warn(`Invalid URL detected: ${url}`)
                }
                return acc
            },
            { validUrls: [], invalidUrls: [] } as { validUrls: string[]; invalidUrls: string[] }
        )
    }

    private isValidUrl(url: string): boolean {
        try {
            return this.urlPattern.test(url)
        } catch (error) {
            this.logger.error(`Error validating URL ${url}: ${error.message}`)
            return false
        }
    }
}
