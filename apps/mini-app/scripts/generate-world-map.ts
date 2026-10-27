/**
 * Builds the static map data from Natural Earth (world-atlas) once; the output is committed.
 *
 *   src/features/map/world-110m.json       country shapes keyed by ISO alpha-2, no Antarctica
 *   src/features/map/country-points.json   [lon, lat] for every supported code, used to draw
 *                                          countries that are too small for the 110m shapes
 *
 * Usage: npm run generate:map -w @travel-days/mini-app
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { geoCentroid } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const root = path.resolve(import.meta.dirname, "..");
const atlasDir = path.resolve(root, "../../node_modules/world-atlas");
const outDir = path.join(root, "src/features/map");

// Natural Earth has no ISO numeric code for Kosovo; it is matched by name.
const CODES_BY_NAME: Record<string, string> = { Kosovo: "XK" };
const ANTARCTICA = "AQ";

// Territories that Natural Earth merges into another country (e.g. Réunion into France)
// or omits at 50m. Approximate centers, [lon, lat].
const MANUAL_POINTS: Record<string, [number, number]> = {
  BQ: [-68.26, 12.18],
  BV: [3.41, -54.42],
  CC: [96.87, -12.16],
  CX: [105.69, -10.45],
  GF: [-53.13, 3.93],
  GI: [-5.35, 36.14],
  GP: [-61.55, 16.25],
  MQ: [-61.02, 14.64],
  RE: [55.54, -21.12],
  SJ: [15.65, 78.22],
  TK: [-171.85, -9.2],
  TV: [179.2, -8.52],
  UM: [166.61, 19.29],
  YT: [45.17, -12.83],
};

type CountriesObject = GeometryCollection<{ name: string }>;
type WorldTopology = Topology<{ countries: CountriesObject }>;

function readAtlas(file: string): WorldTopology {
  return JSON.parse(readFileSync(path.join(atlasDir, file), "utf8")) as WorldTopology;
}

function alpha2(id: string | number | undefined, name: string): string | undefined {
  return (
    (id === undefined ? undefined : countries.numericToAlpha2(String(id))) ?? CODES_BY_NAME[name]
  );
}

/** Codes supported by the API: the countries seed migration is the source of truth. */
function supportedCodes(): string[] {
  const seed = readFileSync(
    path.resolve(root, "../api/migrations/0002_countries_seed.sql"),
    "utf8",
  );
  return [...seed.matchAll(/\('([A-Z]{2})',/g)].map((match) => match[1]!);
}

const round = (value: number) => Math.round(value * 100) / 100;

function nameOf(properties: unknown): string {
  return (properties as { name?: string } | null | undefined)?.name ?? "";
}

// Shapes: re-key 110m geometries by alpha-2 and drop Antarctica.
const world = readAtlas("countries-110m.json");
world.objects.countries.geometries = world.objects.countries.geometries
  .map((geometry) => ({ ...geometry, id: alpha2(geometry.id, nameOf(geometry.properties)) }))
  .filter((geometry) => geometry.id !== ANTARCTICA);
writeFileSync(path.join(outDir, "world-110m.json"), JSON.stringify(world));

// Points: centroids from the more detailed 50m shapes, plus manual ones.
const detailed = readAtlas("countries-50m.json");
const detailedFeatures = feature(detailed, detailed.objects.countries).features;
const points: Record<string, [number, number]> = {};
for (const item of detailedFeatures) {
  const code = alpha2(item.id, nameOf(item.properties));
  if (code) {
    const [lon, lat] = geoCentroid(item);
    points[code] = [round(lon), round(lat)];
  }
}
Object.assign(points, MANUAL_POINTS);

const missing = supportedCodes().filter((code) => !(code in points));
if (missing.length > 0) {
  throw new Error(`No map point for: ${missing.join(", ")}`);
}
const sortedPoints = Object.fromEntries(
  Object.entries(points).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(
  path.join(outDir, "country-points.json"),
  `${JSON.stringify(sortedPoints, null, 0)}\n`,
);

console.log(
  `world-110m.json: ${world.objects.countries.geometries.length} shapes; ` +
    `country-points.json: ${Object.keys(sortedPoints).length} points`,
);
