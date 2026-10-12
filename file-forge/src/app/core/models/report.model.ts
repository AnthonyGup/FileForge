import { FileExtension } from './file.model';
import { ActivityAction } from './activity.model';
import { ISODateString } from './common.model';

export interface ReportFilters {
  from?: ISODateString;
  to?: ISODateString;
}

// Fila del reporte "archivos por tipo" (equivale al aggregate $group por extension).
export interface FileTypeReportRow {
  type: FileExtension;
  count: number;
  totalSize: number;
}

// Fila del reporte "actividad por acción" (aggregate $group por action).
export interface ActivityReportRow {
  action: ActivityAction;
  count: number;
}

// Fila del reporte "uso de almacenamiento" (agrupado por carpeta para el usuario, por usuario para el admin).
export interface StorageReportRow {
  key: string;
  label: string;
  count: number;
  totalSize: number;
}
