export interface IEvent {
  id: string;
  name: string;
  description: string | null;
  venue: string;
  eventDate: string; // ISO 8601
  totalCapacity: number;
  availableTickets: number;
  createdAt: string;
}

