import { IReservation } from '../models/reservation.model';

export interface CreateReservationRequestDTO {
  eventId: string;
  userId: string;
  tickets: number;
}

export type ReservationResponseDTO = IReservation;

