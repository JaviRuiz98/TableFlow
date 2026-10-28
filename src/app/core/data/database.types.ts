/**
 * TableFlow Database typings.
 *
 * Origin: hand-aligned from `supabase/BOOTSTRAP_TABLEFLOW.sql` + verified app contracts
 * (not live `supabase gen types` — regenerate procedure documented in docs/refactoring/B10_TYPES.md).
 *
 * Domain models in `core/models/models.ts` mirror these Rows for app use.
 * Do not invent columns or RPC signatures beyond bootstrap/code evidence.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'ADMIN' | 'USER' | 'RECEPTOR';
export type TableShape = 'circle' | 'rectangle';
export type TableType = 'TABLE' | 'RESERVED';
export type FloorElementKind = 'wall' | 'zone' | 'door' | 'text';
export type OrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type OrderItemStatus = 'PENDING' | 'PLACED' | 'CANCELLED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
/** Opening session lifecycle on floor_plans (migration 0030). */
export type JornadaStatus = 'scheduled' | 'open' | 'closed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: AppRole;
          username: string | null;
          /** Present after 0017 / remote company migration. Null for legacy users. */
          company_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: AppRole;
          username?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: AppRole;
          username?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      companies: {
        Row: {
          id: string;
          name: string;
          onboarding_plan_done: boolean;
          onboarding_products_done: boolean;
          onboarding_users_done: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          onboarding_plan_done?: boolean;
          onboarding_products_done?: boolean;
          onboarding_users_done?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          onboarding_plan_done?: boolean;
          onboarding_products_done?: boolean;
          onboarding_users_done?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      app_secrets: {
        Row: {
          id: string;
          secret_key: string;
          description: string | null;
          secret_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          secret_key: string;
          description?: string | null;
          secret_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          secret_key?: string;
          description?: string | null;
          secret_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      floor_plans: {
        Row: {
          id: string;
          name: string;
          width: number;
          height: number;
          is_active: boolean;
          is_locked: boolean;
          /** Present after 0027. Ownership key (created_by removed). */
          company_id: string;
          /** Opening calendar date (0030). Not created_at. */
          opening_date: string;
          opens_at: string;
          closes_at: string;
          closes_next_day: boolean;
          status: JornadaStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          width?: number;
          height?: number;
          is_active?: boolean;
          is_locked?: boolean;
          company_id: string;
          opening_date: string;
          opens_at: string;
          closes_at: string;
          closes_next_day?: boolean;
          status?: JornadaStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          width?: number;
          height?: number;
          is_active?: boolean;
          is_locked?: boolean;
          company_id?: string;
          opening_date?: string;
          opens_at?: string;
          closes_at?: string;
          closes_next_day?: boolean;
          status?: JornadaStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      floor_plan_elements: {
        Row: {
          id: string;
          floor_plan_id: string;
          kind: FloorElementKind;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          points: Json | null;
          label: string | null;
          font_size: number | null;
          z_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          floor_plan_id: string;
          kind: FloorElementKind;
          x: number;
          y: number;
          width?: number;
          height?: number;
          rotation?: number;
          points?: Json | null;
          label?: string | null;
          font_size?: number | null;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          floor_plan_id?: string;
          kind?: FloorElementKind;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          points?: Json | null;
          label?: string | null;
          font_size?: number | null;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      tables: {
        Row: {
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
          /** Current reservation flag (0030). Not history. */
          reserved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          floor_plan_id: string;
          type?: TableType;
          number: number;
          x: number;
          y: number;
          width?: number;
          height?: number;
          rotation?: number;
          shape?: TableShape;
          attended?: boolean;
          observation?: string | null;
          reserved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          floor_plan_id?: string;
          type?: TableType;
          number?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          shape?: TableShape;
          attended?: boolean;
          observation?: string | null;
          reserved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      reservations: {
        Row: {
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
        };
        Insert: {
          id?: string;
          table_id: string;
          name: string;
          reservation_date: string;
          reservation_time?: string | null;
          people?: number;
          notes?: string | null;
          status?: ReservationStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          name?: string;
          reservation_date?: string;
          reservation_time?: string | null;
          people?: number;
          notes?: string | null;
          status?: ReservationStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      product_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          category_id: string;
          company_id: string | null;
          name: string;
          price: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          company_id?: string | null;
          name: string;
          price?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          company_id?: string | null;
          name?: string;
          price?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };

      orders: {
        Row: {
          id: string;
          table_id: string;
          created_by: string;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          created_by: string;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          created_by?: string;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      order_items: {
        Row: {
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
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status?: OrderItemStatus;
          attended?: boolean;
          created_by: string;
          placed_by?: string | null;
          placed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          status?: OrderItemStatus;
          attended?: boolean;
          created_by?: string;
          placed_by?: string | null;
          placed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      /** Pending remote apply: `0027_floor_plans_company_id.sql`. */
      current_company_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };

      /** Pending remote apply: `0028_operational_tenant_rls.sql`. */
      floor_plan_belongs_to_current_company: {
        Args: {
          p_floor_plan_id: string;
        };
        Returns: boolean;
      };

      /** Pending remote apply: `0028_operational_tenant_rls.sql`. */
      table_belongs_to_current_company: {
        Args: {
          p_table_id: string;
        };
        Returns: boolean;
      };

      replace_floor_plan_snapshot: {
        Args: {
          p_floor_plan_id: string;
          /** JSON array of element payloads (transport; not a typed composite). */
          p_elements: Json;
          /** JSON array of table payloads including ids. */
          p_tables: Json;
        };
        Returns: undefined;
      };

      verify_app_secret: {
        Args: {
          p_key: string;
          p_secret: string;
        };
        Returns: boolean;
      };

      /** Pending remote apply: `0023_update_own_company_name.sql` (+ uniqueness in `0026`). */
      update_own_company_name: {
        Args: {
          p_name: string;
        };
        Returns: string;
      };

      /** Pending remote apply: `0026_unique_company_name.sql`. */
      is_company_name_available: {
        Args: {
          p_name: string;
        };
        Returns: boolean;
      };

      /** Pending remote apply: `0025_update_own_admin_profile.sql`. */
      update_own_admin_profile: {
        Args: {
          p_full_name: string;
          p_phone: string;
        };
        Returns: Json;
      };

      assign_products_to_table: {
        Args: {
          p_table_id: string;
          /** JSON array of `{ product_id, quantity }`. */
          p_items: Json;
        };
        Returns: string;
      };

      set_table_attended: {
        Args: {
          p_table_id: string;
          p_attended: boolean;
        };
        Returns: undefined;
      };

      set_table_observation: {
        Args: {
          p_table_id: string;
          p_observation: string | null;
        };
        Returns: undefined;
      };

      /** 0031 — ADMIN creates scheduled jornada (+ optional layout copy). */
      create_opening_jornada: {
        Args: {
          p_name: string;
          p_opening_date: string;
          p_opens_at: string;
          p_closes_at: string;
          p_closes_next_day?: boolean;
          p_source_floor_plan_id?: string | null;
          p_width?: number;
          p_height?: number;
        };
        Returns: Database['public']['Tables']['floor_plans']['Row'];
      };

      open_jornada: {
        Args: { p_floor_plan_id: string };
        Returns: Database['public']['Tables']['floor_plans']['Row'];
      };

      close_jornada: {
        Args: { p_floor_plan_id: string };
        Returns: Database['public']['Tables']['floor_plans']['Row'];
      };

      set_table_reserved: {
        Args: { p_table_id: string; p_reserved: boolean };
        Returns: Database['public']['Tables']['tables']['Row'];
      };

      transfer_table_content: {
        Args: { p_source_table_id: string; p_target_table_id: string };
        Returns: Json;
      };

      delete_table_with_orders: {
        Args: {
          p_table_id: string;
          p_secret: string;
          p_force: boolean;
        };
        /** Dynamic jsonb `{ ok, reason }` — adapt at service boundary. */
        Returns: Json;
      };

      product_has_order_history: {
        Args: { p_product_id: string };
        Returns: boolean;
      };

      category_has_order_history: {
        Args: { p_category_id: string };
        Returns: boolean;
      };

      delete_product_safe: {
        Args: { p_product_id: string };
        Returns: boolean;
      };

      delete_category_safe: {
        Args: { p_category_id: string };
        Returns: boolean;
      };
    };

    Enums: {
      app_role: AppRole;
      table_shape: TableShape;
      table_type: TableType;
      floor_element_kind: FloorElementKind;
      order_status: OrderStatus;
      order_item_status: OrderItemStatus;
      reservation_status: ReservationStatus;
    };

    CompositeTypes: Record<string, never>;
  };
}

/** Helpers mirroring supabase-js generated helpers. */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
