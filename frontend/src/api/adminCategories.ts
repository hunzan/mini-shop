import { adminGet, adminPost, adminPatchJson } from "./adminClient";

export type AdminCategory = {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export function fetchAdminCategories() {
  return adminGet<AdminCategory[]>("/admin/categories");
}

export function createCategory(payload: {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  return adminPost<AdminCategory>("/admin/categories", payload);
}

export function updateCategory(
  id: number,
  payload: Partial<{
    name: string;
    sort_order: number;
    is_active: boolean;
  }>
) {
  return adminPatchJson<AdminCategory>(`/admin/categories/${id}`, payload);
}
