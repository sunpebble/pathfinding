import type { TravelGuideAiDayDto } from './travel-guide';

type Assert<T extends true> = T;

export type TravelGuideAiDayUsesCanonicalDayNumber = Assert<
  'day_number' extends keyof TravelGuideAiDayDto ? true : false
>;

export type TravelGuideAiDayIncludesTitle = Assert<
  'title' extends keyof TravelGuideAiDayDto ? true : false
>;

export type TravelGuideAiDayOmitsLegacyDayNumber = Assert<
  'dayNumber' extends keyof TravelGuideAiDayDto ? false : true
>;
