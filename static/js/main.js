/* global api, clearToken, getToken, isAuthenticated, redirectToLogin, setToken */

const STATUS_LABELS = {
  new: "Новое",
  in_progress: "В работе",
  closed: "Закрыто",
};

const ROLE_LABELS = {
  admin: "Администратор",
  operator: "Оператор",
};

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) {
    return;
  }

  const template = document.getElementById("toast-template");
  if (!template) {
    return;
  }

  const node = template.content.cloneNode(true);
  const toastEl = node.querySelector(".toast");
  const bodyEl = node.querySelector(".toast-body");

  toastEl.classList.add(type === "danger" ? "text-bg-danger" : "text-bg-success");
  bodyEl.textContent = message;

  container.appendChild(node);
  const inserted = container.lastElementChild;
  const toast = bootstrap.Toast.getOrCreateInstance(inserted, { delay: 5000 });
  inserted.addEventListener("hidden.bs.toast", () => inserted.remove());
  toast.show();
}

function setButtonLoading(button, loading) {
  if (!button) {
    return;
  }
  button.disabled = loading;
  const spinner = button.querySelector(".btn-spinner");
  if (spinner) {
    spinner.classList.toggle("d-none", !loading);
  }
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU");
}

function requireAdminAuth() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }
  return true;
}

function initLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) {
    return;
  }
  logoutBtn.addEventListener("click", () => {
    clearToken();
    redirectToLogin();
  });
}

/* ——— Public form ——— */

