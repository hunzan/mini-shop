// src/api/products.ts
import { apiGet } from "./client";
import type { Product } from "../types/product";

export function listProducts() {
  return apiGet<Product[]>("/products");
}

export function getProduct(id: number) {
  return apiGet<Product>(`/products/${id}`);
}
