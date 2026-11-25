import { z } from 'zod'
import { SCHOOL_TYPES, SECTORS } from '../../lib/referenceData'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
export const SKILLS_MAX = 20
export const SKILL_MAX_LENGTH = 100

function requiredText(message: string, max: number) {
  return z.string().trim().min(1, message).max(max, `${max} caractères maximum.`)
}

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((value) => value || undefined)
}

export const passwordRule = z
  .string()
  .min(PASSWORD_MIN, `${PASSWORD_MIN} caractères minimum.`)
  .max(PASSWORD_MAX, `${PASSWORD_MAX} caractères maximum.`)

const email = z
  .string()
  .trim()
  .min(1, 'Indiquez votre adresse e-mail.')
  .max(254, '254 caractères maximum.')
  .pipe(z.email('Cette adresse e-mail ne semble pas valide.'))

const phone = z
  .string()
  .trim()
  .min(1, 'Indiquez un numéro de téléphone.')
  .regex(/^[0-9 +().-]{6,30}$/, 'De 6 à 30 caractères : chiffres, espaces et + ( ) . - uniquement.')

const charterAccepted = z
  .boolean()
  .refine((accepted) => accepted, 'Vous devez accepter la charte pour envoyer votre demande.')

const country = requiredText('Indiquez le pays.', 100)
const city = requiredText('Indiquez la ville.', 100)

export const schoolSchema = z.object({
  schoolName: requiredText("Indiquez le nom de l'établissement.", 200),
  schoolType: z.string().pipe(z.enum(SCHOOL_TYPES, { error: "Choisissez le type d'établissement." })),
  country,
  city,
  referentRole: requiredText('Indiquez votre fonction.', 100),
  email,
  phone,
  password: passwordRule,
  charterAccepted,
})

export type SchoolFormInput = z.input<typeof schoolSchema>
export type SchoolFormValues = z.output<typeof schoolSchema>

export const speakerSchema = z.object({
  fullName: requiredText('Indiquez votre prénom et votre nom.', 200),
  jobTitle: requiredText('Indiquez votre métier.', 100),
  organization: optionalText(100),
  sector: z.string().pipe(z.enum(SECTORS, { error: "Choisissez votre secteur d'activité." })),
  country,
  city,
  skills: z
    .array(z.string())
    .min(1, 'Choisissez au moins une compétence.')
    .max(SKILLS_MAX, `${SKILLS_MAX} compétences maximum.`),
  motivation: optionalText(1000),
  email,
  phone,
  password: passwordRule,
  charterAccepted,
})

export type SpeakerFormInput = z.input<typeof speakerSchema>
export type SpeakerFormValues = z.output<typeof speakerSchema>
