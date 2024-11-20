import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UrlAnalyzerService {
    private readonly logger = new Logger(UrlAnalyzerService.name)

    // private readonly puppeteerPatterns = [
    //     // JavaScript Frameworks & Libraries
    //     /\.js$/,
    //     /spa\./,
    //     /angular\./,
    //     /react\./,
    //     /vue\./,
    //     /next\./,
    //     /nuxt\./,
    //     /gatsby\./,
    //     /ember\./,
    //     /svelte\./,
    //     /webpack\./,
    //     /vite\./,

    //     // Social Media & Video Platforms
    //     /twitter\.com/,
    //     /facebook\.com/,
    //     /instagram\.com/,
    //     /linkedin\.com/,
    //     /youtube\.com/,
    //     /tiktok\.com/,
    //     // /pinterest\.com/,
    //     /reddit\.com/,
    //     /tumblr\.com/,
    //     /vimeo\.com/,
    //     /dailymotion\.com/,
    //     /twitch\.tv/,

    //     // E-commerce & Shopping
    //     /shopee\./,
    //     /lazada\./,
    //     /tiki\./,
    //     /amazon\./,
    //     /ebay\./,
    //     /alibaba\./,
    //     /taobao\./,
    //     /jd\.com/,
    //     /walmart\./,
    //     /target\./,
    //     /bestbuy\./,
    //     /sendo\./,
    //     /zalora\./,

    //     // Dynamic Content & Web Apps
    //     /gmail\./,
    //     /google\.com\/maps/,
    //     /booking\./,
    //     /airbnb\./,
    //     /netflix\./,
    //     /spotify\./,
    //     /discord\./,
    //     /slack\./,
    //     /trello\./,
    //     /notion\./,
    //     /figma\./,
    //     /canva\./,

    //     // Vietnamese Dynamic Sites
    //     /sendo\.vn/,
    //     /foody\.vn/,
    //     /tinhte\.vn/,
    //     /batdongsan\.com\.vn/,
    //     /chotot\.com/,
    //     /thegioididong\.com/,
    //     /fptshop\.com\.vn/,
    //     /dienmayxanh\.com/,
    //     /bachhoaxanh\.com/,

    //     // Single Page Applications
    //     /\#\//, // Hash routing
    //     /\/app\//,
    //     /\/dashboard/,
    //     /\/admin/,
    //     /\/portal/,
    //     /\/account/,
    //     /\/profile/,

    //     // Dynamic Features
    //     /infinite-scroll/,
    //     /lazy-loading/,
    //     /real-time/,
    //     /live-/,
    //     /streaming/,
    //     /interactive/,
    // ]
    // // Patterns for Cheerio
    // private readonly cheerioPatterns = [
    //     /wikipedia\.org/,
    //     /wiki\//,
    //     /mediawiki\./,
    //     /wikibooks\./,
    //     /wikimedia\./,
    //     /wikiquote\./,
    //     /wikisource\./,
    //     /wiktionary\./,
    //     /wikiversity\./,
    //     /wikivoyage\./,
    //     /wikidata\./,
    //     // Static Content
    //     /\.html$/,
    //     /\.htm$/,
    //     /\.xml$/,
    //     /\.rss$/,
    //     /\.aspx$/,
    //     /\.php$/,

    //     // News & Media
    //     /blog\./,
    //     /news\./,
    //     /article\./,
    //     /press\./,
    //     /media\./,
    //     /magazine\./,
    //     /newspaper\./,
    //     /editorial\./,

    //     // CMS & Static Sites
    //     /wordpress\./,
    //     /wiki\./,
    //     /medium\./,
    //     /blogger\./,
    //     /ghost\./,
    //     /jekyll\./,
    //     /drupal\./,
    //     /joomla\./,

    //     // Vietnamese News Sites
    //     /vnexpress\.net/,
    //     /tuoitre\.vn/,
    //     /thanhnien\.vn/,
    //     /dantri\.com\.vn/,
    //     /vietnamnet\.vn/,
    //     /baomoi\.com/,
    //     /kenh14\.vn/,
    //     /24h\.com\.vn/,
    //     /cafef\.vn/,
    //     /cafebiz\.vn/,
    //     /genk\.vn/,
    //     /zingnews\.vn/,
    //     /nld\.com\.vn/,
    //     /tienphong\.vn/,
    //     /sggp\.org\.vn/,
    //     /vov\.vn/,
    //     /vtc\.vn/,
    //     /vietnamplus\.vn/,

    //     // Documentation & Static Content
    //     /docs\./,
    //     /documentation\./,
    //     /help\./,
    //     /support\./,
    //     /faq\./,
    //     /about\./,
    //     /contact\./,
    //     /privacy\./,
    //     /terms\./,

    //     // Educational & Reference
    //     /edu\./,
    //     /academic\./,
    //     /research\./,
    //     /study\./,
    //     /library\./,
    //     /dictionary\./,
    //     /encyclopedia\./,

    //     // Government & Organizations
    //     /gov\./,
    //     /org\./,
    //     /\.edu$/,
    //     /\.gov$/,
    //     /\.org$/,

    //     // Static Business Sites
    //     /company\./,
    //     /corporate\./,
    //     /business\./,
    //     /enterprise\./,
    //     /agency\./,
    //     /firm\./,
    // ]

    private readonly puppeteerPatterns = [
        /\.js$/, // JavaScript rendered pages
        /spa\./, // Single Page Applications
        /angular\./,
        /react\./,
        /vue\./,
        /next\./,
        /nuxt\./,
        /twitter\.com/,
        /facebook\.com/,
        /instagram\.com/,
        /linkedin\.com/,
        /youtube\.com/,
        /shopee\./,
        /lazada\./,
        /tiki\./,
        /amazon\./,
    ]

    private readonly cheerioPatterns = [
        /\.html$/,
        /blog\./,
        /news\./,
        /article\./,
        /wordpress\./,
        /wiki\./,
        /vnexpress\.net/,
        /tuoitre\.vn/,
        /thanhnien\.vn/,
        /dantri\.com\.vn/,
    ]

    analyzeUrl(url: string): 'cheerio' | 'puppeteer' {
        try {
            const urlLower = url.toLowerCase()

            // Check Puppeteer patterns first (vì các trang này thường cần JavaScript)
            if (this.puppeteerPatterns.some((pattern) => pattern.test(urlLower))) {
                return 'puppeteer'
            }

            // Check Cheerio patterns
            if (this.cheerioPatterns.some((pattern) => pattern.test(urlLower))) {
                return 'cheerio'
            }

            // Default to Cheerio for unknown patterns
            return 'cheerio'
        } catch (error) {
            this.logger.error(`Error analyzing URL ${url}: ${error.message}`)
            return 'cheerio' // Default fallback
        }
    }

    analyzeUrls(urls: string[]): {
        cheerioUrls: string[]
        puppeteerUrls: string[]
    } {
        return urls.reduce(
            (acc, url) => {
                const strategy = this.analyzeUrl(url)
                if (strategy === 'cheerio') {
                    acc.cheerioUrls.push(url)
                } else {
                    acc.puppeteerUrls.push(url)
                }
                return acc
            },
            { cheerioUrls: [], puppeteerUrls: [] } as {
                cheerioUrls: string[]
                puppeteerUrls: string[]
            }
        )
    }
}
