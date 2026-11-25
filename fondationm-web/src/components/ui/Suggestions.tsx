export function Suggestions({ id, options }: { id: string; options: readonly string[] }) {
  return (
    <datalist id={id}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </datalist>
  )
}
