#!/usr/bin/env node
/**
 * Script para verificar duplicatas na tabela cell_people
 * 
 * Uso:
 * NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/check-cell-duplicates.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Tentar carregar .env.local se existir
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const envPath = join(__dirname, '..', '.env.local')
if (!supabaseUrl || !supabaseServiceKey) {
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value
      }
    })
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function checkDuplicates() {
  console.log('🔍 Buscando duplicatas na tabela cell_people...\n')

  // Buscar todos os registros
  const { data: allRecords, error } = await supabase
    .from('cell_people')
    .select(`
      id,
      cell_id,
      person_id,
      full_name,
      phone,
      type,
      status,
      created_at,
      person:people(id, full_name),
      cell:cells(id, name)
    `)
    .order('cell_id')
    .order('created_at')

  if (error) {
    console.error('❌ Erro ao buscar registros:', error)
    return
  }

  console.log(`📊 Total de registros: ${allRecords.length}\n`)

  // Agrupar por célula
  const byCellId = {}
  allRecords.forEach(record => {
    if (!byCellId[record.cell_id]) {
      byCellId[record.cell_id] = []
    }
    byCellId[record.cell_id].push(record)
  })

  let totalDuplicates = 0
  let duplicateRecords = []

  // Verificar duplicatas por célula
  for (const cellId in byCellId) {
    const records = byCellId[cellId]
    const cellName = records[0]?.cell?.name || cellId

    // Agrupar por person_id ou nome+telefone
    const personMap = {}
    const duplicatesInCell = []

    records.forEach(record => {
      let key
      
      if (record.person_id) {
        // Membro com person_id - chave é o person_id
        key = `person_${record.person_id}`
      } else {
        // Visitante sem person_id - chave é nome + telefone
        const name = (record.full_name || '').toLowerCase().trim()
        const phone = (record.phone || '').trim()
        key = `visitor_${name}_${phone}`
      }

      if (!personMap[key]) {
        personMap[key] = []
      }
      personMap[key].push(record)
    })

    // Verificar quais têm duplicatas
    for (const key in personMap) {
      const group = personMap[key]
      if (group.length > 1) {
        duplicatesInCell.push({
          key,
          records: group,
          count: group.length
        })
        totalDuplicates += group.length - 1
      }
    }

    // Reportar duplicatas desta célula
    if (duplicatesInCell.length > 0) {
      console.log(`\n🔴 Célula: ${cellName} (${cellId})`)
      console.log(`   Duplicatas encontradas: ${duplicatesInCell.length} grupos\n`)

      duplicatesInCell.forEach(dup => {
        const first = dup.records[0]
        const personName = first.person?.full_name || first.full_name || 'Sem nome'
        const type = first.type
        
        console.log(`   👤 ${personName} (${type.toUpperCase()})`)
        console.log(`      Registros duplicados: ${dup.count}`)
        
        dup.records.forEach((record, idx) => {
          const date = new Date(record.created_at).toLocaleString('pt-BR')
          console.log(`      ${idx + 1}. ID: ${record.id} | Status: ${record.status} | Criado: ${date}`)
        })
        console.log()

        duplicateRecords.push(...dup.records)
      })
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(70))
  if (totalDuplicates === 0) {
    console.log('✅ Nenhuma duplicata encontrada!')
  } else {
    console.log(`⚠️  Total de registros duplicados: ${totalDuplicates}`)
    console.log(`📋 Para limpar, você pode deletar os IDs duplicados mais recentes`)
  }
  console.log('='.repeat(70) + '\n')

  return duplicateRecords
}

async function main() {
  const duplicates = await checkDuplicates()

  // Se quiser gerar um script de limpeza
  if (duplicates && duplicates.length > 0) {
    console.log('💡 Para limpar as duplicatas, você pode usar este SQL:\n')
    console.log('-- ATENÇÃO: Revise os IDs antes de executar!\n')
    
    // Agrupar por grupo de duplicatas e manter o mais antigo
    const toDelete = new Set()
    const byCellAndPerson = {}
    
    duplicates.forEach(record => {
      const key = record.person_id 
        ? `${record.cell_id}_${record.person_id}`
        : `${record.cell_id}_${(record.full_name || '').toLowerCase()}_${record.phone || ''}`
      
      if (!byCellAndPerson[key]) {
        byCellAndPerson[key] = []
      }
      byCellAndPerson[key].push(record)
    })

    // Para cada grupo, marcar todos exceto o mais antigo para deleção
    for (const key in byCellAndPerson) {
      const group = byCellAndPerson[key]
      if (group.length > 1) {
        // Ordenar por created_at
        group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        // Deletar todos exceto o primeiro (mais antigo)
        for (let i = 1; i < group.length; i++) {
          toDelete.add(group[i].id)
        }
      }
    }

    if (toDelete.size > 0) {
      const ids = Array.from(toDelete).map(id => `'${id}'`).join(',')
      console.log(`DELETE FROM cell_people WHERE id IN (${ids});`)
      console.log(`\n-- Total de registros a deletar: ${toDelete.size}`)
    }
  }
}

main().catch(console.error)
