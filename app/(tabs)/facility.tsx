import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Package, QrCode, CheckCircle, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { getCurrentDriverId } from '@/lib/auth';

export default function FacilityScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLock, setScanLock] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await getCurrentDriverId();
      setDriverId(id);
      await loadOrders(id || undefined);
    })();
  }, []);

  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`facility-orders-${driverId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `or(assigned_pickup_driver_id.eq.${driverId},assigned_dropoff_driver_id.eq.${driverId})`,
      }, () => {
        loadOrders(driverId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const openScanner = async () => {
    if (!permission || !permission.granted) {
      const perm = await requestPermission();
      if (!perm.granted) {
        Alert.alert('Camera', 'Cameratoestemming is vereist om te scannen.');
        return;
      }
    }
    setScanLock(false);
    setShowScanner(true);
  };

  const closeScanner = () => setShowScanner(false);

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLock) return;
    setScanLock(true);

    try {
      const id = driverId || (await getCurrentDriverId());
      if (!id) throw new Error('Geen chauffeur');

      const today = new Date().toISOString().split('T')[0];
      const { data: matchOrders, error } = await supabase
        .from('orders')
        .select('*')
        .or(`assigned_pickup_driver_id.eq.${id},assigned_dropoff_driver_id.eq.${id}`)
        .in('status', ['ready_for_delivery'])
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .or(`qr_code.eq.${data},order_number.eq.${data}`);

      if (error) throw error;
      const match = (matchOrders || [])[0];
      if (!match) {
        Alert.alert('Niet gevonden', 'QR komt niet overeen met een te scannen order.');
        setScanLock(false);
        return;
      }

      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: 'scanned', updated_at: new Date().toISOString() })
        .eq('id', match.id);
      if (updErr) throw updErr;

      setShowScanner(false);
      Alert.alert('Succes', `Bestelling ${match.order_number} is gescand!`);
    } catch (e) {
      console.error(e);
      Alert.alert('Fout', 'Scannen mislukt, probeer opnieuw.');
      setScanLock(false);
    }
  };

  const loadOrders = async (id?: string) => {
    try {
      setLoading(true);
      const driver = id || (await getCurrentDriverId());
      if (!driver) {
        setOrders([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: facilityOrders, error } = await supabase
        .from('orders')
        .select('*')
        .or(`assigned_pickup_driver_id.eq.${driver},assigned_dropoff_driver_id.eq.${driver}`)
        .in('status', ['ready_for_delivery', 'scanned'])
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(facilityOrders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Fout', 'Kon bestellingen niet laden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(driverId || undefined);
  };

        const readyOrders = orders.filter(order => order.status === 'ready_for_delivery');
      const scannedOrders = orders.filter(order => order.status === 'scanned');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Facility Pickup</Text>
        <Text style={styles.subtitle}>Scan jouw toegewezen orders</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Te scannen ({readyOrders.length})</Text>
            {readyOrders.length > 0 && (
              <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
                <QrCode size={16} color="#ffffff" />
                <Text style={styles.scanButtonText}>Scan QR</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {readyOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color="#64748b" />
              <Text style={styles.emptyStateTitle}>Geen orders te scannen</Text>
              <Text style={styles.emptyStateText}>
                Alle jouw orders zijn gescand of er zijn geen orders voor vandaag!
              </Text>
            </View>
          ) : (
            readyOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.customerName}>{order.customer_name}</Text>
                    <Text style={styles.address}>{order.shipping_address}</Text>
                    <Text style={styles.orderNumber}>#{order.order_number}</Text>
                  </View>
                  <QrCode size={24} color="#3b82f6" />
                </View>
                <View style={styles.orderFooter}>
                  <View style={[styles.statusBadge, styles.readyBadge]}>
                    <Text style={[styles.statusText, styles.readyText]}>Te scannen</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {scannedOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gereed voor route ({scannedOrders.length})</Text>
            </View>
            
            {scannedOrders.map((order) => (
              <View key={order.id} style={[styles.orderCard, styles.scannedOrderCard]}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.customerName}>{order.customer_name}</Text>
                    <Text style={styles.address}>{order.shipping_address}</Text>
                    <Text style={styles.orderNumber}>#{order.order_number}</Text>
                  </View>
                  <CheckCircle size={24} color="#10b981" />
                </View>
                <View style={styles.orderFooter}>
                  <View style={[styles.statusBadge, styles.scannedBadge]}>
                    <Text style={[styles.statusText, styles.scannedText]}>Gescand</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {showScanner && (
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity onPress={closeScanner} style={styles.closeButton}>
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={styles.scannerBody}>
            <CameraView
              style={styles.cameraView}
              onBarcodeScanned={(result: { data: string }) => onBarcodeScanned({ data: result.data })}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
          </View>
        </View>
      )}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    width: '100%',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  scannedOrderCard: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'left',
  },
  address: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 4,
    textAlign: 'left',
  },
  orderNumber: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  readyBadge: {
    backgroundColor: '#dbeafe',
  },
  scannedBadge: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  readyText: {
    color: '#1e40af',
  },
  scannedText: {
    color: '#166534',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Scanner overlay styles
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },
  scannerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
  scannerBody: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  cameraView: {
    width: '100%',
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
  },
});