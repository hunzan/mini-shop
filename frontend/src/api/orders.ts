import { apiFetch } from "./client";

export type CreateOrderItem = { product_id: string; qty: number };
export type CreateOrderPayload = {
  buyer_name: string;
  buyer_email: string;
  note?: string;
  items: CreateOrderItem[];
};

export type CreateOrderResponse = {
  order_id: string;
  status: string;
};

export function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>("/orders", { method: "POST", json: payload });
}
