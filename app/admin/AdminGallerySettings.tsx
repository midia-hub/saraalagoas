'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react'

interface WorshipService {
  id: string
  name: string
  slug: string
  active: boolean
  created_at: string
}

export function AdminGallerySettings() {
  const [services, setServices] = useState<WorshipService[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Novo culto
  const [showNewServiceForm, setShowNewServiceForm] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [creatingService, setCreatingService] = useState(false)

  // Editar culto
  const [editingService, setEditingService] = useState<string | null>(null)
  const [editServiceName, setEditServiceName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      const response = await fetch('/api/admin/services', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createService() {
    if (!supabase || !newServiceName.trim()) return

    setCreatingService(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newServiceName, active: true }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Culto criado com sucesso!' })
        setNewServiceName('')
        setShowNewServiceForm(false)
        loadData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Erro ao criar culto' })
      }
    } catch (error) {
      console.error('Create service error:', error)
      setMessage({ type: 'error', text: 'Erro ao criar culto' })
    } finally {
      setCreatingService(false)
    }
  }

  async function updateService(serviceId: string, newName: string) {
    if (!supabase || !newName.trim()) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Culto atualizado com sucesso!' })
        setEditingService(null)
        loadData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Erro ao atualizar culto' })
      }
    } catch (error) {
      console.error('Update service error:', error)
      setMessage({ type: 'error', text: 'Erro ao atualizar culto' })
    }
  }

  async function toggleServiceActive(serviceId: string, active: boolean) {
    if (!supabase) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active }),
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Toggle service error:', error)
    }
  }

  async function deleteService(serviceId: string) {
    if (!supabase) return
    if (!confirm('Tem certeza que deseja excluir este culto?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Culto excluído com sucesso!' })
        loadData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Erro ao excluir culto' })
      }
    } catch (error) {
      console.error('Delete service error:', error)
      setMessage({ type: 'error', text: 'Erro ao excluir culto' })
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c62737] mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Mensagem */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="text-green-600 shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          )}
          <p className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Cultos */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cultos</h2>
            <p className="text-sm text-gray-600">Gerencie a lista de cultos disponíveis para upload</p>
          </div>
          <button
            onClick={() => setShowNewServiceForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] transition-colors"
          >
            <Plus size={20} />
            Adicionar Culto
          </button>
        </div>

        {/* Formulário Novo Culto */}
        {showNewServiceForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Novo Culto</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Nome do culto"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && createService()}
              />
              <button
                onClick={createService}
                disabled={!newServiceName.trim() || creatingService}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
              >
                <Check size={20} />
              </button>
              <button
                onClick={() => {
                  setShowNewServiceForm(false)
                  setNewServiceName('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Lista de Cultos */}
        {services.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nenhum culto cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                {editingService === service.id ? (
                  <div className="flex-1 flex gap-2 mr-4">
                    <input
                      type="text"
                      value={editServiceName}
                      onChange={(e) => setEditServiceName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && updateService(service.id, editServiceName)}
                    />
                    <button
                      onClick={() => updateService(service.id, editServiceName)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setEditingService(null)}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-500">{service.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={service.active}
                          onChange={(e) => toggleServiceActive(service.id, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Ativo</span>
                      </label>
                      <button
                        onClick={() => {
                          setEditingService(service.id)
                          setEditServiceName(service.name)
                        }}
                        className="p-2 text-gray-600 hover:text-[#c62737] transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
