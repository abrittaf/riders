/** «850 m» por debajo del kilómetro; «12,3 km» hasta cien; «1.250 km» de ahí en más. */
export function formatDistance(
  distanceInMeters: number,
  language: string,
): string {
  if (distanceInMeters < 1000) {
    return new Intl.NumberFormat(language, {
      style: 'unit',
      unit: 'meter',
      maximumFractionDigits: 0,
    }).format(distanceInMeters)
  }
  const kilometers = distanceInMeters / 1000
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: kilometers < 100 ? 1 : 0,
  }).format(kilometers)
}
