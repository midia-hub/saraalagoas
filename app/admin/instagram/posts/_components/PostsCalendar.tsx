'use client'

import { useState, useMemo } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { Loader2, CalendarDays, LayoutGrid, List } from 'lucide-react'
import type { ScheduledItem } from './types'
import { PostCard } from './PostCard'

type ViewMode = 'month' | 'week' | 'day'

type PostsCalendarProps = {
  posts: ScheduledItem[]
  loading?: boolean
  onReschedule: (postId: string, newScheduledAt: string) => Promise<void>
  /** Data inicial do calendário */
  initialDate?: Date
}

function getPostsForDate(posts: ScheduledItem[], date: Date): ScheduledItem[] {
  const d = date.toDateString()
  return posts.filter((p) => {
    const at = new Date(p.scheduled_at)
    return at.toDateString() === d && p.status === 'pending'
  })
}

function getPostsForWeek(posts: ScheduledItem[], startOfWeek: Date): ScheduledItem[] {
  const end = new Date(startOfWeek)
  end.setDate(end.getDate() + 7)
  return posts.filter((p) => {
    if (p.status !== 'pending') return false
    const at = new Date(p.scheduled_at)
    return at >= startOfWeek && at < end
  })
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = x.getDate() - day + (day === 0 ? -6 : 1)
  x.setDate(diff)
  x.setHours(0, 0, 0, 0)
  return x
}

export function PostsCalendar({
  posts,
  loading = false,
  onReschedule,
  initialDate = new Date(),
}: PostsCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)

  const pendingPosts = useMemo(
    () => posts.filter((p) => p.status === 'pending'),
    [posts]
  )

  const dayPosts = useMemo(
    () => getPostsForDate(pendingPosts, selectedDate),
    [pendingPosts, selectedDate]
  )

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])
  const weekPosts = useMemo(
    () => getPostsForWeek(pendingPosts, weekStart),
    [pendingPosts, weekStart]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over?.data?.current?.date) return
    const postId = active.id as string
    const targetDate = over.data.current.date as Date
    const post = pendingPosts.find((p) => p.id === postId)
    if (!post) return
    const current = new Date(post.scheduled_at)
    targetDate.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), 0)
    setReschedulingId(postId)
    try {
      await onReschedule(postId, targetDate.toISOString())
    } finally {
      setReschedulingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Calendário de postagens</h2>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={viewMode === 'month'}
          >
            <CalendarDays className="h-4 w-4" />
            Mês
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={viewMode === 'week'}
          >
            <LayoutGrid className="h-4 w-4" />
            Semana
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={viewMode === 'day'}
          >
            <List className="h-4 w-4" />
            Dia
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : viewMode === 'month' ? (
        <div className="calendar-month">
          <Calendar
            locale="pt-BR"
            value={selectedDate}
            onChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value
              if (next instanceof Date) setSelectedDate(next)
            }}
            tileClassName={({ date }) => {
              const count = getPostsForDate(pendingPosts, date).length
              return count > 0 ? 'has-posts' : ''
            }}
            tileContent={({ date }) => {
              const count = getPostsForDate(pendingPosts, date).length
              if (count === 0) return null
              return (
                <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c62737] text-xs font-medium text-white">
                  {count}
                </span>
              )
            }}
          />
        </div>
      ) : viewMode === 'week' ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <WeekGrid
            weekStart={weekStart}
            weekPosts={weekPosts}
            reschedulingId={reschedulingId}
            onSelectDate={setSelectedDate}
          />
          <DragOverlay>
            {reschedulingId ? (
              <div className="rounded-lg border-2 border-[#c62737] bg-white p-2 shadow-lg opacity-90">
                <span className="text-sm font-medium text-slate-700">Reprogramando...</span>
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-[#c62737]" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <DayView date={selectedDate} posts={dayPosts} onDateChange={setSelectedDate} />
      )}
    </div>
  )
}

function WeekGrid({
  weekStart,
  weekPosts,
  reschedulingId,
  onSelectDate,
}: {
  weekStart: Date
  weekPosts: ScheduledItem[]
  reschedulingId: string | null
  onSelectDate: (d: Date) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => (
        <WeekDayColumn
          key={day.toISOString()}
          day={day}
          posts={weekPosts.filter((p) => new Date(p.scheduled_at).toDateString() === day.toDateString())}
          reschedulingId={reschedulingId}
          onSelectDate={onSelectDate}
        />
      ))}
    </div>
  )
}

function WeekDayColumn({
  day,
  posts,
  reschedulingId,
  onSelectDate,
}: {
  day: Date
  posts: ScheduledItem[]
  reschedulingId: string | null
  onSelectDate: (d: Date) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.toISOString()}`,
    data: { date: day },
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-lg border-2 p-2 transition-colors ${
        isOver ? 'border-[#c62737] bg-red-50/50' : 'border-slate-200 bg-slate-50/50'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectDate(day)}
        className="w-full rounded py-1 text-center text-sm font-medium text-slate-700 hover:bg-white"
      >
        {day.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
      </button>
      <div className="mt-2 space-y-2">
        {posts.map((post) => (
          <DraggablePostKey
            key={post.id}
            post={post}
            isRescheduling={reschedulingId === post.id}
          />
        ))}
      </div>
    </div>
  )
}

function DraggablePostKey({
  post,
  isRescheduling,
}: {
  post: ScheduledItem
  isRescheduling: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { post },
  })

  const time = new Date(post.scheduled_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const title = post.galleries?.title ?? 'Post'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-sm shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      } ${isRescheduling ? 'animate-pulse' : ''}`}
    >
      <span className="font-medium text-slate-800">{time}</span>
      <p className="truncate text-xs text-slate-600">{title}</p>
    </div>
  )
}

function DayView({
  date,
  posts,
  onDateChange,
}: {
  date: Date
  posts: ScheduledItem[]
  onDateChange: (d: Date) => void
}) {
  const sorted = useMemo(
    () => [...posts].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [posts]
  )

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-600">
        {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-slate-500">Nenhuma postagem programada para este dia.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((post) => (
            <li key={post.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <span className="shrink-0 text-sm font-medium text-slate-700">
                {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{post.galleries?.title ?? 'Postagem'}</p>
                {post.caption && <p className="truncate text-xs text-slate-600">{post.caption}</p>}
              </div>
              <a
                href={`/admin/galeria/${post.album_id}/post/create`}
                className="shrink-0 text-sm text-[#c62737] hover:underline"
              >
                Editar
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
