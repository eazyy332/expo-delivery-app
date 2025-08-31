import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  MapPin
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getCurrentDriverId } from '@/lib/auth';

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await getCurrentDriverId();
      setDriverId(id);
      if (id) {
        await loadOrdersForDate(selectedDate, id);
      }
    })();
  }, []);

  useEffect(() => {
    if (driverId) {
      loadOrdersForDate(selectedDate, driverId);
    }
  }, [selectedDate, driverId]);

  const loadOrdersForDate = async (date: Date, id?: string) => {
    try {
      setLoading(true);
      const driver = id || driverId;
      if (!driver) return;

      const dateStr = date.toISOString().split('T')[0];
      const { data: dayOrders, error } = await supabase
        .from('orders')
        .select('*')
        .or(`assigned_pickup_driver_id.eq.${driver},assigned_dropoff_driver_id.eq.${driver}`)
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lte('created_at', `${dateStr}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(dayOrders || []);
    } catch (error) {
      console.error('Error loading orders for date:', error);
      Alert.alert('Fout', 'Kon bestellingen niet laden voor deze datum.');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setSelectedDate(prevDate);
  };

  const goToNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Vandaag';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gisteren';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    } else {
      return date.toLocaleDateString('nl-NL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready_for_delivery':
        return <Package size={20} color="#3b82f6" />;
      case 'scanned':
        return <Clock size={20} color="#f59e0b" />;
      case 'in_transit_to_facility':
        return <Truck size={20} color="#8b5cf6" />;
      case 'arrived_at_facility':
        return <MapPin size={20} color="#8b5cf6" />;
      case 'delivered':
        return <CheckCircle size={20} color="#10b981" />;
      default:
        return <Package size={20} color="#64748b" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready_for_delivery':
        return 'Klaar voor ophaling';
      case 'scanned':
        return 'Gescand';
      case 'in_transit_to_facility':
        return 'Onderweg naar facility';
      case 'arrived_at_facility':
        return 'Aangekomen bij facility';
      case 'delivered':
        return 'Afgeleverd';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready_for_delivery':
        return '#3b82f6';
      case 'scanned':
        return '#f59e0b';
      case 'in_transit_to_facility':
        return '#8b5cf6';
      case 'arrived_at_facility':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const OrderCard = ({ order }: { order: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{order.order_number}</Text>
          <Text style={styles.customerName}>{order.customer_name}</Text>
          <View style={styles.addressContainer}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.address}>{order.shipping_address}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(order.status)}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>
      </View>
      
      {order.estimated_pickup_time && (
        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Geschatte tijd:</Text>
          <Text style={styles.timeValue}>
            {new Date(order.estimated_pickup_time).toLocaleTimeString('nl-NL', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      )}
    </View>
  );

  const stats = {
    total: orders.length,
    ready: orders.filter(o => o.status === 'ready_for_delivery').length,
    inProgress: orders.filter(o => 
      ['scanned', 'in_transit_to_facility', 'arrived_at_facility'].includes(o.status)
    ).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>Bekijk je bestellingen per dag</Text>
      </View>

      <View style={styles.dateNavigation}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousDay}>
          <ChevronLeft size={20} color="#3b82f6" />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Calendar size={20} color="#3b82f6" />
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <Text style={styles.dateSubtext}>
            {selectedDate.toLocaleDateString('nl-NL', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.navButton} onPress={goToNextDay}>
          <ChevronRight size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
        <Text style={styles.todayButtonText}>Vandaag</Text>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Totaal</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.ready}</Text>
          <Text style={styles.statLabel}>Klaar</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>Bezig</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Klaar</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Laden...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={64} color="#64748b" />
            <Text style={styles.emptyStateTitle}>Geen bestellingen</Text>
            <Text style={styles.emptyStateText}>
              Er zijn geen bestellingen voor {formatDate(selectedDate).toLowerCase()}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
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
    textAlign: 'center',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  dateSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  todayButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 16,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'left',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textAlign: 'left',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
    textAlign: 'left',
  },
  statusContainer: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
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
  },
});
