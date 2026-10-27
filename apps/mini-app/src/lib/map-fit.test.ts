import { describe, expect, it } from "vitest";
import { fitTransform, unionBounds, type Bounds } from "./map-fit";

const EXTENT: Bounds = [
  [0, 0],
  [1000, 500],
];

/** Where a map point lands on screen after the transform. */
const apply = ({ k, x, y }: { k: number; x: number; y: number }, [px, py]: [number, number]) => [
  px * k + x,
  py * k + y,
];

describe("unionBounds", () => {
  it("returns null for no boxes", () => {
    expect(unionBounds([])).toBeNull();
  });

  it("covers every box", () => {
    expect(
      unionBounds([
        [
          [10, 20],
          [30, 40],
        ],
        [
          [5, 25],
          [20, 60],
        ],
        [
          [50, 50],
          [50, 50],
        ],
      ]),
    ).toEqual([
      [5, 20],
      [50, 60],
    ]);
  });
});

describe("fitTransform", () => {
  it("centers a small region and scales it to fill the view minus padding", () => {
    const region: Bounds = [
      [400, 200],
      [500, 250],
    ];
    const transform = fitTransform(region, EXTENT, 100, 0.2);

    expect(transform.k).toBeCloseTo(8);
    expect(apply(transform, [450, 225])).toEqual([500, 250]);
  });

  it("caps the zoom, so a single point gets maxZoom", () => {
    const point: Bounds = [
      [500, 250],
      [500, 250],
    ];

    expect(fitTransform(point, EXTENT, 4).k).toBe(4);
  });

  it("never zooms out below the whole map", () => {
    expect(fitTransform(EXTENT, EXTENT, 4)).toEqual({ k: 1, x: 0, y: 0 });
  });

  it("keeps the view inside the map near its edges", () => {
    const corner: Bounds = [
      [0, 0],
      [50, 25],
    ];
    const transform = fitTransform(corner, EXTENT, 4);

    expect(transform.k).toBe(4);
    // The map's top-left corner stays at the view's top-left corner instead of moving inwards.
    expect(apply(transform, [0, 0])).toEqual([0, 0]);
  });

  it("respects an extent that does not start at the origin", () => {
    const extent: Bounds = [
      [0, -100],
      [1000, 400],
    ];
    const bottomRight: Bounds = [
      [980, 390],
      [1000, 400],
    ];
    const transform = fitTransform(bottomRight, extent, 4);

    expect(apply(transform, [1000, 400])).toEqual([1000, 400]);
  });
});
