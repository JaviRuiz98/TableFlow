/**
 * Domain models for TableFlow (app layer).
 * Column shapes mirror `core/data/database.types.ts` Rows (BOOTSTRAP-aligned).
 * Prefer these in UI/services; use Database helpers at the Supabase client boundary.
 */
export type {
  AppRole as Role,
  FloorElementKind,
  JornadaStatus,
  OrderItemStatus,
  OrderStatus,
  ReservationStatus,
  TableShape,
  TableType,
} from '../data/database.types';

import type {
  AppRole,
  FloorElementKind,
  JornadaStatus,
  OrderItemStatus,
  OrderStatus,
  ReservationStatus,
  TableShape,
  TableType,
} from '../data/database.types';

export interface Profile {
  id: string;
  full_name: string | null;
  phone?: string | null;
  username?: string | null;
  role: AppRole;
  company_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  onboarding_plan_done: boolean;
  onboarding_products_done: boolean;
  onboarding_users_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  is_active: boolean;
  is_locked: boolean;
  /** Tenant owner after migration 0027 (replaces created_by). */
  company_id: string;
  /** Opening calendar date (YYYY-MM-DD). Not created_at. */
  opening_date: string;
  /** Local open time (HH:MM:SS). */
  opens_at: string;
  /** Local close time (HH:MM:SS); may be next day when closes_next_day. */
  closes_at: string;
  closes_next_day: boolean;
  status: JornadaStatus;
  created_at: string;
  updated_at: string;
}

export interface FloorPlanElement {
  id: string;
  floor_plan_id: string;
  kind: FloorElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** Domain form of jsonb `points` (walls/doors). */
  points: number[] | null;
  label: string | null;
  font_size: number | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface ClubTable {
  id: string;
  floor_plan_id: string;
  type: TableType;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShape;
  attended: boolean;
  observation: string | null;
  /** Current reservation flag for this jornada (not history). */
  reserved: boolean;
  created_at: string;
  updated_at: string;
}

/** Legacy dated reservations table (schema parity; app UI uses tables.type=RESERVED). */
export interface Reservation {
  id: string;
  table_id: string;
  name: string;
  reservation_date: string;
  reservation_time: string | null;
  people: number;
  notes: string | null;
  status: ReservationStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  company_id: string | null;
  name: string;
  price: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  table_id: string;
  created_by: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  status: OrderItemStatus;
  attended: boolean;
  created_by: string;
  placed_by: string | null;
  placed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** order_items row with nested `products(*)` join used by OrderService.forTable. */
export type OrderItemWithProduct = OrderItem & { product: Product };

export type OrderItemCategoryGroup = {
  id: string;
  name: string;
  items: OrderItemWithProduct[];
};

export interface FloorSnapshot {
  elements: FloorPlanElement[];
  tables: ClubTable[];
  reserved?: ClubTable[];
}
