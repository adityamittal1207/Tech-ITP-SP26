import { useCallback, useEffect, useState } from "react";
import { createItem, deleteItem, fetchItems } from "./api/items.js";
import "./App.css";

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    setError("");
    try {
      const data = await fetchItems();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "offline" }));
  }, [loadItems]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      await createItem({ name: name.trim(), description: description.trim() });
      setName("");
      setDescription("");
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Lumnus ITP</p>
          <h1>MERN Stack Backbone</h1>
          <p className="subtitle">
            MongoDB · Express · React · Node — wired and ready to extend.
          </p>
        </div>
        <div className={`health ${health?.status === "ok" ? "ok" : "bad"}`}>
          API: {health?.status ?? "checking…"}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Add item</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example task"
              required
            />
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Create"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Items</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">No items yet. Create one above.</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li key={item._id}>
                <div>
                  <strong>{item.name}</strong>
                  {item.description && (
                    <p className="muted">{item.description}</p>
                  )}
                </div>
                <button type="button" onClick={() => handleDelete(item._id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
