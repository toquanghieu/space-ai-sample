/** Human-readable labels for machine metric/dimension keys, shared by charts and tables. */
export const LABELS: Record<string, string> = {
  order_count: 'Orders',
  delivered_count: 'Delivered',
  delayed_count: 'Delayed',
  on_time_rate: 'On-time rate',
  avg_delivery_days: 'Avg delivery (days)',
  total_quantity: 'Total quantity',
  total_order_value: 'Order value (USD)',
  value: 'Quantity',
  period: 'Period',
  carrier: 'Carrier',
  region: 'Region',
  status: 'Status',
  product_category: 'Category',
  destination_city: 'Destination',
  warehouse: 'Warehouse',
  client_id: 'Client',
  sku: 'SKU',
};

export const labelFor = (key: string): string => LABELS[key] ?? key;
