/** «5 h 9 min»; por debajo de la hora, «45 min». */
export function formatDuration(seconds: number, language: string): string {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const unit = (value: number, unitName: 'hour' | 'minute') =>
    new Intl.NumberFormat(language, {
      style: 'unit',
      unit: unitName,
      unitDisplay: 'narrow',
    }).format(value)
  if (hours === 0) return unit(minutes, 'minute')
  if (minutes === 0) return unit(hours, 'hour')
  return `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`
}
