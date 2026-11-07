import { IEvent } from '../models/event.model';

export interface GetEventsQueryDTO {
  limit?: number;
  offset?: number;
  name?: string;
}

export interface PaginatedEventsResponseDTO {
  items: IEvent[];
  total: number;
  limit: number;
  offset: number;
}

