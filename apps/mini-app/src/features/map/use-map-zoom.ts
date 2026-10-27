import { pointer, select } from "d3-selection";
import "d3-transition";
import {
  zoom,
  zoomIdentity,
  zoomTransform,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { fitTransform, type Bounds } from "../../lib/map-fit";
import { setVerticalSwipesEnabled } from "../../lib/telegram";

export const MAX_ZOOM = 8;
/** Fitting a few small countries stops here, so their neighbours stay in view. */
const FIT_MAX_ZOOM = 4;
const ZOOM_STEP = 2;
const ANIMATION_MS = 250;
const FIT_ANIMATION_MS = 500;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 30;

type Extent = Bounds;

/**
 * Pinch, double tap, drag and buttons for the map, in Telegram's webview:
 * - at 1× one finger scrolls the page; only a pinch (two fingers) starts zooming;
 * - once zoomed in, one finger pans the map and Telegram's swipe-to-close is turned off.
 */
export function useMapZoom(svgRef: RefObject<SVGSVGElement | null>, extent: Extent) {
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const behaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastPointerTypeRef = useRef<string>("mouse");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const isZoomedIn = () => zoomTransform(svg).k > 1;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .extent(extent)
      .translateExtent(extent)
      .filter((event: Event) => {
        switch (event.type) {
          case "touchstart":
            return (event as TouchEvent).touches.length > 1 || isZoomedIn();
          case "wheel":
            // Trackpad pinch arrives as ctrl+wheel; plain wheel keeps scrolling the page.
            return (event as WheelEvent).ctrlKey || isZoomedIn();
          case "mousedown":
            return (event as MouseEvent).button === 0 && isZoomedIn();
          default:
            return false;
        }
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => setTransform(event.transform));

    behaviorRef.current = behavior;
    const selection = select(svg).call(behavior);
    // Double tap is handled below for every zoom level; d3's own one would only work when
    // touches already pass the filter (zoomed in) and would double the step.
    selection.on("dblclick.zoom", null);

    return () => {
      selection.on(".zoom", null);
      behaviorRef.current = null;
    };
  }, [svgRef, extent]);

  const zoomedIn = transform.k > 1;
  useEffect(() => {
    setVerticalSwipesEnabled(!zoomedIn);
  }, [zoomedIn]);
  useEffect(() => () => setVerticalSwipesEnabled(true), []);

  const animate = useCallback(
    (apply: (behavior: ZoomBehavior<SVGSVGElement, unknown>, svg: SVGSVGElement) => void) => {
      const svg = svgRef.current;
      const behavior = behaviorRef.current;
      if (svg && behavior) {
        apply(behavior, svg);
      }
    },
    [svgRef],
  );

  const zoomBy = useCallback(
    (factor: number, point?: [number, number]) =>
      animate((behavior, svg) =>
        select(svg)
          .transition()
          .duration(ANIMATION_MS)
          .call((transition) => behavior.scaleBy(transition, factor, point)),
      ),
    [animate],
  );

  const reset = useCallback(
    () =>
      animate((behavior, svg) =>
        select(svg)
          .transition()
          .duration(ANIMATION_MS)
          .call((transition) => behavior.transform(transition, zoomIdentity)),
      ),
    [animate],
  );

  /** Shows the given region as large as possible, or the whole map for null. */
  const fitTo = useCallback(
    (bounds: Bounds | null) =>
      animate((behavior, svg) => {
        const { k, x, y } = bounds
          ? fitTransform(bounds, extent, FIT_MAX_ZOOM)
          : { k: 1, x: 0, y: 0 };
        select(svg)
          .transition()
          .duration(FIT_ANIMATION_MS)
          .call((transition) =>
            behavior.transform(transition, zoomIdentity.translate(x, y).scale(k)),
          );
      }),
    [animate, extent],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    lastPointerTypeRef.current = event.pointerType;
  }, []);

  /** Double tap with a finger zooms in at the tapped point. */
  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.pointerType !== "touch") {
        return;
      }
      const previous = lastTapRef.current;
      const isDoubleTap =
        previous !== null &&
        event.timeStamp - previous.time < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < DOUBLE_TAP_DISTANCE_PX;
      if (isDoubleTap) {
        lastTapRef.current = null;
        zoomBy(ZOOM_STEP, pointer(event.nativeEvent, event.currentTarget));
      } else {
        lastTapRef.current = { time: event.timeStamp, x: event.clientX, y: event.clientY };
      }
    },
    [zoomBy],
  );

  /** Double click with a mouse; touch double taps are handled by onPointerUp. */
  const onDoubleClick = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      if (lastPointerTypeRef.current !== "touch") {
        zoomBy(ZOOM_STEP, pointer(event.nativeEvent, event.currentTarget));
      }
    },
    [zoomBy],
  );

  return {
    transform,
    zoomedIn,
    canZoomIn: transform.k < MAX_ZOOM,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
    reset,
    fitTo,
    handlers: { onPointerDown, onPointerUp, onDoubleClick },
  };
}
