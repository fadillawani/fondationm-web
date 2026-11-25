export function tabId(idPrefix: string, value: string): string {
  return `${idPrefix}-onglet-${value}`
}

export function panelId(idPrefix: string): string {
  return `${idPrefix}-panneau`
}
