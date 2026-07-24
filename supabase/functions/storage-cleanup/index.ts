import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type Stats = {
  storageFilesDeleted: number
  storageBytesDeleted: number
  videoOrReelPostsDeleted: number
  roomVideoPostsDeleted: number
  storiesDeleted: number
  chatVideoMessagesCleared: number
  postsDeleted: number
  roomPostsDeleted: number
  errors: string[]
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VIDEO_RE = /\.(mp4|mov|m4v|webm|avi|mkv|3gp|mpeg|mpg)(\?|$)/i
const KEEP_IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|bmp|avif)(\?|$)/i
const JUNK_RE = /(cache|test|tmp|temp|thumbnail|reel|video)/i

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const publicPath = (url: string | null | undefined, bucket: string) => {
  if (!url) return null
  const marker = `/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index < 0) return null
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0])
}

const add = (set: Set<string>, value: string | null) => {
  if (value) set.add(value)
}

async function listAll(supabase: ReturnType<typeof createClient>, bucket: string, prefix = ''): Promise<Array<{ path: string; size: number; createdAt?: string }>> {
  const out: Array<{ path: string; size: number; createdAt?: string }> = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    const rows = data ?? []

    for (const item of rows) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      const metadata = item.metadata as { size?: number } | null
      if (item.id || typeof metadata?.size === 'number') {
        out.push({ path, size: Number(metadata?.size ?? 0), createdAt: item.created_at })
      } else {
        out.push(...await listAll(supabase, bucket, path))
      }
    }

    if (rows.length < 1000) break
    offset += 1000
  }

  return out
}

async function removeFiles(supabase: ReturnType<typeof createClient>, bucket: string, files: Array<{ path: string; size: number }>, stats: Stats) {
  const unique = Array.from(new Map(files.map((file) => [file.path, file])).values())

  for (let index = 0; index < unique.length; index += 100) {
    const batch = unique.slice(index, index + 100)
    const { error } = await supabase.storage.from(bucket).remove(batch.map((file) => file.path))
    if (error) {
      stats.errors.push(`${bucket}: ${error.message}`)
      continue
    }
    stats.storageFilesDeleted += batch.length
    stats.storageBytesDeleted += batch.reduce((sum, file) => sum + file.size, 0)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Cleanup secrets are missing.' }, 500)

  const stats: Stats = {
    storageFilesDeleted: 0,
    storageBytesDeleted: 0,
    videoOrReelPostsDeleted: 0,
    roomVideoPostsDeleted: 0,
    storiesDeleted: 0,
    chatVideoMessagesCleared: 0,
    postsDeleted: 0,
    roomPostsDeleted: 0,
    errors: [],
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const keepAvatars = new Set<string>()
    const keepCovers = new Set<string>()
    const keepChat = new Set<string>()

    const { data: profiles } = await supabase.from('profiles').select('avatar, cover_image')
    for (const profile of profiles ?? []) {
      add(keepAvatars, publicPath(profile.avatar, 'avatars'))
      add(keepCovers, publicPath(profile.cover_image, 'avatars'))
    }

    const { count: postsCount } = await supabase.from('posts').select('id', { count: 'exact', head: true })
    const { count: roomPostsCount } = await supabase.from('room_posts').select('id', { count: 'exact', head: true })
    stats.postsDeleted = postsCount ?? 0
    stats.roomPostsDeleted = roomPostsCount ?? 0

    const { data: messages } = await supabase.from('messages').select('id, type, media_url')
    const videoMessageIds: string[] = []
    for (const message of messages ?? []) {
      if (message.type === 'video' || VIDEO_RE.test(message.media_url ?? '')) videoMessageIds.push(message.id)
      else add(keepChat, publicPath(message.media_url, 'chat-media'))
    }

    const { count: storyCount } = await supabase.from('stories').select('id', { count: 'exact', head: true })
    stats.storiesDeleted = storyCount ?? 0

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    for (const bucket of ['avatars', 'covers', 'posts', 'room-media', 'stories', 'status-images', 'story-videos', 'reels', 'chat-media', 'chat-images', 'voice-notes', 'group-avatars', 'music']) {
      try {
        const files = await listAll(supabase, bucket)
        const toDelete = files.filter((file) => {
          if (['posts', 'room-media', 'stories', 'status-images', 'story-videos', 'reels'].includes(bucket)) return true
          if (VIDEO_RE.test(file.path) || JUNK_RE.test(file.path)) return true
          if (bucket === 'avatars') return !keepAvatars.has(file.path) && !keepCovers.has(file.path)
          if (bucket === 'covers') return false
          if (bucket === 'group-avatars') return false
          if (bucket === 'music' || bucket === 'voice-notes') return false
          if (bucket === 'chat-media' || bucket === 'chat-images') {
            const createdAt = file.createdAt ? Date.parse(file.createdAt) : 0
            return !keepChat.has(file.path) || (createdAt > 0 && createdAt < cutoff && !KEEP_IMAGE_RE.test(file.path))
          }
          return false
        })
        await removeFiles(supabase, bucket, toDelete, stats)
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : `${bucket}: cleanup failed`)
      }
    }

    const { error: postsDeleteError } = await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (postsDeleteError) stats.errors.push(`posts: ${postsDeleteError.message}`)

    const { error: roomPostsDeleteError } = await supabase.from('room_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (roomPostsDeleteError) stats.errors.push(`room_posts: ${roomPostsDeleteError.message}`)

    for (let index = 0; index < videoMessageIds.length; index += 100) {
      const batch = videoMessageIds.slice(index, index + 100)
      const { count, error } = await supabase
        .from('messages')
        .update({ type: 'text', media_url: null, content: 'Video attachment removed to restore storage.' }, { count: 'exact' })
        .in('id', batch)
      if (error) stats.errors.push(`messages: ${error.message}`)
      stats.chatVideoMessagesCleared += count ?? batch.length
    }

    const { error: storyDeleteError } = await supabase.from('stories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (storyDeleteError) stats.errors.push(`stories: ${storyDeleteError.message}`)

    return json({
      ok: stats.errors.length === 0,
      ...stats,
      storageDeletedMb: Number((stats.storageBytesDeleted / 1024 / 1024).toFixed(2)),
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Storage cleanup failed.' }, 500)
  }
})