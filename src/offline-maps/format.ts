const KILOBYTE = 1024
const MEGABYTE = 1024 * KILOBYTE
const GIGABYTE = 1024 * MEGABYTE

export function formatSize(sizeInBytes: number, language: string): string {
  const [value, unit] =
    sizeInBytes >= GIGABYTE
      ? [sizeInBytes / GIGABYTE, 'gigabyte']
      : sizeInBytes >= MEGABYTE || sizeInBytes === 0
        ? [sizeInBytes / MEGABYTE, 'megabyte']
        : [sizeInBytes / KILOBYTE, 'kilobyte']
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit,
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(date: Date, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date)
}