function initPublicPage() {
  const form = document.getElementById("appeal-form");
  if (!form) {
    return;
  }

  const topicSelect = document.getElementById("topic_id");
  const textArea = document.getElementById("appeal-text");
  const submitBtn = document.getElementById("submit-appeal");

  function validateForm() {
    const topicValid = Boolean(topicSelect.value);
    const textValid = textArea.value.trim().length >= 1;
    submitBtn.disabled = !(topicValid && textValid);
  }

  async function loadTopics() {
    try {
      const topics = await api.getPublicTopics();
      topicSelect.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Выберите тему";
      topicSelect.appendChild(placeholder);

      (topics || []).forEach((topic) => {
        const option = document.createElement("option");
        option.value = String(topic.id);
        option.textContent = topic.name;
        topicSelect.appendChild(option);
      });
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    }
  }

  topicSelect.addEventListener("change", validateForm);
  textArea.addEventListener("input", validateForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    validateForm();
    if (submitBtn.disabled) {
      return;
    }

    const formData = new FormData();
    formData.append("topic_id", topicSelect.value);
    formData.append("text", textArea.value.trim());

    const filesInput = document.getElementById("appeal-files");
    Array.from(filesInput.files || []).forEach((file) => {
      formData.append("files", file);
    });

    setButtonLoading(submitBtn, true);
    try {
      const result = await api.submitAppeal(formData);
      const message =
        result && typeof result.message === "string"
          ? result.message
          : "Обращение отправлено";
      showToast(message);
      form.reset();
      submitBtn.disabled = true;
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  loadTopics();
  validateForm();
}

/* ——— Admin login ——— */

function initAdminLogin() {
  const form = document.getElementById("login-form");
  if (!form) {
    return;
  }

  if (isAuthenticated()) {
    window.location.href = "/admin";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    setButtonLoading(submitBtn, true);
    try {
      const result = await api.login(email, password);
      setToken(result.access_token);
      window.location.href = "/admin";
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

/* ——— Users ——— */

function initUsersPage() {
  if (!requireAdminAuth()) {
    return;
  }

  const tableBody = document.getElementById("users-table-body");
  const userModal = document.getElementById("user-modal");
  const userForm = document.getElementById("user-form");
  const modalTitle = document.getElementById("user-modal-title");
  const passwordField = document.getElementById("user-password-wrap");
  const isActiveWrap = document.getElementById("user-is-active-wrap");
  const emailInput = document.getElementById("user-email");
  const passwordInput = document.getElementById("user-password");
  let editingId = null;

  function getTelegramChatIdValue() {
    const value = document.getElementById("user-telegram-chat-id").value.trim();
    return value || null;
  }

  function openModal(user) {
    editingId = user ? user.id : null;
    const isEdit = Boolean(user);
    modalTitle.textContent = isEdit
      ? "Редактировать пользователя"
      : "Создать пользователя";
    passwordField.classList.toggle("d-none", isEdit);
    isActiveWrap.classList.toggle("d-none", !isEdit);
    emailInput.readOnly = isEdit;
    emailInput.required = !isEdit;
    passwordInput.required = !isEdit;

    emailInput.value = user?.email || "";
    document.getElementById("user-full-name").value = user?.full_name || "";
    document.getElementById("user-role").value = user?.role || "operator";
    document.getElementById("user-is-active").checked = user ? user.is_active : true;
    document.getElementById("user-notify-telegram").checked = Boolean(
      user?.notify_telegram
    );
    document.getElementById("user-telegram-chat-id").value =
      user?.telegram_chat_id || "";
    passwordInput.value = "";

    bootstrap.Modal.getOrCreateInstance(userModal).show();
  }

  function renderUsers(users) {
    tableBody.replaceChildren();
    const template = document.getElementById("user-row-template");

    (users || []).forEach((user) => {
      const row = template.content.cloneNode(true);
      const tr = row.querySelector("tr");

      row.querySelector(".user-active").textContent = user.is_active ? "Да" : "Нет";
      row.querySelector(".user-email").textContent = user.email;
      row.querySelector(".user-full-name").textContent = user.full_name || "—";
      row.querySelector(".user-role").textContent =
        ROLE_LABELS[user.role] || user.role;
      row.querySelector(".user-notify-telegram").textContent = user.notify_telegram
        ? "Да"
        : "Нет";
      row.querySelector(".user-telegram-chat-id").textContent =
        user.telegram_chat_id || "—";

      row.querySelector(".btn-edit").addEventListener("click", () => openModal(user));
      row.querySelector(".btn-delete").addEventListener("click", async () => {
        if (!window.confirm(`Удалить пользователя ${user.email}?`)) {
          return;
        }
        try {
          await api.deleteUser(user.id);
          showToast("Пользователь удалён");
          await loadUsers();
        } catch (error) {
          showToast(`Ошибка: ${error.message}`, "danger");
        }
      });

      tableBody.appendChild(tr);
    });
  }

  async function loadUsers() {
    tableBody.replaceChildren();
    const loadingRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "text-center text-muted py-4";
    cell.textContent = "Загрузка…";
    loadingRow.appendChild(cell);
    tableBody.appendChild(loadingRow);

    try {
      const users = await api.getUsers();
      renderUsers(users);
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    }
  }

  document.getElementById("btn-create-user").addEventListener("click", () => openModal(null));

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = userForm.querySelector('button[type="submit"]');
    const notifyTelegram = document.getElementById("user-notify-telegram").checked;
    const telegramChatId = getTelegramChatIdValue();

    setButtonLoading(submitBtn, true);
    try {
      if (editingId) {
        const payload = {
          full_name: document.getElementById("user-full-name").value.trim(),
          role: document.getElementById("user-role").value,
          is_active: document.getElementById("user-is-active").checked,
          notify_telegram: notifyTelegram,
          telegram_chat_id: telegramChatId,
        };
        const password = passwordInput.value;
        if (password) {
          payload.password = password;
        }
        await api.updateUser(editingId, payload);
        showToast("Пользователь обновлён");
      } else {
        const payload = {
          email: emailInput.value.trim(),
          full_name: document.getElementById("user-full-name").value.trim(),
          role: document.getElementById("user-role").value,
          password: passwordInput.value,
          notify_telegram: notifyTelegram,
          telegram_chat_id: telegramChatId,
        };
        await api.createUser(payload);
        showToast("Пользователь создан");
      }
      bootstrap.Modal.getInstance(userModal).hide();
      await loadUsers();
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  loadUsers();
}

/* ——— Topics ——— */

function initTopicsPage() {
  if (!requireAdminAuth()) {
    return;
  }

  const tableBody = document.getElementById("topics-table-body");
  const topicModal = document.getElementById("topic-modal");
  const topicForm = document.getElementById("topic-form");
  const modalTitle = document.getElementById("topic-modal-title");
  let editingId = null;

  function openModal(topic) {
    editingId = topic ? topic.id : null;
    modalTitle.textContent = topic ? "Редактировать тему" : "Создать тему";
    document.getElementById("topic-name").value = topic?.name || "";
    document.getElementById("topic-sort-order").value =
      topic?.sort_order != null ? String(topic.sort_order) : "0";
    document.getElementById("topic-is-active").checked = topic ? topic.is_active : true;
    bootstrap.Modal.getOrCreateInstance(topicModal).show();
  }

  function renderTopics(topics) {
    tableBody.replaceChildren();
    const template = document.getElementById("topic-row-template");

    (topics || []).forEach((topic) => {
      const row = template.content.cloneNode(true);

      row.querySelector(".topic-name").textContent = topic.name;
      row.querySelector(".topic-active").textContent = topic.is_active ? "Да" : "Нет";
      row.querySelector(".topic-sort").textContent = String(topic.sort_order ?? 0);

      row.querySelector(".btn-edit").addEventListener("click", () => openModal(topic));
      row.querySelector(".btn-delete").addEventListener("click", async () => {
        if (!window.confirm(`Удалить тему «${topic.name}»?`)) {
          return;
        }
        try {
          await api.deleteTopic(topic.id);
          showToast("Тема удалена");
          await loadTopics();
        } catch (error) {
          showToast(`Ошибка: ${error.message}`, "danger");
        }
      });

      tableBody.appendChild(row.querySelector("tr"));
    });
  }

  async function loadTopics() {
    tableBody.replaceChildren();
    const loadingRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "text-center text-muted py-4";
    cell.textContent = "Загрузка…";
    loadingRow.appendChild(cell);
    tableBody.appendChild(loadingRow);

    try {
      const topics = await api.getTopics();
      renderTopics(topics);
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    }
  }

  document.getElementById("btn-create-topic").addEventListener("click", () => openModal(null));

  topicForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = topicForm.querySelector('button[type="submit"]');
    const payload = {
      name: document.getElementById("topic-name").value.trim(),
      sort_order: Number(document.getElementById("topic-sort-order").value) || 0,
      is_active: document.getElementById("topic-is-active").checked,
    };

    setButtonLoading(submitBtn, true);
    try {
      if (editingId) {
        await api.updateTopic(editingId, payload);
        showToast("Тема обновлена");
      } else {
        await api.createTopic(payload);
        showToast("Тема создана");
      }
      bootstrap.Modal.getInstance(topicModal).hide();
      await loadTopics();
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  loadTopics();
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;

function isImageAttachment(attachment) {
  const contentType = attachment.content_type || "";
  if (contentType.startsWith("image/")) {
    return true;
  }
  const filename = attachment.original_filename || "";
  return IMAGE_EXTENSIONS.test(filename);
}

function revokeAttachmentPreviewUrls(urlSet) {
  urlSet.forEach((url) => URL.revokeObjectURL(url));
  urlSet.clear();
}

async function loadAttachmentImagePreview(
  appealId,
  attachment,
  previewContainer,
  previewUrls
) {
  try {
    const { blob, contentType } = await api.fetchAttachmentBlob(
      appealId,
      attachment.id
    );
    const isImage =
      contentType.startsWith("image/") || isImageAttachment(attachment);
    if (!isImage) {
      previewContainer.remove();
      return;
    }

    previewContainer.replaceChildren();
    const img = document.createElement("img");
    img.className = "attachment-preview__img img-thumbnail";
    img.alt = attachment.original_filename || "Превью";
    const objectUrl = URL.createObjectURL(blob);
    previewUrls.add(objectUrl);
    img.src = objectUrl;
    previewContainer.appendChild(img);
  } catch {
    previewContainer.replaceChildren();
    const message = document.createElement("p");
    message.className = "text-muted small mb-0";
    message.textContent = "Не удалось загрузить превью";
    previewContainer.appendChild(message);
  }
}

function renderAppealAttachments(container, appealId, attachments, previewUrls) {
  if (!attachments || attachments.length === 0) {
    return;
  }

  const block = document.createElement("div");
  block.className = "mb-0";
  const title = document.createElement("strong");
  title.textContent = "Вложения:";
  block.appendChild(title);

  const list = document.createElement("ul");
  list.className = "list-unstyled mt-2 mb-0";

  attachments.forEach((attachment) => {
    const item = document.createElement("li");
    item.className = "mb-3";

    const linkRow = document.createElement("div");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-link btn-sm p-0 align-baseline";
    button.textContent =
      attachment.original_filename || `Файл #${attachment.id}`;
    button.addEventListener("click", async () => {
      try {
        await api.downloadAttachment(
          appealId,
          attachment.id,
          attachment.original_filename
        );
      } catch (error) {
        showToast(`Ошибка: ${error.message}`, "danger");
      }
    });

    const meta = document.createElement("span");
    meta.className = "text-muted small ms-1";
    const sizeKb = attachment.size_bytes
      ? ` (${(attachment.size_bytes / 1024).toFixed(1)} КБ)`
      : "";
    meta.textContent = sizeKb;

    linkRow.appendChild(button);
    linkRow.appendChild(meta);
    item.appendChild(linkRow);

    if (isImageAttachment(attachment)) {
      const preview = document.createElement("div");
      preview.className = "attachment-preview mt-2";
      const loading = document.createElement("p");
      loading.className = "text-muted small mb-0";
      loading.textContent = "Загрузка превью…";
      preview.appendChild(loading);
      item.appendChild(preview);
      loadAttachmentImagePreview(
        appealId,
        attachment,
        preview,
        previewUrls
      );
    }

    list.appendChild(item);
  });

  block.appendChild(list);
  container.appendChild(block);
}

/* ——— Appeals ——— */

function initAppealsPage() {
  if (!requireAdminAuth()) {
    return;
  }

  const tableBody = document.getElementById("appeals-table-body");
  const viewModal = document.getElementById("appeal-view-modal");
  const attachmentPreviewUrls = new Set();

  viewModal.addEventListener("hidden.bs.modal", () => {
    revokeAttachmentPreviewUrls(attachmentPreviewUrls);
  });

  async function showAppealDetails(id) {
    revokeAttachmentPreviewUrls(attachmentPreviewUrls);
    const modalBody = document.getElementById("appeal-view-body");
    modalBody.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "text-muted";
    loading.textContent = "Загрузка…";
    modalBody.appendChild(loading);

    bootstrap.Modal.getOrCreateInstance(viewModal).show();

    try {
      const appeal = await api.getAppeal(id);
      modalBody.replaceChildren();

      const fields = [
        ["Тема", appeal.topic_name || "—"],
        ["Статус", STATUS_LABELS[appeal.status] || appeal.status],
        ["Создано", formatDate(appeal.created_at)],
        ["Обновлено", formatDate(appeal.updated_at)],
        ["Текст", appeal.text || "—"],
      ];

      fields.forEach(([label, value]) => {
        const block = document.createElement("div");
        block.className = "mb-3";
        const title = document.createElement("strong");
        title.textContent = `${label}: `;
        const content = document.createElement("span");
        if (label === "Текст") {
          content.textContent = value;
          content.style.whiteSpace = "pre-wrap";
        } else {
          content.textContent = value;
        }
        block.appendChild(title);
        block.appendChild(content);
        modalBody.appendChild(block);
      });

      renderAppealAttachments(
        modalBody,
        appeal.id,
        appeal.attachments,
        attachmentPreviewUrls
      );
    } catch (error) {
      modalBody.replaceChildren();
      const err = document.createElement("p");
      err.className = "text-danger";
      err.textContent = error.message;
      modalBody.appendChild(err);
    }
  }

  function renderAppeals(appeals) {
    tableBody.replaceChildren();
    const template = document.getElementById("appeal-row-template");

    (appeals || []).forEach((appeal) => {
      const row = template.content.cloneNode(true);

      row.querySelector(".appeal-topic").textContent = appeal.topic_name || "—";
      row.querySelector(".appeal-text").textContent =
        appeal.text_preview || "—";
      row.querySelector(".appeal-created").textContent = formatDate(
        appeal.created_at
      );
      const attachmentsCell = row.querySelector(".appeal-attachments");
      if (attachmentsCell) {
        attachmentsCell.textContent = String(appeal.attachments_count ?? 0);
      }

      const statusSelect = row.querySelector(".appeal-status");
      Object.keys(STATUS_LABELS).forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = STATUS_LABELS[status];
        if (status === appeal.status) {
          option.selected = true;
        }
        statusSelect.appendChild(option);
      });

      statusSelect.addEventListener("change", async () => {
        const previous = appeal.status;
        statusSelect.disabled = true;
        try {
          await api.updateAppealStatus(appeal.id, statusSelect.value);
          appeal.status = statusSelect.value;
          showToast("Статус обновлён");
        } catch (error) {
          statusSelect.value = previous;
          showToast(`Ошибка: ${error.message}`, "danger");
        } finally {
          statusSelect.disabled = false;
        }
      });

      row.querySelector(".btn-view").addEventListener("click", () => {
        showAppealDetails(appeal.id);
      });

      tableBody.appendChild(row.querySelector("tr"));
    });
  }

  async function loadAppeals() {
    tableBody.replaceChildren();
    const loadingRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "text-center text-muted py-4";
    cell.textContent = "Загрузка…";
    loadingRow.appendChild(cell);
    tableBody.appendChild(loadingRow);

    try {
      const appeals = await api.getAppeals();
      renderAppeals(appeals);
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, "danger");
    }
  }

  loadAppeals();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  initLogout();

  switch (page) {
    case "public":
      initPublicPage();
      break;
    case "admin-login":
      initAdminLogin();
      break;
    case "admin-users":
      initUsersPage();
      break;
    case "admin-topics":
      initTopicsPage();
      break;
    case "admin-appeals":
      initAppealsPage();
      break;
    default:
      break;
  }
});
