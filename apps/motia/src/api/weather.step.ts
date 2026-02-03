import { z } from 'zod'

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || ''
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/3.0'

const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000

interface WeatherData {
  current?: {
    temp: number
    humidity?: number
    wind_speed?: number
    weather?: Array<{ description?: string }>
  }
  daily?: Array<{
    dt: number
    temp: { min: number; max: number }
  }>
  cached?: boolean
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  if (!OPENWEATHERMAP_API_KEY) {
    throw new Error('OpenWeatherMap API key not configured')
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = weatherCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, cached: true }
  }

  const url = `${OPENWEATHERMAP_BASE_URL}/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=zh_cn`
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })

  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status}`)
  }

  const data = await response.json()
  weatherCache.set(cacheKey, { data, timestamp: Date.now() })
  return { ...data, cached: false }
}

const queryParamsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

export const config = {
  type: 'api',
  name: 'WeatherForecast',
  description: '天气预报 API',
  path: '/api/weather/forecast',
  method: 'GET',
  emits: [],
  flows: ['weather'],
}

interface HandlerContext {
  logger: { info: (msg: string, data?: unknown) => void; error: (msg: string, data?: unknown) => void }
}

export async function handler(req: { queryParams?: Record<string, string> }, { logger }: HandlerContext) {
  const parseResult = queryParamsSchema.safeParse(req.queryParams)

  if (!parseResult.success) {
    return { status: 400, body: { error: 'Valid lat and lon required' } }
  }

  const { lat, lon } = parseResult.data

  try {
    logger.info('Fetching weather', { lat, lon })
    const forecast = await fetchWeather(lat, lon)
    return {
      status: 200,
      body: {
        data: {
          current: forecast.current,
          daily: forecast.daily?.map((d) => ({ dt: d.dt, temp_min: d.temp.min, temp_max: d.temp.max })),
          cached: forecast.cached,
        },
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weather service unavailable'
    logger.error('Weather fetch failed', { error: message })
    return { status: 503, body: { error: message } }
  }
}
