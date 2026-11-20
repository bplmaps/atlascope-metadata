// Files build.mjs writes to dist/<instance>/, keyed to their manifest target.
export const OUTPUTS = [
  { file: 'volume-extents.geojson', target: 'volumeExtentsGeojson', required: true },
  { file: 'volume-extents.topojson', target: 'volumeExtentsTopojson', required: true },
  { file: 'extents-dissolved.geojson', target: 'footprintsDissolved', required: true },
  { file: 'coverage-list.json', target: 'coverageList', required: false },
];
