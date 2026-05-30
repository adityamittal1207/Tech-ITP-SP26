import { apiRequest } from "./client";

export type Item = {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export function fetchItems() {
  return apiRequest<Item[]>("/items");
}

export function createItem(payload: Pick<Item, "name" | "description">) {
  return apiRequest<Item>("/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteItem(id: string) {
  return apiRequest<{ message: string }>(`/items/${id}`, { method: "DELETE" });
}
