export type ShippingMethod = "post" | "cvs_711" | "cvs_family" | "courier";

export type ShippingOption = {
  method: ShippingMethod;
  fee: number;
  region_note: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  category_id: number | null;

  image_url: string;
  is_active: boolean;

  stock: number; // ✅ 庫存（後端回傳帶上）
  shipping_options: ShippingOption[];
};
