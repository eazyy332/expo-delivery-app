import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Truck, Package, CheckCircle, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedPickups: 0,
    completedDeliveries: 0,
    inProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState('Chauffeur');

  useEffect(() => {
    loadStats();
    loadDriverInfo();
  }, []);

  const loadDriverInfo = async () => {
    try {
      const { getCurrentDriverName } = await import('@/lib/auth');
      const name = await getCurrentDriverName();
      setDriverName(name);
    } catch (error) {
      console.error('Error loading driver info:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Always use mock data for testing
      const { mockOrders } = await import('@/lib/mockData');
      
      if (mockOrders.length > 0) {
        const totalOrders = mockOrders.length;
        const completedPickups = mockOrders.filter(o => 
          o.status === 'scanned' || o.status === 'in_transit_to_customer' || o.status === 'delivered'
        ).length;
        const completedDeliveries = mockOrders.filter(o => o.status === 'delivered').length;
        const inProgress = mockOrders.filter(o => 
          o.status === 'scanned' || o.status === 'in_transit_to_facility' || o.status === 'in_transit_to_customer'
        ).length;

        console.log('Loaded mock stats:', { totalOrders, completedPickups, completedDeliveries, inProgress });
        setStats({
          totalOrders,
          completedPickups,
          completedDeliveries,
          inProgress,
        });
      } else {
        setStats({
          totalOrders: 0,
          completedPickups: 0,
          completedDeliveries: 0,
          inProgress: 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalOrders: 0,
        completedPickups: 0,
        completedDeliveries: 0,
        inProgress: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon, 
    title, 
    value, 
    color 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: number; 
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welkom terug!</Text>
          <Text style={styles.driverName}>{driverName}</Text>
          <TouchableOpacity style={styles.testStatsButton} onPress={loadStats}>
            <Text style={styles.testStatsButtonText}>Test Stats</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.logoContainer}>
          <Truck size={32} color="#3b82f6" />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vandaag's Overzicht</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Package size={24} color="#3b82f6" />}
              title="Totaal Orders"
              value={stats.totalOrders}
              color="#3b82f6"
            />
            <StatCard
              icon={<Truck size={24} color="#f59e0b" />}
              title="Opgehaald"
              value={stats.completedPickups}
              color="#f59e0b"
            />
            <StatCard
              icon={<CheckCircle size={24} color="#10b981" />}
              title="Afgeleverd"
              value={stats.completedDeliveries}
              color="#10b981"
            />
            <StatCard
              icon={<Clock size={24} color="#8b5cf6" />}
              title="In Behandeling"
              value={stats.inProgress}
              color="#8b5cf6"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snelle Acties</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/facility')}>
            <View style={styles.actionIcon}>
              <Package size={20} color="#3b82f6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Scan Orders bij Facility</Text>
              <Text style={styles.actionDescription}>Begin je route door orders te scannen</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/route')}>
            <View style={styles.actionIcon}>
              <Truck size={20} color="#10b981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Bekijk Route</Text>
              <Text style={styles.actionDescription}>Zie je geplande stops voor vandaag</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  testStatsButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  testStatsButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
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
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
});