/**
 * City entity - destination city reference data
 */
export interface City {
  id: string;
  name: string;
  nameEn?: string;
  timezone: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

/**
 * City input for creating a new city
 */
export type CreateCityInput = Omit<City, "id" | "createdAt">;

/**
 * City update input for partial updates
 */
export type UpdateCityInput = Partial<Omit<City, "id" | "createdAt">>;
