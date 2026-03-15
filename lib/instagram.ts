import {
  createInstagramCarouselItemContainer,
  createInstagramCarouselContainer,
  publishInstagramMedia,
  waitForInstagramMediaContainerReady,
} from '@/lib/meta'

type InstagramMediaInput = {
  imageUrl: string
  caption?: string
  accessToken: string
  igUserId: string
}

export async function createMediaContainer(input: InstagramMediaInput): Promise<{ containerId: string }> {
  const { id } = await createInstagramCarouselItemContainer({
    igUserId: input.igUserId,
    imageUrl: input.imageUrl,
    accessToken: input.accessToken,
  })
  return { containerId: id }
}

export async function createCarousel(input: {
  childContainerIds: string[]
  caption: string
  accessToken: string
  igUserId: string
}): Promise<{ carouselContainerId: string }> {
  // Aguarda todos os containers filhos ficarem prontos antes de criar o carrossel
  await Promise.all(
    input.childContainerIds.map((containerId) =>
      waitForInstagramMediaContainerReady({ containerId, accessToken: input.accessToken })
    )
  )

  const { id } = await createInstagramCarouselContainer({
    igUserId: input.igUserId,
    childContainerIds: input.childContainerIds,
    caption: input.caption,
    accessToken: input.accessToken,
  })
  return { carouselContainerId: id }
}

export async function publish(input: {
  creationId: string
  accessToken: string
  igUserId: string
}): Promise<{ mediaId: string }> {
  await waitForInstagramMediaContainerReady({
    containerId: input.creationId,
    accessToken: input.accessToken,
  })

  const { id } = await publishInstagramMedia({
    igUserId: input.igUserId,
    creationId: input.creationId,
    accessToken: input.accessToken,
  })
  return { mediaId: id }
}
