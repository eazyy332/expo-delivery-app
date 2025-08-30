export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  shipping_address: string;
  pickup_date: string;
  delivery_date?: string;
  status: 'ready_for_delivery' | 'scanned' | 'in_transit_to_facility' | 'delivered' | 'arrived_at_facility' | 'awaiting_pickup_customer' | 'in_transit_to_customer';
  qr_code: string;
  assigned_driver_id?: string;
  created_at: string;
  updated_at: string;
  internal_notes?: string;
  pickup_photo_url?: string;
  delivery_photo_url?: string;
  recipient_name?: string;
  type: 'pickup' | 'delivery';
  phone?: string;
  latitude?: string;
  longitude?: string;
  estimated_pickup_time?: string;
  estimated_dropoff_time?: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface RouteStop {
  id: string;
  order: Order;
  type: 'pickup' | 'dropoff';
  address: string;
  customer_name: string;
  estimated_time?: string;
  distance?: string;
}