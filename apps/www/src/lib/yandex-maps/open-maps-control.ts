import type { YMapControls, YMapControlsProps } from '@yandex/ymaps3-types';

export const OPEN_MAPS_BUTTON_TITLE = 'Яндекс Карты';

export const createOpenMapsControl = async (
  maps: typeof ymaps3,
  position: YMapControlsProps['position']
): Promise<YMapControls> => {
  const { YMapOpenMapsButton } = await maps.import('@yandex/ymaps3-controls-extra');
  return new maps.YMapControls({ position }, [
    new YMapOpenMapsButton({ title: OPEN_MAPS_BUTTON_TITLE })
  ]);
};
