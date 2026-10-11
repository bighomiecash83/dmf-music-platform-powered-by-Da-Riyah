'use strict'

// Core
const config        = require('./config')
const identifiers   = require('./identifiers/index')

// Distribution
const ern           = require('./ern/index')
const ernDeliver    = require('./ern/deliver')
const approvals     = require('./approvals/index')

// Artists & Assets
const roster        = require('./roster/index')
const studio        = require('./studio/index')
const video         = require('./video/index')
const videoProviders = require('./video/providers')

// Da'Riyah Platform
const dariyah       = require('./dariyah/index')
const audit         = require('./dariyah/audit')
const code          = require('./dariyah/code')
const sandbox       = require('./dariyah/sandbox')
const migrations    = require('./dariyah/migrations')

// Workshop
const workshop      = require('./workshop/index')

module.exports = {
  // Config
  getConfig: config.getConfig,
  validateEnv: config.validateEnv,

  // Identifiers
  validateIsrc: identifiers.validateIsrc,
  validateUpc: identifiers.validateUpc,
  validateIsni: identifiers.validateIsni,
  validateGrid: identifiers.validateGrid,
  validateReleaseIdentifiers: identifiers.validateReleaseIdentifiers,

  // ERN / Delivery
  generateErn: ern.generateErn,
  validateErnXml: ern.validateErnXml,
  deliverErn: ernDeliver.deliverErn,

  // Approvals
  ApprovalGate: approvals.ApprovalGate,
  FileApprovalStore: approvals.FileApprovalStore,

  // Roster
  Roster: roster.Roster,
  ROSTER_SEED: roster.ROSTER_SEED,
  validateMetric: roster.validateMetric,
  parseSpotifyArtistUrl: roster.parseSpotifyArtistUrl,

  // Studio
  StudioStore: studio.StudioStore,
  createSession: studio.createSession,
  normaliseTrack: studio.normaliseTrack,
  processAudio: studio.processAudio,
  SESSION_STATUSES: studio.SESSION_STATUSES,

  // Video
  RenderQueue: video.RenderQueue,
  createVideoProject: video.createVideoProject,
  planCuts: video.planCuts,
  buildScenes: video.buildScenes,
  STYLE_PRESETS: video.STYLE_PRESETS,
  ProviderRegistry: videoProviders.ProviderRegistry,
  PROVIDER_CONTRACT: videoProviders.PROVIDER_CONTRACT,

  // Da'Riyah
  listDivisions: dariyah.listDivisions,
  getDivision: dariyah.getDivision,
  engineStatus: dariyah.engineStatus,
  AuditLog: audit.AuditLog,
  AUDIT_EVENTS: audit.AUDIT_EVENTS,
  CodeProviderRegistry: code.CodeProviderRegistry,
  buildCodeRequest: code.buildCodeRequest,
  requestCode: code.requestCode,
  SandboxRunner: sandbox.SandboxRunner,
  buildRunSpec: sandbox.buildRunSpec,
  NoSandbox: sandbox.NoSandbox,
  MigrationGate: migrations.MigrationGate,
  analyseMigration: migrations.analyseMigration,
  MIGRATION_KINDS: migrations.MIGRATION_KINDS,

  // Workshop
  WorkshopStore: workshop.WorkshopStore,
  createWorkshopItem: workshop.createWorkshopItem,
  WORKSHOP_STATUSES: workshop.WORKSHOP_STATUSES,
}
