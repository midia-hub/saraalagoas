'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== 'undefined') {
  // Ícone personalizado com a cor da marca (#c62737)
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

  const CustomIcon = L.divIcon({
    className: "my-custom-pin",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<div style="${markerHtmlStyles}" />`
  })
  
  L.Marker.prototype.options.icon = CustomIcon
}

interface CelulasMapProps {
  cells: any[]
}

// Componente interno para lidar com o Heatmap (precisa do hook useMap)
function HeatmapLayer({ points, ready }: { points: [number, number, number][], ready: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !points.length || !ready) return

    // @ts-ignore - leaflet.heat estende o objeto L global
    if (typeof L.heatLayer !== 'function') return

    // @ts-ignore
    const heat = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.2: '#fee2e2', // Red 100
        0.4: '#fecaca', // Red 200
        0.6: '#f87171', // Red 400
        0.8: '#ef4444', // Red 500
        1.0: '#c62737'  // O Vermelho da logo (#c62737)
      }
    }).addTo(map)

    return () => {
      map.removeLayer(heat)
    }
  }, [map, points, ready])

  return null
}

export default function CelulasMap({ cells }: CelulasMapProps) {
  const [heatReady, setHeatReady] = useState(false)
  const defaultCenter: [number, number] = [-9.6498, -35.7089] // Maceió

  useEffect(() => {
    // Importar leaflet.heat dinamicamente no cliente
    import('leaflet.heat').then(() => {
      setHeatReady(true)
    })
  }, [])

  // Filtrar células com lat/lng e preparar pontos para o heatmap
  const validCells = useMemo(() => 
    cells.filter(c => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))),
  [cells])

  const heatPoints: [number, number, number][] = validCells.map(c => [
    parseFloat(c.latitude),
    parseFloat(c.longitude),
    0.6 // Intensidade padrão
  ])

  const center = validCells.length > 0 
    ? [parseFloat(validCells[0].latitude), parseFloat(validCells[0].longitude)] as [number, number]
    : defaultCenter

  return (
    <MapContainer 
      center={center} 
      zoom={validCells.length > 0 ? 15 : 13} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      {/* TileLayer mais limpo e profissional do CartoDB */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <HeatmapLayer points={heatPoints} ready={heatReady} />

      {validCells.map((cell) => (
        <React.Fragment key={cell.id}>
          <Marker position={[parseFloat(cell.latitude), parseFloat(cell.longitude)]}>
            <Popup>
              <div className="p-1 min-w-[150px]">
                <p className="font-bold text-slate-800 m-0 text-sm">{cell.name}</p>
                <p className="text-xs text-slate-500 m-0">{cell.neighborhood}</p>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter m-0">Líder</p>
                  <p className="text-xs font-semibold text-emerald-600 m-0">{cell.leader?.full_name || '—'}</p>
                </div>
              </div>
            </Popup>
          </Marker>
          
          <Circle
            center={[parseFloat(cell.latitude), parseFloat(cell.longitude)]}
            radius={100}
            pathOptions={{ 
              fillColor: '#c62737', 
              color: '#c62737', 
              weight: 1, 
              fillOpacity: 0.05 
            }}
          />
        </React.Fragment>
      ))}
    </MapContainer>
  )
}
