import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../api/errors'
import { FakeXhr, SECURE_URL, SIGNATURE, imageFile } from '../../test/fakeXhr'
import { safePhotoUrl } from '../../lib/photo'
import {
  FILE_SIZE_ERROR,
  FILE_TYPE_ERROR,
  PHOTO_MAX_BYTES,
  PhotoUploadError,
  checkImageFile,
  cloudinaryUploadUrl,
  fitsSignature,
  readPhotoSignature,
  uploadForm,
  uploadToCloudinary,
} from './photoUpload'

beforeEach(() => FakeXhr.install())

describe('Photo : contrôle du fichier avant tout envoi', () => {
  it('accepte JPG, PNG et WebP dont le type, l’extension et les premiers octets concordent', async () => {
    expect(await checkImageFile(imageFile('moi.jpg', 'image/jpeg'))).toEqual({ ok: true, format: 'jpg' })
    expect(await checkImageFile(imageFile('moi.JPEG', 'image/jpeg'))).toEqual({ ok: true, format: 'jpg' })
    expect(await checkImageFile(imageFile('logo.png', 'image/png', 'png'))).toEqual({ ok: true, format: 'png' })
    expect(await checkImageFile(imageFile('logo.webp', 'image/webp', 'webp'))).toEqual({ ok: true, format: 'webp' })
  })

  it('refuse un autre type, une extension trompeuse, un contenu déguisé ou plus de 5 Mo', async () => {
    expect(await checkImageFile(imageFile('anim.gif', 'image/gif'))).toEqual({ ok: false, message: FILE_TYPE_ERROR })
    expect(await checkImageFile(imageFile('moi.png', 'image/jpeg'))).toEqual({ ok: false, message: FILE_TYPE_ERROR })
    expect(await checkImageFile(imageFile('moi.jpg', 'image/jpeg', 'png'))).toEqual({ ok: false, message: FILE_TYPE_ERROR })
    expect(await checkImageFile(imageFile('lourd.jpg', 'image/jpeg', 'jpg', PHOTO_MAX_BYTES + 1))).toEqual({ ok: false, message: FILE_SIZE_ERROR })
    expect(await checkImageFile(imageFile('juste.jpg', 'image/jpeg', 'jpg', PHOTO_MAX_BYTES))).toEqual({ ok: true, format: 'jpg' })
  })
})

describe('Photo : signature et corps de l’envoi', () => {
  it('lit la signature et refuse une réponse incomplète', () => {
    expect(readPhotoSignature(SIGNATURE)).toMatchObject({ cloudName: 'nuage-de-test', overwrite: true, transformation: 'c_limit,w_800,h_800' })
    expect(() => readPhotoSignature({ ...SIGNATURE, signature: null })).toThrow(ApiError)
    expect(() => readPhotoSignature({ ...SIGNATURE, timestamp: 'demain' })).toThrow(ApiError)
  })

  it('envoie exactement les paramètres signés, en snake_case, sans resource_type ni cloud_name', () => {
    const form = uploadForm(imageFile('moi.jpg', 'image/jpeg'), readPhotoSignature(SIGNATURE))
    const fields = Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : 'fichier']))
    expect(fields).toEqual({
      file: 'fichier',
      api_key: 'cle-publique-factice',
      timestamp: '1795000000',
      signature: 'signature-factice-0123456789abcdef',
      public_id: '7f1c2a9e-0000-4000-8000-000000000001',
      asset_folder: 'fondationm/profils',
      overwrite: 'true',
      invalidate: 'true',
      allowed_formats: 'jpg,png,webp',
      transformation: 'c_limit,w_800,h_800',
    })
    const partial = uploadForm(imageFile('moi.jpg', 'image/jpeg'), readPhotoSignature({ ...SIGNATURE, transformation: null, assetFolder: null }))
    expect([...partial.keys()]).not.toContain('transformation')
    expect([...partial.keys()]).not.toContain('asset_folder')
    expect(cloudinaryUploadUrl(readPhotoSignature(SIGNATURE))).toBe('https://api.cloudinary.com/v1_1/nuage-de-test/image/upload')
  })

  it('vérifie aussi les formats et la taille annoncés par la signature', () => {
    const signature = readPhotoSignature({ ...SIGNATURE, allowedFormats: 'png', maxFileSize: 1000 })
    expect(fitsSignature('jpg', 10, signature)).toEqual({ ok: false, message: FILE_TYPE_ERROR })
    expect(fitsSignature('png', 2000, signature)).toEqual({ ok: false, message: FILE_SIZE_ERROR })
    expect(fitsSignature('png', 500, signature)).toEqual({ ok: true, format: 'png' })
  })
})

describe('Photo : envoi direct à Cloudinary', () => {
  const signature = readPhotoSignature(SIGNATURE)

  it('suit la progression, n’ajoute aucun en-tête d’authentification et rend secure_url', async () => {
    const steps: number[] = []
    const sent = uploadToCloudinary(imageFile('moi.jpg', 'image/jpeg'), signature, { onProgress: (value) => steps.push(value), signal: new AbortController().signal })
    const xhr = FakeXhr.last()
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('https://api.cloudinary.com/v1_1/nuage-de-test/image/upload')
    expect(xhr.headers).toEqual({})
    xhr.progress(512, 2048)
    xhr.progress(2048, 2048)
    xhr.respond(200, { secure_url: SECURE_URL, public_id: SIGNATURE.publicId })
    await expect(sent).resolves.toBe(SECURE_URL)
    expect(steps).toEqual([25, 100])
  })

  it('distingue la signature expirée, le refus, la panne réseau et l’annulation', async () => {
    const run = () => uploadToCloudinary(imageFile('moi.jpg', 'image/jpeg'), signature, { onProgress: () => undefined, signal: new AbortController().signal })
    const expired = run()
    FakeXhr.last().respond(400, { error: { message: 'Stale request - reported time is 2026-11-26 more than 1 hour ago' } })
    await expect(expired).rejects.toMatchObject({ kind: 'expired' })

    const rejected = run()
    FakeXhr.last().respond(401, { error: { message: 'Invalid Signature 0123' } })
    await expect(rejected).rejects.toMatchObject({ kind: 'rejected' })

    const noUrl = run()
    FakeXhr.last().respond(200, { public_id: 'x' })
    await expect(noUrl).rejects.toMatchObject({ kind: 'rejected' })

    const offline = run()
    FakeXhr.last().fail()
    await expect(offline).rejects.toMatchObject({ kind: 'network' })

    const controller = new AbortController()
    const cancelled = uploadToCloudinary(imageFile('moi.jpg', 'image/jpeg'), signature, { onProgress: () => undefined, signal: controller.signal })
    controller.abort()
    await expect(cancelled).rejects.toBeInstanceOf(PhotoUploadError)
    expect(FakeXhr.last().aborted).toBe(true)
  })
})

describe('Photo : adresses affichées', () => {
  it('n’affiche que les images de res.cloudinary.com', () => {
    expect(safePhotoUrl(SECURE_URL)).toBe(SECURE_URL)
    expect(safePhotoUrl('http://res.cloudinary.com/x.jpg')).toBeNull()
    expect(safePhotoUrl('https://exemple.test/x.jpg')).toBeNull()
    expect(safePhotoUrl('javascript:alert(1)')).toBeNull()
    expect(safePhotoUrl(null)).toBeNull()
    expect(safePhotoUrl(undefined)).toBeNull()
  })
})
