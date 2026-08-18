import { getFoodLog, getCalorieGoal, getWeights } from './storageService';

/**
 * Collects all app data into a single exportable object.
 * Reads foodLog, calorieGoal, and weightLog from the API server.
 * Images are server-only; no local images to export.
 */
export async function getExportData() {
  const [plates, weights] = await Promise.all([
    getFoodLog(),
    getWeights(),
  ]);
  const calorieGoal = await getCalorieGoal();

  return {
    exportedAt: new Date().toISOString(),
    plates,
    settings: {
      calorieGoal,
    },
    weights,
    images: {}, // Images are now server-only; no local images to export
  };
}

/**
 * Converts data to a JSON blob and triggers a file download.
 * Falls back to a share prompt on iOS Safari if download fails.
 */
export function triggerExport(data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = `platescan-export-${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}