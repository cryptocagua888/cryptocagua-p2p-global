export enum OfferType {
  BUY = 'COMPRA',
  SELL = 'VENTA',
  EXCHANGE = 'INTERCAMBIO'
}

export enum AssetCategory {
  CRYPTO = 'Criptomonedas',
  FIAT = 'Moneda Fiat',
  GOODS = 'Bienes Físicos',
  SERVICES = 'Servicios',
  DIGITAL = 'Activos Digitales'
}

export type OfferStatus = 'PENDING' | 'APPROVED';

export interface Offer {
  id: string;
  type: OfferType;
  title: string;
  description: string;
  asset: string; // What is being offered/requested e.g., "Bitcoin", "iPhone 13"
  price: string; // e.g., "500 USD", "Market Price"
  location: string; // e.g., "Global", "Caracas, VE", "Madrid, ES"
  category: AssetCategory;
  createdAt: string;
  contactInfo: string;
  nickname: string; // New field for user alias
  status: OfferStatus;
  reputation?: number; // 1-5 stars
  verified?: boolean; // If the user is trusted
}

export interface ViewState {
  current: 'HOME' | 'MARKETPLACE' | 'CREATE' | 'CONFIG';
  detailsId?: string;
}