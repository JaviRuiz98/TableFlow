import type {
  ClubTable,
  FloorPlan,
  FloorPlanElement,
  Order,
  OrderItem,
  Product,
  ProductCategory,
  Profile,
  Reservation,
} from '../app/core/models/models';

/** Shared domain fixtures for Vitest (no remote I/O). */
export const fixtureProfileAdmin: Profile = {
  id: 'user-admin',
  full_name: 'Admin',
  username: 'admin',
  role: 'ADMIN',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/** Day-to-day management (former ADMIN shell). */
export const fixtureProfileUser: Profile = {
  ...fixtureProfileAdmin,
  id: 'user-manager',
  full_name: 'Manager',
  username: 'manager',
  role: 'USER',
};

/** Operative staff that receives order alerts (former USER responsibilities). */
export const fixtureProfileReceptor: Profile = {
  ...fixtureProfileAdmin,
  id: 'user-staff',
  full_name: 'Staff',
  username: 'staff',
  role: 'RECEPTOR',
};

export const fixturePlan: FloorPlan = {
  id: 'plan-1',
  name: 'Sala',
  width: 2000,
  height: 1200,
  is_active: true,
  is_locked: false,
  created_by: 'user-admin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const fixtureTable: ClubTable = {
  id: 'table-1',
  floor_plan_id: 'plan-1',
  type: 'TABLE',
  number: 1,
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  rotation: 0,
  shape: 'circle',
  attended: true,
  observation: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const fixtureReserved: ClubTable = {
  ...fixtureTable,
  id: 'reserved-1',
  type: 'RESERVED',
  number: 2,
  shape: 'rectangle',
};

export const fixtureWall: FloorPlanElement = {
  id: 'el-1',
  floor_plan_id: 'plan-1',
  kind: 'wall',
  x: 0,
  y: 0,
  width: 100,
  height: 0,
  rotation: 0,
  points: [0, 0, 100, 0],
  label: null,
  font_size: null,
  z_index: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const fixtureCategory: ProductCategory = {
  id: 'cat-1',
  name: 'Bebidas',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const fixtureProduct: Product = {
  id: 'prod-1',
  category_id: 'cat-1',
  company_id: 'co-1',
  name: 'Agua',
  price: null,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const fixtureOrder: Order = {
  id: 'order-1',
  table_id: 'table-1',
  created_by: 'user-admin',
  status: 'OPEN',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const fixtureOrderItem: OrderItem = {
  id: 'item-1',
  order_id: 'order-1',
  product_id: 'prod-1',
  quantity: 2,
  status: 'PENDING',
  attended: false,
  created_by: 'user-admin',
  placed_by: null,
  placed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/** Schema-only domain shape (no Angular UI module yet). */
export const fixtureReservation: Reservation = {
  id: 'res-1',
  table_id: 'table-1',
  name: 'García',
  reservation_date: '2026-10-27',
  reservation_time: '22:00:00',
  people: 4,
  notes: null,
  status: 'PENDING',
  created_by: 'user-admin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
