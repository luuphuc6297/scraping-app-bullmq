export interface IVideoContent {
    videoInfo: {
        title: string
        views?: string
        likes?: string
        channelName?: string
        videoSrc: string
        poster?: string
        duration: number
        qualities?: string[]
        dimensions: {
            width: number
            height: number
        }
    }
    iframeVideos: Array<{
        src: string
        width: string
        height: string
    }>
    metadata: IVideoMetadata
}

export interface IVideoMetadata {
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    ogVideo?: string
    ogVideoUrl?: string
    ogVideoType?: string
    ogVideoWidth?: string
    ogVideoHeight?: string
    uploadDate?: string
    duration?: string
    embedUrl?: string
}
