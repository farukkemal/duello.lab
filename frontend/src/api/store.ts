import api from './axios';
import { type UserDto } from './auth';

export interface StoreProduct {
  id: string;
  name: string;
  category: 'coins' | 'powerup' | 'cosmetic';
  coinAmount: number;
  bonusCoins: number;
  priceTry: number;
  costCoins: number;
  icon: string;
  description: string;
  tag: string;
}

export interface DailyChestResult {
  coinsWon: number;
  xpWon: number;
  message: string;
  user: UserDto;
}

export const getStoreProducts = () =>
  api.get<StoreProduct[]>('/store/products');

export const buyCoinPack = (packId: string) =>
  api.post<UserDto>('/store/buy-pack', { packId });

export const buyStoreItem = (itemId: string) =>
  api.post<UserDto>('/store/buy-item', { itemId });

export const openDailyChest = () =>
  api.post<DailyChestResult>('/store/daily-chest');
