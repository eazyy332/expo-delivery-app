import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order } from '@/types/database';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Navigation, 
  Phone, 
  Printer, 
  Camera, 
  Scan 
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { printQRLabel } from '@/components/QRLabelPrinter';
import { getCurrentDriverId } from '@/lib/auth';
import { canCompletePickup, canCompleteDelivery } from '@/lib/statusTransitions';

export default function CurrentScreen() {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [actionType, setActionType] = useState<'pickup' | 'dropoff'>('pickup');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [permission, setPermission] = useState<{ granted: boolean } | null>(null);

  useEffect(() => {
    const initializeDriver = async () => {
      try {
        const driverIdFromAuth = await getCurrentDriverId();
        if (driverIdFromAuth) {
          setDriverId(driverIdFromAuth);
        }
      } catch (error) {
        console.error('Error initializing driver:', error);
      }
    };

    const requestCameraPermission = async () => {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      setPermission({ granted: result.status === 'granted' });
    };

    initializeDriver();
    requestCameraPermission();
  }, []);

  useEffect(() => {
    if (driverId) {
      loadCurrentOrder();
      const channel = supabase
        .channel(`current-order-${driverId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `or(assigned_pickup_driver_id.eq.${driverId},assigned_dropoff_driver_id.eq.${driverId})`,
        }, () => {
          loadCurrentOrder();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [driverId]);

  const uploadPhoto = async (uri: string, fileName: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage
      .from('order-photos')
      .upload(`${driverId}/${fileName}`, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('order-photos')
      .getPublicUrl(data.path);
    return publicUrl;
  };

  const makePhoneCall = (phoneNumber: string) => {
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Bel Functie', `Bel nummer: ${phoneNumber}`, [
        { text: 'OK' }
      ]);
    }
  };

  const loadCurrentOrder = async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .or(`assigned_pickup_driver_id.eq.${driverId},assigned_dropoff_driver_id.eq.${driverId}`)
        .in('status', ['ready_for_delivery', 'scanned', 'in_transit_to_facility', 'arrived_at_facility'])
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      const order = orders && orders[0];
      setCurrentOrder(order || null);
      if (order) {
        // Determine action type based on status and order type
        if (order.type === 'pickup') {
          if (order.status === 'ready_for_delivery' || order.status === 'scanned') {
            setActionType('pickup');
          } else if (order.status === 'in_transit_to_facility') {
            setActionType('pickup'); // Still pickup until arrived at facility
          } else if (order.status === 'arrived_at_facility') {
            setActionType('dropoff'); // Now ready for dropoff
          } else {
            setActionType('pickup');
          }
        } else if (order.type === 'delivery') {
          if (order.status === 'ready_for_delivery' || order.status === 'scanned') {
            setActionType('pickup'); // Pickup from facility
          } else if (order.status === 'in_transit_to_facility') {
            setActionType('pickup'); // Still pickup until arrived
          } else if (order.status === 'arrived_at_facility') {
            setActionType('dropoff'); // Now ready for delivery
          } else {
            setActionType('dropoff');
          }
        } else {
          // Fallback logic based on status only
          if (order.status === 'ready_for_delivery' || order.status === 'scanned') {
            setActionType('pickup');
          } else if (order.status === 'arrived_at_facility') {
            setActionType('dropoff');
          } else {
            setActionType('pickup');
          }
        }
        
        // Log status for debugging
        console.log(`Order ${order.order_number} status: ${order.status}, type: ${order.type}, action: ${actionType}`);
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Fout', 'Kon huidige bestelling niet laden.');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera Niet Beschikbaar', 'Foto maken is niet beschikbaar op web. Gebruik de mobiele app.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming Vereist', 'Camera toegang is nodig om foto\'s te maken');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePrintQRLabel = async () => {
    if (!currentOrder) return;
    try {
      await printQRLabel({
        orderNumber: currentOrder.order_number,
        qrCode: currentOrder.qr_code || currentOrder.order_number,
        customerName: currentOrder.customer_name,
      });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Fout', 'Kon QR label niet printen');
    }
  };

  const uploadPhotoToSupabase = async (uri: string, fileName: string): Promise<string | null> => {
    setUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadPhoto(uri, fileName);
      return uploadedUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Fout', 'Kon foto niet uploaden naar server');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const completePickup = async () => {
    if (!currentOrder || !photoUri) {
      Alert.alert('Fout', 'Foto is vereist voor pickup bevestiging');
      return;
    }
    setLoading(true);
    try {
      const uploadedPhotoUrl = await uploadPhotoToSupabase(
        photoUri,
        `pickup_${currentOrder.order_number}_${Date.now()}`
      );
      if (!uploadedPhotoUrl && Platform.OS !== 'web') {
        Alert.alert('Fout', 'Kon foto niet uploaden. Probeer opnieuw.');
        return;
      }
      // Determine correct status based on order type
      const newStatus = 'in_transit_to_facility';
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          pickup_photo_url: uploadedPhotoUrl || photoUri,
          pickup_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentOrder.id);
      if (error) throw error;
      Alert.alert('Succes', 'Pickup succesvol voltooid!', [
        { text: 'OK', onPress: () => { setPhotoUri(null); loadCurrentOrder(); } }
      ]);
    } catch (error) {
      console.error('Error completing pickup:', error);
      Alert.alert('Fout', 'Kon pickup niet voltooien');
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return { granted: status === 'granted' };
  };

  const handleQRScan = async (data: string) => {
    if (!currentOrder) return;
    if (data === currentOrder.qr_code || data === currentOrder.order_number) {
      setShowScanner(false);
      if (actionType === 'pickup') {
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status: 'scanned', updated_at: new Date().toISOString() })
            .eq('id', currentOrder.id);
          if (error) throw error;
          Alert.alert('Succes', 'QR code succesvol gescand! U kunt nu de pickup voltooien.');
          loadCurrentOrder();
        } catch (error) {
          console.error('Error updating order:', error);
          Alert.alert('Fout', 'QR code gescand maar kon status niet bijwerken.');
        }
      } else {
        Alert.alert('Succes', 'QR code succesvol geverifieerd voor aflevering!');
      }
    } else {
      Alert.alert('Fout', 'QR code komt niet overeen met huidige bestelling', [
        { text: 'Opnieuw Scannen', onPress: () => {} },
        { text: 'Annuleren', onPress: () => setShowScanner(false) }
      ]);
    }
  };

  const completeDropoff = async () => {
    if (!currentOrder) return;
    setLoading(true);
    try {
              // Check if status transition is valid
        if (!canCompleteDelivery(currentOrder.status)) {
          Alert.alert('Fout', `Kan order niet afleveren vanuit status: ${currentOrder.status}`);
          setLoading(false);
          return;
        }

      const updates: any = {
        status: 'delivered',
        updated_at: new Date().toISOString(),
      };
      if (recipientName) updates.recipient_name = recipientName;
      if (photoUri) {
        const uploadedPhotoUrl = await uploadPhotoToSupabase(
          photoUri,
          `delivery_${currentOrder.order_number}_${Date.now()}`
        );
        updates.delivery_photo_url = uploadedPhotoUrl || photoUri;
      }
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', currentOrder.id);
      if (error) throw error;
      Alert.alert('Succes', 'Aflevering succesvol voltooid!');
      setRecipientName('');
      setPhotoUri(null);
      loadCurrentOrder();
    } catch (error) {
      console.error('Error completing dropoff:', error);
      Alert.alert('Fout', 'Kon aflevering niet voltooien');
    } finally {
      setLoading(false);
    }
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera Niet Beschikbaar', 'QR scanning is niet beschikbaar op web.');
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Toestemming Vereist', 'Camera toestemming is nodig om QR codes te scannen');
        return;
      }
    }
    setShowScanner(true);
  };

  if (!driverId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyState}>
          <CheckCircle size={64} color="#64748b" />
          <Text style={styles.emptyStateTitle}>Geen chauffeur gevonden</Text>
          <Text style={styles.emptyStateText}>Log opnieuw in.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showScanner && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.scannerHeader}>
          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.closeScannerText}>Sluiten</Text>
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Verifieer QR Code</Text>
        </View>
        
        <CameraView
          style={styles.scanner}
          facing="back"
          onBarcodeScanned={({ data }) => handleQRScan(data)}
        >
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={styles.scannerCorner} />
              <View style={[styles.scannerCorner, styles.topRight]} />
              <View style={[styles.scannerCorner, styles.bottomLeft]} />
              <View style={[styles.scannerCorner, styles.bottomRight]} />
            </View>
            <Text style={styles.scannerInstructions}>
              Scan de QR-code op de tas
            </Text>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  if (!currentOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyState}>
          <CheckCircle size={64} color="#10b981" />
          <Text style={styles.emptyStateTitle}>Geen actieve orders</Text>
          <Text style={styles.emptyStateText}>Er zijn geen orders voor vandaag</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadCurrentOrder}>
            <Text style={styles.refreshButtonText}>Vernieuwen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.actionTypeContainer}>
            {actionType === 'pickup' ? (
              <Package size={24} color="#f59e0b" />
            ) : (
              <Truck size={24} color="#10b981" />
            )}
            <Text style={styles.actionType}>
              {actionType === 'pickup' ? 'OPHALEN' : 'AFLEVEREN'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={loadCurrentOrder}>
            <Text style={styles.refreshButtonText}>Vernieuw</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Huidige Stop</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.customerName}>{currentOrder.customer_name}</Text>
            <Text style={styles.orderId}>#{currentOrder.order_number}</Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Navigation size={16} color="#64748b" />
            <Text style={styles.address}>{currentOrder.shipping_address}</Text>
          </View>

          {currentOrder.phone && (
            <TouchableOpacity 
              style={styles.phoneContainer}
              onPress={() => makePhoneCall(currentOrder.phone!)}
            >
              <Phone size={16} color="#3b82f6" />
              <Text style={styles.phoneNumber}>{currentOrder.phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {actionType === 'pickup' && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Pickup Acties</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePrintQRLabel}
            >
              <Printer size={20} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Print QR Label</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, uploadingPhoto && styles.actionButtonDisabled]} 
              onPress={takePhoto}
              disabled={uploadingPhoto}
            >
              <Camera size={20} color="#3b82f6" />
              <Text style={styles.actionButtonText}>
                {uploadingPhoto ? 'Uploading...' : photoUri ? 'Foto Genomen ✓' : 'Maak Foto van Tas'}
              </Text>
            </TouchableOpacity>

            {photoUri && (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.retakeButton}
                  onPress={takePhoto}
                >
                  <Camera size={16} color="#6b7280" />
                  <Text style={styles.retakeButtonText}>Opnieuw</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.completeButton, (!photoUri || loading || uploadingPhoto) && styles.completeButtonDisabled]}
              onPress={completePickup}
              disabled={!photoUri || loading || uploadingPhoto}
            >
              <CheckCircle size={20} color="#ffffff" />
              <Text style={styles.completeButtonText}>
                {loading ? 'Bezig...' : 'Bevestig Pickup'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {actionType === 'dropoff' && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Drop-off Acties</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={openScanner}>
              <Scan size={20} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Scan QR Code</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ontvanger (optioneel):</Text>
              <TextInput
                style={styles.textInput}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Naam van ontvanger"
              />
            </View>

            <TouchableOpacity 
              style={[styles.actionButton, uploadingPhoto && styles.actionButtonDisabled]} 
              onPress={takePhoto}
              disabled={uploadingPhoto}
            >
              <Camera size={20} color="#3b82f6" />
              <Text style={styles.actionButtonText}>
                {uploadingPhoto ? 'Uploading...' : photoUri ? 'Afleverfoto Genomen ✓' : 'Afleverfoto (optioneel)'}
              </Text>
            </TouchableOpacity>

            {photoUri && (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.retakeButton}
                  onPress={takePhoto}
                >
                  <Camera size={16} color="#6b7280" />
                  <Text style={styles.retakeButtonText}>Opnieuw</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.completeButton, (loading || uploadingPhoto) && styles.completeButtonDisabled]}
              onPress={completeDropoff}
              disabled={loading || uploadingPhoto}
            >
              <CheckCircle size={20} color="#ffffff" />
              <Text style={styles.completeButtonText}>
                {loading ? 'Bezig...' : 'Bevestig Aflevering'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'stretch',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'left',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    flex: 1,
    textAlign: 'left',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },

  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  photoContainer: {
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retakeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Scanner styles
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  closeScannerButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeScannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#3b82f6',
    borderWidth: 4,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scannerInstructions: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
});