export const compactLicensePlate = (licensePlate = '') =>
  licensePlate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

const formatPlateNumberBlock = (numberBlock) => {
  if (numberBlock.length < 4) {
    return numberBlock
  }

  return `${numberBlock.slice(0, -2)}.${numberBlock.slice(-2)}`
}

export const formatLicensePlate = (licensePlate = '') => {
  const compactPlate = compactLicensePlate(licensePlate)

  if (!compactPlate) {
    return ''
  }

  for (const numericBlockLength of [5, 4]) {
    if (compactPlate.length <= numericBlockLength) {
      continue
    }

    const prefix = compactPlate.slice(0, -numericBlockLength)
    const numberBlock = compactPlate.slice(-numericBlockLength)

    if (!/^\d{2}[A-Z0-9]{1,3}$/.test(prefix) || !/[A-Z]/.test(prefix) || !/^\d+$/.test(numberBlock)) {
      continue
    }

    return `${prefix}-${formatPlateNumberBlock(numberBlock)}`
  }

  return compactPlate
}
