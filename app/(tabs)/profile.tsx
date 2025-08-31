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
  User, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Settings,
  LogOut 
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getCurrentDriverId, getCurrentDriverName } from '@/lib/auth';

export default function ProfileScreen() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedPickups: 0,
    completedDeliveries: 0,
    inProgress: 0,
  });
  const [driverName, setDriverName] = useState('Chauffeur');
  const [driverEmail, setDriverEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const driverId = await getCurrentDriverId();
      if (!driverId) {
        setStats({ totalOrders: 0, completedPickups: 0, completedDeliveries: 0, inProgress: 0 });
        return;
      }

      // Get driver info from auth
      const name = await getCurrentDriverName();
      setDriverName(name);
      
      // Get driver email from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      setDriverEmail(user?.email || '');

      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .or(`assigned_pickup_driver_id.eq.${driverId},assigned_dropoff_driver_id.eq.${driverId}`)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const completedPickups = orders?.filter(o => 
        o.status === 'scanned' || o.status === 'delivered'
      ).length || 0;
      const completedDeliveries = orders?.filter(o => o.status === 'delivered').length || 0;
      const inProgress = orders?.filter(o => 
        o.status === 'scanned' || o.status === 'in_transit_to_facility' || o.status === 'arrived_at_facility'
      ).length || 0;

      setStats({
        totalOrders,
        completedPickups,
        completedDeliveries,
        inProgress,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
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

  const handleLogout = async () => {
    Alert.alert(
      'Uitloggen',
      'Weet je zeker dat je wilt uitloggen?',
      [
        { text: 'Annuleren', style: 'cancel' },
        { 
          text: 'Uitloggen', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { signOut } = await import('@/lib/auth');
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Fout', 'Kon niet uitloggen. Probeer opnieuw.');
            }
          }
        }
      ]
    );
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
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <User size={32} color="#ffffff" />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverTitle}>Eazyy Chauffeur</Text>
            {driverEmail && <Text style={styles.driverEmail}>{driverEmail}</Text>}
          </View>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vandaag's Statistieken</Text>
          
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
          <Text style={styles.sectionTitle}>Instellingen</Text>
          
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Settings size={20} color="#64748b" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>App Instellingen</Text>
              <Text style={styles.actionDescription}>Pas je voorkeuren aan</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleLogout}>
            <View style={styles.actionIcon}>
              <LogOut size={20} color="#ef4444" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Uitloggen</Text>
              <Text style={styles.actionDescription}>Log uit van de app</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Eazyy Driver App v1.0.0</Text>
          <Text style={styles.footerText}>© 2025 Eazyy</Text>
        </View>
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
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'left',
  },
  driverTitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'left',
  },
  driverEmail: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'left',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    width: '100%',
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'left',
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
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
});