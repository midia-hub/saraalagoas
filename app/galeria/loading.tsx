/**
 * O loading da galeria é gerenciado pelo <Suspense> interno do page.tsx.
 * Retornar null aqui evita um flash de double-loading (skeleton do loading.tsx
 * seguido pelo skeleton do Suspense fallback).
 */
export default function GaleriaPublicLoading() {
  return null
}
