const VIETNAM_UTC_OFFSET_MINUTES = 7 * 60
const VIETNAM_UTC_OFFSET_MS = VIETNAM_UTC_OFFSET_MINUTES * 60 * 1000
const MINUTE_IN_MS = 60 * 1000
const DAY_IN_MS = 24 * 60 * MINUTE_IN_MS
const EXPLICIT_TIMEZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i
const VIETNAM_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/

const padMilliseconds = (value = '0') => Number(value.padEnd(3, '0').slice(0, 3))

export const parseVietnamDateTime = (value) => {
  if (value instanceof Date) {
    return new Date(value.getTime())
  }

  if (typeof value !== 'string') {
    return new Date(value)
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return new Date(Number.NaN)
  }

  if (EXPLICIT_TIMEZONE_PATTERN.test(normalizedValue)) {
    return new Date(normalizedValue)
  }

  const matched = normalizedValue.match(VIETNAM_DATE_TIME_PATTERN)

  if (!matched) {
    return new Date(normalizedValue)
  }

  const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = matched
  const utcTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    padMilliseconds(millisecond)
  )

  return new Date(utcTime - VIETNAM_UTC_OFFSET_MS)
}

export const toVietnamDate = (value) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return new Date(date.getTime() + VIETNAM_UTC_OFFSET_MS)
}

export const startOfVietnamDay = (value) => {
  const vietnamDate = toVietnamDate(value)

  return new Date(
    Date.UTC(vietnamDate.getUTCFullYear(), vietnamDate.getUTCMonth(), vietnamDate.getUTCDate()) -
      VIETNAM_UTC_OFFSET_MS
  )
}

export const addVietnamDays = (value, days) => new Date(value.getTime() + days * DAY_IN_MS)

export const setVietnamMinutes = (value, minutes) => {
  const startOfDay = startOfVietnamDay(value)
  return new Date(startOfDay.getTime() + minutes * MINUTE_IN_MS)
}
