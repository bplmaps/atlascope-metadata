# atlascope-metadata

Layer metadata for [Atlascope](https://atlascope.org) instances, and the pipeline that turns it into the production files each instance loads. Each historic atlas volume and each modern reference basemap lives in its own file, so every change to a layer has its own history in git.

The Atlascope app itself lives in a separate repository (`atlascope-v2`); see its `FORKING.md` for how an instance consumes these files.

## Layout

```
manifest.yaml              Every instance: id, name, directory, deploy URL, publish targets
<instance>/
  atlas-layers/            One GeoJSON Feature per historic atlas volume
  reference-layers/        One GeoJSON Feature per modern reference basemap
  coverage-list.json       Optional: named places for the splash-page search
schemas/                   JSON Schemas for every file above, plus the production bundle
utils/                     Node scripts that build and publish an instance
.github/workflows/         Manually triggered publish pipelines, one per instance
```

Current instances are `boston` and `portland`.

## Layer files

Each layer is a single GeoJSON `Feature`: properties first, then geometry, with one coordinate pair per line so geometry edits make readable diffs.

- **Atlas layers** ([schema](schemas/atlas-layer.schema.json)) have a `Polygon` or `MultiPolygon` footprint and require `identifier`, `year`, `publisherShort`, `bibliographicEntry`, `source`, `catalogPermalink`, and `heldBy`. `sponsors`, `fallbackSubtitle`, and `plateGeometryFile` are optional.
- **Reference layers** ([schema](schemas/reference-layer.schema.json)) have `geometry: null` and `globalExtent: true`, and require `identifier`, `year`, `bibliographicEntry`, and `source`.

Field notes:

- `year` is the year the layer *depicts*, not necessarily its publication year.
- `source` is `{ "type": "tilejson" | "xyz", "url": "…" }`; add `"hidden": true` for a layer the app loads but does not list.
- `bibliographicEntry` is Markdown.
- `heldBy` and `sponsors` are free text; there is no controlled vocabulary.
- `plateGeometryFile` is a planned add-on: a URL to the polygons of the individual plates that make up a volume.

### Filenames

A layer's filename is derived from its identifier, and the build fails if they disagree:

- ARK identifiers use the last path segment: `ark:/76611/amll458jy` → `amll458jy.json`.
- Other identifiers use the whole identifier: `massgis-2023-orthos` → `massgis-2023-orthos.json`.

Identifiers must be unique within an instance.

## Coverage list

`coverage-list.json` ([schema](schemas/coverage-list.schema.json)) is an array of `{ name, center: [lon, lat] }`, with optional `neighborhood` and `new` booleans. It is maintained by hand, including the `new` flags.

## Manifest

[`manifest.yaml`](manifest.yaml) ([schema](schemas/manifest.schema.json)) lists each instance:

| Field | Meaning |
|---|---|
| `id` | Short key used by the scripts and workflows |
| `name` | Display name |
| `directory` | Top-level directory holding the instance's layers |
| `deployUrl` | Public URL of the deployed instance |
| `targets` | `endpoint`, `region`, and `bucket` of the S3-compatible store, plus the object key for each production file |

Leave `targets` values `null` until an instance is ready to publish; the publish step refuses to run while a required value is missing. `coverageList` may stay `null` for an instance without a coverage list.

## Production files

`utils/build.mjs <instance>` writes these to `dist/<instance>/`:

| File | Target key | Contents |
|---|---|---|
| `volume-extents.geojson` | `volumeExtentsGeojson` | Archival bundle of every layer at full precision; reference layers last |
| `volume-extents.topojson` | `volumeExtentsTopojson` | The file the app reads; coordinates rounded to 0.00001° (about 1 m) |
| `extents-dissolved.geojson` | `footprintsDissolved` | All footprints dissolved into one `GeometryCollection`, simplified 30%, precision 0.001°; gates geocoder results |
| `coverage-list.json` | `coverageList` | Copied from the instance directory, if present |

All outputs are written without whitespace. mapshaper drops zero-area spikes from footprints when it builds the TopoJSON; footprint areas are otherwise unchanged.

## Publishing

Each instance has its own manually triggered workflow in the repository's **Actions** tab (for example, **Publish Boston metadata**). Each one calls the shared [`publish-instance.yml`](.github/workflows/publish-instance.yml), which:

1. installs dependencies with `npm ci`;
2. runs `node utils/build.mjs <instance>`, which fails on a misnamed or duplicate layer; and
3. runs `node utils/publish.mjs <instance>`, which uploads each built file to its target with the AWS CLI.

The workflow needs two repository secrets: `WASABI_ACCESS_KEY_ID` and `WASABI_SECRET_KEY_ID`. Public read access is granted by the bucket policy, not by the upload.

To run the steps locally (Node 22 or later):

```bash
npm ci
```

```bash
node utils/build.mjs boston
```

```bash
AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… node utils/publish.mjs boston
```

The build does not validate files against the JSON Schemas; editors that understand JSON Schema (and the `yaml-language-server` comment in `manifest.yaml`) will flag problems as you edit.

## Common tasks

**Add or edit a layer.** Create or edit the file in `<instance>/atlas-layers/` or `<instance>/reference-layers/`, named after its identifier. Commit, then run the instance's publish workflow.

**Add an instance.**

1. Create a top-level directory with `atlas-layers/` (and `reference-layers/` and `coverage-list.json` as needed).
2. Add an entry to `manifest.yaml`, with `targets` values `null` until storage is ready.
3. Copy `.github/workflows/publish-boston.yml`, changing its `name` and `instance`.
4. Point the new Atlascope deployment's `instance.json` at the target URLs.
