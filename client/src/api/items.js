import { apiRequest } from "./client.js";

export function fetchItems() {
  return apiRequest("/items");
}

export function createItem(payload) {
  return apiRequest("/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteItem(id) {
  return apiRequest(`/items/${id}`, { method: "DELETE" });
}
