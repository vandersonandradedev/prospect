export interface BrazilianState {
  uf: string;
  name: string;
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  capital: string;
  capitalLat: number;
  capitalLon: number;
}

export const BRAZILIAN_STATES: BrazilianState[] = [
  { uf: 'AC', name: 'Acre', region: 'Norte', capital: 'Rio Branco', capitalLat: -9.9753, capitalLon: -67.8249 },
  { uf: 'AL', name: 'Alagoas', region: 'Nordeste', capital: 'Maceió', capitalLat: -9.6658, capitalLon: -35.7351 },
  { uf: 'AP', name: 'Amapá', region: 'Norte', capital: 'Macapá', capitalLat: 0.0356, capitalLon: -51.0705 },
  { uf: 'AM', name: 'Amazonas', region: 'Norte', capital: 'Manaus', capitalLat: -3.1190, capitalLon: -60.0217 },
  { uf: 'BA', name: 'Bahia', region: 'Nordeste', capital: 'Salvador', capitalLat: -12.9777, capitalLon: -38.5016 },
  { uf: 'CE', name: 'Ceará', region: 'Nordeste', capital: 'Fortaleza', capitalLat: -3.7319, capitalLon: -38.5267 },
  { uf: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste', capital: 'Brasília', capitalLat: -15.7975, capitalLon: -47.8919 },
  { uf: 'ES', name: 'Espírito Santo', region: 'Sudeste', capital: 'Vitória', capitalLat: -20.3155, capitalLon: -40.3128 },
  { uf: 'GO', name: 'Goiás', region: 'Centro-Oeste', capital: 'Goiânia', capitalLat: -16.6869, capitalLon: -49.2648 },
  { uf: 'MA', name: 'Maranhão', region: 'Nordeste', capital: 'São Luís', capitalLat: -2.5307, capitalLon: -44.3068 },
  { uf: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste', capital: 'Cuiabá', capitalLat: -15.6014, capitalLon: -56.0979 },
  { uf: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste', capital: 'Campo Grande', capitalLat: -20.4697, capitalLon: -54.6201 },
  { uf: 'MG', name: 'Minas Gerais', region: 'Sudeste', capital: 'Belo Horizonte', capitalLat: -19.9167, capitalLon: -43.9345 },
  { uf: 'PA', name: 'Pará', region: 'Norte', capital: 'Belém', capitalLat: -1.4558, capitalLon: -48.4902 },
  { uf: 'PB', name: 'Paraíba', region: 'Nordeste', capital: 'João Pessoa', capitalLat: -7.1195, capitalLon: -34.8450 },
  { uf: 'PR', name: 'Paraná', region: 'Sul', capital: 'Curitiba', capitalLat: -25.4296, capitalLon: -49.2713 },
  { uf: 'PE', name: 'Pernambuco', region: 'Nordeste', capital: 'Recife', capitalLat: -8.0578, capitalLon: -34.8778 },
  { uf: 'PI', name: 'Piauí', region: 'Nordeste', capital: 'Teresina', capitalLat: -5.0920, capitalLon: -42.8038 },
  { uf: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste', capital: 'Rio de Janeiro', capitalLat: -22.9068, capitalLon: -43.1729 },
  { uf: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste', capital: 'Natal', capitalLat: -5.7945, capitalLon: -35.2110 },
  { uf: 'RS', name: 'Rio Grande do Sul', region: 'Sul', capital: 'Porto Alegre', capitalLat: -30.0346, capitalLon: -51.2177 },
  { uf: 'RO', name: 'Rondônia', region: 'Norte', capital: 'Porto Velho', capitalLat: -8.7619, capitalLon: -63.9039 },
  { uf: 'RR', name: 'Roraima', region: 'Norte', capital: 'Boa Vista', capitalLat: 2.8235, capitalLon: -60.6758 },
  { uf: 'SC', name: 'Santa Catarina', region: 'Sul', capital: 'Florianópolis', capitalLat: -27.5954, capitalLon: -48.5480 },
  { uf: 'SP', name: 'São Paulo', region: 'Sudeste', capital: 'São Paulo', capitalLat: -23.5505, capitalLon: -46.6333 },
  { uf: 'SE', name: 'Sergipe', region: 'Nordeste', capital: 'Aracaju', capitalLat: -10.9472, capitalLon: -37.0731 },
  { uf: 'TO', name: 'Tocantins', region: 'Norte', capital: 'Palmas', capitalLat: -10.1844, capitalLon: -48.3336 },
];

export function getStateByUf(uf: string): BrazilianState | undefined {
  if (!uf) return undefined;
  const upper = uf.trim().toUpperCase();
  return BRAZILIAN_STATES.find((s) => s.uf === upper);
}
