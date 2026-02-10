type InstagramMediaInput = {
  imageUrl: string
  caption?: string
  accessToken: string
  igUserId: string
}

export async function createMediaContainer(input: InstagramMediaInput): Promise<{ containerId: string }> {
  console.log('[instagram] createMediaContainer', {
    igUserId: input.igUserId,
    imageUrl: input.imageUrl,
    hasCaption: !!input.caption,
    tokenSize: input.accessToken.length,
  })

  return {
    containerId: `container_${Math.random().toString(36).slice(2, 12)}`,
  }
}

export async function createCarousel(input: {
  childContainerIds: string[]
  caption: string
  accessToken: string
  igUserId: string
}): Promise<{ carouselContainerId: string }> {
  console.log('[instagram] createCarousel', {
    igUserId: input.igUserId,
    children: input.childContainerIds.length,
    hasCaption: !!input.caption,
    tokenSize: input.accessToken.length,
  })

  return {
    carouselContainerId: `carousel_${Math.random().toString(36).slice(2, 12)}`,
  }
}

export async function publish(input: {
  creationId: string
  accessToken: string
  igUserId: string
}): Promise<{ mediaId: string }> {
  console.log('[instagram] publish', {
    igUserId: input.igUserId,
    creationId: input.creationId,
    tokenSize: input.accessToken.length,
  })

  return {
    mediaId: `media_${Math.random().toString(36).slice(2, 12)}`,
  }
}
