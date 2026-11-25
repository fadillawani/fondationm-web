import { text, textList, oneOf, type WireRecord } from '../api/wire'
import { SCHOOL_TYPES, SECTORS, type SchoolType, type Sector } from './referenceData'

export interface SchoolDetails {
  kind: 'school'
  schoolName: string
  schoolType: SchoolType | null
  city: string
  country: string
  referentRole: string
  phone: string
  charterAcceptedAt: string | null
}

export interface SpeakerDetails {
  kind: 'speaker'
  fullName: string
  jobTitle: string
  organization: string
  sector: Sector | null
  city: string
  country: string
  phone: string
  skills: string[]
  motivation: string
  charterAcceptedAt: string | null
}

/** Profil élève (`StudentProfileResponse`) : aucun nom d'établissement dans le contrat. */
export interface StudentDetails {
  kind: 'student'
  firstName: string
  lastName: string
  classId: string | null
  classTitle: string
}

export type ProfileDetails = SchoolDetails | SpeakerDetails

/** Profil de l'utilisateur connecté : école, intervenant ou élève. */
export type UserDetails = ProfileDetails | StudentDetails

/** Nom affiché tiré d'un profil (école, intervenant, élève, donateur) ; null si aucun nom. */
export function profileName(profile: WireRecord | null): string | null {
  if (profile === null) return null
  return (
    text(profile, 'schoolName') ??
    text(profile, 'fullName') ??
    ([text(profile, 'firstName'), text(profile, 'lastName')].filter(Boolean).join(' ') || null) ??
    text(profile, 'name')
  )
}

export function readSchoolDetails(profile: WireRecord): SchoolDetails {
  return {
    kind: 'school',
    schoolName: text(profile, 'schoolName') ?? '',
    schoolType: oneOf(SCHOOL_TYPES, text(profile, 'schoolType')),
    city: text(profile, 'city') ?? '',
    country: text(profile, 'country') ?? '',
    referentRole: text(profile, 'referentRole') ?? '',
    phone: text(profile, 'phone') ?? '',
    charterAcceptedAt: text(profile, 'charterAcceptedAt'),
  }
}

export function readStudentDetails(profile: WireRecord): StudentDetails {
  return {
    kind: 'student',
    firstName: text(profile, 'firstName') ?? '',
    lastName: text(profile, 'lastName') ?? '',
    classId: text(profile, 'classId'),
    classTitle: text(profile, 'classTitle') ?? '',
  }
}

export function readSpeakerDetails(profile: WireRecord): SpeakerDetails {
  return {
    kind: 'speaker',
    fullName: text(profile, 'fullName') ?? '',
    jobTitle: text(profile, 'jobTitle') ?? '',
    organization: text(profile, 'organization') ?? '',
    sector: oneOf(SECTORS, text(profile, 'sector')),
    city: text(profile, 'city') ?? '',
    country: text(profile, 'country') ?? '',
    phone: text(profile, 'phone') ?? '',
    skills: textList(profile, 'skills'),
    motivation: text(profile, 'motivation') ?? '',
    charterAcceptedAt: text(profile, 'charterAcceptedAt'),
  }
}
