const BASE64_ENCODING = 'base64'

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function createDownloadBlob(payload) {
  if (payload.encoding === BASE64_ENCODING) {
    const bytes = base64ToUint8Array(payload.data)
    return new Blob([bytes], { type: payload.mimeType })
  }
  return new Blob([payload.data], { type: payload.mimeType })
}
