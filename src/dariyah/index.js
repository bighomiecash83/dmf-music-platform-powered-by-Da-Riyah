'use strict'

const DIVISIONS = Object.freeze([
  {
    id: 'distribution',
    name: 'Distribution',
    description: 'DSP delivery, ERN 4.3 generation, ISRC/UPC management',
    status: 'active',
    modules: ['ern', 'identifiers', 'approvals'],
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Audio session management, mixing, mastering pipeline',
    status: 'active',
    modules: ['studio'],
  },
  {
    id: 'video',
    name: 'Video',
    description: 'Music video rendering, scene planning, style presets',
    status: 'active',
    modules: ['video'],
  },
  {
    id: 'roster',
    name: 'Roster',
    description: 'Artist management, metrics, Spotify integration',
    status: 'active',
    modules: ['roster'],
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Code/data prep workspace, migration tools',
    status: 'active',
    modules: ['workshop', 'dariyah/migrations'],
  },
  {
    id: 'ai',
    name: 'Da\'Riyah AI',
    description: 'Code assistance, sandbox execution, AI chat',
    status: 'active',
    modules: ['dariyah/code', 'dariyah/sandbox'],
  },
])

function listDivisions() {
  return [...DIVISIONS]
}

function getDivision(id) {
  return DIVISIONS.find(d => d.id === id) || null
}

function engineStatus() {
  const { version } = require('../../package.json')
  return {
    name: 'DMF Distribution Engine',
    version,
    divisions: DIVISIONS.length,
    divisionList: DIVISIONS.map(d => ({ id: d.id, name: d.name, status: d.status })),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }
}

module.exports = { listDivisions, getDivision, engineStatus, DIVISIONS }
