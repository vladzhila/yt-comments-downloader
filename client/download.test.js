import { expect, test, describe } from 'bun:test'
import { createDownloadBlob } from './download/blob.js'

describe('createDownloadBlob', () => {
  test('creates blob from plain text data', async () => {
    const payload = {
      data: 'hello world',
      mimeType: 'text/plain',
    }
    const blob = createDownloadBlob(payload)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type.startsWith('text/plain')).toBe(true)
    expect(await blob.text()).toBe('hello world')
  })

  test('creates blob from base64 encoded data', async () => {
    const payload = {
      data: btoa('hello world'),
      mimeType: 'text/plain',
      encoding: 'base64',
    }
    const blob = createDownloadBlob(payload)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type.startsWith('text/plain')).toBe(true)
    expect(await blob.text()).toBe('hello world')
  })

  test('creates blob with correct mime type for JSON', async () => {
    const jsonData = JSON.stringify({ foo: 'bar' })
    const payload = {
      data: jsonData,
      mimeType: 'application/json',
    }
    const blob = createDownloadBlob(payload)

    expect(blob.type.startsWith('application/json')).toBe(true)
    expect(await blob.text()).toBe(jsonData)
  })

  test('creates blob from base64 binary data', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    const base64 = btoa(String.fromCharCode(...bytes))
    const payload = {
      data: base64,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      encoding: 'base64',
    }
    const blob = createDownloadBlob(payload)

    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    const result = new Uint8Array(await blob.arrayBuffer())
    expect(result).toEqual(bytes)
  })
})
