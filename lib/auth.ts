import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getCurrentDriverId = async (): Promise<string | null> => {
  try {
    const driverId = await AsyncStorage.getItem('driver_id');
    return driverId;
  } catch (error) {
    console.error('Error getting driver ID:', error);
    return null;
  }
};

export const getCurrentDriverName = async (): Promise<string> => {
  try {
    const driverName = await AsyncStorage.getItem('driver_name');
    return driverName || 'Chauffeur';
  } catch (error) {
    console.error('Error getting driver name:', error);
    return 'Chauffeur';
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const driverId = await getCurrentDriverId();
    return !!(session && driverId);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('driver_id');
    await AsyncStorage.removeItem('driver_name');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};