export const CIDADES = [
  "Avaré",
  "Bauru",
  "Botucatu",
  "São Carlos",
  "Marília",
  "Jaú",
  "Ourinhos",
] as const;

export const CIDADE_ORIGEM_PADRAO = "Avaré";
export const CIDADE_DESTINO_PADRAO = "Bauru";

export function isCidadeValida(city: string): boolean {
  return CIDADES.includes(city as (typeof CIDADES)[number]);
}
