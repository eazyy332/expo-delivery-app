/*
  # Create orders table for Eazyy driver app

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_name` (text, not null)
      - `customer_address` (text, not null)
      - `phone_number` (text, optional)
      - `delivery_date` (date, not null)
      - `pickup_date` (timestamptz, optional)
      - `status` (enum, default ready_for_delivery)
      - `qr_code` (text, unique)
      - `driver_id` (uuid, optional)
      - `order_type` (enum, pickup or dropoff)
      - `problem_notes` (text, optional)
      - `pickup_photo_url` (text, optional)
      - `delivery_photo_url` (text, optional)
      - `recipient_name` (text, optional)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

    - `drivers`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE order_status AS ENUM ('ready_for_delivery', 'scanned', 'in_transit_to_facility', 'delivered', 'arrived_at_facility');
CREATE TYPE order_type AS ENUM ('pickup', 'dropoff');

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  phone_number text,
  delivery_date date NOT NULL,
  pickup_date timestamptz,
  status order_status DEFAULT 'ready_for_delivery',
  qr_code text UNIQUE NOT NULL,
  driver_id uuid REFERENCES drivers(id),
  order_type order_type NOT NULL,
  problem_notes text,
  pickup_photo_url text,
  delivery_photo_url text,
  recipient_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for drivers
CREATE POLICY "Drivers can read own data"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Drivers can update own data"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for orders
CREATE POLICY "Anyone can read orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders (delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders (driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON orders (qr_code);

-- Insert some sample data for testing
INSERT INTO orders (customer_name, customer_address, phone_number, delivery_date, qr_code, order_type) VALUES
('Jan Jansen', 'Hoofdstraat 123, 1234 AB Amsterdam', '+31612345678', CURRENT_DATE, 'QR001', 'dropoff'),
('Marie Smit', 'Lange Voorhout 45, 2514 EC Den Haag', '+31687654321', CURRENT_DATE, 'QR002', 'pickup'),
('Piet de Vries', 'Kalverstraat 92, 1012 PH Amsterdam', '+31623456789', CURRENT_DATE, 'QR003', 'dropoff'),
('Lisa van den Berg', 'Breestraat 67, 2311 CS Leiden', '+31634567890', CURRENT_DATE, 'QR004', 'pickup'),
('Tom Bakker', 'Marktplein 15, 3511 LH Utrecht', '+31645678901', CURRENT_DATE, 'QR005', 'dropoff');