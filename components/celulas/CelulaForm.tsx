'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { CreatableCombobox } from '@/components/admin/CreatableCombobox'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Loader2, MapPin, Navigation, Search } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== 'undefined') {
  const markerHtmlStyles = `
    background-color: #c62737;
    width: 2rem;
    height: 2rem;
    display: block;
    left: -1rem;
    top: -1rem;
    position: relative;
    border-radius: 2rem 2rem 0;
    transform: rotate(45deg);
    border: 3px solid #FFFFFF;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), 0 0 0 2px rgba(198, 39, 55, 0.2);
  `

  const BrandIcon = L.divIcon({
    className: "my-custom-pin",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<div style="${markerHtmlStyles}" />`
  })
  
  L.Marker.prototype.options.icon = BrandIcon
}

interface CelulaFormProps {
  initial?: any
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
}

// Componente para atualizar o centro do mapa programaticamente
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// Componente para capturar cliques no mapa
function MapEventsHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
  })
  return null
}

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Segunda-feira' },
  { value: 'tue', label: 'Terça-feira' },
  { value: 'wed', label: 'Quarta-feira' },
  { value: 'thu', label: 'Quinta-feira' },
  { value: 'fri', label: 'Sexta-feira' },
  { value: 'sat', label: 'Sábado' },
  { value: 'sun', label: 'Domingo' },
]

const FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
]

export function CelulaForm({ initial, onSubmit, loading = false }: CelulaFormProps) {
  const [form, setForm] = useState({
    church_id: initial?.church_id || '',
    name: initial?.name || '',
    day_of_week: initial?.day_of_week || 'wed',
    time_of_day: initial?.time_of_day || '20:00',
    frequency: initial?.frequency || 'weekly',
    leader_person_id: initial?.leader_person_id || '',
    co_leader_person_id: initial?.co_leader_person_id || '',
    cep: initial?.cep || '',
    street: initial?.street || '',
    address_number: initial?.address_number || '',
    neighborhood: initial?.neighborhood || '',
    city: initial?.city || 'Maceió',
    state: initial?.state || 'AL',
    latitude: initial?.latitude ? String(initial.latitude) : '',
    longitude: initial?.longitude ? String(initial.longitude) : '',
    status: initial?.status || 'ativa',
  })

  const [churches, setChurches] = useState<any[]>([])
  const [searchingCep, setSearchingCep] = useState(false)
  const [searchingGps, setSearchingGps] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [mapZoom, setMapZoom] = useState(16)
  const [leaderLabel, setLeaderLabel] = useState(initial?.leader?.full_name || '')
  const [coLeaderLabel, setCoLeaderLabel] = useState(initial?.co_leader?.full_name || '')

  const mapCenter = useMemo(() => {
    const lat = parseFloat(form.latitude)
    const lng = parseFloat(form.longitude)
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng] as [number, number]
    return [-9.6498, -35.7089] as [number, number] // Maceió
  }, [form.latitude, form.longitude])

  const onMapClick = (latlng: L.LatLng) => {
    update('latitude', latlng.lat.toFixed(7))
    update('longitude', latlng.lng.toFixed(7))
  }

  const handleGetGps = () => {
    setSearchingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('latitude', pos.coords.latitude.toFixed(7))
        update('longitude', pos.coords.longitude.toFixed(7))
        setMapZoom(18)
        setSearchingGps(false)
      },
      (err) => {
        console.error(err)
        alert('Erro ao obter localização. Verifique as permissões do navegador.')
        setSearchingGps(false)
      }
    )
  }

  const handleSearchAddress = async () => {
    if (!form.street || !form.city) return
    setGeocoding(true)
    
    // Usando Nominatim (OpenStreetMap) - Gratuito
    const query = encodeURIComponent(`${form.street}, ${form.number || ''}, ${form.neighborhood}, ${form.city}, ${form.state}, Brazil`)
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
      const results = await res.json()
      
      if (results && results[0]) {
        update('latitude', parseFloat(results[0].lat).toFixed(7))
        update('longitude', parseFloat(results[0].lon).toFixed(7))
        setMapZoom(17)
      } else {
        alert('Endereço não encontrado no mapa. Tente ajustar o nome da rua ou clique manualmente no mapa.')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao buscar endereço. Tente novamente mais tarde.')
    } finally {
      setGeocoding(false)
    }
  }

  useEffect(() => {
    adminFetchJson<{ items: any[] }>('/api/admin/consolidacao/churches')
      .then(data => setChurches(data.items || []))
      .catch(console.error)
  }, [])

  const update = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setSearchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }))

        // Auto-geocodificação via Nominatim após preencher o endereço pelo CEP
        const query = [data.logradouro, data.bairro, data.localidade, data.uf, 'Brasil']
          .filter(Boolean)
          .join(', ')
        try {
          setGeocoding(true)
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
            { headers: { 'User-Agent': 'MidiaIgreja/1.0' } }
          )
          const geo = await geoRes.json()
          if (Array.isArray(geo) && geo[0]?.lat && geo[0]?.lon) {
            setForm(prev => ({
              ...prev,
              latitude: parseFloat(geo[0].lat).toFixed(7),
              longitude: parseFloat(geo[0].lon).toFixed(7),
            }))
            setMapZoom(17)
          }
        } catch {
          // geocodificação falhou silenciosamente — usuário pode ajustar no mapa
        } finally {
          setGeocoding(false)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    } finally {
      setSearchingCep(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const inputClass = "w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados da Célula</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Nome da Célula *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className={inputClass}
              required
              placeholder="Ex: Célula Betel"
            />
          </div>

          <div>
            <label className={labelClass}>Igreja (Núcleo) *</label>
            <CustomSelect
              value={form.church_id}
              onChange={v => update('church_id', v)}
              options={churches.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Selecione a igreja"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <CustomSelect
              value={form.status}
              onChange={v => update('status', v)}
              options={[
                { value: 'ativa', label: 'Ativa' },
                { value: 'inativa', label: 'Inativa' },
              ]}
            />
          </div>

          <div>
            <label className={labelClass}>Dia da Semana</label>
            <CustomSelect
              value={form.day_of_week}
              onChange={v => update('day_of_week', v)}
              options={DAYS_OF_WEEK}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Horário</label>
              <input
                type="time"
                value={form.time_of_day}
                onChange={e => update('time_of_day', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Frequência</label>
              <CustomSelect
                value={form.frequency}
                onChange={v => update('frequency', v)}
                options={FREQUENCIES}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Liderança</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Líder *</label>
            <CreatableCombobox
              fetchItems={async (q) => {
                const data = await adminFetchJson<{ items: any[] }>(`/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(q)}`)
                return { items: data.items.map(p => ({ id: p.id, label: p.full_name })) }
              }}
              selectedId={form.leader_person_id}
              selectedLabel={leaderLabel}
              onChange={(id, _, label) => {
                update('leader_person_id', id || '')
                if (label) setLeaderLabel(label)
              }}
              placeholder="Buscar líder..."
            />
          </div>
          <div>
            <label className={labelClass}>Co-líder</label>
            <CreatableCombobox
              fetchItems={async (q) => {
                const data = await adminFetchJson<{ items: any[] }>(`/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(q)}`)
                return { items: data.items.map(p => ({ id: p.id, label: p.full_name })) }
              }}
              selectedId={form.co_leader_person_id}
              selectedLabel={coLeaderLabel}
              onChange={(id, _, label) => {
                update('co_leader_person_id', id || '')
                if (label) setCoLeaderLabel(label)
              }}
              placeholder="Buscar co-líder..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <MapPin size={20} className="text-[#c62737]" />
          Localização e Endereço
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Digite o CEP para preencher o endereço e posicionar o pin automaticamente. Ajuste arrastando o pin ou clicando no mapa.
        </p>
        <div className="flex justify-end gap-2 mb-4">
            <button
              type="button"
              onClick={handleGetGps}
              disabled={searchingGps}
              className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-semibold hover:bg-sky-100 transition-colors flex items-center gap-1.5"
            >
              {searchingGps ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Navigation size={14} />
              )}
              {searchingGps ? 'Capturando...' : 'Usar GPS Atual'}
            </button>
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={geocoding || !form.street}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {geocoding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              {geocoding ? 'Geocodificando...' : 'Geocodificar Endereço'}
            </button>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-12 h-[350px] rounded-xl overflow-hidden border border-slate-200 shadow-inner group relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
            >
              <ChangeView center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapEventsHandler onClick={onMapClick} />
              
              {form.latitude && form.longitude && (
                <Marker 
                  position={[parseFloat(form.latitude), parseFloat(form.longitude)]}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target
                      const position = marker.getLatLng()
                      update('latitude', position.lat.toFixed(7))
                      update('longitude', position.lng.toFixed(7))
                    }
                  }}
                />
              )}
            </MapContainer>
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/95 backdrop-blur-[2px] rounded-full text-[11px] font-bold text-slate-600 shadow-md border border-slate-200 pointer-events-none z-[1000] group-hover:border-[#c62737] group-hover:text-[#c62737] transition-all flex items-center gap-2">
              {geocoding ? (
                <>
                  <Loader2 size={12} className="text-[#c62737] animate-spin" />
                  POSICIONANDO PELO ENDEREÇO...
                </>
              ) : form.latitude && form.longitude ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  PIN DEFINIDO · ARRASTE PARA AJUSTAR
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#c62737] animate-pulse" />
                  INFORME O CEP OU CLIQUE NO MAPA PARA POSICIONAR
                </>
              )}
            </div>
          </div>

          <div className="md:col-span-3">
            <label className={labelClass}>CEP</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={form.cep}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                  update('cep', v)
                  if (v.length === 8) handleCepSearch(v)
                }}
                className={`${inputClass} pl-9`}
                placeholder="00000-000"
                maxLength={8}
              />
              {(searchingCep || geocoding) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#c62737]" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {searchingCep ? 'Buscando endereço...' : geocoding ? 'Posicionando no mapa...' : 'Preencha o CEP para localizar automaticamente'}
            </p>
          </div>
          <div className="md:col-span-6">
            <label className={labelClass}>Rua / Logradouro</label>
            <input
              type="text"
              value={form.street}
              onChange={e => update('street', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Número</label>
            <input
              type="text"
              value={form.address_number}
              onChange={e => update('address_number', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-4">
            <label className={labelClass}>Bairro</label>
            <input
              type="text"
              value={form.neighborhood}
              onChange={e => update('neighborhood', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-4">
            <label className={labelClass}>Cidade / UF</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.city}
                onChange={e => update('city', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                value={form.state}
                onChange={e => update('state', e.target.value)}
                className="w-20 px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
                maxLength={2}
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <label className={labelClass}>Latitude / Longitude (Coordenadas)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.latitude}
                onChange={e => update('latitude', e.target.value)}
                className={inputClass}
                placeholder="Latitude"
              />
              <input
                type="text"
                value={form.longitude}
                onChange={e => update('longitude', e.target.value)}
                className={inputClass}
                placeholder="Longitude"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" loading={loading}>
          {initial ? 'Salvar Alterações' : 'Criar Célula'}
        </Button>
      </div>
    </form>
  )
}
