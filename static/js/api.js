const TOKEN_KEY = "access_token";

function getBackendUrl() {
  return (window.BACKEND_API_URL || "").replace(/\/$/, "");
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function isAuthenticated() {
  return Boolean(getToken());
}

function redirectToLogin() {
  const loginPath = "/admin/login";
  if (window.location.pathname !== loginPath) {
    window.location.href = loginPath;
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

function extractErrorMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => item.msg || String(item)).join("; ");
  }
  if (payload.message) {
    return payload.message;
  }
  return fallback;
}

async function apiRequest(path, options = {}) {
  const { auth = true, raw = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});

  if (auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && auth) {
    clearToken();
    redirectToLogin();
    throw new Error("Требуется авторизация");
  }

  if (raw) {
    return response;
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = extractErrorMessage(
      payload,
      `Ошибка запроса (${response.status})`
    );
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (payload && payload.success === true && "data" in payload) {
    return payload.data;
  }

  return payload;
}

const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),
  patch: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (path, options) =>
    apiRequest(path, { ...options, method: "DELETE" }),

  getPublicTopics: () => api.get("/public/topics", { auth: false }),
  /** multipart: topic_id, text, files (повторяющееся поле) */
  submitAppeal: (formData) =>
    api.post("/public/appeals", formData, { auth: false }),

  login: (email, password) =>
    api.post("/admin/auth/login", { email, password }, { auth: false }),

  getUsers: () => api.get("/admin/users"),
  createUser: (data) => api.post("/admin/users", data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  getTopics: () => api.get("/admin/topics"),
  createTopic: (data) => api.post("/admin/topics", data),
  updateTopic: (id, data) => api.put(`/admin/topics/${id}`, data),
  deleteTopic: (id) => api.delete(`/admin/topics/${id}`),

  getAppeals: (params = {}) => {
    const search = new URLSearchParams();
    if (params.status) {
      search.set("status", params.status);
    }
    if (params.skip != null) {
      search.set("skip", String(params.skip));
    }
    if (params.limit != null) {
      search.set("limit", String(params.limit));
    }
    const query = search.toString();
    return api.get(`/admin/appeals${query ? `?${query}` : ""}`);
  },
  getAppeal: (appealId) => api.get(`/admin/appeals/${appealId}`),
  updateAppealStatus: (appealId, status) =>
    api.patch(`/admin/appeals/${appealId}/status`, { status }),
  fetchAttachmentBlob: async (appealId, attachmentId) => {
    const response = await apiRequest(
      `/admin/appeals/${appealId}/attachments/${attachmentId}/download`,
      { raw: true }
    );

    if (!response.ok) {
      const payload = await parseResponse(response);
      throw new Error(
        extractErrorMessage(payload, "Не удалось загрузить вложение")
      );
    }

    const blob = await response.blob();
    const contentType =
      response.headers.get("Content-Type") || blob.type || "";
    return { blob, contentType };
  },

  downloadAttachment: async (appealId, attachmentId, filename) => {
    const { blob } = await api.fetchAttachmentBlob(appealId, attachmentId);
    const name = filename || "attachment";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  },
};
