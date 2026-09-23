<script lang="ts">
  import { pluralize } from '@shelkovo/format';
  import {
    APPLE_MARKER,
    ANIMALS_MARKER,
    CONSTRUCTION_MARKER,
    FISH_MARKER,
    FOODTRUCK_MARKER,
    KPP_MARKER,
    TITANIC_MARKER
  } from '@shelkovo/ui/markers';
  import type { Feature } from '@yandex/ymaps3-clusterer';
  import { onMount } from 'svelte';

  import { createEditorialMapObjects } from '@/components/maps/editorial-map';
  import { EditorialPublicGeometrySchema } from '@/lib/geometry/editorial-public-schema';
  import { getUrlWithoutParcel, PARCEL_QUERY_PARAM } from '@/lib/parcels/parcel-url';
  import { PARCEL_CODE } from '@/lib/parcels/schema';
  import type {
    PlaceMapPublicItemDto,
    PlaceMapPublicPayloadDto
  } from '@/lib/places/map-public-dto';
  import type { PlaceMapItem, PlaceMapProps } from '@/lib/places/map-types';
  import { getPlaceClosingTime } from '@/lib/places/opening-hours';
  import { placeUrl } from '@/lib/places/routes';
  import type { PlaceMarker } from '@/lib/places/schema';
  import { formatPlaceStatus } from '@/lib/places/view';
  import { createOpenMapsControl } from '@/lib/yandex-maps/open-maps-control';
  import {
    installYandexMapsRuntimeHeadPersistence,
    loadYandexMaps,
    waitForStableLayout
  } from '@/lib/yandex-maps/runtime';

  import type { ParcelLayer, ParcelMapPayload } from './parcel-layer-types';
  import {
    createMapFeatures,
    fromPublicEditorialGeometry,
    getMarkerScale,
    getPaddedBounds,
    getPlaceBounds
  } from './place-map-geometry';
  import { getUrlWithoutPlaceHighlight, PLACE_HIGHLIGHT_QUERY_PARAM } from './place-map-url';

  let {
    dataUrl = '',
    fallbackPlace,
    places = [] as readonly PlaceMapItem[]
  }: PlaceMapProps = $props();

  const VIEW_MARGIN: ymaps3.Margin = [112, 80, 32, 80];
  const MOBILE_VIEW_MARGIN: ymaps3.Margin = [112, 32, 32, 32];
  const CLUSTER_GRID_SIZE = 48;
  const CLUSTER_ZOOM_DURATION_MS = 220;
  const HIGHLIGHT_DURATION_MS = 5_000;
  const MARKER_MAX_ZOOM = 16;
  const PLACE_FOCUS_ZOOM = MARKER_MAX_ZOOM;
  const PARCEL_DATA_URL = '/map/data/parcels.json';
  const toPlaceMapItem = (place: PlaceMapPublicItemDto): PlaceMapItem => ({
    slug: place.slug,
    name: place.name,
    marker: place.marker,
    status: place.status,
    coordinates: place.coordinates,
    geometry: place.geometry
      ? fromPublicEditorialGeometry(EditorialPublicGeometrySchema.parse(place.geometry))
      : undefined,
    openingHours: place.opening_hours
      ? {
          description: place.opening_hours.description,
          periods: place.opening_hours.periods.map((period) => ({
            days: period.days,
            opensAt: period.opens_at,
            closesAt: period.closes_at
          }))
        }
      : undefined,
    url: placeUrl(place.slug)
  });
  const fetchPlaces = async (url: string): Promise<readonly PlaceMapItem[]> => {
    if (!url) throw new Error('Не указан источник данных карты');

    const response = await fetch(url);
    if (!response.ok) throw new Error('Не удалось загрузить данные карты');

    const payload = (await response.json()) as PlaceMapPublicPayloadDto;
    return payload.places.map(toPlaceMapItem);
  };
  const CUSTOM_MARKER_IMAGES: Readonly<
    Record<PlaceMarker, { readonly src: string; readonly width: number; readonly height: number }>
  > = {
    apple: APPLE_MARKER,
    animals: ANIMALS_MARKER,
    foodtruck: FOODTRUCK_MARKER,
    titanic: TITANIC_MARKER,
    construction: CONSTRUCTION_MARKER,
    fish: FISH_MARKER,
    kpp: KPP_MARKER
  };
  const getCurrentPlaceBounds = (): ymaps3.LngLatBounds => getPlaceBounds(places);
  const getMapZoomDuration = (): number =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : CLUSTER_ZOOM_DURATION_MS;
  const getViewMargin = (): ymaps3.Margin =>
    window.matchMedia?.('(max-width: 40rem)').matches ? MOBILE_VIEW_MARGIN : VIEW_MARGIN;
  const removeHighlightQuery = (expectedSlug?: string): void => {
    const url = getUrlWithoutPlaceHighlight(window.location.href, expectedSlug);

    if (!url) return;

    window.history.replaceState(window.history.state, '', url);
  };

  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let map: ymaps3.YMap | undefined;
  let mapClusterer: ymaps3.YMapEntity<unknown> | undefined;
  let mapListener: ymaps3.YMapListener | undefined;
  const mapEditorialObjects = new Map<
    string,
    readonly (ymaps3.YMapFeature | ymaps3.YMapMarker)[]
  >();
  let markerContents: Array<readonly [PlaceMapItem, HTMLAnchorElement]> = [];
  const markerHoveredGeometry = new Set<string>();
  const focusedGeometry = new Set<string>();
  const highlightedGeometry = new Set<string>();
  const visibleGeometry = new Set<string>();
  const markerEvents = new AbortController();
  let pendingClusterFocusId: Feature['id'] | undefined;
  let pendingClusterSource: HTMLButtonElement | undefined;
  let clusterFocusObserver: MutationObserver | undefined;
  let clusterFocusFrame: number | undefined;
  let clusterFocusMarkerRendered = false;
  let clusterFocusClusterRendered = false;
  let isLoading = $state(true);
  let error: string | undefined = $state(undefined);
  let parcelsEnabled = $state(false);
  let parcelsLoading = $state(false);
  let parcelsError = $state(false);
  let layersOpen = $state(false);
  let layersControl: HTMLDivElement | undefined = $state(undefined);
  let layersButton: HTMLButtonElement | undefined = $state(undefined);
  let toggleParcels: (checked: boolean) => void;
  let retryParcels = $state<() => void>(() => {});
  let errorPlace = $derived(places[0] ?? fallbackPlace);

  const mapBehaviors = (): ymaps3.BehaviorType[] => [
    'drag',
    'scrollZoom',
    'pinchZoom',
    'dblClick',
    'oneFingerZoom'
  ];

  const supportsGeometryHover = (): boolean =>
    window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

  const updateGeometryVisibility = (place: PlaceMapItem): void => {
    const objects = mapEditorialObjects.get(place.slug);
    if (!map || !objects?.length) return;

    const show =
      markerHoveredGeometry.has(place.slug) ||
      focusedGeometry.has(place.slug) ||
      highlightedGeometry.has(place.slug);
    if (show === visibleGeometry.has(place.slug)) return;
    for (const object of objects) {
      if (show) map.addChild(object);
      else map.removeChild(object);
    }
    if (show) visibleGeometry.add(place.slug);
    else visibleGeometry.delete(place.slug);
  };

  const setGeometryState = (place: PlaceMapItem, states: Set<string>, active: boolean): void => {
    if (!mapEditorialObjects.has(place.slug)) return;
    if (active) states.add(place.slug);
    else states.delete(place.slug);
    updateGeometryVisibility(place);
  };

  const updateMarkerContent = (place: PlaceMapItem, link: HTMLAnchorElement): void => {
    const closingTime = place.openingHours ? getPlaceClosingTime(place.openingHours) : undefined;

    if (!place.openingHours) {
      delete link.dataset.open;
    } else {
      link.dataset.open = String(Boolean(closingTime));
    }

    const status = place.status === 'existing' ? '' : `, ${formatPlaceStatus(place.status)}`;
    let openingStatus = '';

    if (place.openingHours) {
      openingStatus = closingTime ? `открыто до ${closingTime}` : 'сейчас закрыто';
    }

    link.setAttribute(
      'aria-label',
      `Открыть место «${place.name}»${status}${openingStatus ? `, ${openingStatus}` : ''}`
    );
    link.title =
      place.status === 'underConstruction'
        ? place.name
        : `${place.name}${status}${openingStatus ? `\n${openingStatus}` : ''}`;
  };

  const refreshMarkerContents = (): void => {
    for (const [place, link] of markerContents) {
      updateMarkerContent(place, link);
    }
  };

  const createMarkerContent = (place: PlaceMapItem): HTMLAnchorElement => {
    const link = document.createElement('a');
    const visual = document.createElement('span');
    const options = { signal: markerEvents.signal };

    link.className = 'place-map-marker';
    link.href = place.url;
    link.dataset.status = place.status;
    updateMarkerContent(place, link);
    link.addEventListener('click', (event) => event.stopPropagation(), options);
    link.addEventListener(
      'mouseenter',
      () => {
        if (supportsGeometryHover()) setGeometryState(place, markerHoveredGeometry, true);
      },
      options
    );
    link.addEventListener(
      'mouseleave',
      () => setGeometryState(place, markerHoveredGeometry, false),
      options
    );
    link.addEventListener('focus', () => setGeometryState(place, focusedGeometry, true), options);
    link.addEventListener('blur', () => setGeometryState(place, focusedGeometry, false), options);
    link.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          setGeometryState(place, focusedGeometry, false);
          return;
        }
        if (event.key !== ' ') return;

        event.preventDefault();
        link.click();
      },
      options
    );

    if (place.marker) {
      const markerImage = CUSTOM_MARKER_IMAGES[place.marker];
      const image = document.createElement('img');

      link.dataset.marker = place.marker;
      visual.className = 'place-map-marker-graphic';
      image.className = 'place-map-marker-image';
      image.src = markerImage.src;
      image.alt = '';
      image.width = markerImage.width;
      image.height = markerImage.height;
      image.draggable = false;
      visual.append(image);
    } else {
      const point = document.createElement('span');

      visual.className = 'place-map-marker-point';
      point.className = 'place-map-marker-point-surface ui-map-marker';
      visual.append(point);
    }

    if (place.openingHours) {
      const closedIndicator = document.createElement('span');

      closedIndicator.className = 'place-map-marker-closed-indicator';
      visual.append(closedIndicator);
    }

    visual.setAttribute('aria-hidden', 'true');
    link.append(visual);

    return link;
  };

  const updateMarkerScale = (zoom: number): void => {
    mapContainer?.style.setProperty('--place-map-marker-scale', getMarkerScale(zoom).toFixed(3));
  };

  const zoomToCluster = (features: readonly Feature[]): void => {
    map?.update({
      location: {
        bounds: getPaddedBounds(features.map((feature) => feature.geometry.coordinates)),
        duration: getMapZoomDuration(),
        easing: 'ease-in-out'
      },
      margin: getViewMargin()
    });
  };

  const focusPlace = (place: PlaceMapItem, duration: number): void => {
    map?.update({
      location: {
        center: [place.coordinates.lng, place.coordinates.lat],
        zoom: PLACE_FOCUS_ZOOM,
        duration,
        easing: 'ease-in-out'
      }
    });
  };

  const cancelClusterFocus = (): void => {
    clusterFocusObserver?.disconnect();
    if (clusterFocusFrame !== undefined) window.cancelAnimationFrame(clusterFocusFrame);
    clusterFocusObserver = undefined;
    clusterFocusFrame = undefined;
    pendingClusterFocusId = undefined;
    pendingClusterSource = undefined;
    clusterFocusMarkerRendered = false;
    clusterFocusClusterRendered = false;
  };

  const restoreClusterFocus = (): void => {
    if (pendingClusterFocusId === undefined || !mapContainer) return;

    // The SDK can remove a focused cluster before inserting its replacement.
    if (document.activeElement === document.body) mapContainer.focus({ preventScroll: true });
    if (
      document.activeElement !== mapContainer &&
      document.activeElement !== pendingClusterSource
    ) {
      cancelClusterFocus();
      return;
    }

    const id = String(pendingClusterFocusId);
    const marker = markerContents.find(([place]) => place.slug === id)?.[1];
    if (clusterFocusMarkerRendered && marker?.isConnected && mapContainer.contains(marker)) {
      cancelClusterFocus();
      marker.focus({ preventScroll: true });
      return;
    }

    if (!clusterFocusClusterRendered) return;
    const clusters = mapContainer.querySelectorAll<HTMLButtonElement>('.place-map-cluster');
    const cluster = Array.from(clusters).find((candidate) =>
      candidate.dataset.placeIds?.split(' ').includes(id)
    );
    if (cluster) {
      cancelClusterFocus();
      cluster.focus({ preventScroll: true });
    }
  };

  const createClusterContent = (features: readonly Feature[]): HTMLButtonElement => {
    const button = document.createElement('button');
    const label = `${features.length} ${pluralize(features.length, ['место', 'места', 'мест'])} рядом`;

    button.type = 'button';
    button.className = 'place-map-cluster';
    button.dataset.placeIds = features.map(({ id }) => String(id)).join(' ');
    button.textContent = String(features.length);
    button.title = label;
    button.setAttribute('aria-label', `${label}. Приблизить карту`);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      cancelClusterFocus();
      if (event.detail === 0 && document.activeElement === button && features[0] && mapContainer) {
        pendingClusterFocusId = features[0].id;
        pendingClusterSource = button;
        mapContainer.focus({ preventScroll: true });
        clusterFocusObserver = new MutationObserver(restoreClusterFocus);
        clusterFocusObserver.observe(mapContainer, { childList: true, subtree: true });
      }
      zoomToCluster(features);
    });

    return button;
  };

  const fitPlaces = (): void => {
    map?.update?.({
      location: { bounds: getCurrentPlaceBounds(), duration: 0 },
      margin: getViewMargin()
    });
  };

  const clearMap = (): void => {
    markerEvents.abort();
    cancelClusterFocus();
    if (map) {
      for (const slug of visibleGeometry) {
        for (const object of mapEditorialObjects.get(slug) ?? []) map.removeChild(object);
      }
      if (mapClusterer) map.removeChild(mapClusterer);
      if (mapListener) map.removeChild(mapListener);
      map.destroy();
    }

    mapClusterer = undefined;
    mapListener = undefined;
    mapEditorialObjects.clear();
    markerContents = [];
    markerHoveredGeometry.clear();
    focusedGeometry.clear();
    highlightedGeometry.clear();
    visibleGeometry.clear();
    mapContainer?.style.removeProperty('--place-map-marker-scale');
    map = undefined;
  };

  onMount(() => {
    let destroyed = false;
    const closeLayersOutside = (event: PointerEvent): void => {
      if (!layersControl?.contains(event.target as Node)) layersOpen = false;
    };
    const closeLayersOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !layersOpen) return;
      layersOpen = false;
      layersButton?.focus();
    };
    document.addEventListener('pointerdown', closeLayersOutside);
    document.addEventListener('keydown', closeLayersOnEscape);
    const cancelFocusOnPointer = (): void => cancelClusterFocus();
    const cancelFocusOnMove = (event: FocusEvent): void => {
      if (
        pendingClusterFocusId !== undefined &&
        event.target !== mapContainer &&
        event.target !== pendingClusterSource
      )
        cancelClusterFocus();
    };
    document.addEventListener('pointerdown', cancelFocusOnPointer, true);
    document.addEventListener('focusin', cancelFocusOnMove);
    mapContainer?.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Tab' &&
          (event.shiftKey || event.target !== mapContainer || !pendingClusterSource?.isConnected)
        )
          cancelClusterFocus();
      },
      { signal: markerEvents.signal }
    );
    let parcelRequest = 0;
    let parcelLayer: ParcelLayer | undefined;
    let parcelData: ParcelMapPayload | undefined;
    let pendingParcelCode: string | undefined;
    let preserveParcelCamera = false;
    const requestedParcelCode =
      new URL(window.location.href).searchParams.get(PARCEL_QUERY_PARAM) || undefined;
    const parcelCode = requestedParcelCode?.toUpperCase();
    const removeParcelQuery = (code?: string): void => {
      const url = getUrlWithoutParcel(window.location.href, code);
      if (url) window.history.replaceState(window.history.state, '', url);
    };
    const loadParcelData = async (): Promise<ParcelMapPayload> => {
      if (parcelData) return parcelData;
      const [response, { ParcelMapPublicSchema }] = await Promise.all([
        fetch(PARCEL_DATA_URL),
        import('@/lib/parcels/map-public-schema')
      ]);
      if (!response.ok) throw new Error('Не удалось загрузить участки');
      const payload = ParcelMapPublicSchema.parse(await response.json());
      if (!destroyed) parcelData = payload;
      return payload;
    };
    const enableParcels = async (code?: string): Promise<void> => {
      const request = ++parcelRequest;
      parcelsEnabled = true;
      parcelsLoading = true;
      parcelsError = false;
      try {
        if (!map || !mapContainer) return;
        const data = await loadParcelData();
        if (destroyed || request !== parcelRequest || !map || !mapContainer) return;
        const canonical = code
          ? data.find((item) => item.code === code || item.aliases?.includes(code))?.code
          : undefined;
        if (code && !canonical) {
          removeParcelQuery(requestedParcelCode);
          pendingParcelCode = undefined;
          parcelsEnabled = false;
          return;
        }
        if (!parcelLayer) {
          const { createParcelLayer } = await import('./parcel-layer');
          if (destroyed || request !== parcelRequest || !map || !mapContainer) return;
          parcelLayer = createParcelLayer(
            map,
            window.ymaps3,
            mapContainer,
            () => {
              if (pendingParcelCode) {
                removeParcelQuery(pendingParcelCode);
                pendingParcelCode = undefined;
              }
            },
            getMapZoomDuration
          );
        }
        parcelLayer.enable(data);
        parcelLayer.updateViewport(map.zoom, map.bounds);
        if (canonical) {
          if (!parcelLayer.focus(canonical)) {
            parcelLayer.disable();
            parcelData = undefined;
            throw new Error('Номер найден, но контур участка недоступен');
          }
          preserveParcelCamera = true;
          pendingParcelCode = requestedParcelCode;
        }
      } catch (reason) {
        if (destroyed || request !== parcelRequest) return;
        parcelLayer?.disable();
        console.error('Parcel layer error:', reason);
        parcelsError = true;
        parcelsEnabled = false;
      } finally {
        if (!destroyed && request === parcelRequest) parcelsLoading = false;
      }
    };
    toggleParcels = (checked: boolean): void => {
      parcelsEnabled = checked;
      if (!checked) {
        parcelRequest++;
        parcelsLoading = false;
        parcelsError = false;
        parcelLayer?.disable();
        if (pendingParcelCode) {
          removeParcelQuery(pendingParcelCode);
          pendingParcelCode = undefined;
        }
        return;
      }
      void enableParcels(pendingParcelCode ? parcelCode : undefined);
    };
    retryParcels = (): void => {
      void enableParcels(pendingParcelCode ? parcelCode : undefined);
    };
    let highlightTimer: number | undefined;
    let markerUpdateTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const highlightUrl = new URL(window.location.href);
    const requestedSlug = !requestedParcelCode
      ? highlightUrl.searchParams.get(PLACE_HIGHLIGHT_QUERY_PARAM) || undefined
      : undefined;
    let highlightedPlace: PlaceMapItem | undefined;

    const startPlaceHighlight = (place: PlaceMapItem): void => {
      const marker = markerContents.find(([candidate]) => candidate.slug === place.slug)?.[1];

      if (!marker) {
        highlightedPlace = undefined;
        removeHighlightQuery(place.slug);
        return;
      }

      marker.dataset.highlighted = 'true';
      marker.setAttribute('aria-current', 'location');
      setGeometryState(place, highlightedGeometry, true);
      focusPlace(place, getMapZoomDuration());
      highlightTimer = window.setTimeout(() => {
        highlightTimer = undefined;
        delete marker.dataset.highlighted;
        marker.removeAttribute('aria-current');
        setGeometryState(place, highlightedGeometry, false);
        highlightedPlace = undefined;
        removeHighlightQuery(place.slug);
      }, HIGHLIGHT_DURATION_MS);
    };

    installYandexMapsRuntimeHeadPersistence();

    const refresh = (): void => {
      void waitForStableLayout().then(() => {
        if (destroyed) return;

        if (preserveParcelCamera) return;

        if (highlightedPlace) {
          focusPlace(highlightedPlace, 0);
          return;
        }

        fitPlaces();
      });
    };

    document.addEventListener('astro:page-load', refresh);

    if (typeof ResizeObserver !== 'undefined' && mapContainer) {
      resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(mapContainer);
    }

    void (async () => {
      try {
        const placesRequest = places.length ? Promise.resolve(places) : fetchPlaces(dataUrl);
        const [loadedPlaces] = await Promise.all([placesRequest, loadYandexMaps()]);

        if (destroyed || !mapContainer) return;

        places = loadedPlaces;
        highlightedPlace = requestedSlug
          ? places.find((place) => place.slug === requestedSlug)
          : undefined;

        if (
          !requestedParcelCode &&
          highlightUrl.searchParams.has(PLACE_HIGHLIGHT_QUERY_PARAM) &&
          !highlightedPlace
        ) {
          removeHighlightQuery(requestedSlug);
        }

        const ymaps3 = window.ymaps3;

        if (!ymaps3) {
          removeHighlightQuery(highlightedPlace?.slug);
          highlightedPlace = undefined;
          error = 'Yandex Maps API недоступен';
          isLoading = false;
          return;
        }

        await ymaps3.ready;
        const { YMapClusterer, clusterByGrid } = await import('@yandex/ymaps3-clusterer');
        await waitForStableLayout();

        if (destroyed || !mapContainer) return;

        const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapListener, YMapMarker } =
          ymaps3;

        map = new YMap(
          mapContainer,
          {
            location: { bounds: getCurrentPlaceBounds() },
            behaviors: mapBehaviors(),
            mode: 'vector',
            copyrightsPosition: 'bottom left',
            distributionPosition: 'bottom right'
          },
          [
            new YMapDefaultSchemeLayer({
              layers: {
                ground: { zIndex: 0 },
                buildings: { zIndex: 1 },
                icons: { visible: false, zIndex: 2 },
                labels: { zIndex: 3 }
              }
            }),
            new YMapDefaultFeaturesLayer()
          ]
        );

        const currentMap = map;
        const control = await createOpenMapsControl(ymaps3, 'bottom right');
        if (destroyed || map !== currentMap) return;
        map.addChild(control);

        markerContents = places.map((place) => [place, createMarkerContent(place)] as const);
        for (const place of places) {
          if (!place.geometry) continue;
          mapEditorialObjects.set(place.slug, createEditorialMapObjects(ymaps3, place.geometry));
        }
        mapListener = new YMapListener({
          onUpdate: ({ location }) => {
            updateMarkerScale(location.zoom);
            parcelLayer?.updateViewport(location.zoom, location.bounds);
          }
        });
        mapClusterer = new YMapClusterer({
          method: clusterByGrid({ gridSize: CLUSTER_GRID_SIZE }),
          features: createMapFeatures(places),
          maxZoom: PLACE_FOCUS_ZOOM - 1,
          onRender: (clusters) => {
            const visibleMarkers = new Set(
              clusters
                .filter(({ features }) => features.length === 1)
                .map(({ features }) => String(features[0]!.id))
            );
            for (const [place] of markerContents) {
              if (visibleMarkers.has(place.slug)) continue;
              setGeometryState(place, markerHoveredGeometry, false);
              setGeometryState(place, focusedGeometry, false);
            }
            if (clusterFocusFrame !== undefined) window.cancelAnimationFrame(clusterFocusFrame);
            clusterFocusFrame = undefined;
            clusterFocusMarkerRendered =
              pendingClusterFocusId !== undefined &&
              visibleMarkers.has(String(pendingClusterFocusId));
            clusterFocusClusterRendered = false;
            if (
              pendingClusterFocusId !== undefined &&
              clusters.some(
                ({ features }) =>
                  features.length > 1 && features.some(({ id }) => id === pendingClusterFocusId)
              )
            ) {
              clusterFocusFrame = window.requestAnimationFrame(() => {
                clusterFocusFrame = undefined;
                clusterFocusClusterRendered = true;
                restoreClusterFocus();
              });
            }
            restoreClusterFocus();
          },
          marker: (feature) => {
            const content = markerContents.find(([place]) => place.slug === feature.id)?.[1];

            if (!content) throw new Error(`Не найден маркер места ${feature.id}`);

            return new YMapMarker({ coordinates: feature.geometry.coordinates }, content);
          },
          cluster: (coordinates, features) =>
            new YMapMarker({ coordinates }, createClusterContent(features))
        });
        map.addChild(mapListener);
        map.addChild(mapClusterer);
        updateMarkerScale(map.zoom);

        if (highlightedPlace) {
          startPlaceHighlight(highlightedPlace);
        } else {
          fitPlaces();
        }
        if (markerContents.some(([place]) => place.openingHours)) {
          markerUpdateTimer = window.setInterval(refreshMarkerContents, 60_000);
        }
        isLoading = false;
        if (requestedParcelCode) {
          if (!parcelCode || !PARCEL_CODE.test(parcelCode)) {
            removeParcelQuery(requestedParcelCode);
          } else {
            pendingParcelCode = requestedParcelCode;
            void enableParcels(parcelCode);
          }
        }
      } catch (reason) {
        if (destroyed) return;
        console.error('Places map setup error:', reason);
        clearMap();

        removeHighlightQuery(highlightedPlace?.slug ?? requestedSlug);
        highlightedPlace = undefined;
        error = reason instanceof Error ? reason.message : 'Карта недоступна';
        isLoading = false;
      }
    })();

    return () => {
      destroyed = true;
      document.removeEventListener('pointerdown', closeLayersOutside);
      document.removeEventListener('keydown', closeLayersOnEscape);
      document.removeEventListener('pointerdown', cancelFocusOnPointer, true);
      document.removeEventListener('focusin', cancelFocusOnMove);
      parcelRequest++;
      parcelLayer?.destroy();
      document.removeEventListener('astro:page-load', refresh);
      resizeObserver?.disconnect();
      if (highlightTimer !== undefined) {
        window.clearTimeout(highlightTimer);
      }
      if (markerUpdateTimer !== undefined) {
        window.clearInterval(markerUpdateTimer);
      }
      clearMap();
    };
  });
