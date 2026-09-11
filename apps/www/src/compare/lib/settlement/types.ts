export type AvailabilityStatus = 'yes' | 'no' | 'partial';
export type DrainageType = 'closed' | 'open' | 'none';
export type RoadType = 'asphalt' | 'partlyAsphalt' | 'gravel' | 'dirt';
export type SourceType = 'official' | 'community' | 'media' | 'personal';
export type TariffPeriod = 'month' | 'quarter' | 'year';
export type TariffUnit = 'perSotka' | 'perLot' | 'fixed';
export type UndergroundElectricity = 'full' | 'partial' | 'none';
export type VideoSurveillance = 'full' | 'checkpointOnly' | 'none';

export interface Location {
  /** Человекочитаемый адрес для карточек сравнения и сводок источников. */
  readonly addressText: string;
  readonly lat: number;
  readonly lng: number;
  readonly mapUrl?: string;
  readonly district: string;
}

export interface TariffPart {
  readonly value: number;
  readonly unit: TariffUnit;
  readonly period: TariffPeriod;
  readonly note?: string;
}

export interface TariffSource extends TariffPart {
  readonly parts?: readonly TariffPart[];
}

export interface Tariff extends TariffSource {
  /** Месячная стоимость, нормализованная на одну сотку для сравнения поселков. */
  readonly normalizedPerSotkaMonth: number;
  /** Значение true, если нормализация использовала допущения по участку или фиксированному тарифу. */
  readonly normalizedIsEstimate: boolean;
}

export interface TariffPartCalculation {
  readonly source: TariffPart;
  readonly months: number;
  readonly normalizedPerSotkaMonth: number;
}

/** Промежуточный расчет для mapper-а и пояснения; не входит в данные поселка. */
export interface TariffCalculation {
  readonly lotSotka: number;
  readonly parts: readonly TariffPartCalculation[];
  readonly normalizedPerSotkaMonth: number;
  readonly normalizedIsEstimate: boolean;
}

export interface Lots {
  readonly count?: number;
  readonly areaHa?: number;
  /** Средний размер участка в продаже в сотках. */
  readonly averageSotka?: number;
  readonly averageNote?: string;
}

export interface Infrastructure {
  readonly roads?: RoadType;
  readonly sidewalks?: AvailabilityStatus;
  readonly lighting?: AvailabilityStatus;
  readonly gas?: AvailabilityStatus;
  readonly water?: AvailabilityStatus;
  readonly sewage?: AvailabilityStatus;
  readonly drainage?: DrainageType;
  readonly checkpoints?: AvailabilityStatus;
  readonly security?: AvailabilityStatus;
  readonly fencing?: AvailabilityStatus;
  readonly videoSurveillance?: VideoSurveillance;
  readonly undergroundElectricity?: UndergroundElectricity;
  readonly adminBuilding?: AvailabilityStatus;
  readonly retailOrServices?: AvailabilityStatus;
}

export interface CommonSpaces {
  readonly playgrounds?: AvailabilityStatus;
  readonly sports?: AvailabilityStatus;
  readonly pool?: AvailabilityStatus;
  readonly fitnessClub?: AvailabilityStatus;
  readonly restaurant?: AvailabilityStatus;
  readonly spaCenter?: AvailabilityStatus;
  readonly walkingRoutes?: AvailabilityStatus;
  readonly waterAccess?: AvailabilityStatus;
  readonly beachZones?: AvailabilityStatus;
  readonly kidsClub?: AvailabilityStatus;
  readonly sportsCamp?: AvailabilityStatus;
  readonly primarySchool?: AvailabilityStatus;
  readonly clubInfrastructure?: AvailabilityStatus;
  readonly bbqZones?: AvailabilityStatus;
}

export interface ServiceModel {
  readonly garbageCollection?: AvailabilityStatus;
  readonly snowRemoval?: AvailabilityStatus;
  readonly roadCleaning?: AvailabilityStatus;
  readonly landscaping?: AvailabilityStatus;
  readonly emergencyService?: AvailabilityStatus;
  readonly dispatcher?: AvailabilityStatus;
}

export interface Source {
  readonly title: string;
  readonly url: string;
  readonly type: SourceType;
  /** Дата проверки источника в формате ISO. */
  readonly dateChecked: string;
  readonly comment: string;
}

export interface ManagementCompany {
  readonly title: string;
  readonly url?: string;
}

export interface Settlement {
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
  readonly website: string;
  readonly telegram?: string;
  readonly managementCompany?: ManagementCompany;
  /** Отмечает базовый поселок для расчетов сравнения. */
  readonly isBaseline: boolean;
  readonly location: Location;
  readonly tariff: Tariff;
  readonly lots?: Lots;
  readonly waterInTariff?: boolean;
  /** Редакционный флаг для ограничительных правил сервисных договоров. */
  readonly rabstvo?: boolean;
  readonly infrastructure: Infrastructure;
  readonly commonSpaces: CommonSpaces;
  readonly serviceModel: ServiceModel;
  readonly sources: readonly Source[];
}

export interface Stats {
  readonly shelkovoTariff: number;
  readonly medianTariff: number;
  readonly peerMedianTariff: number;
  readonly meanTariff: number;
  readonly minTariff: number;
  readonly maxTariff: number;
  readonly shelkovoRank: number;
  readonly totalSettlements: number;
  readonly cheaperCount: number;
  readonly moreExpensiveCount: number;
  readonly shelkovoVsMedianPercent: number;
  readonly shelkovoVsPeerMedianPercent: number;
  readonly shelkovoVsMeanPercent: number;
}

export interface ComparisonResult {
  readonly tariffDelta: number;
  readonly tariffDeltaPercent: number;
  readonly isCheaper: boolean;
}
