import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import type { OrderRecord, OrderStatus } from '@logi/shared';
import type { OrderRepository } from '../domain/ports';

const VALID_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'delivered',
  'delayed',
  'in_transit',
  'exception',
  'canceled',
]);

/**
 * In-memory implementation of the {@link OrderRepository} port. Loads the
 * provided CSV once at boot into typed, normalised records. Suitable because the
 * dataset is tiny (400 rows) and read-only — see README "Assumptions".
 */
@Injectable()
export class InMemoryOrderRepository implements OrderRepository, OnModuleInit {
  private rows: OrderRecord[] = [];

  onModuleInit(): void {
    this.rows = this.load();
  }

  findAll(): readonly OrderRecord[] {
    return this.rows;
  }

  private resolveCsvPath(): string {
    const candidates = [
      join(__dirname, '..', 'data', 'mock_logistics_data.csv'), // dist/data (prod build)
      join(__dirname, '..', '..', 'data', 'mock_logistics_data.csv'), // src/dataset -> apps/api/data (jest/local)
      join(process.cwd(), 'data', 'mock_logistics_data.csv'),
    ];
    const found = candidates.find(existsSync);
    if (!found) {
      throw new Error(
        `mock_logistics_data.csv not found. Looked in:\n${candidates.join('\n')}`,
      );
    }
    return found;
  }

  private load(): OrderRecord[] {
    const raw = readFileSync(this.resolveCsvPath(), 'utf-8');
    const records: Record<string, string>[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records.map((r, i) => this.normalise(r, i));
  }

  private num(value: string, field: string, rowIndex: number): number {
    const n = Number(value);
    if (Number.isNaN(n)) {
      throw new Error(`Invalid number in column "${field}" at row ${rowIndex + 1}: "${value}"`);
    }
    return n;
  }

  private normalise(r: Record<string, string>, rowIndex: number): OrderRecord {
    if (!VALID_STATUSES.has(r.status as OrderStatus)) {
      throw new Error(`Invalid status at row ${rowIndex + 1}: "${r.status}"`);
    }
    return {
      client_id: r.client_id,
      order_id: r.order_id,
      order_date: r.order_date,
      delivery_date: r.delivery_date ? r.delivery_date : null,
      carrier: r.carrier,
      origin_city: r.origin_city,
      destination_city: r.destination_city,
      status: r.status as OrderStatus,
      sku: r.sku,
      product_category: r.product_category,
      quantity: this.num(r.quantity, 'quantity', rowIndex),
      unit_price_usd: this.num(r.unit_price_usd, 'unit_price_usd', rowIndex),
      order_value_usd: this.num(r.order_value_usd, 'order_value_usd', rowIndex),
      is_promo: r.is_promo === '1' || r.is_promo?.toLowerCase() === 'true',
      promo_discount_pct: this.num(r.promo_discount_pct, 'promo_discount_pct', rowIndex),
      region: r.region,
      warehouse: r.warehouse,
    };
  }
}
