import { prisma } from '../config/prisma.js'

const DEFAULT_SETTINGS = [
  {
    key: 'operating_hours',
    label: 'Operating Hours',
    description: 'Daily opening and closing hours for the parking facility.',
    category: 'general',
    type: 'string',
    value: '06:00 - 23:00',
  },
  {
    key: 'grace_period_minutes',
    label: 'Grace Period (minutes)',
    description: 'Minutes allowed before overtime fees start applying.',
    category: 'general',
    type: 'number',
    value: '15',
  },
  {
    key: 'tax_rate_percent',
    label: 'Tax Rate (%)',
    description: 'Default tax percentage applied to parking fees.',
    category: 'general',
    type: 'number',
    value: '10',
  },
  {
    key: 'penalty_fee',
    label: 'Penalty Fee',
    description: 'Flat penalty amount used for policy violations.',
    category: 'general',
    type: 'number',
    value: '5',
  },
  {
    key: 'currency',
    label: 'Currency',
    description: 'Display currency for pricing and reports.',
    category: 'general',
    type: 'string',
    value: 'USD',
  },
  {
    key: 'auto_lock_full_zones',
    label: 'Auto Lock Full Zones',
    description: 'Automatically block new allocations when a zone is full.',
    category: 'preferences',
    type: 'boolean',
    value: 'true',
  },
  {
    key: 'enable_notifications',
    label: 'Enable Notifications',
    description: 'Send operational alerts to staff and managers.',
    category: 'preferences',
    type: 'boolean',
    value: 'true',
  },
  {
    key: 'allow_reservation',
    label: 'Allow Reservation',
    description: 'Allow customers to create parking reservations.',
    category: 'preferences',
    type: 'boolean',
    value: 'false',
  },
]

const ensureDefaults = async () => {
  await Promise.all(
    DEFAULT_SETTINGS.map((setting) =>
      prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      })
    )
  )
}

const getSettings = async () => {
  await ensureDefaults()

  return prisma.systemSetting.findMany({
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })
}

const updateSettings = async (settings) => {
  await ensureDefaults()

  await prisma.$transaction(
    settings.map((setting) =>
      prisma.systemSetting.update({
        where: { key: setting.key },
        data: {
          value: setting.value,
        },
      })
    )
  )

  return getSettings()
}

export const systemSettingService = {
  getSettings,
  updateSettings,
}