</script>

<div data-testid="place-map" class="place-map">
  {#if isLoading}
    <div class="map-placeholder map-placeholder--loading" aria-live="polite">
      <p class="map-loading-message">Загружаем карту…</p>
    </div>
  {/if}

  {#if error}
    <div class="map-placeholder map-placeholder--error" role="status">
      <div class="map-error-panel">
        <p class="map-error-title">Карта сейчас недоступна</p>
        {#if errorPlace}
          <a href={errorPlace.url} class="site-text-link map-error-link">
            Открыть карточку «{errorPlace.name}»
          </a>
        {/if}
      </div>
    </div>
  {/if}

  <div bind:this={mapContainer} class="place-map__canvas" tabindex="-1"></div>
  {#if !error}
    <div class="parcel-map-controls">
      <div class="parcel-map-layers" bind:this={layersControl}>
        <button
          bind:this={layersButton}
          type="button"
          class="parcel-map-layers-button"
          aria-label="Слои"
          aria-expanded={layersOpen}
          aria-controls="parcel-map-layer-list"
          disabled={isLoading}
          onclick={() => (layersOpen = !layersOpen)}
        >
          <svg class="parcel-map-layer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div id="parcel-map-layer-list" class="parcel-map-layer-list" hidden={!layersOpen}>
          <button
            type="button"
            class="parcel-map-layer"
            aria-pressed={parcelsEnabled}
            onclick={() => toggleParcels(!parcelsEnabled)}
          >
            <svg class="parcel-map-layer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m4 6 13-2 4 13-13 3L4 6Z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="4" cy="6" r="1.5" fill="currentColor" />
              <circle cx="21" cy="17" r="1.5" fill="currentColor" />
            </svg>
            Участки
          </button>
        </div>
      </div>
      {#if parcelsLoading}<span role="status">Загружаем участки…</span>{/if}
      {#if parcelsError}
        <span role="alert">Не удалось загрузить участки.</span>
        <button type="button" onclick={retryParcels}>Повторить</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .place-map {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--color-bg-soft);
  }

  .place-map__canvas {
    container-type: inline-size;
    width: 100%;
    height: 100%;
  }

  .place-map__canvas:focus-visible {
    outline: 0.1875rem solid var(--color-focus);
    outline-offset: -0.1875rem;
  }

  .parcel-map-controls {
    position: absolute;
    top: 4.5rem;
    left: 1rem;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    max-width: min(90%, 26rem);
    color: var(--color-text);
    font-size: 0.875rem;
  }

  .parcel-map-layers {
    position: relative;
  }

  .parcel-map-layers-button,
  .parcel-map-layer-list {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
  }

  .parcel-map-layers-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    box-shadow: 0 0.125rem 0.4rem oklch(24% 0.04 145 / 0.16);
  }

  .parcel-map-layer-list {
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    min-width: 11rem;
    padding: 0.25rem;
    box-shadow: 0 0.25rem 0.75rem oklch(24% 0.04 145 / 0.18);
  }

  .parcel-map-layer {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.625rem;
    min-height: 2.75rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
    text-align: left;
  }

  .parcel-map-layer-icon {
    width: 1.375rem;
    height: 1.375rem;
    flex: none;
    color: var(--color-text-muted);
  }

  .parcel-map-layer[aria-pressed='true'] {
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .parcel-map-layer[aria-pressed='true'] .parcel-map-layer-icon {
    color: var(--color-primary);
  }

  .parcel-map-controls button {
    font: inherit;
    cursor: pointer;
  }
  .parcel-map-controls button:hover:not(:disabled) {
    background: var(--color-primary-soft);
  }
  .parcel-map-controls button:disabled {
    cursor: wait;
  }
  .parcel-map-controls button:not(.parcel-map-layers-button, .parcel-map-layer) {
    border: 0;
    background: none;
    color: var(--color-primary);
    font-weight: 600;
    text-decoration: underline;
  }
  .parcel-map-controls button:focus-visible {
    outline: 0.1875rem solid var(--color-focus);
    outline-offset: 0.125rem;
  }

  :global(.parcel-map-label) {
    display: grid;
    min-width: 2.75rem;
    min-height: 2.75rem;
    place-items: center;
    padding: 0.25rem;
    border: 0;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-family: var(--font-body);
    transform: translate(-50%, -50%);
  }

  :global(.parcel-map-label span) {
    padding: 0.125rem 0.375rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    box-shadow: 0 1px 2px oklch(24% 0.04 145 / 0.12);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
  }

  .place-map__canvas :global(:is(a, button):focus-visible) {
    outline: 0.1875rem solid var(--color-focus);
    outline-offset: 0.125rem;
  }

  @container (max-width: 32rem) {
    .place-map__canvas :global(.ymaps3--map-copyrights_bottom) {
      bottom: 3.5rem;
    }
  }

  .map-placeholder {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(
        color-mix(in oklab, var(--color-border) 62%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        color-mix(in oklab, var(--color-border) 62%, transparent) 1px,
        transparent 1px
      ),
      var(--color-bg-soft);
    background-size: 2rem 2rem;
  }

  .map-placeholder--loading {
    pointer-events: none;
  }

  .map-placeholder--error {
    padding-inline: 1.25rem;
  }

  .map-loading-message,
  .map-error-panel {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .map-loading-message {
    padding: 0.5rem 1rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
  }

  .map-error-panel {
    max-width: 24rem;
    padding: 1.25rem;
    text-align: center;
  }

  .map-error-title,
  .map-error-link {
    font-weight: 600;
  }

  .map-error-title {
    color: var(--color-text);
  }

  .map-error-link {
    display: inline-flex;
    margin-top: 0.5rem;
  }

  :global(.place-map-marker) {
    position: relative;
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    align-items: center;
    justify-items: center;
    border-radius: 999px;
    transform: translate(-50%, -50%);
    text-decoration: none;
  }

  :global(.place-map-marker[data-highlighted='true']::before) {
    position: absolute;
    inset: -0.3125rem;
    border: 0.1875rem solid var(--color-accent-text);
    border-radius: 999px;
    box-shadow: 0 0 0 0.1875rem var(--color-surface-raised);
    content: '';
    pointer-events: none;
  }

  :global(.place-map-marker[data-highlighted='true']) {
    z-index: 1;
  }

  :global(.place-map-marker[data-highlighted='true']::after) {
    position: absolute;
    top: -1.125rem;
    left: 50%;
    width: 0;
    height: 0;
    border-top: 0.625rem solid var(--color-accent-text);
    border-right: 0.4375rem solid transparent;
    border-left: 0.4375rem solid transparent;
    content: '';
    filter: drop-shadow(0 0.125rem 0 var(--color-surface-raised));
    pointer-events: none;
    transform: translateX(-50%);
    animation: place-map-highlight-arrow 0.7s ease-in-out infinite alternate;
  }

  :global(.place-map-marker[data-marker]) {
    width: 3rem;
    height: 3rem;
  }

  :global(.place-map-marker-point) {
    --ui-map-marker-size: 0.9375rem;
    --ui-map-marker-border: 0.1875rem solid var(--color-surface-raised);

    position: relative;
    display: block;
    width: var(--ui-map-marker-size);
    height: var(--ui-map-marker-size);
    flex: none;
    scale: var(--place-map-marker-scale, 1);
    transition:
      scale 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker-point-surface) {
    display: block;
    transition: filter 0.15s ease;
  }

  :global(.place-map-marker-graphic) {
    position: relative;
    display: block;
    width: 2rem;
    flex: none;
    scale: var(--place-map-marker-scale, 1);
    transition:
      scale 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker[data-marker='apple'] .place-map-marker-graphic) {
    width: 1.75rem;
  }

  :global(.place-map-marker[data-marker='construction'] .place-map-marker-graphic) {
    width: 1.3333rem;
  }

  :global(.place-map-marker-image) {
    --place-map-marker-state-filter: saturate(1);

    display: block;
    width: 100%;
    height: auto;
    filter: var(--place-map-marker-state-filter) drop-shadow(0 0 0.1rem oklch(100% 0 0 / 0.96))
      drop-shadow(0 0.25rem 0.35rem oklch(24% 0.04 145 / 0.4));
    transition: filter 0.15s ease;
    user-select: none;
  }

  :global(.place-map-marker:is(:hover, :focus-visible)) {
    outline: none;
  }

  :global(.place-map-marker:is(:hover, :focus-visible) .place-map-marker-point),
  :global(.place-map-marker:is(:hover, :focus-visible) .place-map-marker-graphic) {
    transform: scale(1.16);
  }

  :global(.place-map-marker:focus-visible) {
    box-shadow: 0 0 0 0.1875rem var(--color-focus);
  }

  :global(.place-map-marker[data-open='false'] .place-map-marker-point-surface) {
    filter: grayscale(1);
  }

  :global(.place-map-marker[data-open='false'] .place-map-marker-image) {
    --place-map-marker-state-filter: grayscale(1);
  }

  :global(.place-map-marker-closed-indicator) {
    position: absolute;
    top: -0.375rem;
    right: -0.375rem;
    z-index: 1;
    display: none;
    box-sizing: border-box;
    width: 0.75rem;
    height: 0.75rem;
    border: 0.09375rem solid currentColor;
    border-radius: 999px;
    background: var(--color-accent);
    box-shadow: 0 0 0 0.0625rem var(--color-surface-raised);
    color: var(--color-text);
    pointer-events: none;
  }

  :global(.place-map-marker-closed-indicator::before),
  :global(.place-map-marker-closed-indicator::after) {
    position: absolute;
    left: 50%;
    border-radius: 999px;
    background: currentColor;
    content: '';
    transform-origin: left center;
  }

  :global(.place-map-marker-closed-indicator::before) {
    top: 0.125rem;
    width: 0.09375rem;
    height: 0.25rem;
    transform: translateX(-50%);
  }

  :global(.place-map-marker-closed-indicator::after) {
    top: calc(50% - 0.046875rem);
    width: 0.21875rem;
    height: 0.09375rem;
    transform: rotate(30deg);
  }

  :global(.place-map-marker[data-open='false'] .place-map-marker-closed-indicator) {
    display: block;
  }

  :global(.place-map-marker[data-status='planned'] .place-map-marker-point) {
    border-style: dashed;
    opacity: 0.76;
  }

  :global(.place-map-marker[data-status='planned'] .place-map-marker-graphic) {
    opacity: 0.76;
  }

  :global(.place-map-marker[data-status='underConstruction'] .place-map-marker-point) {
    border-radius: 0.25rem;
  }

  :global(.place-map-cluster) {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 0.125rem solid var(--color-primary);
    border-radius: 999px;
    background: var(--color-surface-raised);
    box-shadow:
      0 0 0 0.125rem color-mix(in oklab, var(--color-surface) 88%, transparent),
      0 0.2rem 0.45rem oklch(24% 0.04 145 / 0.28);
    color: var(--color-text);
    cursor: pointer;
    font: inherit;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    line-height: 1;
    touch-action: manipulation;
    transform: translate(-50%, -50%);
    animation: place-map-cluster-enter 0.16s ease-out;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-cluster:hover) {
    border-color: var(--color-primary-hover);
    background: var(--color-primary-soft);
    transform: translate(-50%, -50%) scale(1.08);
  }

  :global(.place-map-cluster:focus-visible) {
    outline: 0.1875rem solid var(--color-focus);
    outline-offset: 0.125rem;
    transform: translate(-50%, -50%) scale(1.08);
  }

  :global(.place-map-cluster:active) {
    transform: translate(-50%, -50%) scale(0.96);
  }

  @keyframes place-map-cluster-enter {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.72);
    }
  }

  @keyframes place-map-highlight-arrow {
    to {
      transform: translate(-50%, 0.25rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.place-map-marker-point),
    :global(.place-map-marker-point-surface),
    :global(.place-map-marker-graphic),
    :global(.place-map-marker-image),
    :global(.place-map-marker[data-highlighted='true']::after),
    :global(.place-map-cluster) {
      animation: none;
      transition: none;
    }
  }
</style>
