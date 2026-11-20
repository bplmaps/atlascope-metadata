import mapshaper from 'mapshaper';

const EXTENTS_PRECISION = 0.00001;
const DISSOLVED_PRECISION = 0.001;
const DISSOLVED_SIMPLIFY = '30%';

async function runMapshaper(commands, inputName, collection, outputName) {
  const output = await mapshaper.applyCommands(commands, { [inputName]: collection });
  if (!(outputName in output)) throw new Error(`mapshaper produced no ${outputName}`);
  return String(output[outputName]);
}

export function toTopojson(collection, layerName) {
  const input = `${layerName}.json`;
  const out = `${layerName}.topojson`;
  return runMapshaper(
    `-i ${input} -o ${out} format=topojson precision=${EXTENTS_PRECISION}`,
    input,
    collection,
    out,
  );
}

export function toDissolved(collection) {
  return runMapshaper(
    `-i extents.json -dissolve2 -simplify ${DISSOLVED_SIMPLIFY} -o dissolved.geojson format=geojson precision=${DISSOLVED_PRECISION}`,
    'extents.json',
    collection,
    'dissolved.geojson',
  );
}
