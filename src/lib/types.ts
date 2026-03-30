export type ItemCategory = "Furniture" | "Appliance" | "Misc";

export type ItemStatus = "available" | "pending" | "completed" | "missing";

export interface Item {
  id: string;
  imageUrls: string[];
  offerAmount: number;
  timeViewed: string;
  location: string;
  address?: string;
  category: ItemCategory;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  activeReservationId?: string;
}

export type ReservationStatus = "authorized" | "charged" | "released";

export interface Reservation {
  id: string;
  itemId: string;
  paymentIntentId: string;
  amount: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppStore {
  items: Item[];
  reservations: Reservation[];
}
