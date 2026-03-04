/**
 * lib/rekognition.ts
 * Helper para integração com AWS Rekognition — reconhecimento facial nas fotos da galeria.
 *
 * Variáveis de ambiente necessárias:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION                     (padrão: us-east-1)
 *   REKOGNITION_COLLECTION_ID      (padrão: sara-midia-fotos)
 */

import {
  RekognitionClient,
  CreateCollectionCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DeleteFacesCommand,
  type FaceRecord,
  type FaceMatch,
} from '@aws-sdk/client-rekognition'

// ─── Configuração do cliente ─────────────────────────────────────────────────

function getClient(): RekognitionClient {
  const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey =
    process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REKOGNITION_REGION || process.env.AWS_REGION || 'us-east-1'

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Credenciais AWS ausentes. Defina AWS_REKOGNITION_ACCESS_KEY_ID e AWS_REKOGNITION_SECRET_ACCESS_KEY.'
    )
  }

  return new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export function getCollectionId(): string {
  return process.env.REKOGNITION_COLLECTION_ID || 'sara-midia-fotos'
}

// ─── Collection ──────────────────────────────────────────────────────────────

/**
 * Garante que a collection existe no Rekognition.
 * Cria se não existir; silencia erro 409 (ResourceAlreadyExistsException).
 */
export async function ensureCollection(collectionId?: string): Promise<void> {
  const client = getClient()
  const cid = collectionId ?? getCollectionId()

  // Verifica se já existe
  try {
    await client.send(new DescribeCollectionCommand({ CollectionId: cid }))
    return // já existe
  } catch (err: unknown) {
    const name = (err as { name?: string }).name ?? ''
    if (name !== 'ResourceNotFoundException') throw err
  }

  // Cria a collection
  try {
    await client.send(new CreateCollectionCommand({ CollectionId: cid }))
  } catch (err: unknown) {
    const name = (err as { name?: string }).name ?? ''
    if (name === 'ResourceAlreadyExistsException') return // race condition
    throw err
  }
}

// ─── Indexar Rosto de Referência ─────────────────────────────────────────────

export interface IndexFaceResult {
  faceId: string
  externalImageId: string
  confidence: number
}

/**
 * Indexa o rosto de uma imagem de referência na collection.
 * Retorna o FaceId gerado pelo Rekognition.
 * Lança erro se não detectar exatamente 1 rosto de alta qualidade.
 */
export async function indexReferenceFace(
  imageBuffer: Buffer,
  externalImageId: string,
  collectionId?: string
): Promise<IndexFaceResult> {
  const client = getClient()
  const cid = collectionId ?? getCollectionId()

  await ensureCollection(cid)

  const cmd = new IndexFacesCommand({
    CollectionId: cid,
    Image: { Bytes: imageBuffer },
    ExternalImageId: externalImageId,
    MaxFaces: 1,
    QualityFilter: 'AUTO',
    DetectionAttributes: [],
  })

  const response = await client.send(cmd)
  const faces: FaceRecord[] = response.FaceRecords ?? []

  if (faces.length === 0) {
    const unindexed = response.UnindexedFaces ?? []
    const reason =
      unindexed[0]?.Reasons?.join(', ') ??
      'Nenhum rosto encontrado na imagem. Use uma foto com o rosto bem visível e iluminado.'
    throw new Error(`Não foi possível indexar o rosto: ${reason}`)
  }

  const face = faces[0].Face!
  return {
    faceId: face.FaceId!,
    externalImageId: face.ExternalImageId ?? externalImageId,
    confidence: face.Confidence ?? 0,
  }
}

// ─── Buscar Rostos em uma Foto ───────────────────────────────────────────────

export interface FaceSearchMatch {
  faceId: string
  externalImageId: string | undefined
  similarity: number
}

/**
 * Pesquisa se a imagem contém rostos que fazem parte da collection.
 * Retorna a lista de matches com similarity >= threshold.
 */
export async function searchFacesInPhoto(
  imageBuffer: Buffer,
  options?: { collectionId?: string; threshold?: number; maxFaces?: number }
): Promise<FaceSearchMatch[]> {
  const client = getClient()
  const cid = options?.collectionId ?? getCollectionId()
  const threshold = options?.threshold ?? 80
  const maxFaces = options?.maxFaces ?? 10

  try {
    const cmd = new SearchFacesByImageCommand({
      CollectionId: cid,
      Image: { Bytes: imageBuffer },
      FaceMatchThreshold: threshold,
      MaxFaces: maxFaces,
    })

    const response = await client.send(cmd)
    const matches: FaceMatch[] = response.FaceMatches ?? []

    return matches.map((m) => ({
      faceId: m.Face!.FaceId!,
      externalImageId: m.Face?.ExternalImageId ?? undefined,
      similarity: m.Similarity ?? 0,
    }))
  } catch (err: unknown) {
    const name = (err as { name?: string }).name ?? ''
    // InvalidParameterException = nenhum rosto na foto; não é erro fatal
    if (name === 'InvalidParameterException') return []
    throw err
  }
}

// ─── Remover Rosto da Collection ─────────────────────────────────────────────

/**
 * Remove um FaceId da collection do Rekognition.
 * Silencia erros 404 (rosto já removido).
 */
export async function deleteFaceFromCollection(
  faceId: string,
  collectionId?: string
): Promise<void> {
  const client = getClient()
  const cid = collectionId ?? getCollectionId()

  try {
    await client.send(
      new DeleteFacesCommand({ CollectionId: cid, FaceIds: [faceId] })
    )
  } catch (err: unknown) {
    const name = (err as { name?: string }).name ?? ''
    if (name === 'ResourceNotFoundException') return
    throw err
  }
}
