'use strict'

const REQUIRED_ENV = [
  'DMF_MESSAGE_ID',
  'DMF_ISRC',
  'DMF_UPC',
  'DMF_SENDER_ID',
  'DMF_RECIPIENT_ID',
]

const OPTIONAL_ENV = [
  'DMF_ENV',
  'DMF_APPROVAL_FILE',
  'DMF_DATA_DIR',
  'PORT',
]

function validateEnv({ strict = false } = {}) {
  const missing = REQUIRED_ENV.filter(k => !process.env[k])
  if (strict && missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  return { missing, ok: missing.length === 0 }
}

function getConfig() {
  return {
    env: process.env.DMF_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    dataDir: process.env.DMF_DATA_DIR || '.data',
    approvalFile: process.env.DMF_APPROVAL_FILE || '.data/approvals.json',
    isProduction: (process.env.DMF_ENV || 'development') === 'production',
    messageId: process.env.DMF_MESSAGE_ID || null,
    isrc: process.env.DMF_ISRC || null,
    upc: process.env.DMF_UPC || null,
    senderId: process.env.DMF_SENDER_ID || null,
    recipientId: process.env.DMF_RECIPIENT_ID || null,
  }
}

module.exports = { validateEnv, getConfig, REQUIRED_ENV, OPTIONAL_ENV }
