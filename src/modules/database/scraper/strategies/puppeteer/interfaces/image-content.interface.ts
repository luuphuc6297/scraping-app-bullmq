export interface IImageContent {
    images: Array<{
        src: string
        alt?: string
        title?: string
        width: number
        height: number
        loading?: string
        srcset?: string
        sizes?: string
    }>
    backgroundImages: Array<{
        url: string
        element: string
        className: string
    }>
    metadata: IImageMetadata
}

export interface IImageMetadata {
    ogImage?: string
    ogImageWidth?: string
    ogImageHeight?: string
    ogImageType?: string
    twitterImage?: string
    articleImage?: string
    imageCount: number
}
