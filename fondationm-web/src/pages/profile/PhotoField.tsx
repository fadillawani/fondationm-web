import { useEffect, useId, useRef, useState } from 'react'
import { errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/initials'
import { deletePhoto, requestPhotoSignature, savePhotoUrl, useRefreshMe } from './profileData'
import {
  PhotoUploadError,
  UPLOAD_MESSAGES,
  checkImageFile,
  fitsSignature,
  uploadToCloudinary,
  type ImageFormat,
} from './photoUpload'

type Step = 'idle' | 'signing' | 'uploading' | 'saving' | 'removing'

interface Failure {
  title: string
  detail: string | null
  /** Image déjà chez Cloudinary : seul l'enregistrement est à refaire. */
  retryUrl: string | null
}

interface PhotoFieldProps {
  owner: 'speaker' | 'school'
  name: string
  photoUrl: string | null
  /** Envoi en cours : la page arme sa garde de sortie (un seul `useBlocker` par page). */
  onBusyChange: (busy: boolean) => void
}

const TEXT = {
  speaker: {
    title: 'Ma photo',
    noun: 'photo',
    save: 'Enregistrer la photo',
    remove: 'Retirer la photo',
    info: 'Votre photo sera visible des établissements avec lesquels vous êtes en relation, et des élèves de la classe concernée.',
    confirmTitle: 'Retirer votre photo ?',
    confirmText: 'Les établissements verront vos initiales.',
    saved: 'Photo enregistrée.',
    removed: 'Photo retirée.',
    current: 'Votre photo actuelle',
  },
  school: {
    title: 'Logo de l’établissement',
    noun: 'logo',
    save: 'Enregistrer le logo',
    remove: 'Retirer le logo',
    info: 'Votre logo sera visible des intervenants et de la Fondation M avec qui vous préparez des rencontres.',
    confirmTitle: 'Retirer le logo ?',
    confirmText: 'Les intervenants verront les initiales de l’établissement.',
    saved: 'Logo enregistré.',
    removed: 'Logo retiré.',
    current: 'Logo actuel de l’établissement',
  },
} as const

/** Cadre commun à l'aperçu et à l'affichage : photo recadrée, logo jamais coupé (pas de recadrage, décision 129). */
function frameClass(role: 'speaker' | 'school') {
  return cn(
    'inline-flex size-24 shrink-0 items-center justify-center rounded-[22px] font-display text-3xl leading-none',
    role === 'school' ? 'border-2 border-line bg-indigo text-cream' : 'bg-orange text-ink',
  )
}

/**
 * Photo de l'intervenant ou logo de l'école (F13) : contrôle du fichier, signature, envoi direct à Cloudinary avec
 * progression et annulation, enregistrement par PUT ; retrait confirmé. Aucune clé dans le code (décision 131).
 */
export function PhotoField({ owner: role, name, photoUrl, onBusyChange }: PhotoFieldProps) {
  const text = TEXT[role]
  const id = useId()
  const refresh = useRefreshMe()
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const controller = useRef<AbortController | null>(null)
  const [file, setFile] = useState<{ blob: File; format: ImageFormat; preview: string } | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [progress, setProgress] = useState(0)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const busy = step !== 'idle'
  const sending = step === 'signing' || step === 'uploading' || step === 'saving'

  useEffect(() => {
    onBusyChange(sending)
  }, [sending, onBusyChange])

  useEffect(() => () => {
    if (file) URL.revokeObjectURL(file.preview)
  }, [file])

  async function choose(chosen: File | undefined) {
    setFailure(null)
    setNotice(null)
    if (chosen === undefined) return
    const check = await checkImageFile(chosen)
    if (!check.ok) {
      setFile(null)
      setFailure({ title: check.message, detail: null, retryUrl: null })
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile({ blob: chosen, format: check.format, preview: URL.createObjectURL(chosen) })
  }

  function clearFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function save(url: string) {
    setStep('saving')
    try {
      await savePhotoUrl(url)
    } catch (error) {
      setFailure({ title: `${text.noun === 'logo' ? 'Le logo' : 'La photo'} n’a pas pu être enregistré${text.noun === 'logo' ? '' : 'e'}.`, detail: errorMessage(error), retryUrl: url })
      setStep('idle')
      return
    }
    clearFile()
    setFailure(null)
    setNotice(text.saved)
    setStep('idle')
    void refresh()
  }

  async function send() {
    if (file === null || busy) return
    const abort = new AbortController()
    controller.current = abort
    setFailure(null)
    setNotice(null)
    setProgress(0)
    setStep('signing')
    let signature
    try {
      signature = await requestPhotoSignature()
    } catch (error) {
      if (abort.signal.aborted) return
      setFailure({ title: 'L’envoi n’a pas pu être préparé.', detail: errorMessage(error), retryUrl: null })
      setStep('idle')
      return
    }
    if (abort.signal.aborted) return
    const fits = fitsSignature(file.format, file.blob.size, signature)
    if (!fits.ok) {
      setFailure({ title: fits.message, detail: null, retryUrl: null })
      setStep('idle')
      return
    }
    setStep('uploading')
    let url: string
    try {
      url = await uploadToCloudinary(file.blob, signature, { onProgress: setProgress, signal: abort.signal })
    } catch (error) {
      const kind = error instanceof PhotoUploadError ? error.kind : 'network'
      if (kind === 'aborted') {
        setNotice('Envoi annulé.')
      } else {
        setFailure({ title: UPLOAD_MESSAGES[kind], detail: null, retryUrl: null })
      }
      setStep('idle')
      return
    }
    controller.current = null
    await save(url)
  }

  function cancel() {
    controller.current?.abort()
    controller.current = null
    setStep('idle')
    setNotice('Envoi annulé.')
  }

  async function remove() {
    setConfirming(false)
    setFailure(null)
    setNotice(null)
    setStep('removing')
    try {
      await deletePhoto()
      setNotice(text.removed)
      void refresh()
    } catch (error) {
      setFailure({ title: `${text.noun === 'logo' ? 'Le logo' : 'La photo'} n’a pas pu être retiré${text.noun === 'logo' ? '' : 'e'}.`, detail: errorMessage(error), retryUrl: null })
    }
    setStep('idle')
  }

  const kind = role === 'school' ? 'logo' : 'photo'
  const shown = file?.preview ?? photoUrl

  return (
    <section aria-labelledby={`${id}-titre`} className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 lg:p-5">
      <h2 id={`${id}-titre`} className="text-xl">
        {text.title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        {file ? (
          <span className={cn(frameClass(role), 'overflow-hidden', kind === 'logo' && 'bg-white')}>
            <img src={file.preview} alt={`Aperçu : ${file.blob.name}`} className={cn('size-full', kind === 'photo' ? 'object-cover' : 'object-contain')} />
          </span>
        ) : (
          <Avatar photoUrl={shown} kind={kind} className={frameClass(role)} decorative={false} alt={text.current}>
            <span aria-hidden="true">{initialsOf(name)}</span>
          </Avatar>
        )}
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${id}-fichier`}
            className={cn(
              'inline-flex min-h-touch cursor-pointer items-center justify-center rounded-button border-2 border-ink bg-surface px-4 text-[15px] font-extrabold text-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            Choisir une image
            <input
              ref={inputRef}
              id={`${id}-fichier`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              aria-describedby={`${id}-aide ${id}-info`}
              className="sr-only"
              onChange={(event) => void choose(event.target.files?.[0])}
            />
          </label>
          <p id={`${id}-aide`} className="text-xs font-bold text-muted">
            JPG, PNG ou WebP, 5 Mo au plus.
          </p>
        </div>
      </div>
      <p id={`${id}-info`} className="rounded-[12px] bg-canvas px-3 py-2 text-[13px] font-bold text-ink">
        {text.info}
      </p>

      {(step === 'signing' || step === 'uploading' || step === 'saving') && (
        <div className="flex flex-col gap-1">
          <progress
            aria-label={`Envoi ${text.noun === 'logo' ? 'du logo' : 'de la photo'}`}
            max={100}
            value={step === 'uploading' ? progress : step === 'saving' ? 100 : 0}
            className="h-2 w-full accent-green"
          />
          <span className="text-xs font-bold text-muted">
            {step === 'signing' ? 'Préparation de l’envoi…' : step === 'uploading' ? `Envoi : ${progress} %` : 'Enregistrement…'}
          </span>
        </div>
      )}

      <div aria-live="polite" className="empty:hidden">
        {notice && <p className="rounded-block border-l-[6px] border-green bg-green-tint px-4 py-3 text-sm font-semibold text-green">{notice}</p>}
      </div>
      {failure && (
        <Alert
          tone="error"
          title={failure.title}
          action={
            failure.retryUrl ? (
              <Button size="md" variant="outline" onClick={() => failure.retryUrl && void save(failure.retryUrl)} disabled={busy}>
                Réessayer l’enregistrement
              </Button>
            ) : undefined
          }
        >
          {failure.detail ?? ''}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {file && (
          <Button size="md" variant="success" onClick={() => void send()} loading={busy && step !== 'removing'} disabled={busy}>
            {text.save}
          </Button>
        )}
        {(step === 'signing' || step === 'uploading') && (
          <Button size="md" variant="outline" onClick={cancel}>
            Annuler l’envoi
          </Button>
        )}
        {file && !busy && (
          <Button size="md" variant="outline" onClick={clearFile}>
            Ne pas garder cette image
          </Button>
        )}
        {photoUrl && !file && (
          <Button size="md" variant="outline" onClick={() => setConfirming(true)} disabled={busy} loading={step === 'removing'}>
            {text.remove}
          </Button>
        )}
      </div>

      <Modal
        open={confirming}
        title={text.confirmTitle}
        onClose={() => setConfirming(false)}
        initialFocus={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} size="md" variant="outline" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button size="md" variant="danger" onClick={() => void remove()}>
              Retirer
            </Button>
          </>
        }
      >
        <p className="text-[15px] font-semibold text-ink">{text.confirmText}</p>
      </Modal>
    </section>
  )
}
