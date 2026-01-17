
import { apiClient } from './client';

export interface UserCreateData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userType: string;
  nic?: string;
  birthCertificateNo?: string;
  dateOfBirth: string;
  gender: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  imageUrl?: string;
  idUrl?: string;
  isActive?: boolean;
  subscriptionPlan?: string;
  paymentExpiresAt?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: string;
  dateOfBirth: string;
  gender: string;
  imageUrl?: string;
  telegramId?: string;
  rfid?: string;
  isActive: boolean;
  subscriptionPlan: string;
  paymentExpiresAt?: string;
  createdAt: string;
}

export interface BasicUser {
  id: string;
  imageUrl?: string;
  fullName: string;
  userType: string;
}

export const usersApi = {
  create: async (data: UserCreateData): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  
  getBasicInfo: async (userId: string): Promise<BasicUser> => {
    const response = await apiClient.get(`/users/basic/${userId}`);
    return response;
  },

  getBasicInfoByRfid: async (rfid: string): Promise<BasicUser> => {
    const response = await apiClient.get(`/users/basic/rfid/${rfid}`);
    return response;
  }
};
