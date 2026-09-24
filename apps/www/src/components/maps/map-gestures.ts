import type { BehaviorType, YMap } from '@yandex/ymaps3-types';

/** Keep page scrolling while allowing mouse drag and two-finger map gestures. */
export const installMapPreviewGestures = (element: HTMLElement, map: YMap): AbortController => {
  const controller = new AbortController();
  const options = { capture: true, passive: true, signal: controller.signal };
  const touches = new Set<number>();
  let mouseDown = false;
  let behaviors: BehaviorType[] = ['pinchZoom'];
  const updateBehaviors = (): void => {
    behaviors = mouseDown || touches.size >= 2 ? ['drag', 'pinchZoom'] : ['pinchZoom'];
    map.setBehaviors(behaviors);
  };
  element.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'touch') {
        mouseDown = false;
        touches.add(event.pointerId);
      } else if (event.pointerType === 'mouse') {
        mouseDown = event.button === 0;
      }
      updateBehaviors();
    },
    options
  );
  const release = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') touches.delete(event.pointerId);
    else if (event.pointerType === 'mouse') mouseDown = false;
    updateBehaviors();
  };
  window.addEventListener('pointerup', release, options);
  window.addEventListener('pointercancel', release, options);
  window.addEventListener(
    'blur',
    () => {
      touches.clear();
      mouseDown = false;
      updateBehaviors();
    },
    { signal: controller.signal }
  );
  // Trackpad pinch is Ctrl+wheel; ordinary wheel scrolls the page.
  element.addEventListener(
    'wheel',
    (event) => map.setBehaviors(event.ctrlKey ? [...behaviors, 'scrollZoom'] : behaviors),
    options
  );
  return controller;
};
