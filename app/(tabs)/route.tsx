import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Navigation, Package, Truck, X, CheckCircle } from 'lucide-react-native';

export default function RouteScreen() {
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<any | null>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [arrivedStopId, setArrivedStopId] = useState<string | null>(null);

  useEffect(() => {
    loadRoute();
  }, []);

  const loadRoute = async () => {
    try {
      setLoading(true);
      
      // Always use mock data for testing
      const { mockOrders } = await import('@/lib/mockData');
      
      if (mockOrders.length > 0) {
        const stops = mockOrders.map((order: any, index: number) => ({
          id: order.id,
          type: order.type || (order.status === 'ready_for_delivery' || order.status === 'scanned' ? 'pickup' : 'dropoff'),
          customerName: order.customer_name,
          address: order.shipping_address,
          estimatedTime: order.estimated_pickup_time ? 
            new Date(order.estimated_pickup_time).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) :
            `${9 + index}:${30 + (index * 30) % 60}`,
          orderNumber: order.order_number,
          status: order.status,
          phone: order.phone,
          qr_code: order.qr_code,
        }));

        setRouteStops(stops);
      } else {
        setRouteStops([]);
      }
    } catch (error) {
      console.error('Error loading route:', error);
      setRouteStops([]);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (address: string, stopId: string) => {
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(url);
    setActiveStopId(stopId);
    setArrivedStopId(null);
  };

  const markArrived = (stopId: string) => {
    setArrivedStopId(stopId);
  };

  const completePickup = async (stop: any) => {
    try {
      // For pickup, consider QR already verified at facility; mark as in_transit_to_customer
      updateLocalStatus(stop.id, 'in_transit_to_customer');
      Alert.alert('Pickup', `Order ${stop.orderNumber} opgehaald`);
      advanceToNext(stop.id);
    } catch (e) {
      console.error(e);
    }
  };

  const completeDelivery = async (stop: any) => {
    try {
      updateLocalStatus(stop.id, 'delivered');
      Alert.alert('Afgeleverd', `Order ${stop.orderNumber} afgeleverd`);
      advanceToNext(stop.id);
    } catch (e) {
      console.error(e);
    }
  };

  const updateLocalStatus = (orderId: string, newStatus: string) => {
    setRouteStops(prev => prev.map(s => s.id === orderId ? { ...s, status: newStatus, type: newStatus === 'in_transit_to_customer' ? 'dropoff' : s.type } : s));
  };

  const advanceToNext = (currentId: string) => {
    const idx = routeStops.findIndex(s => s.id === currentId);
    if (idx >= 0 && idx < routeStops.length - 1) {
      const next = routeStops[idx + 1];
      setActiveStopId(next.id);
      setArrivedStopId(null);
    } else {
      setActiveStopId(null);
      setArrivedStopId(null);
    }
    setSelectedStop(null);
  };

  const ArrivedFlow = ({ stop }: { stop: any }) => (
    <View style={styles.arrivedBar}>
      <Text style={styles.arrivedText}>Aangekomen bij: {stop.customerName}</Text>
      {stop.type === 'pickup' ? (
        <TouchableOpacity style={styles.arrivedAction} onPress={() => completePickup(stop)}>
          <CheckCircle size={16} color="#ffffff" />
          <Text style={styles.arrivedActionText}>Pickup bevestigen</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.arrivedAction} onPress={() => completeDelivery(stop)}>
          <CheckCircle size={16} color="#ffffff" />
          <Text style={styles.arrivedActionText}>Aflevering bevestigen</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const RouteStopCard = ({ 
    stop, 
    index 
  }: { 
    stop: any; 
    index: number 
  }) => (
    <View style={styles.stopCard}>
      <View style={styles.stopHeader}>
        <View style={[
          styles.stopNumber, 
          stop.type === 'pickup' ? styles.pickupNumber : styles.dropoffNumber
        ]}>
          <Text style={styles.stopNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.stopInfo}>
          <View style={styles.stopTypeContainer}>
            {stop.type === 'pickup' ? (
              <Package size={18} color="#f59e0b" />
            ) : (
              <Truck size={18} color="#10b981" />
            )}
            <Text style={[
              styles.stopType,
              stop.type === 'pickup' ? styles.pickupType : styles.dropoffType
            ]}>
              {stop.type === 'pickup' ? 'Ophalen' : 'Afleveren'}
            </Text>
          </View>
          <Text style={styles.customerName}>{stop.customerName}</Text>
          <Text style={styles.address}>{stop.address}</Text>
        </View>
      </View>
      
      <View style={styles.stopActions}>
        {arrivedStopId === stop.id ? (
          <ArrivedFlow stop={stop} />
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={() => openMaps(stop.address, stop.id)}>
            <Navigation size={16} color="#ffffff" />
            <Text style={styles.navButtonText}>Navigeer</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.detailsButton} onPress={() => setSelectedStop(stop)}>
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>
        {activeStopId === stop.id && arrivedStopId !== stop.id && (
          <TouchableOpacity style={styles.arrivedButton} onPress={() => markArrived(stop.id)}>
            <Text style={styles.arrivedButtonText}>Aangekomen</Text>
          </TouchableOpacity>
        )}
      </View>

      {stop.estimatedTime && (
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>Geschat: {stop.estimatedTime}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Jouw Route</Text>
        <Text style={styles.subtitle}>
          {routeStops.length} stops • Geoptimaliseerde volgorde
        </Text>
        <TouchableOpacity style={styles.testRouteButton} onPress={loadRoute}>
          <Text style={styles.testRouteButtonText}>Test Route</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Route laden...</Text>
          </View>
        ) : routeStops.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={64} color="#64748b" />
            <Text style={styles.emptyStateTitle}>Geen route stops</Text>
            <Text style={styles.emptyStateText}>
              Er zijn geen bestellingen toegewezen voor vandaag
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadRoute}>
              <Text style={styles.refreshButtonText}>Vernieuw</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.routeList}>
            {routeStops.map((stop, index) => (
              <RouteStopCard key={stop.id} stop={stop} index={index} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedStop} transparent animationType="slide" onRequestClose={() => setSelectedStop(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stop Details</Text>
              <TouchableOpacity onPress={() => setSelectedStop(null)}>
                <X size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>
            {selectedStop && (
              <View style={styles.modalBody}>
                <Text style={styles.modalRow}><Text style={styles.modalLabel}>Type: </Text>{selectedStop.type}</Text>
                <Text style={styles.modalRow}><Text style={styles.modalLabel}>Klant: </Text>{selectedStop.customerName}</Text>
                <Text style={styles.modalRow}><Text style={styles.modalLabel}>Adres: </Text>{selectedStop.address}</Text>
                <Text style={styles.modalRow}><Text style={styles.modalLabel}>Order: </Text>{selectedStop.orderNumber}</Text>
                <Text style={styles.modalRow}><Text style={styles.modalLabel}>Status: </Text>{selectedStop.status}</Text>
                {selectedStop.estimatedTime && (
                  <Text style={styles.modalRow}><Text style={styles.modalLabel}>Geschatte tijd: </Text>{selectedStop.estimatedTime}</Text>
                )}
                {selectedStop.phone && (
                  <Text style={styles.modalRow}><Text style={styles.modalLabel}>Telefoon: </Text>{selectedStop.phone}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  testRouteButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  testRouteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  routeList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stopCard: {
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
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stopNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pickupNumber: {
    backgroundColor: '#f59e0b',
  },
  dropoffNumber: {
    backgroundColor: '#10b981',
  },
  stopNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopInfo: {
    flex: 1,
  },
  stopTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  stopType: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickupType: {
    color: '#f59e0b',
  },
  dropoffType: {
    color: '#10b981',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  address: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 8,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailsButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  arrivedButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  arrivedButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  timeInfo: {
    marginTop: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    gap: 6,
  },
  modalRow: {
    fontSize: 14,
    color: '#334155',
  },
  modalLabel: {
    fontWeight: '700',
    color: '#0f172a',
  },
  arrivedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
  },
  arrivedText: {
    color: '#92400e',
    fontWeight: '700',
    flex: 1,
  },
  arrivedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  arrivedActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});