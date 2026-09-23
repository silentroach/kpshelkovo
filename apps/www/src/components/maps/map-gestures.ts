import type { BehaviorType, YMap } from '@yandex/ymaps3-types';

/** Keep page scrolling while allowing mouse drag and deliberate pinch gestures. */
export const installMapPreviewGestures = (element: HTMLElement, map: YMap): AbortController => {
  const controller = new AbortController();
  const options = { capture: true, passive: true, signal: controller.signal };
  let behaviors: BehaviorType[] = ['pinchZoom'];
  const stopDrag = (): void => {
    behaviors = ['pinchZoom'];
    map.setBehaviors(behaviors);
  };
  element.addEventListener(
    'pointerdown',
    (event) => {
      behaviors =
        event.pointerType === 'mouse' && event.button === 0 ? ['drag', 'pinchZoom'] : ['pinchZoom'];
      map.setBehaviors(behaviors);
    },
    options
  );
  window.addEventListener('pointerup', stopDrag, options);
  window.addEventListener('pointercancel', stopDrag, options);
  window.addEventListener('blur', stopDrag, { signal: controller.signal });
  // Trackpad pinch is Ctrl+wheel; ordinary wheel scrolls the page.
  element.addEventListener(
    'wheel',
    (event) => map.setBehaviors(event.ctrlKey ? [...behaviors, 'scrollZoom'] : behaviors),
    options
  );
  return controller;
};
