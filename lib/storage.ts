import { supabase } from './supabase';
import { Platform } from 'react-native';

export const uploadPhoto = async (uri: string, fileName: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      // For web, we'll return the URI as-is since we can't upload files easily
      console.warn('Photo upload not implemented for web platform');
      return uri;
    }

    // Convert URI to blob for upload
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a unique filename
    const timestamp = new Date().getTime();
    const fileExt = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${timestamp}_${fileName}.${fileExt}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('order-photos')
      .upload(`photos/${uniqueFileName}`, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      if (error.message.includes('Bucket not found')) {
        console.warn('Storage bucket "order-photos" not found. Please create it in your Supabase dashboard.');
        console.warn('For now, returning the local URI as fallback.');
        return uri; // Return local URI as fallback
      }
      console.error('Error uploading photo:', error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('order-photos')
      .getPublicUrl(`photos/${uniqueFileName}`);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadPhoto:', error);
    // Fallback to local URI if upload fails
    return uri;
  }
};

export const deletePhoto = async (url: string): Promise<boolean> => {
  try {
    // Extract filename from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const { error } = await supabase.storage
      .from('order-photos')
      .remove([`photos/${fileName}`]);

    if (error) {
      console.error('Error deleting photo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePhoto:', error);
    return false;
  }
};