'use strict'

// ERN 4.3 — Electronic Release Notification (DDEX standard)

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generateErn(release) {
  const {
    messageId,
    senderId,
    recipientId,
    createdAt = new Date().toISOString(),
    title,
    artist,
    isrc,
    upc,
    genre = 'Hip-Hop',
    releaseDate,
    label = 'DMF Records Fly Hoolie ENT Co.',
    territory = 'Worldwide',
    trackList = [],
  } = release

  if (!messageId) throw new Error('ERN requires messageId')
  if (!isrc) throw new Error('ERN requires ISRC')
  if (!title) throw new Error('ERN requires title')
  if (!artist) throw new Error('ERN requires artist')

  const resourceRefs = trackList.length
    ? trackList.map((t, i) => `        <ResourceReference>A${String(i + 1).padStart(6, '0')}</ResourceReference>`).join('\n')
    : `        <ResourceReference>A000001</ResourceReference>`

  const soundRecordings = trackList.length
    ? trackList.map((t, i) => _buildSoundRecording(t, `A${String(i + 1).padStart(6, '0')}`)).join('\n')
    : _buildSoundRecording({ title, artist, isrc }, 'A000001')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ernm:NewReleaseMessage
  xmlns:ernm="http://ddex.net/xml/ern/43"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xs:schemaLocation="http://ddex.net/xml/ern/43 http://ddex.net/xml/ern/43/release-notification.xsd"
  MessageSchemaVersionId="ern/43"
  ReleaseProfileVersionId="CommonDealTypes/14">

  <MessageHeader>
    <MessageThreadId>${_esc(messageId)}</MessageThreadId>
    <MessageId>${_esc(messageId)}</MessageId>
    <MessageSender>
      <PartyId>${_esc(senderId || 'PADPIDA2009121501U')}</PartyId>
      <PartyName><FullName>${_esc(label)}</FullName></PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>${_esc(recipientId || 'PADPIDA2004120101U')}</PartyId>
    </MessageRecipient>
    <MessageCreatedDateTime>${_esc(createdAt)}</MessageCreatedDateTime>
  </MessageHeader>

  <ResourceList>
${soundRecordings}
  </ResourceList>

  <ReleaseList>
    <Release>
      <ReleaseReference>R0</ReleaseReference>
      <ReleaseType>Single</ReleaseType>
      <ReleaseId>
        ${isrc ? `<ISRC>${_esc(isrc)}</ISRC>` : ''}
        ${upc  ? `<UPC>${_esc(upc)}</UPC>`   : ''}
      </ReleaseId>
      <ReleaseTitle>
        <TitleText>${_esc(title)}</TitleText>
      </ReleaseTitle>
      <DisplayArtist>
        <PartyName><FullName>${_esc(artist)}</FullName></PartyName>
        <ArtistRole>MainArtist</ArtistRole>
      </DisplayArtist>
      <ReleaseLabel>${_esc(label)}</ReleaseLabel>
      <Genre>
        <GenreText>${_esc(genre)}</GenreText>
      </Genre>
      <ReleaseDate>${_esc(releaseDate || new Date().toISOString().slice(0, 10))}</ReleaseDate>
      <ReleaseResourceReferenceList>
${resourceRefs}
      </ReleaseResourceReferenceList>
    </Release>
  </ReleaseList>

  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R0</DealReleaseReference>
      <Deal>
        <DealTerms>
          <CommercialModelType>PayAsYouGoModel</CommercialModelType>
          <Usage>
            <UseType>OnDemandStream</UseType>
            <UseType>PermanentDownload</UseType>
          </Usage>
          <TerritoryCode>${_esc(territory)}</TerritoryCode>
        </DealTerms>
      </Deal>
    </ReleaseDeal>
  </DealList>

</ernm:NewReleaseMessage>`
}

function _buildSoundRecording(track, ref) {
  return `    <SoundRecording>
      <SoundRecordingType>MusicalWorkSoundRecording</SoundRecordingType>
      <SoundRecordingId>
        <ISRC>${_esc(track.isrc || '')}</ISRC>
      </SoundRecordingId>
      <ResourceReference>${_esc(ref)}</ResourceReference>
      <ReferenceTitle>
        <TitleText>${_esc(track.title || '')}</TitleText>
      </ReferenceTitle>
      <Duration>PT3M30S</Duration>
      <SoundRecordingDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <DisplayArtist>
          <PartyName><FullName>${_esc(track.artist || '')}</FullName></PartyName>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>
      </SoundRecordingDetailsByTerritory>
    </SoundRecording>`
}

function validateErnXml(xml) {
  const errors = []
  if (!xml.includes('<ernm:NewReleaseMessage')) errors.push('Missing root NewReleaseMessage element')
  if (!xml.includes('<MessageHeader>')) errors.push('Missing MessageHeader')
  if (!xml.includes('<ResourceList>')) errors.push('Missing ResourceList')
  if (!xml.includes('<ReleaseList>')) errors.push('Missing ReleaseList')
  if (!xml.includes('<DealList>')) errors.push('Missing DealList')
  if (!xml.includes('MessageSchemaVersionId="ern/43"')) errors.push('Missing or wrong MessageSchemaVersionId')
  return { ok: errors.length === 0, errors }
}

module.exports = { generateErn, validateErnXml }
