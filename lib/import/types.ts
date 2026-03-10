export interface ColumnMapping {
  source: string;       // Excel/CSV oszlopnév
  target: string;       // DB oszlopnév
  type: 'string' | 'number' | 'date' | 'boolean' | 'float';
  required?: boolean;
  transform?: string;   // Opcionális transzformáció: 'trim', 'uppercase', 'date_parse'
}

export interface ImportFilter {
  column: string;
  operator: '=' | '!=' | 'contains' | 'starts_with' | 'in';
  value: string;
}

export interface ImportConfig {
  id: number;
  configName: string;
  moduleId: string | null;
  fileType: 'excel' | 'csv' | 'json';
  targetTable: string;
  columnMapping: ColumnMapping[];
  filters: ImportFilter[];
  unitId: number | null;
  detectRules: Record<string, unknown> | null;
  isActive: boolean;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: string[];
}

export interface DetectResult {
  configId: number | null;
  configName: string | null;
  confidence: number;     // 0-100
  detectedColumns: string[];
}

export interface IImportAdapter {
  /** Fejléc kiolvasása a fájlból (első N sor) */
  readHeaders(filePath: string): Promise<string[]>;

  /** Fájl típus felismerés a fejléc alapján */
  detect(filePath: string, configs: ImportConfig[]): Promise<DetectResult>;

  /** Import végrehajtás */
  process(filePath: string, config: ImportConfig, username: string): Promise<ImportResult>;
}
