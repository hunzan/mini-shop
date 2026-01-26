export type ShippingMethod = "post" | "cvs_711" | "cvs_family" | "courier";

export type ShippingOption = {
  id?: number;
  method: ShippingMethod;
  fee: number;
  region_note: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;

  description: string;          // 列表短描述
  description_text?: string;    // 詳細頁長文（可有可無）

  image_url?: string;

  stock_qty: number;

  category_id: number | null;

  is_active: boolean;

  shipping_options?: ShippingOption[];
};
