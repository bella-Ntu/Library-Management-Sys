async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function json(method, body) {
  return { method, body: JSON.stringify(body) };
}

export const api = {
  health: () => request("/health"),
  books: () => request("/books"),
  createBook: (book) => request("/books", json("POST", book)),
  updateBook: (id, book) => request(`/books/${id}`, json("PATCH", book)),
  deleteBook: (id) => request(`/books/${id}`, { method: "DELETE" }),
  loans: () => request("/loans"),
  borrow: (bookId) => request("/loans", json("POST", { bookId })),
  returnLoan: (id) => request(`/loans/${id}/return`, { method: "PATCH" }),
  recommendations: () => request("/recommendations"),
  createRecommendation: (recommendation) => request("/recommendations", json("POST", recommendation)),
  updateRecommendation: (id, status) => request(`/recommendations/${id}`, json("PATCH", { status })),
  login: (credentials) => request("/auth/login", json("POST", credentials)),
  register: (credentials) => request("/auth/register", json("POST", credentials)),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  changePassword: (passwords) => request("/auth/change-password", json("POST", passwords)),
  createLibrarian: (user) => request("/librarians", json("POST", user)),
  librarianCount: () => request("/librarians/count"),
};
