export interface SmmService {
  id: string;
  section: string;
  title: string;
  rawUnitPrice: number;
  rawPer1000: number;
  minQty: number;
  maxQty: number;
  quality: string;
  speed: string;
  guarantee: string;
  refill: string;
  compensation: string;
  cancelBtn: string;
  linkType: string;
  desc: string;
}

export interface SmmOrder {
  orderId: string;
  secretId: string;
  serviceId: string;
  serviceTitle: string;
  targetLink: string;
  quantity: number;
  completed: number;
  remains: number;
  costUsd: number;
  status: string;
  createdAt: string;
}

export interface SmsProvider {
  id: string;
  name: string;
  title: string;
  badge: string;
  desc: string;
  status: 'active' | 'degraded' | 'offline';
}

export interface CountryItem {
  id: string;
  name: string;
  title: string;
  flag: string;
  prefix: string;
  defaultRub: number;
}

export interface ServiceApp {
  code: string;
  name: string;
  short: string;
  iconName: string;
}
