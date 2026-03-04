/**
 * GET /api/rekognition/usage
 * Retorna o consumo mensal das APIs do Rekognition (free tier).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { getMonthlyUsage, REKOGNITION_LIMITS } from '@/lib/rekognition-limits'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const [usage, storageCounts] = await Promise.all([
    getMonthlyUsage(),
    supabaseServer
      .from('rekognition_people_photos')
      .select('id', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    apiCalls: {
      used: usage.total,
      limit: REKOGNITION_LIMITS.FREE_TIER_API_CALLS_PER_MONTH,
      remaining: usage.remaining,
      percentUsed: usage.percentUsed,
      nearLimit: usage.nearLimit,
      overLimit: usage.overLimit,
      breakdown: {
        IndexFaces: usage.IndexFaces,
        SearchFacesByImage: usage.SearchFacesByImage,
      },
    },
    storedFaces: {
      used: storageCounts.count ?? 0,
      limit: REKOGNITION_LIMITS.FREE_TIER_STORED_FACES,
    },
    limits: {
      maxPhotosPerPerson: REKOGNITION_LIMITS.MAX_PHOTOS_PER_PERSON,
      maxScanPhotosPerCall: REKOGNITION_LIMITS.MAX_SCAN_PHOTOS_PER_CALL,
    },
    yearMonth: usage.yearMonth,
  })
}
