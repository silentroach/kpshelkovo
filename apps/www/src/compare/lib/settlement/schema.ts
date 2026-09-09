import type { z } from 'zod';

import {
  AvailabilityStatusEnum as RawAvailabilityStatusSchema,
  CommonSpacesSchema as RawCommonSpacesSchema,
  DrainageTypeEnum as RawDrainageTypeSchema,
  InfrastructureSchema as RawInfrastructureSchema,
  LocationSchema as RawLocationSchema,
  LotsSchema as RawLotsSchema,
  ManagementCompanySchema as RawManagementCompanySchema,
  RoadTypeEnum as RawRoadTypeSchema,
  ServiceModelSchema as RawServiceModelSchema,
  SettlementSchema as RawSettlementSchema,
  SourceSchema as RawSourceSchema,
  SourceTypeEnum as RawSourceTypeSchema,
  TariffPeriodEnum as RawTariffPeriodSchema,
  TariffSchema as RawTariffSchema,
  TariffUnitEnum as RawTariffUnitSchema,
  TelegramSchema as RawTelegramSchema,
  UndergroundElectricityEnum as RawUndergroundElectricitySchema,
  VideoSurveillanceEnum as RawVideoSurveillanceSchema
} from '../schema';

export {
  RawAvailabilityStatusSchema,
  RawCommonSpacesSchema,
  RawDrainageTypeSchema,
  RawInfrastructureSchema,
  RawLocationSchema,
  RawLotsSchema,
  RawManagementCompanySchema,
  RawRoadTypeSchema,
  RawServiceModelSchema,
  RawSettlementSchema,
  RawSourceSchema,
  RawSourceTypeSchema,
  RawTariffPeriodSchema,
  RawTariffSchema,
  RawTariffUnitSchema,
  RawTelegramSchema,
  RawUndergroundElectricitySchema,
  RawVideoSurveillanceSchema
};

export type RawAvailabilityStatus = z.output<typeof RawAvailabilityStatusSchema>;
export type RawCommonSpaces = z.output<typeof RawCommonSpacesSchema>;
export type RawDrainageType = z.output<typeof RawDrainageTypeSchema>;
export type RawInfrastructure = z.output<typeof RawInfrastructureSchema>;
export type RawLocation = z.output<typeof RawLocationSchema>;
export type RawLots = z.output<typeof RawLotsSchema>;
export type RawManagementCompany = z.output<typeof RawManagementCompanySchema>;
export type RawRoadType = z.output<typeof RawRoadTypeSchema>;
export type RawServiceModel = z.output<typeof RawServiceModelSchema>;
export type RawSettlement = z.output<typeof RawSettlementSchema>;
export type RawSource = z.output<typeof RawSourceSchema>;
export type RawSourceType = z.output<typeof RawSourceTypeSchema>;
export type RawTariff = z.output<typeof RawTariffSchema>;
export type RawTariffPeriod = z.output<typeof RawTariffPeriodSchema>;
export type RawTariffUnit = z.output<typeof RawTariffUnitSchema>;
export type RawTelegram = z.output<typeof RawTelegramSchema>;
export type RawUndergroundElectricity = z.output<typeof RawUndergroundElectricitySchema>;
export type RawVideoSurveillance = z.output<typeof RawVideoSurveillanceSchema>;
