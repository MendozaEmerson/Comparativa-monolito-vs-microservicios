export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';

export interface IReservation {
  id: string;
  eventId: string;
  userId: string;
  ticketsCount: number;
  status: ReservationStatus;
  createdAt: string;
}

