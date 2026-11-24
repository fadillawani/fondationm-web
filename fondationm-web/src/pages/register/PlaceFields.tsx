import type { UseFormRegisterReturn } from 'react-hook-form'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { COUNTRIES, SENEGAL_CITIES, hasCityList } from '../../lib/places'

interface PlaceFieldsProps {
  /** Pays choisi (valeur suivie du formulaire) : décide si la zone est une liste ou un champ libre. */
  country: string
  countryField: UseFormRegisterReturn<'country'>
  cityField: UseFormRegisterReturn<'city'>
  countryError?: string
  cityError?: string
}

/**
 * « Pays » et « Zone (ville) » des inscriptions (F5.2) : pays en liste fermée (Sénégal par défaut) ;
 * ville en liste fermée pour le Sénégal, champ libre pour les autres pays (la maquette n'en donne aucune).
 */
export function PlaceFields({ country, countryField, cityField, countryError, cityError }: PlaceFieldsProps) {
  const cityClass = cityError ? undefined : 'border-terra font-bold'
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label="Pays" error={countryError} required>
        {(control) => (
          <Select {...control} {...countryField} autoComplete="country-name">
            {COUNTRIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Zone (ville)" error={cityError} required>
        {(control) =>
          hasCityList(country) ? (
            <Select {...control} {...cityField} autoComplete="address-level2" className={cityClass}>
              <option value="">Choisir…</option>
              {SENEGAL_CITIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          ) : (
            <Input {...control} {...cityField} autoComplete="address-level2" className={cityClass} />
          )
        }
      </FormField>
    </div>
  )
}
