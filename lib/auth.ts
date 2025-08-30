import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getCurrentDriverId = async (): Promise<string | null> => {
  try {
    const driverId = await AsyncStorage.getItem('driver_id');
    
    // For testing, if no driver ID is set, return demo driver ID
    if (!driverId) {
      return 'demo-driver-001';
    }
    
    return driverId;
  } catch (error) {
    console.error('Error getting driver ID:', error);
    return 'demo-driver-001';
  }
};

export const getCurrentDriverName = async (): Promise<string> => {
  try {
    const driverName = await AsyncStorage.getItem('driver_name');
    
    // For testing, if no driver name is set, return demo driver name
    if (!driverName) {
      return 'Demo Chauffeur';
    }
    
    return driverName;
  } catch (error) {
    console.error('Error getting driver name:', error);
    return 'Demo Chauffeur';
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