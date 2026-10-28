import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './database.types';
import type {
  ClubTable,
  FloorPlan,
  Order,
  OrderItem,
  OrderItemWithProduct,
  Product,
  ProductCategory,
  Profile,
} from '../models/models';

/**
 * Compile-time contract checks for B10.
 * Runtime asserts document structural alignment between Database Rows and domain models.
 */
describe('database.types contracts', () => {
  it('exposes expected public tables and enums', () => {
    const tables: Array<keyof Database['public']['Tables']> = [
      'profiles',
      'companies',
      'app_secrets',
      'floor_plans',
      'floor_plan_elements',
      'tables',
      'reservations',
      'product_categories',
      'products',
      'orders',
      'order_items',
    ];
    expect(tables).toHaveLength(11);

    const roles: Enums<'app_role'>[] = ['ADMIN', 'USER'];
    expect(roles).toEqual(['ADMIN', 'USER']);

    const orderStatuses: Enums<'order_status'>[] = ['OPEN', 'CLOSED', 'CANCELLED'];
    expect(orderStatuses).toContain('OPEN');
  });

  it('keeps domain models assignable from table Rows (optional username aside)', () => {
    const profileRow: Tables<'profiles'> = {
      id: 'u1',
      full_name: null,
      phone: null,
      role: 'USER',
      username: 'alice',
      company_id: null,
      created_at: 't',
      updated_at: 't',
    };
    const profile: Profile = profileRow;
    expect(profile.role).toBe('USER');

    const tableRow: Tables<'tables'> = {
      id: 't1',
      floor_plan_id: 'p1',
      type: 'TABLE',
      number: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      shape: 'circle',
      attended: false,
      observation: null,
      created_at: 't',
      updated_at: 't',
    };
    const clubTable: ClubTable = tableRow;
    expect(clubTable.attended).toBe(false);

    const planRow: Tables<'floor_plans'> = {
      id: 'p1',
      name: 'Salón',
      width: 2000,
      height: 1200,
      is_active: true,
      is_locked: false,
      created_by: 'u1',
      created_at: 't',
      updated_at: 't',
    };
    const plan: FloorPlan = planRow;
    expect(plan.name).toBe('Salón');

    const product: Product = {
      id: 'pr1',
      category_id: 'c1',
      name: 'Agua',
      price: null,
      active: true,
      created_at: 't',
      updated_at: 't',
    } satisfies Tables<'products'>;
    const category: ProductCategory = {
      id: 'c1',
      name: 'Bebidas',
      sort_order: 0,
      created_at: 't',
      updated_at: 't',
    } satisfies Tables<'product_categories'>;
    expect(product.price).toBeNull();
    expect(category.sort_order).toBe(0);

    const order: Order = {
      id: 'o1',
      table_id: 't1',
      created_by: 'u1',
      status: 'OPEN',
      created_at: 't',
      updated_at: 't',
    } satisfies Tables<'orders'>;
    const item: OrderItem = {
      id: 'i1',
      order_id: 'o1',
      product_id: 'pr1',
      quantity: 2,
      status: 'PENDING',
      attended: false,
      created_by: 'u1',
      placed_by: null,
      placed_at: null,
      created_at: 't',
      updated_at: 't',
    } satisfies Tables<'order_items'>;
    const withProduct: OrderItemWithProduct = { ...item, product };
    expect(withProduct.product.name).toBe('Agua');
    expect(order.status).toBe('OPEN');
  });

  it('types Insert/Update helpers without inventing required fields', () => {
    const insert: TablesInsert<'orders'> = {
      table_id: 't1',
      created_by: 'u1',
    };
    const update: TablesUpdate<'tables'> = {
      attended: true,
      observation: null,
    };
    expect(insert.table_id).toBe('t1');
    expect(update.observation).toBeNull();
  });

  it('documents verified RPC arg names', () => {
    type ReplaceArgs = Database['public']['Functions']['replace_floor_plan_snapshot']['Args'];
    type AssignArgs = Database['public']['Functions']['assign_products_to_table']['Args'];
    type DeleteArgs = Database['public']['Functions']['delete_table_with_orders']['Args'];

    const replaceKeys: Array<keyof ReplaceArgs> = ['p_floor_plan_id', 'p_elements', 'p_tables'];
    const assignKeys: Array<keyof AssignArgs> = ['p_table_id', 'p_items'];
    const deleteKeys: Array<keyof DeleteArgs> = ['p_table_id', 'p_secret', 'p_force'];

    expect(replaceKeys).toHaveLength(3);
    expect(assignKeys).toHaveLength(2);
    expect(deleteKeys).toHaveLength(3);
  });
});
