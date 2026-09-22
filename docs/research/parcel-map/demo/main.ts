import type { YMapFeature } from '@yandex/ymaps3-types';

import { createOpenMapsControl } from '../../../../apps/www/src/lib/yandex-maps/open-maps-control';
import { loadYandexMaps } from '../../../../apps/www/src/lib/yandex-maps/runtime';
import { createDisplayOffset } from './display-offset';
import type { DemoParcel } from './types';

const data = __PARCEL_DEMO__;
const container = document.querySelector<HTMLElement>('#map')!;
const summary = document.querySelector<HTMLElement>('#summary')!;
const selection = document.querySelector<HTMLElement>('#selection')!;
const partSelect = document.querySelector<HTMLSelectElement>('#part')!;
const offsetControls = document.querySelector<HTMLFieldSetElement>('#offset')!;
const eastInput = document.querySelector<HTMLInputElement>('#east')!;
const northInput = document.querySelector<HTMLInputElement>('#north')!;
const format = new Intl.NumberFormat('ru-RU');

eastInput.value = String(data.displayOffset.eastMeters);
northInput.value = String(data.displayOffset.northMeters);

summary.textContent = `Контуры: ${format.format(data.parcels.length)}. Номера: ${format.format(data.matched)} из ${format.format(data.total)}.`;
for (const part of data.parts) {
  partSelect.add(new Option(`${part.name}: ${part.matched} из ${part.total}`, part.id));
}

const start = async (): Promise<void> => {
  await loadYandexMaps();
  const maps = window.ymaps3;
  if (!maps) throw new Error('Яндекс Карты недоступны');
  const map = new maps.YMap(container, {
    location: { bounds: data.bounds },
    margin: [40, 40, 40, 40],
    behaviors: ['drag', 'scrollZoom', 'pinchZoom', 'dblClick'],
    copyrightsPosition: 'bottom left'
  });
  window.addEventListener('pagehide', () => map.destroy(), { once: true });
  map.addChild(new maps.YMapDefaultSchemeLayer({}));
  map.addChild(new maps.YMapDefaultFeaturesLayer({}));
  map.addChild(await createOpenMapsControl(maps, 'bottom right'));

  const normalStyle = {
    stroke: [{ color: '#286334', width: 1.5 }],
    fill: 'rgba(56, 132, 73, 0.12)'
  };
  const selectedStyle = {
    stroke: [{ color: '#915d16', width: 3 }],
    fill: 'rgba(232, 170, 52, 0.35)'
  };
  let selected: YMapFeature | undefined;
  const select = (parcel: DemoParcel, feature: YMapFeature): void => {
    selected?.update({ style: normalStyle });
    selected = feature;
    feature.update({ style: selectedStyle });
    selection.textContent = `${parcel.codes.join(' / ')} · ${parcel.cadastralNumber}${parcel.area === undefined ? '' : ` · ${format.format(parcel.area)} м²`}`;
  };

  const rendered = data.parcels.map((parcel) => {
    const feature = new maps.YMapFeature({
      id: parcel.cadastralNumber,
      geometry: parcel.geometry,
      style: normalStyle,
      onClick: () => select(parcel, feature)
    });
    map.addChild(feature);
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'parcel-label';
    label.textContent = parcel.codes.map((code) => code.slice(4)).join(' / ');
    label.title = `${parcel.codes.join(' / ')} · ${parcel.cadastralNumber}`;
    label.setAttribute('aria-label', label.title);
    label.addEventListener('click', (event) => {
      event.stopPropagation();
      select(parcel, feature);
    });
    const marker = new maps.YMapMarker({ coordinates: parcel.center }, label);
    map.addChild(marker);
    return { parcel, feature, marker };
  });

  const applyOffset = (): void => {
    if (!eastInput.checkValidity() || !northInput.checkValidity()) return;
    const east = eastInput.valueAsNumber;
    const north = northInput.valueAsNumber;
    if (!Number.isFinite(east) || !Number.isFinite(north)) return;
    const shift = createDisplayOffset(east, north, (data.bounds[0][1] + data.bounds[1][1]) / 2);
    for (const { parcel, feature, marker } of rendered) {
      const geometry = parcel.geometry;
      feature.update({
        geometry:
          geometry.type === 'Polygon'
            ? { type: 'Polygon', coordinates: geometry.coordinates.map((ring) => ring.map(shift)) }
            : {
                type: 'MultiPolygon',
                coordinates: geometry.coordinates.map((polygon) =>
                  polygon.map((ring) => ring.map(shift))
                )
              }
      });
      marker.update({ coordinates: shift(parcel.center) });
    }
  };
  offsetControls.addEventListener('input', applyOffset);
  document.querySelector('#reset-offset')!.addEventListener('click', () => {
    eastInput.value = '0';
    northInput.value = '0';
    applyOffset();
  });
  offsetControls.disabled = false;
  applyOffset();

  const updateLabels = (): void => {
    container.classList.toggle('show-labels', map.zoom >= 16);
  };
  map.addChild(new maps.YMapListener({ onUpdate: updateLabels }));
  updateLabels();
  partSelect.disabled = false;
  partSelect.addEventListener('change', () => {
    const part = data.parts.find((item) => item.id === partSelect.value);
    map.setLocation({ bounds: part?.bounds ?? data.bounds });
  });
  container.dataset.ready = 'true';
};

start().catch((error: unknown) => {
  selection.textContent = `Не удалось открыть карту. ${error instanceof Error ? error.message : 'Попробуйте обновить страницу.'}`;
  console.error(error);
});
