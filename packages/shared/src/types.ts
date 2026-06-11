export interface OrderRecord {
  client_id: string;
  order_id: string;
  order_date: string; // ISO yyyy-mm-dd
  delivery_date: string | null; // null when not delivered
  carrier: string;
  origin_city: string;
  destination_city: string;
  status: 'delivered' | 'delayed' | 'in_transit' | 'exception' | 'canceled';
  sku: string;
  product_category: string;
  quantity: number;
  unit_price_usd: number;
  order_value_usd: number;
  is_promo: boolean;
  promo_discount_pct: number;
  region: string;
  warehouse: string;
}

export type OrderStatus = OrderRecord['status'];

export type Metric =
  | 'order_count'
  | 'delivered_count'
  | 'delayed_count'
  | 'on_time_rate'
  | 'avg_delivery_days'
  | 'total_quantity'
  | 'total_order_value';

export type Dimension =
  | 'carrier'
  | 'region'
  | 'destination_city'
  | 'product_category'
  | 'status'
  | 'warehouse'
  | 'client_id'
  | 'sku';

export type TimeGrain = 'day' | 'week' | 'month';

export interface Filters {
  status?: OrderStatus[];
  carrier?: string[];
  region?: string[];
  product_category?: string[];
  sku?: string[];
  is_promo?: boolean;
  dateFrom?: string; // inclusive ISO date
  dateTo?: string; // inclusive ISO date
}

export interface QuerySpec {
  metrics: Metric[];
  groupBy?: Dimension[];
  timeGrain?: TimeGrain; // when set, also groups by time bucket on order_date
  filters?: Filters;
  sortBy?: Metric;
  sortDir?: 'asc' | 'desc';
  limit?: number;
}

export interface QueryExplanation {
  interpretation: string; // human-readable query plan
  metrics: Metric[];
  dimensions: Dimension[];
  timeGrain?: TimeGrain;
  filtersApplied: Filters;
  rowCount: number;
}

export type ChartType = 'line' | 'bar' | 'none';

export interface ChartSpec {
  type: ChartType;
  xKey: string;
  yKeys: string[];
  title: string;
}

export type ResultRow = Record<string, string | number>;

export interface QueryResult {
  rows: ResultRow[];
  chart: ChartSpec;
  explanation: QueryExplanation;
}

export type ForecastMethod = 'moving_average' | 'linear_regression' | 'exponential_smoothing';

export type ForecastGroupDimension = 'product_category' | 'carrier' | 'region' | 'sku';

export interface ForecastSpec {
  metric: 'total_quantity' | 'order_count';
  filters?: Filters; // typically { sku } or { product_category }
  horizonMonths: number; // 1..12
  method?: ForecastMethod;
  groupBy?: ForecastGroupDimension; // when set, one forecast line per group value
}

export interface InventoryRecommendation {
  horizonMonths: number;
  projectedDemand: number; // sum of forecast values
  safetyStock: number; // buffer
  recommendedUnits: number; // projectedDemand + safetyStock
  rationale: string;
}

export interface ForecastGroupRecommendation {
  key: string; // group value, or 'all'
  label: string; // series label shown in the chart
  recommendation: InventoryRecommendation;
}

export interface ForecastResult {
  method: ForecastMethod;
  groupBy?: ForecastGroupDimension;
  rows: ResultRow[]; // wide format: { period, <label1>: v, <label2>: v, ... }
  seriesKeys: string[]; // y-keys to plot (one line per group)
  forecastStartPeriod: string | null; // first forecast month (boundary marker)
  groups: ForecastGroupRecommendation[]; // per-series inventory recommendation
  explanation: string;
}

export type ToolName = 'query_analytics' | 'forecast_demand';

export interface AskResponse {
  answer: string; // NL summary derived from computed result
  tool: ToolName;
  query?: QueryResult;
  forecast?: ForecastResult;
}

export interface DashboardKpis {
  totalOrders: number;
  deliveredOrders: number;
  delayedOrders: number;
  onTimeDeliveryRate: number; // 0..1
  avgDeliveryDays: number; // mean, delivered+delayed with delivery_date
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  charts: {
    volumeOverTime: QueryResult;
    deliveryPerformance: QueryResult;
    carrierBreakdown: QueryResult;
  };
}
