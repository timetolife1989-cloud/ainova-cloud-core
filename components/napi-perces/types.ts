// =====================================================
// AINOVA - Napi Perces Típusok
// =====================================================

export interface NapiData {
  datum_label: string;
  datum: string;
  nap_nev: string;
  cel_perc: number;
  cel_szamitott?: number;
  lejelentett_fo?: number;
  // Lehívott (Anyaglehívás műveletből)
  lehivott_siemens_dc: number;
  lehivott_no_siemens: number;
  lehivott_el_tekercses: number;
  lehivott_ossz: number;
  lehivott_euro: number;
  // Leadott (Szállítás műveletből)
  leadott_siemens_dc: number;
  leadott_no_siemens: number;
  leadott_el_tekercses: number;
  leadott_utomunka: number;
  leadott_ossz: number;
  leadott_euro: number;
  // Műszakbontás (idő alapú DE/DU/ÉJ + csapat annotáció)
  leadott_de: number;
  leadott_du: number;
  leadott_ej: number;
  de_csapat?: string;  // A/B/C csapat annotáció AinovaShiftSchedule-ből
  du_csapat?: string;
  ej_csapat?: string;
  // Százalékok
  lehivas_szazalek: number;
  leadas_szazalek: number;
  // Paging
  total_days?: number;
  total_weeks?: number;
  total_months?: number;
  // Heti/havi extra
  het_eleje?: string;
  het_vege?: string;
  munkanapok?: number;
}

export type KimutatType = 'napi' | 'heti' | 'havi';

export interface ImportStatus {
  last_import: string | null;
  total_records: number;
  unique_days: number;
}

// Page sizes per kimutat type
export const PAGE_SIZES: Record<KimutatType, number> = {
  napi: 20,
  heti: 12,
  havi: 12,
};

// Kimutat labels
export const KIMUTAT_LABELS: Record<KimutatType, string> = {
  napi: 'Napi',
  heti: 'Heti',
  havi: 'Havi',
};
