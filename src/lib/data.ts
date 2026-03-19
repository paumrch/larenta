import type { Deduccion, DeduccionIndex, Stats } from "./types";
import deducciones from "../../data/deducciones.json" with { type: "json" };
import wizardIndex from "../../data/wizard_index.json" with { type: "json" };
import explorerIndex from "../../data/explorer_index.json" with { type: "json" };
import stats from "../../data/stats.json" with { type: "json" };

export function getAllDeducciones(): Deduccion[] {
  return deducciones as Deduccion[];
}

export function getWizardIndex(): DeduccionIndex[] {
  return wizardIndex as DeduccionIndex[];
}

export function getExplorerIndex(): DeduccionIndex[] {
  return explorerIndex as DeduccionIndex[];
}

export function getStats(): Stats {
  return stats as Stats;
}

export function getDeduccionById(id: string): Deduccion | undefined {
  return (deducciones as Deduccion[]).find((d) => d.id === id);
}

export function getDeduccionesByCCAA(codigo: string): DeduccionIndex[] {
  return (explorerIndex as DeduccionIndex[]).filter(
    (d) => d.codigo_ccaa === codigo
  );
}

export function getDeduccionesByCategoria(cat: string): DeduccionIndex[] {
  return (explorerIndex as DeduccionIndex[]).filter(
    (d) => d.categoria === cat
  );
}
