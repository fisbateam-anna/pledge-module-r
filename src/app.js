import { navItems, roles, employees, taskTypes, initialData, reportCatalog, marketAnalogs, taskSourceChannels, printFormCatalog, migrationBatches } from "./data.js";

const app = document.getElementById("app");
let registryFilterRenderTimer = null;

const clone = (value) => JSON.parse(JSON.stringify(value));
const TASK_STATE_STORAGE_KEY = "pledgeModuleR.taskState.v1";
const ROLE_STATE_STORAGE_KEY = "pledgeModuleR.roleId";

function getUnifiedTaskType(type) {
  return String(type || "")
    .replace(/\s*\((документарный|физический)\)\s*$/i, "")
    .trim();
}

function normalizeTaskRecord(task) {
  if (!task) return task;
  return { ...task, type: getUnifiedTaskType(task.type) };
}

function readSavedTaskState() {
  try {
    const raw = localStorage.getItem(TASK_STATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.tasks) ? parsed.tasks.filter((task) => task?.id) : [];
  } catch (error) {
    console.warn("Не удалось прочитать сохраненное состояние задач", error);
    return [];
  }
}

function buildRuntimeData() {
  const data = clone(initialData);
  data.tasks = data.tasks.map(normalizeTaskRecord);
  const savedTasks = readSavedTaskState().map(normalizeTaskRecord);
  if (!savedTasks.length) return data;
  const baseById = new Map(data.tasks.map((task) => [task.id, task]));
  const savedIds = new Set(savedTasks.map((task) => task.id));
  data.tasks = [
    ...savedTasks.map((task) => ({
      ...(baseById.get(task.id) || {}),
      ...task,
      history: Array.isArray(task.history) ? task.history : (baseById.get(task.id)?.history || [])
    })),
    ...data.tasks.filter((task) => !savedIds.has(task.id))
  ];
  return data;
}

function isKnownRole(roleId) {
  return roles.some((role) => role.id === roleId);
}

function getInitialRoleId() {
  try {
    const savedRole = sessionStorage.getItem(ROLE_STATE_STORAGE_KEY);
    if (isKnownRole(savedRole)) return savedRole;
  } catch (error) {
    console.warn("Не удалось прочитать выбранную роль", error);
  }

  const roleFromUrl = new URLSearchParams(window.location.search).get("role");
  if (isKnownRole(roleFromUrl)) return roleFromUrl;
  return "specialist";
}

function rememberSelectedRole(roleId) {
  try {
    if (isKnownRole(roleId)) sessionStorage.setItem(ROLE_STATE_STORAGE_KEY, roleId);
  } catch (error) {
    console.warn("Не удалось сохранить выбранную роль", error);
  }
}

const state = {
  data: buildRuntimeData(),
  roleId: getInitialRoleId(),
  collateralTab: "overview",
  taskRegistryTab: "",
  filters: {
    tasks: { number: "", clientId: "", clientName: "", collateralId: "", type: "", status: "", assignee: "" },
    contracts: { clientId: "", clientName: "", gsz: "", number: "", periodFrom: "", periodTo: "", collateralId: "", status: "Активен" },
    collaterals: { clientId: "", clientName: "", gsz: "", number: "", collateralId: "", address: "", type: "" },
    insurances: { policy: "", clientId: "", clientName: "", collateralId: "", company: "", status: "" },
    sources: { name: "", stage: "", status: "" },
    integrations: { name: "", group: "", status: "" },
    migration: { batch: "", source: "", status: "" }
  },
  visualFilters: {
    tasks: { type: "", urgency: "", status: "", priority: "" },
    contracts: { coverage: "", ltv: "", maturity: "", gszExposure: "", kpi: "" },
    collaterals: { type: "", gsz: "", kpi: "" },
    insurances: { kpi: "" }
  },
  sort: { scope: "", field: "", dir: "asc" },
  taskActiveCollateral: {},
  newTask: {
    key: "",
    type: "Плановый мониторинг",
    selectedCollateralIds: [],
    documents: []
  },
  mobile: { employeePhotos: {} },
  modal: null,
  pendingRegistryFocus: "",
  pendingFilterFocus: null,
  pendingScrollRestore: null,
  pendingMobileScrollRestore: null,
  toasts: []
};

function persistTaskState() {
  try {
    localStorage.setItem(TASK_STATE_STORAGE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      tasks: state.data.tasks
    }));
  } catch (error) {
    console.warn("Не удалось сохранить состояние задач", error);
  }
}

const documentRules = [
  { title: "Заявление клиента по договору/залогодателя", collateralType: "any", clientType: "any", taskType: "any", required: true },
  { title: "Правоустанавливающий документ", collateralType: "any", clientType: "any", taskType: "Постановка в залог", required: true },
  { title: "Акт осмотра", collateralType: "any", clientType: "any", taskType: "Первичный осмотр", required: true },
  { title: "Акт повторного осмотра", collateralType: "any", clientType: "any", taskType: "Повторный осмотр", required: true },
  { title: "Фотофиксация объекта", collateralType: "any", clientType: "any", taskType: "Первичный осмотр", required: true },
  { title: "Фотофиксация объекта", collateralType: "any", clientType: "any", taskType: "Повторный осмотр", required: true },
  { title: "Отчет об оценке", collateralType: "any", clientType: "any", taskType: "Единичная переоценка", required: true },
  { title: "Страховой полис", collateralType: "any", clientType: "ЮЛ", taskType: "Плановый мониторинг", required: true },
  { title: "Страховой полис", collateralType: "any", clientType: "ЮЛ", taskType: "Внеплановый мониторинг", required: true },
  { title: "Кадастровая выписка", collateralType: "Недвижимость", clientType: "any", taskType: "any", required: true },
  { title: "СТС / техпаспорт", collateralType: "Автотранспорт", clientType: "any", taskType: "any", required: true },
  { title: "Инвентаризационная ведомость", collateralType: "Товары в обороте", clientType: "ЮЛ", taskType: "any", required: true },
  { title: "Дополнительный документ", collateralType: "any", clientType: "any", taskType: "any", required: false }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value, currency = "RUB") {
  const amount = Number(value || 0).toLocaleString("ru-RU");
  const displayCurrency = currency === "RUB" ? "₽" : currency;
  return `${amount} ${displayCurrency}`;
}

function badge(text, tone = "") {
  const value = String(text ?? "-");
  const inferred = tone || badgeTone(value);
  return `<span class="badge badge-${inferred}">${escapeHtml(value)}</span>`;
}

function badgeTone(value) {
  const text = String(value).toLowerCase();
  if (/(крит|проср|ошиб|не обеспеч|возврат|доработ)/i.test(text)) return "danger";
  if (/(истека|частич|предуп|отлож|в работе|высок)/i.test(text)) return "warn";
  if (/(действ|оплачен|заверш|успеш|полное|хорош)/i.test(text)) return "ok";
  if (/(назнач|сегодня|средн|норма|инфо)/i.test(text)) return "info";
  return "neutral";
}

function getRole() {
  return roles.find((item) => item.id === state.roleId) || roles[0];
}

function getSwitcherRoles() {
  return roles.filter((item) => item.id !== "admin");
}

function renderRoleSwitcher(role) {
  return `
    <div class="role-box">
      <span class="role-user" title="${escapeHtml(role.user)}">${escapeHtml(role.user)}</span>
      <select data-action="change-role">
        ${getSwitcherRoles().map((item) => `<option value="${item.id}" ${item.id === role.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
      </select>
    </div>
  `;
}

function getRoute() {
  return window.location.hash.replace(/^#/, "") || "/app/tasks";
}

function parseRoute() {
  const [path, query = ""] = getRoute().split("?");
  return { path, query: new URLSearchParams(query) };
}

function updateCollateralTabRoute(tab) {
  state.collateralTab = tab || "overview";
  const { path, query } = parseRoute();
  if (!path.startsWith("/app/collaterals/")) {
    render();
    return;
  }
  query.set("tab", state.collateralTab);
  const route = `${path}?${query.toString()}`;
  if (getRoute() === route) render();
  else window.location.hash = route;
}

function getTask(id) {
  return state.data.tasks.find((item) => item.id === id);
}

function getCollateral(id) {
  return state.data.collaterals.find((item) => item.id === id);
}

function getContract(id) {
  return state.data.contracts.find((item) => item.id === id);
}

function getContractByNumber(number) {
  return state.data.contracts.find((item) => item.number === number || item.id === number);
}

function getTaskCollaterals(task) {
  const ids = task?.collateralIds?.length ? task.collateralIds : [task?.collateralId].filter(Boolean);
  return ids.map(getCollateral).filter(Boolean);
}

function getTaskActiveCollateral(task, collaterals) {
  const activeId = state.taskActiveCollateral[task.id] || task.collateralId || collaterals[0]?.id;
  return collaterals.find((item) => item.id === activeId) || collaterals[0] || null;
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function isInternalTaskParty(value) {
  return /управление залогов|залоговое подразделение|планировщик|система/i.test(String(value || ""));
}

function getTaskContracts(task, collaterals = getTaskCollaterals(task)) {
  const ids = [];
  collaterals.forEach((collateral) => ids.push(...(collateral.contractIds || [])));
  if (!ids.length && task?.contractId) ids.push(task.contractId);
  return uniqueItems(ids).map(getContract).filter(Boolean);
}

function getTaskActiveContracts(task, activeCollateral) {
  const ids = activeCollateral?.contractIds?.length ? activeCollateral.contractIds : [task?.contractId].filter(Boolean);
  return uniqueItems(ids).map(getContract).filter(Boolean);
}

function getTaskActiveContract(task, activeCollateral) {
  return getTaskActiveContracts(task, activeCollateral)[0] || getContract(task?.contractId);
}

function getTaskContractClientNames(task, collaterals = getTaskCollaterals(task)) {
  const names = getTaskContracts(task, collaterals).map((contract) => contract.clientName);
  if (!names.length && task?.client && !isInternalTaskParty(task.client)) names.push(task.client);
  return uniqueItems(names);
}

function getContractPartyRole(contract) {
  const role = contract?.participants?.find((item) => !/залогодатель|поручитель/i.test(item.role || ""))?.role;
  if (role) return role;
  const product = String(contract?.product || "").toLowerCase();
  if (product.includes("гарант")) return "Принципал";
  if (product.includes("лизинг")) return "Лизингополучатель";
  if (product.includes("кредит") || product.includes("ипотеч")) return "Заемщик";
  return "Клиент по договору";
}

function summarizeNames(names, limit = 2) {
  const unique = uniqueItems(names);
  if (!unique.length) return "-";
  if (unique.length <= limit) return unique.join(", ");
  return `${unique.length} клиента по договору: ${unique.slice(0, limit).join(", ")} +${unique.length - limit}`;
}

function getTaskClientSummary(task, collaterals = getTaskCollaterals(task)) {
  return summarizeNames(getTaskContractClientNames(task, collaterals));
}

function getTaskInitiator(task) {
  if (task?.client && isInternalTaskParty(task.client)) return task.client;
  return task?.source || "-";
}

function normalizeTaskType(type) {
  return String(type || "").toLowerCase();
}

function isInspectionTaskType(type) {
  const normalized = normalizeTaskType(type);
  return normalized.includes("осмотр") && !isMobileInspectionTaskType(type);
}

function isMobileInspectionTaskType(type) {
  const normalized = normalizeTaskType(type);
  return normalized.includes("выездной осмотр");
}

function isMonitoringTaskType(type) {
  return normalizeTaskType(type).includes("мониторинг");
}

function isRevaluationTaskType(type) {
  return normalizeTaskType(type).includes("переоценк");
}

function isListRevaluationTaskType(type) {
  return normalizeTaskType(type).includes("списоч");
}

function isPledgeOperationTaskType(type) {
  const normalized = normalizeTaskType(type);
  return normalized.includes("постановка в залог") || normalized.includes("снятие обременения") || normalized.includes("замена залога");
}

function isReportingTaskType(type) {
  return normalizeTaskType(type).includes("отчетност");
}

function render() {
  const role = getRole();
  const { path, query } = parseRoute();
  const isMobileOnlyRole = role.menu.length === 1 && role.menu.includes("mobileEmployee");
  if (isMobileOnlyRole && !path.startsWith("/mobile/employee/tasks")) {
    window.location.hash = "/mobile/employee/tasks";
    return;
  }
  const content = renderRoute(path, query);
  if (isMobileOnlyRole) {
    app.innerHTML = `
      <div class="mobile-app-shell">
        <div class="mobile-prototype-toolbar">
          ${renderRoleSwitcher(role)}
        </div>
        <main class="mobile-main">${content}</main>
        ${renderModal()}
        ${renderToasts()}
      </div>
    `;
    restorePendingScrollPosition();
    restorePendingMobileScrollPosition();
    restorePendingFilterFocus();
    focusPendingRegistryTable();
    return;
  }
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar(role, path)}
      <main class="main">${content}</main>
      ${renderModal()}
      ${renderToasts()}
    </div>
  `;
  restorePendingScrollPosition();
  restorePendingFilterFocus();
  focusPendingRegistryTable();
}

function renderTopbar(role, path) {
  const menu = navItems.filter((item) => role.menu.includes(item.id) && item.id !== "mobileEmployee");
  const mobileMenu = navItems.filter((item) => role.menu.includes(item.id) && item.id === "mobileEmployee");
  const items = menu.length ? menu : mobileMenu;
  const activeItem = items.find((item) => path.startsWith(item.path)) || items[0];
  return `
    <aside class="arm-sidebar">
      <div class="sidebar-brand-wrap">
        <button class="brand brand-visual-logo" data-route="/app/tasks" aria-label="Главная страница системы">
          <svg class="system-logo system-logo-inline" viewBox="0 0 178 44" aria-hidden="true" focusable="false">
            <path class="logo-track" d="M10 29H40L61 18H74M104 18H118L139 29H168" />
            <g class="logo-object logo-home">
              <path d="M31 14L18 24V35H44V24L31 14Z" />
              <path d="M26 35V27H36V35" />
            </g>
            <g class="logo-object logo-car">
              <path d="M112 27H136L141 33H146C148 33 150 35 150 37V39H107V37C107 35 109 33 111 33H115L119 29" />
              <circle cx="118" cy="39" r="3" />
              <circle cx="137" cy="39" r="3" />
            </g>
            <g class="logo-object logo-doc">
              <path d="M153 13H168V31H153Z" />
              <path d="M157 19H164M157 24H164" />
            </g>
            <g class="logo-shield">
              <path d="M89 6L105 12V23C105 32 99 37 89 40C79 37 73 32 73 23V12L89 6Z" />
              <path d="M82 23L87 28L97 17" />
            </g>
            <g class="logo-dots">
              <circle cx="40" cy="29" r="3" />
              <circle cx="61" cy="18" r="3" />
              <circle cx="118" cy="18" r="3" />
              <circle cx="139" cy="29" r="3" />
            </g>
            <path class="logo-baseline" d="M12 41H166" />
          </svg>
        </button>
      </div>
      <nav class="top-nav" aria-label="Основные разделы">
        ${items.map((item) => `<button class="${path.startsWith(item.path) ? "active" : ""}" data-route="${item.path}">${escapeHtml(item.label)}</button>`).join("")}
      </nav>
      <div class="sidebar-signal" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    </aside>
    <header class="app-header">
      <div class="workspace-heading">
        <span>АРМ</span>
        <strong>${escapeHtml(activeItem?.label || "Рабочая область")}</strong>
      </div>
      ${renderRoleSwitcher(role)}
    </header>
  `;
}

function renderRoute(path, query) {
  if (path === "/" || path === "/app") return renderTasksRegistry();
  if (path === "/app/tasks") return renderTasksRegistry();
  if (path === "/app/tasks/new") return renderTaskCreate(query);
  if (path.startsWith("/app/tasks/")) return renderTaskCard(path.split("/").pop());
  if (path === "/app/contracts") return renderContractsRegistry();
  if (path.startsWith("/app/contracts/")) return renderContractCard(path.split("/").pop());
  if (path === "/app/collaterals") return renderCollateralsRegistry();
  if (path.startsWith("/app/collaterals/")) return renderCollateralCard(path.split("/").pop(), query);
  if (path === "/app/insurances") return renderInsurancePoliciesRegistry();
  if (path === "/app/reports") return renderReports();
  if (path.startsWith("/app/print/")) return renderPrintPreview(path.split("/").pop());
  if (path === "/mobile/employee/tasks") return renderMobileEmployeeTasks();
  if (path.startsWith("/mobile/employee/tasks/") && path.endsWith("/photos")) return renderMobilePhotos(path.split("/")[4]);
  return renderNotFound("Раздел не найден", "/app/tasks");
}

function renderPageHeader(title, text, actions = "") {
  return `
    <div class="breadcrumbs"><button class="link" data-route="/app/tasks">Главная</button><span>/</span><span>${escapeHtml(title)}</span></div>
    <section class="page-header">
      <div><h1>${escapeHtml(title)}</h1>${text ? `<p>${escapeHtml(text)}</p>` : ""}</div>
      <div class="header-actions">${actions}</div>
    </section>
  `;
}

function renderNotFound(title, route) {
  return `<section class="error-state"><h2>${escapeHtml(title)}</h2><button class="btn btn-primary" data-route="${route}">Вернуться</button></section>`;
}

function renderInfoGrid(items) {
  return `
    <dl class="info-grid">
      ${Object.entries(items).map(([key, value]) => `
        <div><dt>${escapeHtml(key)}</dt><dd>${typeof value === "string" && value.startsWith("<") ? value : escapeHtml(value ?? "-")}</dd></div>
      `).join("")}
    </dl>
  `;
}

const chartPalette = ["#2563eb", "#1e40af", "#0ea5e9", "#b45309", "#b91c1c", "#6d28d9", "#15803d"];
const contractCurrencyRates = { RUB: 1 };

function sumBy(items, getter) {
  return items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || "Не указано";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toSegments(counter, options = {}) {
  const entries = Array.isArray(counter) ? counter : Object.entries(counter).map(([label, value]) => ({ label, value }));
  return entries
    .filter((item) => Number(item.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, options.limit || entries.length)
    .map((item, index) => ({ ...item, color: item.color || chartPalette[index % chartPalette.length] }));
}

function formatShortMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} млрд ₽`;
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000).toLocaleString("ru-RU")} млн ₽`;
  return formatMoney(amount, "RUB");
}

function getContractDebtRub(contract) {
  const rate = contractCurrencyRates[contract?.currency] || 1;
  return Math.round(Number(contract?.debt || 0) * rate);
}

function renderContractDebtCell(contract) {
  const original = contract.currency && contract.currency !== "RUB"
    ? `<br><small>${formatMoney(contract.debt, contract.currency)}</small>`
    : "";
  return `${formatMoney(getContractDebtRub(contract))}${original}`;
}

function getTaskUrgency(task) {
  if (task.sla === "Просрочена") return "Просрочены";
  if (task.sla === "Сегодня") return "Сегодня";
  if (task.sla === "Неделя") return "На неделе";
  return "В срок";
}

const closedTaskStatuses = ["Завершена"];

function isTaskClosed(task) {
  return closedTaskStatuses.includes(task?.status);
}

function isManagerRole(role) {
  return role?.id === "manager" || Boolean(role?.permissions?.reassign && role?.permissions?.reports);
}

function isTaskApprover(role, task) {
  return Boolean(
    role?.permissions?.returnTask
    && task?.approval?.approver === role?.user
    && task?.approval?.status === "На согласовании"
    && task?.assignee === role?.user
  );
}

function getApproverOptions(task) {
  return [...new Set([
    task?.approval?.approver,
    roles.find((role) => role.id === "manager")?.user,
    ...employees
  ].filter(Boolean))];
}

function matchesTaskRegistryTab(task, tabId, role = getRole()) {
  const isManagerView = Boolean(role.permissions.reassign || role.permissions.reports);
  if (tabId === "completed") return isTaskClosed(task) && (isManagerView || task.assignee === role.user);
  if (tabId === "all") return isManagerView && !isTaskClosed(task);
  return task.assignee === role.user && !isTaskClosed(task);
}

function renderTaskRegistryTabs(rows, activeTab, role) {
  const isManagerView = Boolean(role.permissions.reassign || role.permissions.reports);
  const tabs = [
    { id: "mine", label: "Мои задачи", hint: "в работе у текущего пользователя" },
    ...(isManagerView ? [{ id: "all", label: "Все задачи", hint: "задачи подразделения" }] : []),
    { id: "completed", label: "Завершенные", hint: "архив" }
  ];
  return `
    <div class="tabs registry-tabs" role="tablist" aria-label="Срез задач">
      ${tabs.map((tab) => {
        const count = rows.filter((task) => matchesTaskRegistryTab(task, tab.id, role)).length;
        return `
          <button type="button" role="tab" class="${activeTab === tab.id ? "active" : ""}" data-action="task-registry-tab" data-tab="${tab.id}">
            <span>${escapeHtml(tab.label)}</span>
            <small>${escapeHtml(tab.hint)}</small>
            <strong>${count}</strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderKpiGrid(cards) {
  return `
    <section class="kpi-grid registry-kpi-grid">
      ${cards.map((card) => {
        const tag = card.action ? "button" : "div";
        const type = card.action ? ' type="button"' : "";
        return `
        <${tag}${type} class="kpi-card ${card.tone || ""} ${card.active ? "active" : ""}" ${card.action || ""} aria-label="${escapeHtml(card.label)}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          ${card.hint ? `<small>${escapeHtml(card.hint)}</small>` : ""}
        </${tag}>
      `;
      }).join("")}
    </section>
  `;
}

function hasVisualFilters(scope) {
  return Object.values(state.visualFilters[scope] || {}).some(Boolean);
}

function focusPendingRegistryTable() {
  const scope = state.pendingRegistryFocus;
  if (!scope) return;
  state.pendingRegistryFocus = "";
  const focus = () => {
    const table = document.querySelector(`[data-registry-table="${scope}"]`);
    if (!table) return;
    table.scrollIntoView({ behavior: "smooth", block: "start" });
    table.focus({ preventScroll: true });
  };
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(focus);
  else setTimeout(focus, 0);
}

function restorePendingScrollPosition() {
  const target = state.pendingScrollRestore;
  if (!target) return;
  state.pendingScrollRestore = null;
  const restore = () => window.scrollTo({ top: target.top, left: target.left, behavior: "instant" });
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restore);
  else setTimeout(restore, 0);
}

function rememberMobileScrollPosition(field) {
  const content = field?.closest?.(".mobile-content");
  state.pendingMobileScrollRestore = {
    windowTop: window.scrollY,
    windowLeft: window.scrollX,
    contentTop: content?.scrollTop || 0,
    task: field?.dataset?.task || "",
    collateral: field?.dataset?.collateral || "",
    factor: field?.dataset?.factor || ""
  };
}

function restorePendingMobileScrollPosition() {
  const target = state.pendingMobileScrollRestore;
  if (!target) return;
  state.pendingMobileScrollRestore = null;
  const restore = () => {
    const content = document.querySelector(".mobile-content");
    if (content) content.scrollTop = target.contentTop;
    window.scrollTo({ top: target.windowTop, left: target.windowLeft, behavior: "instant" });
    const field = Array.from(document.querySelectorAll("[data-mobile-check-factor]"))
      .find((item) => item.dataset.task === target.task && item.dataset.collateral === target.collateral && item.dataset.factor === target.factor);
    if (field) field.focus({ preventScroll: true });
  };
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restore);
  else setTimeout(restore, 0);
}

function restorePendingFilterFocus() {
  const target = state.pendingFilterFocus;
  if (!target) return;
  state.pendingFilterFocus = null;
  const restore = () => {
    const field = document.querySelector(`[data-filter-scope="${target.scope}"][data-filter-name="${target.name}"]`);
    if (!field) return;
    field.focus({ preventScroll: true });
    if (typeof field.setSelectionRange === "function") {
      field.setSelectionRange(target.selectionStart, target.selectionEnd);
    }
  };
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restore);
  else setTimeout(restore, 0);
}

function isTextRegistryFilter(field) {
  return field?.matches?.("input[data-filter-scope]")
    && !["date", "checkbox", "radio", "file"].includes(field.type);
}

function updateRegistryFilter(field) {
  const scope = field.dataset.filterScope;
  const name = field.dataset.filterName;
  if (!state.filters[scope]) return;
  state.filters[scope][name] = field.value;
}

function scheduleRegistryFilterRender(field) {
  if (registryFilterRenderTimer) clearTimeout(registryFilterRenderTimer);
  state.pendingFilterFocus = {
    scope: field.dataset.filterScope,
    name: field.dataset.filterName,
    selectionStart: typeof field.selectionStart === "number" ? field.selectionStart : field.value.length,
    selectionEnd: typeof field.selectionEnd === "number" ? field.selectionEnd : field.value.length
  };
  state.pendingScrollRestore = { top: window.scrollY, left: window.scrollX };
  registryFilterRenderTimer = setTimeout(() => {
    registryFilterRenderTimer = null;
    render();
  }, 350);
}

function resetVisualFilters(scope) {
  if (!state.visualFilters[scope]) return;
  state.visualFilters[scope] = Object.fromEntries(Object.keys(state.visualFilters[scope]).map((key) => [key, ""]));
}

function applyRegistryKpiFilter(scope, filter, value) {
  if (!state.visualFilters[scope]) return;
  const sameActive = filter && filter !== "all" && state.visualFilters[scope]?.[filter] === value;
  resetVisualFilters(scope);
  if (filter && filter !== "all" && !sameActive) state.visualFilters[scope][filter] = value;
  state.pendingRegistryFocus = scope;
}

function renderDonutPanel({ title, subtitle, segments, total, centerLabel, scope, filterKey, activeValue, compact = false }) {
  const numericTotal = Number(total) || segments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const safeTotal = numericTotal || 1;
  let current = 0;
  const gradient = segments.length
    ? segments.map((item) => {
      const start = current;
      current += (Number(item.value || 0) / safeTotal) * 100;
      return `${item.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    }).join(", ")
    : "#e2e8f0 0% 100%";
  return `
    <section class="panel chart-panel ${compact ? "compact-donut-panel" : ""}">
      <div class="panel-title"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p class="hint">${escapeHtml(subtitle)}</p>` : ""}</div></div>
      <div class="donut-row">
        <div class="donut" style="background: conic-gradient(${gradient});"><span>${escapeHtml(centerLabel || String(numericTotal || 0))}</span></div>
        <div class="legend-list">
          ${segments.map((item) => `
            <button class="${activeValue === item.label ? "active" : ""}" data-action="visual-filter" data-scope="${scope}" data-filter="${filterKey}" data-value="${escapeHtml(item.label)}">
              <i style="background:${item.color}"></i>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(String(item.valueLabel || item.value))}</strong>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderBarPanel({ title, subtitle, segments, scope, filterKey, activeValue, valueFormatter = (value) => value, compact = false }) {
  const max = Math.max(...segments.map((item) => Number(item.value || 0)), 1);
  return `
    <section class="panel chart-panel ${compact ? "compact-bar-panel" : ""}">
      <div class="panel-title"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p class="hint">${escapeHtml(subtitle)}</p>` : ""}</div></div>
      <div class="bar-list">
        ${segments.map((item) => {
          const width = Math.max(5, Math.round((Number(item.value || 0) / max) * 100));
          const tone = item.tone || (item.label.includes("Проср") || item.label.includes("Не обеспеч") || item.label.includes("Крит") ? "danger" : item.label.includes("Част") || item.label.includes("Сегодня") || item.label.includes("Истека") ? "warning" : "");
          return `
            <button class="bar-row ${tone} ${activeValue === item.label ? "active" : ""}" data-action="visual-filter" data-scope="${scope}" data-filter="${filterKey}" data-value="${escapeHtml(item.label)}">
              <span>${escapeHtml(item.label)}</span>
              <div><i style="width:${width}%; background:${item.color || ""};"></i></div>
              <strong>${escapeHtml(String(valueFormatter(item.value)))}</strong>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function getTaskUrgencyTone(urgency) {
  if (urgency === "Просрочены") return "danger";
  if (urgency === "Сегодня") return "warning";
  if (urgency === "На неделе") return "info";
  return "ok";
}

function getTaskPriorityTone(priority) {
  if (priority === "Критический") return "danger";
  if (priority === "Высокий") return "warning";
  if (priority === "Средний") return "info";
  return "ok";
}

function getTaskQueueWeight(task) {
  const urgencyRank = { "Просрочены": 0, "Сегодня": 1, "На неделе": 2, "В срок": 3 };
  const priorityRank = { "Критический": 0, "Высокий": 1, "Средний": 2, "Низкий": 3 };
  return (urgencyRank[getTaskUrgency(task)] ?? 4) * 10 + (priorityRank[task.priority] ?? 4);
}

function isManagerDecisionTask(task) {
  if (!task || isTaskClosed(task)) return false;
  const urgency = getTaskUrgency(task);
  const isUrgent = urgency === "Просрочены" || urgency === "Сегодня";
  const needsEscalation = ["Критический", "Высокий"].includes(task.priority) || ["На доработке", "Отложена"].includes(task.status);
  return isUrgent && needsEscalation;
}

function getManagerDecisionTasks(rows, limit = 4) {
  return [...rows]
    .filter(isManagerDecisionTask)
    .sort((a, b) => getTaskQueueWeight(a) - getTaskQueueWeight(b) || String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, limit);
}

function renderTaskMetricStrip(cards) {
  return `
    <div class="task-metric-strip">
      ${cards.map((card) => `
        <button type="button" class="task-metric ${card.tone || ""} ${card.active ? "active" : ""}" ${card.action || ""}>
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <small>${escapeHtml(card.hint || "")}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderTaskSlaBoard(segments, total, visual) {
  return `
    <section class="panel task-sla-board">
      <div class="panel-title">
        <div><h2>SLA и сроки</h2><p class="hint">Приоритет по срокам</p></div>
      </div>
      <div class="task-sla-tiles">
        ${segments.map((item) => {
          const value = Number(item.value || 0);
          const percent = total ? Math.round((value / total) * 100) : 0;
          const tone = getTaskUrgencyTone(item.label);
          return `
            <button type="button" class="task-sla-tile ${tone} ${visual.urgency === item.label ? "active" : ""}" data-action="visual-filter" data-scope="tasks" data-filter="urgency" data-value="${escapeHtml(item.label)}">
              <span><i></i>${escapeHtml(item.label)}</span>
              <strong>${value}</strong>
              <small>${percent}% очереди</small>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderTaskTypeBoard(segments, total, visual) {
  const visible = segments.slice(0, 6);
  const restValue = segments.slice(6).reduce((sum, item) => sum + Number(item.value || 0), 0);
  const displaySegments = restValue
    ? [...visible, { label: "Другие типы", value: restValue, color: "#94a3b8", summary: true }]
    : visible;
  return `
    <section class="panel task-type-board">
      <div class="panel-title">
        <div><h2>Типы задач</h2><p class="hint">Доли в очереди</p></div>
      </div>
      <div class="task-type-distribution" aria-hidden="true">
        ${displaySegments.map((item) => {
          const percent = total ? Math.round((Number(item.value || 0) / total) * 100) : 0;
          return `<span style="--slice-width:${percent}%; --task-color:${item.color}"></span>`;
        }).join("")}
      </div>
      <div class="task-type-list">
        ${displaySegments.map((item) => {
          const percent = total ? Math.round((Number(item.value || 0) / total) * 100) : 0;
          const content = `
            <span><i></i>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(String(item.value))}</strong>
            <small>${percent}%</small>
          `;
          return item.summary
            ? `<div class="task-type-rank muted" style="--task-color:${item.color}">${content}</div>`
            : `<button type="button" class="task-type-rank ${visual.type === item.label ? "active" : ""}" style="--task-color:${item.color}" data-action="visual-filter" data-scope="tasks" data-filter="type" data-value="${escapeHtml(item.label)}">${content}</button>`;
        }).join("")}
      </div>
    </section>
  `;
}

function renderTaskAssigneeBoard(segments, activeAssignee) {
  const max = Math.max(...segments.map((item) => Number(item.value || 0)), 1);
  return `
    <section class="panel task-assignee-board">
      <div class="panel-title">
        <div><h2>Загрузка исполнителей</h2><p class="hint">Активные задачи по ответственным</p></div>
      </div>
      <div class="task-assignee-list">
        ${segments.map((item) => {
          const width = Math.max(8, Math.round((Number(item.value || 0) / max) * 100));
          return `
            <button type="button" class="task-assignee-row ${activeAssignee === item.label ? "active" : ""}" data-action="task-assignee-filter" data-value="${escapeHtml(item.label)}">
              <span>${escapeHtml(item.label)}</span>
              <i><b style="width:${width}%"></b></i>
              <strong>${escapeHtml(String(item.value))}</strong>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderTaskQueuePanel(queueRows, visibleCount, baseCount) {
  return `
    <section class="panel task-queue-panel">
      <div class="panel-title">
        <div><h2>Очередь обработки</h2><p class="hint">Сначала показываются срочные и критические задачи</p></div>
        <span class="panel-note">${visibleCount} из ${baseCount}</span>
      </div>
      ${queueRows.length ? `
        <div class="task-queue-list">
          ${queueRows.map((task) => {
            const collaterals = getTaskCollaterals(task);
            const collateral = collaterals[0] || getCollateral(task.collateralId);
            const collateralText = collaterals.length > 1
              ? `${collaterals.length} залогов`
              : collateral?.description || task.collateralId || "Без объекта";
            const urgency = getTaskUrgency(task);
            return `
              <article class="task-queue-item ${getTaskUrgencyTone(urgency)}">
                <div>
                  <a class="link registry-object-link" href="#/app/tasks/${escapeHtml(task.id)}">${escapeHtml(task.id)}</a>
                  <strong>${escapeHtml(task.type)}</strong>
                  <small>${escapeHtml(getTaskClientSummary(task, collaterals))} · ${escapeHtml(collateralText)}</small>
                </div>
                <div>
                  ${badge(task.priority)}
                  <small>${escapeHtml(task.dueDate)} · ${escapeHtml(urgency)}</small>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : renderEmpty("Очередь пуста", "Измените фильтры или выберите другой срез.", "tasks")}
    </section>
  `;
}

function renderTaskRegistryToolbar(filteredRows, activeTab, role, activeFilterCount, rowsCount, baseCount) {
  return `
    <section class="task-registry-toolbar">
      <div>
        ${renderTaskRegistryTabs(filteredRows, activeTab, role)}
      </div>
    </section>
  `;
}

function renderTaskRiskHeatmapPanel(baseRows, visual) {
  const urgencyOrder = ["Просрочены", "Сегодня", "На неделе", "В срок"];
  const activeRows = baseRows.filter((task) => !isTaskClosed(task));
  const typeRows = toSegments(countBy(activeRows, (task) => task.type))
    .map((typeItem) => {
      const counts = Object.fromEntries(urgencyOrder.map((urgency) => [
        urgency,
        activeRows.filter((task) => task.type === typeItem.label && getTaskUrgency(task) === urgency).length
      ]));
      const focus = counts["Просрочены"] + counts["Сегодня"];
      const score = counts["Просрочены"] * 3 + counts["Сегодня"] * 2 + counts["На неделе"];
      return { ...typeItem, counts, focus, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.value || 0) - Number(a.value || 0));
  const weekRiskCount = activeRows.filter((task) => ["Просрочены", "Сегодня", "На неделе"].includes(getTaskUrgency(task))).length;
  const attentionTasks = getManagerDecisionTasks(activeRows, 3);
  return `
    <section class="panel task-risk-heatmap-panel">
      <div class="panel-title">
        <div><h2>Проблемные зоны</h2><p class="hint">Сроковой риск по типам задач</p></div>
        <span class="panel-note">До недели: ${weekRiskCount}</span>
      </div>
      ${typeRows.length ? `
        <div class="task-risk-matrix">
          <div class="task-risk-matrix-head">
            <span>Тип задачи</span>
            <span>Что требует внимания</span>
            <span>Проср.</span>
            <span>Сегодня</span>
            <span>Неделя</span>
            <span>Всего</span>
          </div>
          ${typeRows.map((typeItem) => {
            const taskType = typeItem.label;
            const total = Number(typeItem.value || 0);
            const overdue = Number(typeItem.counts["Просрочены"] || 0);
            const today = Number(typeItem.counts["Сегодня"] || 0);
            const week = Number(typeItem.counts["На неделе"] || 0);
            const overdueAssignees = toSegments(countBy(
              activeRows.filter((task) => task.type === taskType && getTaskUrgency(task) === "Просрочены"),
              (task) => task.assignee
            ));
            const visibleOverdueAssignees = overdueAssignees.slice(0, 2);
            const hiddenOverdueAssignees = overdueAssignees.length - visibleOverdueAssignees.length;
            const overdueAssigneeDetails = visibleOverdueAssignees.length
              ? `${visibleOverdueAssignees.map((item) => `${item.label} - ${item.value}`).join(" · ")}${hiddenOverdueAssignees > 0 ? ` · + еще ${hiddenOverdueAssignees}` : ""}`
              : "";
            const reasonTone = overdue ? "danger" : today ? "warning" : "info";
            const reasonTitle = overdue ? `Просрочка: ${overdue}` : today ? `Истекает сегодня: ${today}` : `На неделе: ${week}`;
            const reasonDetails = overdue
              ? overdueAssigneeDetails
              : today
                ? `На неделе ${week} · просрочек нет`
                : `Просрочек нет · сегодня 0`;
            return `
              <button type="button" class="task-risk-matrix-row ${visual.type === taskType ? "active" : ""}" data-action="task-risk-row" data-type="${escapeHtml(taskType)}">
                <span title="${escapeHtml(taskType)}"><i style="background:${typeItem.color}"></i>${escapeHtml(taskType)}</span>
                <span class="task-risk-reason ${reasonTone}">
                  <b>${escapeHtml(reasonTitle)}</b>
                  <small>${escapeHtml(reasonDetails)}</small>
                </span>
                <strong class="danger">${overdue}</strong>
                <strong class="warning">${today}</strong>
                <strong class="info">${week}</strong>
                <strong>${total}</strong>
              </button>
            `;
          }).join("")}
        </div>
        <div class="task-attention-list">
          <div class="task-attention-title">
            <h3>Требуют решения</h3>
            <span>${attentionTasks.length}</span>
          </div>
          ${attentionTasks.length ? attentionTasks.map((task) => `
            <article class="task-attention-item ${getTaskUrgencyTone(getTaskUrgency(task))}">
              <div>
                <a class="link registry-object-link" href="#/app/tasks/${escapeHtml(task.id)}">${escapeHtml(task.id)}</a>
                <strong>${escapeHtml(task.type)}</strong>
                <small>${escapeHtml(task.assignee)} · ${escapeHtml(task.dueDate)} · ${escapeHtml(getTaskUrgency(task))}</small>
              </div>
              ${badge(task.priority)}
            </article>
          `).join("") : `<div class="task-attention-empty">Нет срочных задач с высоким приоритетом или проблемным статусом</div>`}
        </div>
      ` : renderEmpty("Сроковых рисков нет", "Нет просроченных задач и задач со сроком в ближайшую неделю.", "tasks")}
    </section>
  `;
}

function renderTasksRegistry() {
  const role = getRole();
  const filters = state.filters.tasks;
  const visual = state.visualFilters.tasks;
  const isManagerView = Boolean(role.permissions.reassign || role.permissions.reports);
  const requestedTab = state.taskRegistryTab || (isManagerView ? "all" : "mine");
  const activeTab = !isManagerView && requestedTab === "all" ? "mine" : requestedTab;
  const filteredRows = state.data.tasks.filter((task) => {
    const collaterals = getTaskCollaterals(task);
    const contracts = getTaskContracts(task, collaterals);
    const collateralSearch = collaterals.map((item) => item.id).join(" ");
    const clientIdSearch = [
      ...contracts.map((contract) => contract.inn),
      ...collaterals.map((collateral) => collateral.clientId)
    ].join(" ");
    const clientNameSearch = [
      ...contracts.map((contract) => contract.clientName),
      ...collaterals.map((collateral) => collateral.clientName)
    ].join(" ");
    return matches(task.id, filters.number)
      && matches(clientIdSearch, filters.clientId)
      && matches(clientNameSearch, filters.clientName)
      && matches(collateralSearch || task.collateralId, filters.collateralId)
      && matches(task.type, filters.type)
      && matches(task.status, filters.status)
      && matches(task.assignee, filters.assignee);
  });
  const baseRows = filteredRows.filter((task) => matchesTaskRegistryTab(task, activeTab, role));
  const rows = baseRows.filter((task) =>
    (!visual.type || task.type === visual.type)
    && (!visual.urgency || getTaskUrgency(task) === visual.urgency)
    && (!visual.status || task.status === visual.status)
    && (!visual.priority || task.priority === visual.priority)
  );
  const typeSegments = toSegments(countBy(baseRows, (task) => task.type));
  const urgencyOrder = ["Просрочены", "Сегодня", "На неделе", "В срок"];
  const urgencyCounts = countBy(baseRows, getTaskUrgency);
  const urgencySegments = urgencyOrder.map((label) => ({ label, value: urgencyCounts[label] || 0 }));
  const assigneeSegments = toSegments(countBy(baseRows.filter((task) => !isTaskClosed(task)), (task) => task.assignee), { limit: 6 });
  const queueSourceRows = rows;
  const queueRows = [...queueSourceRows].sort((a, b) => getTaskQueueWeight(a) - getTaskQueueWeight(b) || String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 6);
  const taskTypeOptions = ["", ...new Set([...taskTypes, ...state.data.tasks.map((task) => task.type)])];
  const activeFilterCount = Object.values(filters).filter(Boolean).length + Object.values(visual).filter(Boolean).length;
  return `
    ${renderPageHeader("Реестр задач", "Рабочая очередь задач по залогам, осмотрам, мониторингу и оценке.",
      `${role.permissions.createTask ? `<button class="btn btn-primary" data-route="/app/tasks/new">Создать задачу</button>` : ""}`)}
    <div class="task-registry-workspace">
      ${renderTaskRegistryToolbar(filteredRows, activeTab, role, activeFilterCount, rows.length, baseRows.length)}
      <section class="task-board-grid ${isManagerView ? "manager-view" : "specialist-view"}">
        ${renderTaskQueuePanel(queueRows, queueRows.length, queueSourceRows.length)}
        ${isManagerView ? `
          <div class="task-manager-side-stack">
            ${renderTaskSlaBoard(urgencySegments, baseRows.length, visual)}
            ${renderTaskAssigneeBoard(assigneeSegments, filters.assignee)}
          </div>
          ${renderTaskRiskHeatmapPanel(baseRows, visual)}
        ` : `
          <div class="task-side-stack">
            ${renderTaskSlaBoard(urgencySegments, baseRows.length, visual)}
            ${renderTaskTypeBoard(typeSegments, baseRows.length, visual)}
          </div>
        `}
      </section>
      <section class="panel task-filter-panel">
        <div class="panel-title">
        <div><h2>Фильтры реестра</h2><p class="hint">Поиск по задаче, заемщику, залогодателю, объекту и исполнителю</p></div>
        </div>
        <div class="filter-grid registry-filter-grid">
          ${filterInput("tasks", "number", "Номер задачи")}
          ${filterInput("tasks", "clientId", "ИНН клиента по договору/залогодателя")}
          ${filterInput("tasks", "clientName", "Клиент по договору/залогодатель")}
          ${filterInput("tasks", "collateralId", "Идентификатор залога")}
          ${filterSelect("tasks", "type", "Тип задачи", taskTypeOptions)}
          ${filterSelect("tasks", "status", "Статус", ["", "Назначена", "В работе", "На согласовании", "Отложена", "На доработке", "Завершена"])}
          ${filterSelect("tasks", "assignee", "Исполнитель", ["", ...employees])}
          <button class="btn btn-secondary" data-action="reset-filters" data-scope="tasks">Сбросить</button>
        </div>
      </section>
      <section class="panel table-panel task-table-panel" data-registry-table="tasks" tabindex="-1">
        <div class="panel-title"><h2>Задачи</h2><span class="panel-note">${rows.length} из ${baseRows.length}</span></div>
        ${rows.length ? `
          <table class="task-table-modern">
            <thead><tr><th>Задача</th><th>Клиент по договору/залогодатель и залог</th><th>Тип задачи</th><th>Исполнитель</th><th>SLA</th><th>Статус</th><th>Приоритет</th></tr></thead>
            <tbody>${rows.map((task) => {
              const collaterals = getTaskCollaterals(task);
              const collateral = collaterals[0] || getCollateral(task.collateralId);
              const collateralText = collaterals.length > 1
                ? `${collaterals.length} залогов: ${collaterals.slice(0, 3).map((item) => item.id).join(", ")}${collaterals.length > 3 ? " ..." : ""}`
                : `${collateral?.id || task.collateralId || "-"} · ${collateral?.description || "Объект не найден"}`;
              const urgency = getTaskUrgency(task);
              return `
                <tr>
                  <td><a class="link registry-object-link" href="#/app/tasks/${escapeHtml(task.id)}">${escapeHtml(task.id)}</a><br><small>${escapeHtml(task.createdAt)} · ${escapeHtml(task.source)}</small></td>
                  <td><strong>${escapeHtml(getTaskClientSummary(task, collaterals))}</strong><br><small>${escapeHtml(collateralText)}</small></td>
                  <td>${escapeHtml(task.type)}</td>
                  <td>${escapeHtml(task.assignee)}</td>
                  <td><span class="task-urgency ${getTaskUrgencyTone(urgency)}"><i></i>${escapeHtml(urgency)}</span><br><small>${escapeHtml(task.dueDate)}</small></td>
                  <td>${badge(task.status)}</td>
                  <td>${badge(task.priority)}</td>
                </tr>
              `;
            }).join("")}</tbody>
          </table>` : renderEmpty("Задачи не найдены", "Измените фильтры или создайте новую задачу.", "tasks")}
      </section>
    </div>
  `;
}

function renderContractsRegistry() {
  const filters = state.filters.contracts;
  const visual = state.visualFilters.contracts;
  const baseRows = state.data.contracts.filter((contract) =>
    matches(contract.inn, filters.clientId)
    && matches(contract.clientName, filters.clientName)
    && matches(contract.gsz, filters.gsz)
    && matches(contract.number, filters.number)
    && matchesDateRange(contract.startDate, filters.periodFrom, filters.periodTo)
    && matches(contract.collateralIds.join(" "), filters.collateralId)
    && matches(contract.status, filters.status)
  );
  const rows = baseRows.filter((contract) =>
    (!visual.coverage || getContractCoverageBucket(contract).label === visual.coverage)
    && (!visual.ltv || getContractLtvBucket(contract).label === visual.ltv)
    && (!visual.maturity || getContractMaturityBucket(contract).label === visual.maturity)
    && (!visual.gszExposure || contract.gsz === visual.gszExposure)
    && (!visual.kpi || matchesContractKpi(contract, visual.kpi))
  );
  const filteredTotals = getContractsTotals(rows);
  const debtTotal = sumBy(baseRows, getContractDebtRub);
  const allocatedTotal = sumBy(baseRows, (contract) => contract.allocatedValue);
  const weightedLtv = allocatedTotal ? Math.round((debtTotal / allocatedTotal) * 100) : 0;
  const deficit = getContractsDeficit(baseRows);
  const highLtvCount = baseRows.filter((contract) => Number(contract.ltv || 0) > 90).length;
  const maturity12Count = baseRows.filter(isContractMaturingWithin12Months).length;
  const coverageSegments = getContractCoverageSegments(baseRows);
  const ltvSegments = getContractLtvSegments(baseRows);
  const maturitySegments = getContractMaturitySegments(baseRows);
  const gszExposureSegments = getContractGszExposureSegments(baseRows);
  const contractStatusOptions = getContractStatusOptions();
  return `
    ${renderPageHeader("Реестр договоров", "Договоры, остатки долга, покрытие и связанные залоги.")}
    ${renderKpiGrid([
      { label: "Кредитный портфель", value: formatShortMoney(debtTotal), hint: "Остаток долга", tone: "info", active: !hasVisualFilters("contracts"), action: 'data-action="registry-kpi" data-scope="contracts" data-filter="all"' },
      { label: "Залоговая стоимость", value: formatShortMoney(allocatedTotal), hint: "Аллоцированная стоимость", tone: "info", action: 'data-action="registry-kpi" data-scope="contracts" data-filter="all"' },
      { label: "Дефицит обеспечения", value: formatShortMoney(deficit), hint: "Долг выше залоговой стоимости", tone: deficit ? "danger" : "info", active: visual.kpi === "deficit", action: 'data-action="registry-kpi" data-scope="contracts" data-filter="kpi" data-value="deficit"' },
      { label: "LTV выше 90%", value: String(highLtvCount), hint: `Средневзвешенный LTV ${weightedLtv}%`, tone: highLtvCount ? "warn" : "info", active: visual.kpi === "high-ltv", action: 'data-action="registry-kpi" data-scope="contracts" data-filter="kpi" data-value="high-ltv"' },
      { label: "Окончание до 12 мес.", value: String(maturity12Count), hint: "Договоры к погашению", tone: maturity12Count ? "warn" : "info", active: visual.kpi === "maturity-12", action: 'data-action="registry-kpi" data-scope="contracts" data-filter="kpi" data-value="maturity-12"' }
    ])}
    <section class="contract-analytics-grid registry-analytics equal-height-analytics">
      ${renderDonutPanel({
        title: "Качество покрытия",
        subtitle: "Договоры по уровню обеспеченности залогом.",
        segments: coverageSegments,
        total: baseRows.length,
        scope: "contracts",
        filterKey: "coverage",
        activeValue: visual.coverage,
        compact: true
      })}
      ${renderContractLtvRiskPanel(ltvSegments, visual.ltv)}
      ${renderBarPanel({
        title: "Сроки окончания договоров",
        subtitle: "Когда договоры выходят на погашение или закрытие.",
        segments: maturitySegments,
        scope: "contracts",
        filterKey: "maturity",
        activeValue: visual.maturity,
        compact: true
      })}
      ${renderBarPanel({
        title: "Концентрация задолженности по ГСЗ",
        subtitle: "Остаток долга по группам связанных заемщиков.",
        segments: gszExposureSegments,
        scope: "contracts",
        filterKey: "gszExposure",
        activeValue: visual.gszExposure,
        valueFormatter: formatShortMoney,
        compact: true
      })}
    </section>
    <section class="panel">
      <div class="filter-grid registry-filter-grid">
        ${filterInput("contracts", "clientId", "ИНН клиента по договору")}
        ${filterInput("contracts", "clientName", "Клиент по договору")}
        ${filterInput("contracts", "gsz", "ГСЗ")}
        ${filterInput("contracts", "number", "Номер договора")}
        ${filterDateRange("contracts", "periodFrom", "periodTo", "Период заключения договора")}
        ${filterInput("contracts", "collateralId", "Идентификатор залога")}
        ${filterSelect("contracts", "status", "Статус договора", contractStatusOptions)}
        <button class="btn btn-secondary" data-action="reset-filters" data-scope="contracts">Сбросить</button>
      </div>
    </section>
    <section class="panel table-panel" data-registry-table="contracts" tabindex="-1">
      <div class="panel-title"><h2>Договоры</h2><span class="panel-note">${rows.length} записей</span></div>
      <table class="contracts-table">
        <thead><tr><th>Договор</th><th>Клиент по договору</th><th>ГСЗ</th><th>Продукт</th><th>Текущий остаток долга</th><th>Рыночная стоимость</th><th>Аллоцированная стоимость</th><th>Совокупный LTV</th><th>Статус покрытия</th><th>Категория качества</th><th>Размер резерва</th><th>Залоги</th></tr></thead>
        <tbody>${rows.map((contract) => `
          <tr>
            <td><a class="link registry-object-link" href="#/app/contracts/${escapeHtml(contract.id)}">${escapeHtml(contract.number)}</a><br><small>${escapeHtml(contract.startDate)} - ${escapeHtml(contract.endDate)}</small><br>${badge(contract.status)}</td>
            <td>${escapeHtml(contract.clientName)}<br><small>${escapeHtml(getContractPartyRole(contract))} · ${escapeHtml(contract.inn)}</small></td>
            <td>${escapeHtml(contract.gsz)}</td>
            <td>${escapeHtml(contract.product)}</td>
            <td>${renderContractDebtCell(contract)}</td>
            <td>${formatMoney(contract.marketValue || 0)}</td>
            <td>${formatMoney(contract.allocatedValue || 0)}</td>
            <td>${badge(`${contract.ltv}%`, contract.ltv >= 100 ? "danger" : contract.ltv > 80 ? "warn" : "ok")}</td>
            <td>${badge(contract.coverageStatus, contract.coverageStatus === "Не обеспечено" || contract.coverageStatus === "Недостаточное" ? "danger" : contract.coverageStatus === "Частичное" ? "warn" : "ok")}</td>
            <td>${escapeHtml(contract.loanQuality)}</td>
            <td>${formatMoney(contract.reserve || 0)}</td>
            <td>${contract.collateralIds.map((id) => `<button class="link" data-route="/app/collaterals/${id}">${id}</button>`).join("<br>")}</td>
          </tr>
        `).join("")}</tbody>
        <tfoot>
          <tr class="contracts-total-row">
            <td><strong>ИТОГО</strong><br><small>${rows.length} договоров</small></td>
            <td colspan="3"><span class="contracts-total-note">${escapeHtml(filters.gsz ? `Финальная залоговая позиция по ГСЗ: ${filters.gsz}` : "По отфильтрованным строкам")}</span></td>
            <td>${formatMoney(filteredTotals.debt)}</td>
            <td>${formatMoney(filteredTotals.marketValue)}</td>
            <td>${formatMoney(filteredTotals.allocatedValue)}</td>
            <td>${badge(`${filteredTotals.ltv}%`, filteredTotals.ltv >= 100 ? "danger" : filteredTotals.ltv > 80 ? "warn" : "ok")}</td>
            <td>-</td>
            <td>-</td>
            <td>${formatMoney(filteredTotals.reserve)}</td>
            <td>-</td>
          </tr>
        </tfoot>
      </table>
    </section>
  `;
}

function getContractsDeficit(contracts) {
  return sumBy(contracts, (contract) => Math.max(0, getContractDebtRub(contract) - Number(contract.allocatedValue || 0)));
}

function getContractCoverageBucket(contract) {
  const debt = getContractDebtRub(contract);
  const allocated = Number(contract.allocatedValue || 0);
  if (!allocated) return { label: "Нет активного залога", color: chartPalette[4], tone: "danger" };
  if (debt > allocated) return { label: "Дефицит обеспечения", color: chartPalette[3], tone: "danger" };
  if (contract.coverageStatus === "Частичное" || allocated / Math.max(1, debt) < 1.15) return { label: "Частичное покрытие", color: chartPalette[2], tone: "warn" };
  return { label: "Полное покрытие", color: chartPalette[0], tone: "ok" };
}

function getContractLtvBucket(contract) {
  const ltv = Number(contract.ltv || 0);
  if (ltv > 100) return { label: ">100% дефицит", color: chartPalette[4], tone: "danger", min: 101 };
  if (ltv > 90) return { label: "90-100% высокий риск", color: chartPalette[3], tone: "warn", min: 91 };
  if (ltv > 70) return { label: "70-90% наблюдение", color: chartPalette[2], tone: "warn", min: 71 };
  return { label: "до 70% норма", color: chartPalette[0], tone: "ok", min: 0 };
}


function getContractCoverageSegments(contracts) {
  const order = ["Полное покрытие", "Частичное покрытие", "Дефицит обеспечения", "Нет активного залога"];
  const buckets = contracts.map(getContractCoverageBucket);
  return order.map((label) => {
    const bucket = buckets.find((item) => item.label === label);
    return { label, value: buckets.filter((item) => item.label === label).length, color: bucket?.color || chartPalette[0] };
  }).filter((item) => item.value > 0);
}

function getContractLtvSegments(contracts) {
  const order = ["до 70% норма", "70-90% наблюдение", "90-100% высокий риск", ">100% дефицит"];
  const buckets = contracts.map(getContractLtvBucket);
  return order.map((label) => {
    const bucket = buckets.find((item) => item.label === label);
    return { label, value: buckets.filter((item) => item.label === label).length, color: bucket?.color || chartPalette[0], tone: bucket?.tone || "neutral" };
  }).filter((item) => item.value > 0);
}

function getContractMaturityBucket(contract) {
  const days = daysUntil(contract?.endDate);
  if (days === null) return { label: "Срок не задан", color: chartPalette[5], tone: "neutral" };
  if (days < 0) return { label: "Срок истек", color: chartPalette[4], tone: "danger" };
  if (days <= 180) return { label: "до 6 месяцев", color: chartPalette[3], tone: "warn" };
  if (days <= 365) return { label: "6-12 месяцев", color: chartPalette[2], tone: "warn" };
  if (days <= 1095) return { label: "1-3 года", color: chartPalette[0], tone: "info" };
  return { label: "более 3 лет", color: chartPalette[1], tone: "ok" };
}

function isContractMaturingWithin12Months(contract) {
  const days = daysUntil(contract?.endDate);
  return days !== null && days >= 0 && days <= 365;
}

function getContractMaturitySegments(contracts) {
  const order = ["Срок истек", "до 6 месяцев", "6-12 месяцев", "1-3 года", "более 3 лет", "Срок не задан"];
  const buckets = contracts.map(getContractMaturityBucket);
  return order.map((label) => {
    const bucket = buckets.find((item) => item.label === label);
    return { label, value: buckets.filter((item) => item.label === label).length, color: bucket?.color || chartPalette[0], tone: bucket?.tone || "neutral" };
  }).filter((item) => item.value > 0);
}

function getContractGszExposureSegments(contracts) {
  const totals = new Map();
  contracts.forEach((contract) => {
    const label = contract.gsz || "ГСЗ не указана";
    totals.set(label, (totals.get(label) || 0) + getContractDebtRub(contract));
  });
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({ label, value, color: chartPalette[index % chartPalette.length] }));
}

function renderContractLtvRiskPanel(segments, activeValue) {
  const max = Math.max(...segments.map((item) => item.value), 1);
  return `
    <section class="panel chart-panel contract-ltv-panel">
      <div class="panel-title"><div><h2>LTV по зонам риска</h2><p class="hint">Чем выше LTV, тем меньше запас покрытия по договору.</p></div></div>
      <div class="ltv-risk-list">
        ${segments.map((item) => `
          <button class="ltv-risk-row ${item.tone || ""} ${activeValue === item.label ? "active" : ""}" data-action="visual-filter" data-scope="contracts" data-filter="ltv" data-value="${escapeHtml(item.label)}">
            <span>${escapeHtml(item.label)}</span>
            <div><i style="width:${Math.max(6, Math.round((item.value / max) * 100))}%; background:${item.color};"></i></div>
            <strong>${item.value}</strong>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function getContractStatusOptions() {
  const defaultStatuses = [
    "Активен",
    "На оформлении",
    "Приостановлен",
    "Просрочен",
    "Реструктурирован",
    "Завершен",
    "Закрыт",
    "Досрочно погашен",
    "Расторгнут",
    "Аннулирован"
  ];
  const dataStatuses = state.data.contracts.map((contract) => contract.status).filter(Boolean);
  return ["", ...[...new Set([...defaultStatuses, ...dataStatuses])]];
}

function getContractsTotals(rows) {
  const debt = sumBy(rows, getContractDebtRub);
  const marketValue = sumBy(rows, (contract) => contract.marketValue);
  const allocatedValue = sumBy(rows, (contract) => contract.allocatedValue);
  const reserve = sumBy(rows, (contract) => contract.reserve);
  const ltv = allocatedValue ? Math.round((debt / allocatedValue) * 100) : 0;
  return { debt, marketValue, allocatedValue, reserve, ltv };
}

function renderCollateralsRegistry() {
  const filters = state.filters.collaterals;
  const visual = state.visualFilters.collaterals;
  const baseRows = state.data.collaterals.filter((item) => {
    const contractText = item.contractIds.map((id) => getContract(id)?.number || id).join(" ");
    return matches(item.clientId, filters.clientId)
      && matches(item.clientName, filters.clientName)
      && matches(item.gsz, filters.gsz)
      && matches(contractText, filters.number)
      && matches(item.id, filters.collateralId)
      && matches(item.address, filters.address)
      && matches(item.type, filters.type);
  });
  const rows = baseRows.filter((item) =>
    (!visual.type || item.type === visual.type)
    && (!visual.gsz || item.gsz === visual.gsz)
    && (!visual.kpi || matchesCollateralKpi(item, visual.kpi))
  );
  const types = [...new Set(state.data.collaterals.map((item) => item.type))];
  const typeSegments = toSegments(Object.entries(baseRows.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + Number(item.pledgeValue || item.marketValue || 0);
    return acc;
  }, {})).map(([label, value]) => ({ label, value })));
  return `
    ${renderPageHeader("Реестр залогов", "Объекты залога с оценками, страхованием, рисками и внешними источниками.",
      `<button class="btn btn-secondary" data-action="open-import-collaterals">Загрузить из таблицы</button>`)}
    ${renderKpiGrid([
      { label: "Всего объектов", value: String(baseRows.length), hint: "В выбранном срезе", tone: "info", active: !hasVisualFilters("collaterals"), action: 'data-action="registry-kpi" data-scope="collaterals" data-filter="all"' },
      { label: "Залоговая стоимость", value: formatShortMoney(sumBy(baseRows, (item) => item.pledgeValue)), hint: "Сумма по объектам", tone: "info", action: 'data-action="registry-kpi" data-scope="collaterals" data-filter="all"' },
      { label: "Критические риски", value: String(baseRows.filter((item) => riskTone(item) === "danger").length), hint: "Красные триггеры", tone: "danger", active: visual.kpi === "critical", action: 'data-action="registry-kpi" data-scope="collaterals" data-filter="kpi" data-value="critical"' },
      { label: "Кросс-залоги", value: String(baseRows.filter((item) => item.crossPledge).length), hint: "Несколько договоров", tone: "warn", active: visual.kpi === "cross", action: 'data-action="registry-kpi" data-scope="collaterals" data-filter="kpi" data-value="cross"' },
      { label: "Истекает оценка", value: String(baseRows.filter((item) => item.appraisalStatus === "Истекает" || item.appraisalStatus === "Просрочена").length), hint: "Контроль оценки", tone: "warn", active: visual.kpi === "appraisal", action: 'data-action="registry-kpi" data-scope="collaterals" data-filter="kpi" data-value="appraisal"' }
    ])}
    <section class="analytics-grid registry-analytics equal-height-analytics">
      ${renderDonutPanel({
        title: "Портфель по видам имущества",
        subtitle: "Доли рассчитаны по залоговой стоимости.",
        segments: typeSegments.map((item) => ({ ...item, valueLabel: formatShortMoney(item.value) })),
        total: sumBy(baseRows, (item) => item.pledgeValue),
        centerLabel: formatShortMoney(sumBy(baseRows, (item) => item.pledgeValue)),
        scope: "collaterals",
        filterKey: "type",
        activeValue: visual.type
      })}
      ${renderCollateralControlPanel(baseRows, visual.kpi)}
    </section>
    <section class="panel">
      <div class="filter-grid registry-filter-grid">
        ${filterInput("collaterals", "clientId", "ИНН залогодателя")}
        ${filterInput("collaterals", "clientName", "Залогодатель")}
        ${filterInput("collaterals", "gsz", "ГСЗ")}
        ${filterInput("collaterals", "number", "Номер договора")}
        ${filterInput("collaterals", "collateralId", "Идентификатор залога")}
        ${filterInput("collaterals", "address", "Адрес")}
        ${filterSelect("collaterals", "type", "Тип объекта", ["", ...types])}
        <button class="btn btn-secondary" data-action="reset-filters" data-scope="collaterals">Сбросить</button>
      </div>
    </section>
    <section class="panel table-panel" data-registry-table="collaterals" tabindex="-1">
      <div class="panel-title"><h2>Залоги</h2><span class="panel-note">${rows.length} объектов</span></div>
      <table>
        <thead><tr><th>ID</th><th>Тип</th><th>Описание</th><th>Залогодатель</th><th>ГСЗ</th><th>Договоры</th><th>Рыночная</th><th>Залоговая</th><th>Оценка</th><th>Страхование</th><th>Риск</th></tr></thead>
        <tbody>${rows.map((item) => `
          <tr>
            <td><a class="link registry-object-link" href="#/app/collaterals/${escapeHtml(item.id)}">${escapeHtml(item.id)}</a>${item.crossPledge ? `<br>${badge("Кросс-залог", "warn")}` : ""}</td>
            <td>${escapeHtml(item.type)}</td>
            <td>${escapeHtml(item.description)}<br><small>${escapeHtml(item.address)}</small></td>
            <td>${escapeHtml(item.clientName)}<br><small>${escapeHtml(item.clientId)}</small></td>
            <td>${escapeHtml(item.gsz)}</td>
            <td>${item.contractIds.map((id) => `<button class="link" data-route="/app/contracts/${id}">${escapeHtml(getContract(id)?.number || id)}</button>`).join("<br>")}</td>
            <td>${formatMoney(item.marketValue)}</td>
            <td>${formatMoney(item.pledgeValue)}</td>
            <td>${badge(item.appraisalStatus)}<br><small>${escapeHtml(item.appraisalDue)}</small></td>
            <td>${badge(item.insuranceStatus)}<br><small>${escapeHtml(item.insuranceDue)}</small></td>
            <td>${badge(getCollateralRiskState(item), riskTone(item))}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderCollateralControlPanel(rows, activeKpi = "") {
  const controlRows = getCollateralControlRows(rows);
  return `
    <section class="panel chart-panel collateral-control-panel">
      <div class="panel-title">
        <div>
          <h2>Контроль залогов по видам имущества</h2>
        </div>
        <span class="panel-note">${controlRows.length} типов</span>
      </div>
      <div class="collateral-control-grid">
        <div class="collateral-control-head" aria-hidden="true">
          <span>Вид имущества</span>
          <span>Залоговая стоимость</span>
          <span>Контрольные сигналы</span>
        </div>
        ${controlRows.length ? controlRows.map((row) => {
          const controlFilter = getCollateralControlKpi(row.type);
          return `
          <button type="button" class="collateral-control-row ${row.tone} ${activeKpi === controlFilter ? "active" : ""}" data-action="registry-kpi" data-scope="collaterals" data-filter="kpi" data-value="${escapeHtml(controlFilter)}">
            <span class="collateral-control-type">
              <strong>${escapeHtml(row.type)}</strong>
              <small>${row.count} шт. · с сигналами: ${row.attentionCount}</small>
            </span>
            <span class="collateral-control-value">
              <span class="collateral-control-bar"><i style="width:${row.share}%"></i></span>
              <strong>${escapeHtml(formatShortMoney(row.pledgeValue))}</strong>
            </span>
            <span class="collateral-control-signals">
              ${renderCollateralControlMetric(row.criticalCount, "Риск", "danger")}
              ${renderCollateralControlMetric(row.appraisalCount, "Оценка", "warning")}
              ${renderCollateralControlMetric(row.insuranceCount, "Полис", "warning")}
              ${renderCollateralControlMetric(row.monitoringCount, "Осмотр", "warning")}
            </span>
          </button>
        `;
        }).join("") : `<div class="empty-state">Нет объектов в выбранном срезе</div>`}
      </div>
    </section>
  `;
}

function getCollateralControlKpi(type) {
  return `control:${type}`;
}

function getCollateralControlKpiType(kpi) {
  const prefix = "control:";
  return String(kpi || "").startsWith(prefix) ? String(kpi).slice(prefix.length) : "";
}

function getCollateralControlRows(rows) {
  const totalPledge = sumBy(rows, (item) => item.pledgeValue);
  const grouped = rows.reduce((acc, item) => {
    acc[item.type] = acc[item.type] || [];
    acc[item.type].push(item);
    return acc;
  }, {});
  return Object.entries(grouped).map(([type, items]) => {
    const pledgeValue = sumBy(items, (item) => item.pledgeValue);
    const criticalCount = items.filter((item) => riskTone(item) === "danger").length;
    const appraisalCount = items.filter(hasCollateralAppraisalIssue).length;
    const insuranceCount = items.filter(hasCollateralInsuranceIssue).length;
    const monitoringCount = items.filter(hasCollateralMonitoringIssue).length;
    const attentionCount = new Set(items
      .filter((item) => riskTone(item) === "danger" || hasCollateralAppraisalIssue(item) || hasCollateralInsuranceIssue(item) || hasCollateralMonitoringIssue(item))
      .map((item) => item.id)).size;
    return {
      type,
      count: items.length,
      pledgeValue,
      criticalCount,
      appraisalCount,
      insuranceCount,
      monitoringCount,
      attentionCount,
      share: totalPledge ? Math.max(3, Math.round((pledgeValue / totalPledge) * 100)) : 0,
      tone: criticalCount ? "danger" : attentionCount ? "warning" : "ok"
    };
  }).sort((a, b) =>
    b.criticalCount - a.criticalCount
    || b.attentionCount - a.attentionCount
    || b.pledgeValue - a.pledgeValue
    || a.type.localeCompare(b.type, "ru")
  );
}

function renderCollateralControlMetric(value, label, tone) {
  return `
    <span class="collateral-control-metric ${value ? tone : "ok"}">
      <strong>${value}</strong>
      <small>${escapeHtml(label)}</small>
    </span>
  `;
}

function hasCollateralAppraisalIssue(collateral) {
  return collateral.appraisalStatus === "Истекает" || collateral.appraisalStatus === "Просрочена";
}

function hasCollateralInsuranceIssue(collateral) {
  const premiumStatus = collateral.insurance?.premiumStatus || "";
  return collateral.insuranceStatus === "Истекает"
    || collateral.insuranceStatus === "Не оплачена"
    || (premiumStatus && premiumStatus !== "Оплачена");
}

function hasCollateralMonitoringIssue(collateral) {
  const nextInspectionDays = daysUntil(collateral.monitoring?.nextInspection);
  return nextInspectionDays !== null && nextInspectionDays <= 30;
}

function daysUntil(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date("2026-06-18T00:00:00");
  return Math.ceil((date - today) / 86400000);
}

function getInsurancePolicyRows() {
  return state.data.collaterals.map((collateral) => {
    const insurance = collateral.insurance || {};
    const contract = getContract(collateral.contractIds?.[0]);
    const due = insurance.to || collateral.insuranceDue || "";
    const days = daysUntil(due);
    return {
      id: insurance.policy || `INS-${collateral.id}`,
      company: insurance.company || "Не выбрана",
      collateral,
      contract,
      clientId: collateral.clientId,
      clientName: collateral.clientName,
      amount: Number(insurance.amount || 0),
      premiumStatus: insurance.premiumStatus || "Не проверено",
      status: collateral.insuranceStatus || "Не указано",
      from: insurance.from || "-",
      to: due || "-",
      daysLeft: days,
      source: insurance.source || collateral.source || "-"
    };
  });
}

function renderInsurancePoliciesRegistry() {
  const filters = state.filters.insurances;
  const visual = state.visualFilters.insurances;
  const allRows = getInsurancePolicyRows();
  const filteredRows = allRows.filter((row) =>
    matches(row.id, filters.policy)
    && matches(row.clientId, filters.clientId)
    && matches(row.clientName, filters.clientName)
    && matches(row.collateral.id, filters.collateralId)
    && matches(row.company, filters.company)
    && matches(row.status, filters.status)
  );
  const expiring = filteredRows.filter((row) => matchesInsuranceKpi(row, "expiring"));
  const unpaid = filteredRows.filter((row) => matchesInsuranceKpi(row, "unpaid"));
  const baseRows = filteredRows.filter((row) => matchesInsuranceKpi(row, visual.kpi));
  const statusOptions = ["", ...new Set(allRows.map((row) => row.status))];
  return `
    ${renderPageHeader("Реестр страховых полисов", "Полисы по объектам залога, сроки действия, страховые суммы и контроль оплаты премии.")}
    ${renderKpiGrid([
      { label: "Всего полисов", value: String(filteredRows.length), hint: "По объектам залога", tone: "info" },
      { label: "Страховая сумма", value: formatShortMoney(sumBy(filteredRows, (row) => row.amount)), hint: "Сумма по фильтру", tone: "info" },
      { label: "Истекают до 30 дней", value: String(expiring.length), hint: "Контроль срока", tone: expiring.length ? "warn" : "info", active: visual.kpi === "expiring", action: 'data-action="registry-kpi" data-scope="insurances" data-filter="kpi" data-value="expiring"' },
      { label: "Премия не оплачена", value: String(unpaid.length), hint: "Требует обработки", tone: unpaid.length ? "danger" : "info", active: visual.kpi === "unpaid", action: 'data-action="registry-kpi" data-scope="insurances" data-filter="kpi" data-value="unpaid"' }
    ])}
    <section class="panel">
      <div class="filter-grid registry-filter-grid">
        ${filterInput("insurances", "policy", "Номер полиса")}
        ${filterInput("insurances", "clientId", "ИНН страхователя")}
        ${filterInput("insurances", "clientName", "Страхователь")}
        ${filterInput("insurances", "collateralId", "Идентификатор залога")}
        ${filterInput("insurances", "company", "Страховая компания")}
        ${filterSelect("insurances", "status", "Статус полиса", statusOptions)}
        <button class="btn btn-secondary" data-action="reset-filters" data-scope="insurances">Сбросить</button>
      </div>
    </section>
    <section class="panel table-panel" data-registry-table="insurances" tabindex="-1">
      <div class="panel-title"><h2>Страховые полисы</h2><span class="panel-note">${baseRows.length} строк</span></div>
      <table>
        <thead><tr><th>Полис</th><th>Объект залога</th><th>Страхователь</th><th>Договор</th><th>Компания</th><th>Срок</th><th>Сумма</th><th>Премия</th><th>Статус</th><th>Источник</th></tr></thead>
        <tbody>${baseRows.map((row) => `
          <tr>
            <td><a class="link registry-object-link" href="#/app/collaterals/${escapeHtml(row.collateral.id)}?tab=insurance">${escapeHtml(row.id)}</a></td>
            <td>${escapeHtml(row.collateral.id)}<br><small>${escapeHtml(row.collateral.description)}</small></td>
            <td>${escapeHtml(row.clientName)}<br><small>${escapeHtml(row.collateral.clientId)}</small></td>
            <td>${row.contract ? `<a class="link" href="#/app/contracts/${escapeHtml(row.contract.id)}">${escapeHtml(row.contract.number)}</a>` : "-"}</td>
            <td>${escapeHtml(row.company)}</td>
            <td>${escapeHtml(row.from)} - ${escapeHtml(row.to)}<br><small>${row.daysLeft === null ? "Срок не рассчитан" : `${row.daysLeft} дн.`}</small></td>
            <td>${formatMoney(row.amount)}</td>
            <td>${badge(row.premiumStatus)}</td>
            <td>${badge(row.status)}</td>
            <td>${escapeHtml(row.source)}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function getTaskSourceCount(channel) {
  const aliases = {
    manual: ["Вручную"],
    excel: ["Excel"],
    email: ["Email", "Почтовый сервер"],
    pipeline: ["Конвейер"],
    schedule: ["Расписание", "Планировщик"],
    trigger: ["Триггер", "Авито", "Авто.ру", "Яндекс Недвижимость", "Циан", "ЕГРН", "Инфосфера"]
  }[channel.id] || [channel.name];
  return state.data.tasks.filter((task) => aliases.some((alias) => String(task.source || "").includes(alias) || (task.route || []).some((step) => String(step).includes(alias)))).length;
}

function renderTaskSourcesRegistry() {
  const filters = state.filters.sources;
  const rows = taskSourceChannels.filter((channel) =>
    matches(channel.name, filters.name)
    && matches(channel.stage, filters.stage)
    && matches(channel.status, filters.status)
  );
  const stageOptions = ["", ...new Set(taskSourceChannels.map((item) => item.stage))];
  const statusOptions = ["", ...new Set(taskSourceChannels.map((item) => item.status))];
  const recentTasks = state.data.tasks.filter((task) => task.source).slice(0, 8);
  return `
    ${renderPageHeader("Источники задач", "Ручное создание, Excel, email, конвейеры, расписание и триггеры из состава работ проекта Р.", `<button class="btn btn-primary" data-route="/app/tasks/new">Создать задачу вручную</button>`)}
    ${renderKpiGrid([
      { label: "Каналов создания", value: String(taskSourceChannels.length), hint: "По составу работ", tone: "info" },
      { label: "MVP1", value: String(taskSourceChannels.filter((item) => item.stage === "MVP1").length), hint: "В первом контуре", tone: "info" },
      { label: "MVP2", value: String(taskSourceChannels.filter((item) => item.stage === "MVP2").length), hint: "В развитии модуля", tone: "warn" },
      { label: "Создано задач", value: String(state.data.tasks.length), hint: "Демо-очередь", tone: "info" }
    ])}
    <section class="panel">
      <div class="filter-grid registry-filter-grid">
        ${filterInput("sources", "name", "Канал")}
        ${filterSelect("sources", "stage", "Этап", stageOptions)}
        ${filterSelect("sources", "status", "Статус", statusOptions)}
        <button class="btn btn-secondary" data-action="reset-filters" data-scope="sources">Сбросить</button>
      </div>
    </section>
    <section class="grid-2 source-channel-grid">
      ${rows.map((channel) => `
        <article class="panel source-channel-card">
          <div class="panel-title">
            <div><h2>${escapeHtml(channel.name)}</h2><p class="hint">${escapeHtml(channel.trigger)}</p></div>
            <div class="status-stack">${badge(channel.stage, "info")}${badge(channel.status)}</div>
          </div>
          ${renderInfoGrid({ "Ответственный": channel.owner, "Демо-задач": getTaskSourceCount(channel) })}
          <div class="timeline">${channel.flow.map((step) => `<span>${escapeHtml(step)}</span>`).join("")}</div>
        </article>
      `).join("")}
    </section>
    <section class="panel table-panel">
      <div class="panel-title"><h2>Последние задачи по источникам</h2><span class="panel-note">${recentTasks.length} задач</span></div>
      <table><thead><tr><th>Задача</th><th>Тип</th><th>Источник</th><th>Исполнитель</th><th>Статус</th><th>Срок</th></tr></thead><tbody>${recentTasks.map((task) => `
        <tr>
          <td><a class="link registry-object-link" href="#/app/tasks/${escapeHtml(task.id)}">${escapeHtml(task.id)}</a><br><small>${escapeHtml(task.title)}</small></td>
          <td>${escapeHtml(task.type)}</td>
          <td>${escapeHtml(task.source)}</td>
          <td>${escapeHtml(task.assignee)}</td>
          <td>${badge(task.status)}</td>
          <td>${escapeHtml(task.dueDate)}</td>
        </tr>
      `).join("")}</tbody></table>
    </section>
  `;
}

function renderIntegrationsRegistry() {
  const filters = state.filters.integrations;
  const allRows = state.data.integrations || [];
  const rows = allRows.filter((item) =>
    matches(item.name, filters.name)
    && matches(item.group, filters.group)
    && matches(item.status, filters.status)
  );
  const groupOptions = ["", ...new Set(allRows.map((item) => item.group))];
  const statusOptions = ["", ...new Set(allRows.map((item) => item.status))];
  const problemRows = rows.filter((item) => item.status === "Ошибка" || item.status === "Предупреждение" || Number(item.errors || 0) > 0);
  return `
    ${renderPageHeader("Интеграции", "Преднастроенные методы, статусы обмена и журналы синхронизации по составу работ проекта Р.")}
    ${renderKpiGrid([
      { label: "Всего интеграций", value: String(rows.length), hint: "Внутренние и внешние", tone: "info" },
      { label: "Внешние источники", value: String(rows.filter((item) => item.group === "Внешняя").length), hint: "Оценка и проверки", tone: "info" },
      { label: "Ошибки/предупреждения", value: String(problemRows.length), hint: "Требуют контроля", tone: problemRows.length ? "warn" : "info" },
      { label: "Полей в обмене", value: String(sumBy(rows, (item) => item.fields)), hint: "Демо-оценка", tone: "info" }
    ])}
    <section class="panel">
      <div class="filter-grid registry-filter-grid">
        ${filterInput("integrations", "name", "Интеграция")}
        ${filterSelect("integrations", "group", "Группа", groupOptions)}
        ${filterSelect("integrations", "status", "Статус", statusOptions)}
        <button class="btn btn-secondary" data-action="reset-filters" data-scope="integrations">Сбросить</button>
      </div>
    </section>
    <section class="panel table-panel" data-registry-table="integrations" tabindex="-1">
      <div class="panel-title"><h2>Методы и обмены</h2><span class="panel-note">${rows.length} строк</span></div>
      <table>
        <thead><tr><th>Интеграция</th><th>Группа</th><th>Метод</th><th>Поля</th><th>Последний обмен</th><th>Следующий обмен</th><th>Загружено</th><th>Ошибки</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.id)}</small></td>
            <td>${escapeHtml(item.group)}</td>
            <td>${escapeHtml(item.method)}</td>
            <td>${escapeHtml(item.fields)}</td>
            <td>${escapeHtml(item.lastSync)}</td>
            <td>${escapeHtml(item.nextSync)}</td>
            <td>${escapeHtml(item.imported)}</td>
            <td>${badge(item.errors ? String(item.errors) : "0", item.errors ? "warn" : "ok")}</td>
            <td>${badge(item.status)}</td>
            <td><button class="btn btn-small" data-action="run-integration-sync" data-integration="${escapeHtml(item.name)}">Запустить</button></td>
          </tr>
          <tr class="log-row"><td colspan="10"><div class="log-list">${(item.logs || []).map((log) => `<span>${escapeHtml(log.time)} - ${escapeHtml(log.result)} - ${escapeHtml(log.object)}: ${escapeHtml(log.message)}</span>`).join("")}</div></td></tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderMigrationRegistry() {
  const filters = state.filters.migration;
  const rows = migrationBatches.filter((batch) =>
    matches(batch.id + " " + batch.name, filters.batch)
    && matches(batch.source, filters.source)
    && matches(batch.status, filters.status)
  );
  const statusOptions = ["", ...new Set(migrationBatches.map((item) => item.status))];
  return `
    ${renderPageHeader("Миграция", "Ориентировочная миграция договоров залога и связанных данных. Оценка уточняется после анализа методики Банка.")}
    ${renderKpiGrid([
      { label: "Пакетов миграции", value: String(rows.length), hint: "Демо-партии", tone: "info" },
      { label: "Записей", value: String(sumBy(rows, (item) => item.records).toLocaleString("ru-RU")), hint: "К тестовой загрузке", tone: "info" },
      { label: "Ошибок качества", value: String(sumBy(rows, (item) => item.errors)), hint: "Нужна очистка", tone: sumBy(rows, (item) => item.errors) ? "warn" : "info" },
      { label: "Полей витрин", value: String(sumBy(rows, (item) => item.fields)), hint: "До 40 по договору", tone: "info" }
    ])}
    <section class="panel">
      <div class="filter-grid registry-filter-grid">
        ${filterInput("migration", "batch", "Пакет")}
        ${filterInput("migration", "source", "Источник")}
        ${filterSelect("migration", "status", "Статус", statusOptions)}
        <button class="btn btn-secondary" data-action="reset-filters" data-scope="migration">Сбросить</button>
      </div>
    </section>
    <section class="panel table-panel" data-registry-table="migration" tabindex="-1">
      <div class="panel-title"><h2>Партии миграции</h2><span class="panel-note">${rows.length} строк</span></div>
      <table>
        <thead><tr><th>Пакет</th><th>Источник</th><th>Этап</th><th>Записей</th><th>Полей</th><th>Ошибок</th><th>Ответственный</th><th>Следующий шаг</th><th>Статус</th></tr></thead>
        <tbody>${rows.map((batch) => `
          <tr>
            <td><strong>${escapeHtml(batch.id)}</strong><br><small>${escapeHtml(batch.name)}</small></td>
            <td>${escapeHtml(batch.source)}</td>
            <td>${escapeHtml(batch.stage)}</td>
            <td>${Number(batch.records).toLocaleString("ru-RU")}</td>
            <td>${escapeHtml(batch.fields)}</td>
            <td>${badge(String(batch.errors), batch.errors ? "warn" : "ok")}</td>
            <td>${escapeHtml(batch.owner)}</td>
            <td>${escapeHtml(batch.nextStep)}</td>
            <td>${badge(batch.status)}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function matchesContractKpi(contract, kpi) {
  if (kpi === "high-ltv") return Number(contract.ltv || 0) > 90;
  if (kpi === "deficit") return getContractDebtRub(contract) > Number(contract.allocatedValue || 0);
  if (kpi === "maturity-12") return isContractMaturingWithin12Months(contract);
  if (kpi === "cross") return contract.collateralIds.some((id) => getCollateral(id)?.crossPledge);
  return true;
}

function matchesCollateralKpi(collateral, kpi) {
  if (kpi === "critical") return riskTone(collateral) === "danger";
  if (kpi === "cross") return Boolean(collateral.crossPledge);
  if (kpi === "appraisal") return collateral.appraisalStatus === "Истекает" || collateral.appraisalStatus === "Просрочена";
  const controlType = getCollateralControlKpiType(kpi);
  if (controlType) return collateral.type === controlType && hasCollateralControlIssue(collateral);
  return true;
}

function hasCollateralControlIssue(collateral) {
  return riskTone(collateral) === "danger"
    || hasCollateralAppraisalIssue(collateral)
    || hasCollateralInsuranceIssue(collateral)
    || hasCollateralMonitoringIssue(collateral);
}

function matchesInsuranceKpi(row, kpi) {
  if (kpi === "expiring") return row.status === "Истекает" || (row.daysLeft !== null && row.daysLeft <= 30);
  if (kpi === "unpaid") return row.premiumStatus !== "Оплачена";
  return true;
}

function filterInput(scope, name, label) {
  const value = state.filters[scope]?.[name] || "";
  return `
    <label class="filter-field">
      <span class="filter-label">${escapeHtml(label)}</span>
      <input value="${escapeHtml(value)}" data-filter-scope="${scope}" data-filter-name="${name}" />
    </label>
  `;
}

function filterDateRange(scope, fromName, toName, label) {
  const fromValue = state.filters[scope]?.[fromName] || "";
  const toValue = state.filters[scope]?.[toName] || "";
  return `
    <label class="filter-field filter-date-range">
      <span class="filter-label">${escapeHtml(label)}</span>
      <span class="date-range-inputs">
        <input type="date" value="${escapeHtml(fromValue)}" data-filter-scope="${scope}" data-filter-name="${fromName}" aria-label="${escapeHtml(`${label}: дата начала`)}" />
        <input type="date" value="${escapeHtml(toValue)}" data-filter-scope="${scope}" data-filter-name="${toName}" aria-label="${escapeHtml(`${label}: дата окончания`)}" />
      </span>
    </label>
  `;
}

function filterSelect(scope, name, label, options) {
  const value = state.filters[scope]?.[name] || "";
  return `
    <label class="filter-field">
      <span class="filter-label">${escapeHtml(label)}</span>
      <select data-filter-scope="${scope}" data-filter-name="${name}">
        ${options.map((item) => `<option value="${escapeHtml(item)}" ${item === value ? "selected" : ""}>${escapeHtml(item || "Все")}</option>`).join("")}
      </select>
    </label>
  `;
}

function matches(value, filter) {
  if (!filter) return true;
  return String(value ?? "").toLowerCase().includes(String(filter).toLowerCase().trim());
}

function matchesDateRange(value, from, to) {
  if (!value) return true;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

function renderEmpty(title, text, scope) {
  return `<div class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p><button class="btn btn-secondary" data-action="reset-filters" data-scope="${scope}">Сбросить фильтры</button></div>`;
}

function renderTaskHeaderActions(task, role) {
  const closed = isTaskClosed(task);
  const disabled = closed ? "disabled" : "";
  const manager = isManagerRole(role);
  const approver = isTaskApprover(role, task);
  return `
    <button class="btn btn-secondary" data-route="/app/tasks">Назад</button>
    <button class="btn btn-secondary" data-action="task-defer" data-task="${escapeHtml(task.id)}" ${disabled}>Отложить</button>
    ${approver ? `<button class="btn btn-secondary" data-action="task-return" data-task="${escapeHtml(task.id)}" ${disabled}>Вернуть</button>` : ""}
    <button class="btn btn-primary" data-action="task-complete" data-task="${escapeHtml(task.id)}" ${disabled}>Завершить</button>
    ${manager ? `<button class="btn btn-secondary" data-action="open-reassign" data-task="${escapeHtml(task.id)}" ${disabled}>Переназначить</button>` : ""}
  `;
}

function renderTaskCard(taskId) {
  const task = getTask(taskId);
  if (!task) return renderNotFound("Задача не найдена", "/app/tasks");
  const collaterals = getTaskCollaterals(task);
  const collateral = getTaskActiveCollateral(task, collaterals);
  const activeContracts = getTaskActiveContracts(task, collateral);
  const role = getRole();
  const taskPageClass = [
    "task-page",
    "task-card-compact",
    isRevaluationTaskType(task.type) ? "task-card-revaluation" : "",
    isInspectionTaskType(task.type) || isMobileInspectionTaskType(task.type) ? "task-card-inspection" : ""
  ].filter(Boolean).join(" ");
  return `
    <div class="${taskPageClass}">
      ${renderPageHeader(
        `${task.id} - ${task.type}`,
        "",
        renderTaskHeaderActions(task, role)
      )}
      ${renderTaskMainInfo(task, collaterals)}
      <section class="task-detail-layout">
        <div class="task-detail-main">
          ${renderTaskCollateralContext(task, collaterals, collateral)}
          ${renderTaskSpecificBlocks(task, collateral, collaterals)}
          ${renderTaskExpertConclusion(task, collateral)}
        </div>
        <aside class="task-detail-sidebar">
          ${renderTaskClientContractInfo(task, collateral, activeContracts, collaterals)}
          ${renderTaskDocumentsPanel(task, collaterals, collateral)}
          ${renderTaskRoute(task, role)}
          ${renderTaskHistory(task)}
        </aside>
      </section>
    </div>
  `;
}

function renderTaskMainInfo(task, collaterals = getTaskCollaterals(task)) {
  return `
    <section class="panel task-main-info-panel">
      <div class="panel-title">
        <div>
          <h2>Основная информация по задаче</h2>
        </div>
        <div class="status-stack">${badge(task.status)}${badge(task.priority)}</div>
      </div>
      <div class="hero-metrics task-main-metrics">
        <div><span>Номер задачи</span><strong>${escapeHtml(task.id)}</strong></div>
        <div><span>Тип задачи</span><strong>${escapeHtml(task.type)}</strong></div>
        <div><span>Плановый срок</span><strong>${escapeHtml(task.dueDate)}</strong></div>
        <div><span>Норматив</span><strong>${escapeHtml(task.normativeTerm || "5 рабочих дней")}</strong></div>
        <div><span>Исполнитель</span><strong>${escapeHtml(task.assignee)}</strong></div>
        <div><span>Инициатор</span><strong>${escapeHtml(getTaskInitiator(task))}</strong></div>
      </div>
    </section>
  `;
}

function renderTaskClientContractInfo(task, activeCollateral, activeContracts = [], taskCollaterals = []) {
  const primaryContract = activeContracts[0] || getTaskActiveContract(task, activeCollateral);
  const contractClientNames = uniqueItems(activeContracts.map((contract) => contract.clientName));
  const contractRoles = uniqueItems(activeContracts.map(getContractPartyRole));
  const contractNumbers = uniqueItems(activeContracts.map((contract) => contract.number));
  const multiObjectHint = taskCollaterals.length > 1
    ? `<p class="hint">Данные обновляются при выборе строки в блоке "Информация по объектам залога".</p>`
    : "";
  const contractsTable = activeContracts.length > 1 ? `
    <div class="task-linked-contracts">
      <h3>Договоры активного залога</h3>
      <table>
        <thead><tr><th>Договор</th><th>Клиент по договору</th><th>Роль</th><th>LTV</th><th>Статус</th></tr></thead>
        <tbody>${activeContracts.map((contract) => `
          <tr>
            <td><button class="link" data-route="/app/contracts/${escapeHtml(contract.id)}">${escapeHtml(contract.number)}</button></td>
            <td>${escapeHtml(contract.clientName)}</td>
            <td>${escapeHtml(getContractPartyRole(contract))}</td>
            <td>${escapeHtml(`${contract.ltv || 0}%`)}</td>
            <td>${badge(contract.status)}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>
  ` : "";
  return `
    <section class="panel task-client-contract-panel">
      <h2>Информация о клиенте и договоре</h2>
      ${multiObjectHint}
      ${renderInfoGrid({
        "Активный залог": activeCollateral?.id,
        "Клиент по договору": summarizeNames(contractClientNames),
        "Роль по договору": summarizeNames(contractRoles),
        "ИНН клиента по договору": primaryContract?.inn,
        "Залогодатель": activeCollateral?.clientName,
        "ИНН залогодателя": activeCollateral?.clientId,
        "ГСЗ": primaryContract?.gsz || activeCollateral?.gsz,
        "Договор": contractNumbers.length > 1 ? `${contractNumbers.length} договора: ${contractNumbers.join(", ")}` : primaryContract?.number,
        "Продукт": primaryContract?.product,
        "Остаток долга": formatMoney(primaryContract?.debt || 0, primaryContract?.currency),
        "Категория качества": primaryContract?.loanQuality,
        "LTV": `${primaryContract?.ltv || 0}%`
      })}
      ${contractsTable}
    </section>
  `;
}

function renderTaskCollateralContext(task, collaterals, activeCollateral) {
  if (!collaterals.length) {
    return `<section class="panel task-collateral-panel"><h2>Описание объекта залога</h2><p class="hint">Объект залога не привязан к задаче.</p></section>`;
  }
  if (collaterals.length === 1) return renderTaskCollateralDescription(task, collaterals[0]);
  return renderTaskCollateralObjectsInfo(task, collaterals, activeCollateral);
}

function renderTaskCollateralDescription(task, collateral) {
  const contract = getContract(collateral.contractIds?.[0] || task.contractId);
  const category = collateral.fields?.["Категория"] || collateral.fields?.["Назначение"] || collateral.fields?.["Марка/модель"] || collateral.type;
  return `
    <section class="panel task-collateral-panel task-collateral-description">
      <div class="panel-title">
        <div><h2>Описание объекта залога</h2></div>
        <span class="panel-note">${escapeHtml(collateral.id)}</span>
      </div>
      ${renderInfoGrid({
        "ID залога": collateral.id,
        "Тип объекта": collateral.type,
        "Категория / подтип": category,
        "Описание": collateral.description,
        "Адрес / местонахождение": collateral.address,
        "Залогодатель": collateral.clientName,
        "ИНН": collateral.clientId,
        "ГСЗ": collateral.gsz,
        "Договор": contract?.number || task.contractId,
        "Рыночная стоимость": formatMoney(collateral.marketValue || 0),
        "Залоговая стоимость": formatMoney(collateral.pledgeValue || 0),
        "Оценка": collateral.appraisalStatus,
        "Страхование": collateral.insuranceStatus,
        "Состояние риска": getCollateralRiskState(collateral),
        "Источник данных": collateral.source
      })}
      <div class="inline-actions">
        <button class="btn btn-secondary" data-route="/app/collaterals/${collateral.id}">Открыть залог</button>
        <button class="btn btn-secondary" data-route="/app/contracts/${contract?.id || task.contractId}">Открыть договор</button>
      </div>
    </section>
  `;
}

function renderTaskCollateralObjectsInfo(task, collaterals, activeCollateral) {
  const scrollClass = collaterals.length > 10 ? "is-scrollable" : "";
  return `
    <section class="panel table-panel task-collateral-panel task-collateral-info task-object-selector">
      <div class="panel-title">
        <div><h2>Информация по объектам залога</h2><p class="hint">Выберите строку, чтобы документы, страхование, сигналы и состояние обновились по активному залогу.</p></div>
        <span class="panel-note">Активен: ${escapeHtml(activeCollateral?.id || collaterals[0]?.id || "-")}</span>
      </div>
      <div class="table-wrap compact-table task-collateral-table-wrap ${scrollClass}">
        <table>
          <thead><tr><th>ID</th><th>Тип</th><th>Объект</th><th>Адрес</th><th>Залогодатель</th><th>Договор</th><th>Рыночная</th><th>Залоговая</th></tr></thead>
          <tbody>${collaterals.map((item) => {
            const contract = getContract(item.contractIds?.[0] || task.contractId);
            const active = item.id === activeCollateral?.id;
            return `
              <tr class="${active ? "is-active" : ""}" data-action="select-task-collateral" data-task="${task.id}" data-collateral="${item.id}">
                <td><button class="link" data-route="/app/collaterals/${item.id}">${item.id}</button></td>
                <td><span class="task-collateral-cell">${escapeHtml(item.type)}</span></td>
                <td><strong class="task-collateral-cell is-object">${escapeHtml(item.description)}</strong><small>${escapeHtml(item.clientId)}</small></td>
                <td><span class="task-collateral-cell is-address">${escapeHtml(item.address)}</span></td>
                <td><span class="task-collateral-cell is-client">${escapeHtml(item.clientName)}</span></td>
                <td><span class="task-collateral-cell">${escapeHtml(contract?.number || task.contractId || "-")}</span></td>
                <td>${formatShortMoney(item.marketValue || 0)}</td>
                <td>${formatShortMoney(item.pledgeValue || 0)}</td>
              </tr>
            `;
          }).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTaskSpecificBlocks(task, collateral, collaterals) {
  if (isInspectionTaskType(task.type)) return renderInspectionTaskBlock(task, collateral);
  if (isMobileInspectionTaskType(task.type)) return renderMobileInspectionTaskBlock(task, collateral);
  if (isReportingTaskType(task.type)) return renderReportingTaskBlock(task, collaterals);
  if (isRevaluationTaskType(task.type)) return renderRevaluationTaskBlock(task, collateral);
  if (isMonitoringTaskType(task.type)) return renderMonitoringTaskBlock(task, collateral, collaterals);
  if (isPledgeOperationTaskType(task.type)) return renderPledgeOperationBlock(task, collateral);
  return "";
}

function renderInspectionTaskBlock(task, collateral) {
  const reportFields = getInspectionReportFields(task, collateral);
  const rightFields = getInspectionRightsFields(collateral);
  const insuranceFields = getInspectionInsuranceFields(collateral);
  const result = getInspectionResult(task, collateral);
  return `
    <section class="task-specific-form inspection-task-form">
      <section class="panel task-form-panel">
        <div class="panel-title">
          <div><h2>Описание отчета</h2></div>
          ${badge(task.type, "info")}
        </div>
        ${renderTaskFormGrid(reportFields, "task-form-grid compact")}
      </section>
      ${renderInspectionChecklistBlock(task, collateral, result)}
      ${renderInspectionResultPanel(task, collateral, result)}
      <section class="panel task-form-panel">
        <div class="panel-title">
          <div><h2>Документы, подтверждающие право на объект залога</h2><p class="hint">Проверочные поля по праву собственности. Файлы прикладываются в едином блоке «Документы» справа.</p></div>
        </div>
        ${renderTaskFormGrid(rightFields, "task-form-grid compact")}
      </section>
      <section class="panel task-form-panel">
        <div class="panel-title">
          <div><h2>Документы, подтверждающие страхование объекта залога</h2><p class="hint">Проверочные поля по страховому полису активного объекта. Сам контейнер файлов расположен справа.</p></div>
        </div>
        ${renderTaskFormGrid(insuranceFields, "task-form-grid compact")}
      </section>
      ${renderCollateralPhotoShots(task, collateral)}
      ${renderMobileInspectionResults(task, collateral)}
    </section>
  `;
}

function renderMobileInspectionTaskBlock(task, collateral) {
  const mobileRoute = `/mobile/employee/tasks/${task.id}/photos`;
  const result = getMobileInspectionProgress(task, collateral);
  return `
    <section class="task-specific-form inspection-task-form">
      <section class="panel task-form-panel mobile-inspection-task-panel">
        <div class="panel-title">
          <div>
            <h2>Задача на выездной осмотр</h2>
            <p class="hint">Мобильная подзадача создана из основного осмотра ${escapeHtml(task.parentTaskId || "-")} и возвращает результат выездного осмотра в основную задачу.</p>
          </div>
          ${badge(task.status)}
        </div>
        ${renderInfoGrid({
          "Основная задача": task.parentTaskId || "-",
          "Канал выполнения": "Мобильный АРМ сотрудника",
          "Исполнитель": task.assignee,
          "Объект залога": collateral?.id || task.collateralId,
          "Плановый срок": task.dueDate,
          "Фото получены": `${result.done} из ${result.total}`,
          "Результат": task.result
        })}
        <div class="inline-actions">
          <button class="btn btn-primary" data-route="${mobileRoute}">Открыть мобильный интерфейс</button>
          ${task.parentTaskId ? `<button class="btn btn-secondary" data-route="/app/tasks/${task.parentTaskId}">Открыть основную задачу</button>` : ""}
        </div>
      </section>
      ${renderCollateralPhotoShots(task, collateral)}
    </section>
  `;
}

function getInspectionReportFields(task, collateral) {
  const isRepeat = task.type === "Повторный осмотр";
  return [
    { label: "Причина осмотра", value: isRepeat ? "По замечаниям предыдущего осмотра" : "По заявке / новой задаче", type: "select", options: ["По заявке / новой задаче", "Плановый контроль", "По замечаниям предыдущего осмотра", "По сигналу риска"] },
    { label: "Вид осмотра", value: isRepeat ? "Внеплановый" : "Плановый", type: "select", options: ["Плановый", "Внеплановый"] },
    { label: "Тип осмотра", value: "Выездной", type: "select", options: ["Выездной", "Дистанционный", "Документарный"] },
    { label: "Ресурс для осмотра", value: task.assignee || "Сотрудник Банка", type: "select", options: ["Сотрудник Банка", "Аутсорсер", task.assignee || "Сотрудник Банка"] },
    { label: "Участник осмотра", value: collateral?.clientName || task.client || "" },
    { label: "Статус верификации", value: "Действующая", type: "select", options: ["Действующая", "Требует подтверждения", "Не подтверждена"] }
  ];
}

function getInspectionRightsFields(collateral) {
  const encumbrance = collateral?.encumbrances?.[0] || {};
  return [
    { label: "Право залогодателя", value: collateral?.externalData?.["Право собственности"] || "Установлено", type: "select", options: ["Установлено", "Требует проверки", "Не подтверждено"] },
    { label: "Основание права", value: getOwnershipBasis(collateral), type: "select", options: ["Договор купли-продажи", "Кадастровая выписка", "Инвойс и акт ввода", "Техпаспорт / СТС", "Складские документы"] },
    { label: "Копия правоустанавливающего документа", value: "Вложена / Отсутствует", type: "select", options: ["Вложена / Отсутствует", "Вложена", "Отсутствует"] },
    { label: "Номер", value: encumbrance.number || collateral?.fields?.["Кадастровый номер"] || collateral?.fields?.["VIN"] || collateral?.fields?.["Серийный номер"] || "123" },
    { label: "Дата", value: encumbrance.date || collateral?.updatedAt?.slice(0, 10) || "2026-06-17", type: "date" },
    { label: "Копия документа об оплате", value: "Вложена / Отсутствует", type: "select", options: ["Вложена / Отсутствует", "Вложена", "Отсутствует"] }
  ];
}

function getInspectionInsuranceFields(collateral) {
  const insurance = collateral?.insurance || {};
  return [
    { label: "Требуется страхование", value: "ДА", type: "select", options: ["ДА", "НЕТ"] },
    { label: "Объект залога застрахован", value: collateral?.insuranceStatus === "Оплачена" ? "ДА" : "НЕТ", type: "select", options: ["ДА", "НЕТ"] },
    { label: "Страховая премия уплачена", value: insurance.premiumStatus === "Оплачена" ? "ДА" : "НЕТ", type: "select", options: ["ДА", "НЕТ"] },
    { label: "Полис страхования представлен", value: insurance.policy ? "ДА" : "НЕТ", type: "select", options: ["ДА", "НЕТ"] },
    { label: "Наименование страховщика", value: insurance.company || "Не указано" },
    { label: "Статус аккредитации", value: "Действующая", type: "select", options: ["Действующая", "Требует проверки", "Не аккредитована"] },
    { label: "Номер полиса страхования", value: insurance.policy || "Не указан" },
    { label: "Срок действия полиса", value: insurance.to || collateral?.insuranceDue || "2026-12-31", type: "date" }
  ];
}

function getOwnershipBasis(collateral) {
  if (collateral?.type === "Недвижимость") return "Кадастровая выписка";
  if (collateral?.type === "Автотранспорт") return "Техпаспорт / СТС";
  if (collateral?.type === "Оборудование") return "Инвойс и акт ввода";
  if (collateral?.type === "Товары в обороте") return "Складские документы";
  return "Договор купли-продажи";
}

function renderInspectionResultPanel(task, collateral, result) {
  return `
    <section class="panel task-form-panel inspection-result-panel">
      <div class="panel-title">
        <div><h2>Результат осмотра объекта залога</h2><p class="hint">Результат пересчитывается по чек-листу факторов, весам групп и мастер-шкале состояния.</p></div>
        <div class="status-stack">${badge(result.state, result.tone)}${badge(`Балл ${result.score}`, result.tone)}</div>
      </div>
      ${renderTaskFormGrid([
        { label: "Оценка состояния", value: result.state, readonly: true },
        { label: "Итоговый балл", value: result.score, type: "number", readonly: true },
        { label: "Диапазон мастер-шкалы", value: `${result.scale.min}-${result.scale.max}`, readonly: true },
        { label: "Может быть принято в залог", value: result.canAccept, readonly: true },
        { label: "Дополнительные данные по осмотру объекта", value: result.comment, textarea: true, wide: true },
        { label: "Выводы", value: result.conclusion, textarea: true, wide: true }
      ], "task-form-grid compact")}
    </section>
  `;
}

function getInspectionResult(task, collateral) {
  const calculation = calculateInspectionFactorResult(task, collateral);
  return {
    ...calculation,
    comment: task.result || "Наблюдения в процессе осмотра зафиксированы. Фото и документы сверены с данными карточки залога.",
    conclusion: calculation.canAccept === "НЕТ"
      ? "По итогам осмотра объект не может быть принят без устранения критичных замечаний."
      : "По итогам осмотра объект подтвержден, существенных расхождений с карточкой залога не выявлено."
  };
}

function calculateInspectionFactorResult(task, collateral) {
  const groups = getInspectionFactorGroups(collateral).map((group) => {
    const items = group.items.map((factor, index) => {
      const selected = getInspectionSelectedOption(task, collateral, factor);
      const maxScore = Math.max(...factor.values.map((item) => item.score));
      const factorWeight = getInspectionFactorWeight(group, factor, index);
      const weightedFactorScore = selected.score * (factorWeight / 100);
      const maxWeightedFactorScore = maxScore * (factorWeight / 100);
      return { ...factor, weight: factorWeight, selected, score: selected.score, maxScore, weightedFactorScore, maxWeightedFactorScore };
    });
    const rawScore = items.reduce((sum, item) => sum + item.weightedFactorScore, 0);
    const maxRawScore = items.reduce((sum, item) => sum + item.maxWeightedFactorScore, 0);
    const weightedScore = Math.round(rawScore * (group.weight / 100));
    const maxWeightedScore = Math.round(maxRawScore * (group.weight / 100));
    return { ...group, items, rawScore, maxRawScore, weightedScore, maxWeightedScore };
  });
  const score = Math.max(0, Math.round(groups.reduce((sum, group) => sum + group.weightedScore, 0)));
  const maxScore = Math.max(1, groups.reduce((sum, group) => sum + group.maxWeightedScore, 0));
  const scale = getInspectionMasterScale(score, maxScore);
  return { score, state: scale.state, tone: scale.tone, canAccept: scale.canAccept, scale, groups };
}

const inspectionFactorWeights = {
  "AUTO-ID-VIN": 40,
  "AUTO-ID-LOCATION": 30,
  "AUTO-ID-ODOMETER": 15,
  "AUTO-ID-DOCS": 15,
  "AUTO-BODY-DAMAGE": 35,
  "AUTO-BODY-LIGHTS": 20,
  "AUTO-BODY-TIRES": 25,
  "AUTO-BODY-CORROSION": 20,
  "AUTO-TECH-ENGINE": 35,
  "AUTO-TECH-CHASSIS": 25,
  "AUTO-TECH-SERVICE": 20,
  "AUTO-TECH-USAGE": 20,
  "AUTO-DOCS-INSURANCE": 30,
  "AUTO-DOCS-PHOTOS": 30,
  "AUTO-DOCS-OWNER": 25,
  "AUTO-DOCS-KEYS": 15,
  "REALTY-LAND-LOCATION": 30,
  "REALTY-LAND-BORDERS": 25,
  "REALTY-LAND-ACCESS": 25,
  "REALTY-LAND-PURPOSE": 20,
  "REALTY-BUILDING-USE": 25,
  "REALTY-BUILDING-FACADE": 25,
  "REALTY-BUILDING-INTERIOR": 25,
  "REALTY-BUILDING-ENGINEERING": 25,
  "REALTY-RIGHTS-OWNER": 35,
  "REALTY-RIGHTS-BANS": 35,
  "REALTY-RIGHTS-CADASTRE": 30,
  "REALTY-LIQUIDITY-DEMAND": 35,
  "REALTY-LIQUIDITY-PHOTOS": 20,
  "REALTY-LIQUIDITY-INFRA": 25,
  "REALTY-LIQUIDITY-USE": 20,
  "GEN-ID-LOCATION": 35,
  "GEN-ID-MARKING": 25,
  "GEN-ID-OWNER": 20,
  "GEN-ID-ACCESS": 20,
  "GEN-CONDITION-WORK": 35,
  "GEN-CONDITION-STORAGE": 25,
  "GEN-CONDITION-WEAR": 25,
  "GEN-CONDITION-SAFETY": 15,
  "GEN-DOCS-COMPLETE": 35,
  "GEN-DOCS-PHOTOS": 25,
  "GEN-DOCS-INSURANCE": 25,
  "GEN-DOCS-VALUATION": 15
};

function getInspectionFactorWeight(group, factor, index) {
  if (Number.isFinite(Number(factor.weight))) return Number(factor.weight);
  if (Number.isFinite(Number(inspectionFactorWeights[factor.code]))) return Number(inspectionFactorWeights[factor.code]);
  return Math.round(100 / Math.max(1, group.items.length || index + 1));
}

function getInspectionMasterScale(score, maxScore = 100) {
  const excellent = Math.round(maxScore * 0.9);
  const good = Math.round(maxScore * 0.7);
  const satisfactory = Math.round(maxScore * 0.4);
  if (score >= excellent) return { state: "Отличное", min: excellent, max: maxScore, canAccept: "ДА", tone: "ok" };
  if (score >= good) return { state: "Хорошее", min: good, max: Math.max(good, excellent - 1), canAccept: "ДА", tone: "ok" };
  if (score >= satisfactory) return { state: "Удовлетворительное", min: satisfactory, max: Math.max(satisfactory, good - 1), canAccept: "ДА, с условиями", tone: "warn" };
  return { state: "Неудовлетворительное", min: 0, max: Math.max(0, satisfactory - 1), canAccept: "НЕТ", tone: "danger" };
}

function getInspectionSelectedOption(task, collateral, factor) {
  const value = task?.inspectionAnswers?.[collateral?.id]?.[factor.code] || factor.defaultValue || factor.values[0]?.code;
  return factor.values.find((item) => item.code === value) || factor.values[0];
}

function updateTaskInspectionFactor(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  if (!task || !fieldEl.dataset.collateral || !fieldEl.dataset.factor) return;
  task.inspectionAnswers = task.inspectionAnswers || {};
  task.inspectionAnswers[fieldEl.dataset.collateral] = task.inspectionAnswers[fieldEl.dataset.collateral] || {};
  task.inspectionAnswers[fieldEl.dataset.collateral][fieldEl.dataset.factor] = fieldEl.value;
}

function renderInspectionChecklistBlock(task, collateral, result) {
  const groups = result.groups;
  return `
    <section class="panel task-form-panel inspection-checklist-panel">
      <div class="panel-title">
        <div><h2>Чек-лист осмотра</h2></div>
        <div class="status-stack">${badge(collateral?.type || "Тип не указан", "info")}${badge(`Итого ${result.score}`, result.tone)}</div>
      </div>
      <div class="inspection-checklist-grid">
        ${groups.map((group) => `
          <article class="inspection-checklist-group">
            <div class="inspection-factor-group-head">
              <h3>${escapeHtml(group.title)}</h3>
              <div class="risk-group-metrics">
                <div><span>Вес группы</span><strong>${group.weight}%</strong></div>
                <div><span>Балл группы</span><strong>${group.weightedScore}</strong></div>
              </div>
            </div>
            <div class="inspection-checklist-items">
              ${group.items.map((item) => `
                <div class="inspection-check-row">
                  <div class="inspection-factor-name"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.code)}</span></div>
                  <select data-inspection-factor data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(collateral?.id || "")}" data-factor="${escapeHtml(item.code)}" aria-label="${escapeHtml(item.name)}">
                    ${item.values.map((option) => `<option value="${escapeHtml(option.code)}" ${option.code === item.selected.code ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                  <div class="inspection-factor-score"><strong>${item.score}</strong><span>вес ${item.weight}%</span></div>
                </div>
              `).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getInspectionFactorGroups(collateral) {
  if (collateral?.type === "Автотранспорт") {
    return [
      { code: "AUTO-ID", title: "Идентификация транспорта", weight: 25, items: [
        { code: "AUTO-ID-VIN", name: "VIN и регистрационный номер", defaultValue: "match", values: [
          { code: "match", label: "VIN и госномер соответствуют техпаспорту", score: 100 },
          { code: "partial", label: "Есть несущественное расхождение в регистрационных данных", score: 60 },
          { code: "mismatch", label: "VIN или госномер не соответствуют документам", score: 10 }
        ] },
	        { code: "AUTO-ID-LOCATION", name: "Местонахождение транспорта", defaultValue: "confirmed", values: [
	          { code: "confirmed", label: "Транспорт находится по адресу осмотра", score: 100 },
	          { code: "moved", label: "Транспорт перемещен, адрес подтвержден ответственным", score: 65 },
	          { code: "missing", label: "Транспорт не найден по заявленному адресу", score: 0 }
	        ] },
	        { code: "AUTO-ID-ODOMETER", name: "Пробег и показания приборов", defaultValue: "normal", values: [
	          { code: "normal", label: "Пробег и показания соответствуют эксплуатации", score: 100 },
	          { code: "attention", label: "Показания требуют дополнительной сверки", score: 55 },
	          { code: "critical", label: "Показания не подтверждены или искажены", score: 10 }
	        ] },
	        { code: "AUTO-ID-DOCS", name: "Сверка техпаспорта", defaultValue: "match", values: [
	          { code: "match", label: "Техпаспорт соответствует объекту", score: 100 },
	          { code: "partial", label: "Есть несущественные расхождения", score: 60 },
	          { code: "mismatch", label: "Документ не соответствует объекту", score: 0 }
	        ] }
	      ] },
      { code: "AUTO-BODY", title: "Кузов и внешний вид", weight: 25, items: [
        { code: "AUTO-BODY-DAMAGE", name: "Повреждения кузова", defaultValue: "minor", values: [
          { code: "none", label: "Повреждения кузова отсутствуют", score: 100 },
          { code: "minor", label: "Есть косметические дефекты без влияния на стоимость", score: 70 },
          { code: "critical", label: "Есть существенные повреждения кузова", score: 20 }
        ] },
	        { code: "AUTO-BODY-LIGHTS", name: "Световые приборы и стекла", defaultValue: "ok", values: [
	          { code: "ok", label: "Световые приборы и стекла исправны", score: 100 },
	          { code: "attention", label: "Требуется замена отдельных элементов", score: 60 },
	          { code: "bad", label: "Неисправность влияет на эксплуатацию", score: 20 }
	        ] },
	        { code: "AUTO-BODY-TIRES", name: "Шины и колеса", defaultValue: "wear", values: [
	          { code: "ok", label: "Шины соответствуют сезону и норме износа", score: 100 },
	          { code: "wear", label: "Есть умеренный износ", score: 65 },
	          { code: "bad", label: "Требуется срочная замена шин", score: 20 }
	        ] },
	        { code: "AUTO-BODY-CORROSION", name: "Коррозия и следы ремонта", defaultValue: "minor", values: [
	          { code: "none", label: "Коррозия и следы ремонта не выявлены", score: 100 },
	          { code: "minor", label: "Есть локальные следы ремонта", score: 70 },
	          { code: "critical", label: "Есть коррозия или ремонт несущих элементов", score: 15 }
	        ] }
	      ] },
      { code: "AUTO-TECH", title: "Техническое состояние", weight: 30, items: [
        { code: "AUTO-TECH-ENGINE", name: "Двигатель и ошибки панели", defaultValue: "ok", values: [
          { code: "ok", label: "Ошибки отсутствуют, двигатель работает штатно", score: 100 },
          { code: "service", label: "Есть предупреждения, требуется сервисная диагностика", score: 55 },
          { code: "bad", label: "Выявлены критичные ошибки или нестабильная работа", score: 10 }
        ] },
	        { code: "AUTO-TECH-CHASSIS", name: "Ходовая часть и тормоза", defaultValue: "ok", values: [
	          { code: "ok", label: "Ходовая часть и тормоза без замечаний", score: 100 },
	          { code: "wear", label: "Есть износ, влияющий на ликвидность", score: 65 },
	          { code: "unsafe", label: "Эксплуатация требует ремонта", score: 15 }
	        ] },
	        { code: "AUTO-TECH-SERVICE", name: "Сервисная история", defaultValue: "confirmed", values: [
	          { code: "confirmed", label: "Сервисная история подтверждена", score: 100 },
	          { code: "partial", label: "История подтверждена частично", score: 60 },
	          { code: "missing", label: "Сервисная история отсутствует", score: 20 }
	        ] },
	        { code: "AUTO-TECH-USAGE", name: "Интенсивность эксплуатации", defaultValue: "normal", values: [
	          { code: "normal", label: "Эксплуатация соответствует назначению", score: 100 },
	          { code: "high", label: "Интенсивная эксплуатация повышает износ", score: 55 },
	          { code: "extreme", label: "Эксплуатация критично влияет на ресурс", score: 10 }
	        ] }
	      ] },
      { code: "AUTO-DOCS", title: "Эксплуатация и документы", weight: 20, items: [
        { code: "AUTO-DOCS-INSURANCE", name: "Страхование и техосмотр", defaultValue: collateral?.insuranceStatus === "Оплачена" ? "valid" : "attention", values: [
          { code: "valid", label: "Страхование и техосмотр действуют", score: 100 },
          { code: "attention", label: "Есть истекающий документ, требуется обновление", score: 60 },
          { code: "expired", label: "Ключевой документ отсутствует или истек", score: 15 }
        ] },
	        { code: "AUTO-DOCS-PHOTOS", name: "Фотофиксация ракурсов", defaultValue: "partial", values: [
	          { code: "complete", label: "Все обязательные фото ракурсов приложены", score: 100 },
	          { code: "partial", label: "Часть фото ожидается из мобильного приложения", score: 65 },
	          { code: "missing", label: "Фотофиксация не выполнена", score: 10 }
	        ] },
	        { code: "AUTO-DOCS-OWNER", name: "Право собственности", defaultValue: "confirmed", values: [
	          { code: "confirmed", label: "Право собственности подтверждено", score: 100 },
	          { code: "need-check", label: "Требуется сверка владельца", score: 50 },
	          { code: "not-confirmed", label: "Право собственности не подтверждено", score: 0 }
	        ] },
	        { code: "AUTO-DOCS-KEYS", name: "Комплект ключей и принадлежностей", defaultValue: "partial", values: [
	          { code: "complete", label: "Комплект передан полностью", score: 100 },
	          { code: "partial", label: "Комплект передан частично", score: 60 },
	          { code: "missing", label: "Комплект отсутствует", score: 15 }
	        ] }
	      ] }
    ];
  }
  if (collateral?.type === "Недвижимость") {
    return [
      { code: "REALTY-LAND", title: "Земельный участок", weight: 30, items: [
        { code: "REALTY-LAND-LOCATION", name: "Местонахождение участка", defaultValue: "cadastre-match", values: [
          { code: "cadastre-match", label: "Фактический адрес участка соответствует кадастру", score: 100 },
          { code: "cadastre-partial", label: "Фактический адрес участка частично требует уточнения", score: 60 },
          { code: "cadastre-mismatch", label: "Фактический адрес участка не соответствует кадастру", score: 10 }
        ] },
        { code: "REALTY-LAND-BORDERS", name: "Границы участка", defaultValue: "clear", values: [
          { code: "clear", label: "Границы участка установлены и соответствуют плану", score: 100 },
          { code: "unclear", label: "Границы читаются частично, требуется уточнение", score: 60 },
          { code: "conflict", label: "Границы участка не подтверждены", score: 15 }
        ] },
	        { code: "REALTY-LAND-ACCESS", name: "Подъездные пути", defaultValue: "available", values: [
	          { code: "available", label: "Подъездные пути доступны круглый год", score: 100 },
	          { code: "limited", label: "Доступ ограничен сезонно или режимом территории", score: 65 },
	          { code: "blocked", label: "Доступ к участку затруднен", score: 20 }
	        ] },
	        { code: "REALTY-LAND-PURPOSE", name: "Разрешенное использование", defaultValue: "match", values: [
	          { code: "match", label: "Использование соответствует документам", score: 100 },
	          { code: "attention", label: "Есть ограничения по использованию", score: 60 },
	          { code: "mismatch", label: "Фактическое использование не соответствует документам", score: 10 }
	        ] }
	      ] },
      { code: "REALTY-BUILDING", title: "Строение", weight: 35, items: [
        { code: "REALTY-BUILDING-USE", name: "Фактическое использование", defaultValue: "active", values: [
          { code: "active", label: "Объект эксплуатируется по назначению", score: 100 },
          { code: "partial", label: "Эксплуатация частичная, есть свободные площади", score: 65 },
          { code: "stopped", label: "Объект не эксплуатируется", score: 20 }
        ] },
        { code: "REALTY-BUILDING-FACADE", name: "Фасад и кровля", defaultValue: "attention", values: [
          { code: "ok", label: "Фасад и кровля без видимых дефектов", score: 100 },
          { code: "attention", label: "Требуется обновить фото или устранить локальные дефекты", score: 70 },
          { code: "bad", label: "Есть дефекты, влияющие на стоимость", score: 25 }
        ] },
	        { code: "REALTY-BUILDING-INTERIOR", name: "Внутреннее состояние", defaultValue: "ok", values: [
	          { code: "ok", label: "Помещения в рабочем состоянии", score: 100 },
	          { code: "wear", label: "Есть износ отделки и инженерных систем", score: 60 },
	          { code: "critical", label: "Состояние помещений неудовлетворительное", score: 15 }
	        ] },
	        { code: "REALTY-BUILDING-ENGINEERING", name: "Инженерные коммуникации", defaultValue: "work", values: [
	          { code: "work", label: "Коммуникации работают штатно", score: 100 },
	          { code: "limited", label: "Есть ограничения по отдельным системам", score: 60 },
	          { code: "critical", label: "Коммуникации требуют капитального ремонта", score: 10 }
	        ] }
	      ] },
      { code: "REALTY-RIGHTS", title: "Права и ограничения", weight: 20, items: [
        { code: "REALTY-RIGHTS-OWNER", name: "Собственник и право", defaultValue: "confirmed", values: [
          { code: "confirmed", label: "Собственник и право подтверждены документами", score: 100 },
          { code: "need-check", label: "Требуется уточнение правоустанавливающего документа", score: 55 },
          { code: "not-confirmed", label: "Право собственности не подтверждено", score: 0 }
        ] },
	        { code: "REALTY-RIGHTS-BANS", name: "Аресты и запреты", defaultValue: getCollateralRiskState(collateral) === "Критическое" ? "critical" : "clean", values: [
	          { code: "clean", label: "Аресты и запреты не выявлены", score: 100 },
	          { code: "attention", label: "Есть внешний сигнал, требуется проверка", score: 50 },
	          { code: "critical", label: "Выявлены ограничения, влияющие на залог", score: 0 }
	        ] },
	        { code: "REALTY-RIGHTS-CADASTRE", name: "Кадастровая актуальность", defaultValue: "actual", values: [
	          { code: "actual", label: "Кадастровые данные актуальны", score: 100 },
	          { code: "need-update", label: "Требуется обновление выписки", score: 55 },
	          { code: "outdated", label: "Кадастровые сведения устарели", score: 15 }
	        ] }
	      ] },
      { code: "REALTY-LIQUIDITY", title: "Ликвидность и доступность", weight: 15, items: [
        { code: "REALTY-LIQUIDITY-DEMAND", name: "Ликвидность объекта", defaultValue: "normal", values: [
          { code: "high", label: "Спрос на аналогичные объекты высокий", score: 100 },
          { code: "normal", label: "Спрос на аналогичные объекты стабильный", score: 80 },
          { code: "low", label: "Спрос ограничен, реализация может быть длительной", score: 35 }
        ] },
	        { code: "REALTY-LIQUIDITY-PHOTOS", name: "Фотофиксация объекта", defaultValue: "partial", values: [
	          { code: "complete", label: "Все обязательные ракурсы приложены", score: 100 },
	          { code: "partial", label: "Требуется обновить отдельные фото", score: 65 },
	          { code: "missing", label: "Фотофиксация отсутствует", score: 10 }
	        ] },
	        { code: "REALTY-LIQUIDITY-INFRA", name: "Инфраструктура и окружение", defaultValue: "normal", values: [
	          { code: "strong", label: "Окружение повышает ликвидность", score: 100 },
	          { code: "normal", label: "Окружение типовое для региона", score: 75 },
	          { code: "weak", label: "Окружение ограничивает спрос", score: 35 }
	        ] },
	        { code: "REALTY-LIQUIDITY-USE", name: "Альтернативное использование", defaultValue: "available", values: [
	          { code: "available", label: "Возможны альтернативные сценарии использования", score: 100 },
	          { code: "limited", label: "Альтернативное использование ограничено", score: 60 },
	          { code: "none", label: "Альтернативное использование не просматривается", score: 20 }
	        ] }
	      ] }
    ];
  }
  return [
    { code: "GEN-ID", title: "Наличие и идентификация", weight: 35, items: [
      { code: "GEN-ID-LOCATION", name: "Местонахождение объекта", defaultValue: "confirmed", values: [
        { code: "confirmed", label: "Объект находится по заявленному адресу", score: 100 },
        { code: "partial", label: "Местонахождение подтверждено ответственным лицом", score: 65 },
        { code: "missing", label: "Объект не найден по заявленному адресу", score: 0 }
      ] },
	      { code: "GEN-ID-MARKING", name: "Маркировка и номера", defaultValue: "match", values: [
	        { code: "match", label: "Маркировка и номера соответствуют документам", score: 100 },
	        { code: "partial", label: "Маркировка читается частично", score: 55 },
	        { code: "mismatch", label: "Маркировка не соответствует документам", score: 10 }
	      ] },
	      { code: "GEN-ID-OWNER", name: "Право владения", defaultValue: "confirmed", values: [
	        { code: "confirmed", label: "Право владения подтверждено", score: 100 },
	        { code: "need-check", label: "Право требует дополнительной проверки", score: 55 },
	        { code: "not-confirmed", label: "Право владения не подтверждено", score: 0 }
	      ] },
	      { code: "GEN-ID-ACCESS", name: "Доступ к объекту", defaultValue: "available", values: [
	        { code: "available", label: "Доступ к объекту обеспечен", score: 100 },
	        { code: "limited", label: "Доступ ограничен по времени или режиму", score: 60 },
	        { code: "blocked", label: "Доступ к объекту отсутствует", score: 15 }
	      ] }
	    ] },
    { code: "GEN-CONDITION", title: "Физическое состояние", weight: 40, items: [
      { code: "GEN-CONDITION-WORK", name: "Работоспособность", defaultValue: "work", values: [
        { code: "work", label: "Объект работоспособен", score: 100 },
        { code: "service", label: "Требуется обслуживание без остановки эксплуатации", score: 60 },
        { code: "broken", label: "Работоспособность не подтверждена", score: 15 }
      ] },
	      { code: "GEN-CONDITION-STORAGE", name: "Условия хранения", defaultValue: "ok", values: [
	        { code: "ok", label: "Условия хранения соответствуют типу объекта", score: 100 },
	        { code: "attention", label: "Есть замечания к условиям хранения", score: 60 },
	        { code: "bad", label: "Условия хранения создают риск ухудшения", score: 20 }
	      ] },
	      { code: "GEN-CONDITION-WEAR", name: "Износ объекта", defaultValue: "normal", values: [
	        { code: "low", label: "Износ не влияет на стоимость", score: 100 },
	        { code: "normal", label: "Износ умеренный", score: 65 },
	        { code: "high", label: "Износ существенно снижает стоимость", score: 20 }
	      ] },
	      { code: "GEN-CONDITION-SAFETY", name: "Безопасность эксплуатации", defaultValue: "safe", values: [
	        { code: "safe", label: "Эксплуатация безопасна", score: 100 },
	        { code: "attention", label: "Есть замечания по безопасности", score: 60 },
	        { code: "danger", label: "Эксплуатация небезопасна", score: 10 }
	      ] }
	    ] },
    { code: "GEN-DOCS", title: "Документы и фото", weight: 25, items: [
      { code: "GEN-DOCS-COMPLETE", name: "Комплектность документов", defaultValue: "complete", values: [
        { code: "complete", label: "Комплект документов достаточен", score: 100 },
        { code: "partial", label: "Не хватает отдельных подтверждающих документов", score: 55 },
        { code: "missing", label: "Ключевые документы отсутствуют", score: 10 }
      ] },
	      { code: "GEN-DOCS-PHOTOS", name: "Фотофиксация", defaultValue: "partial", values: [
	        { code: "complete", label: "Фотофиксация выполнена по всем ракурсам", score: 100 },
	        { code: "partial", label: "Фотофиксация выполнена частично", score: 65 },
	        { code: "missing", label: "Фотофиксация отсутствует", score: 10 }
	      ] },
	      { code: "GEN-DOCS-INSURANCE", name: "Страховые документы", defaultValue: collateral?.insuranceStatus === "Оплачена" ? "valid" : "attention", values: [
	        { code: "valid", label: "Страховые документы действуют", score: 100 },
	        { code: "attention", label: "Страховые документы требуют обновления", score: 55 },
	        { code: "missing", label: "Страховые документы отсутствуют", score: 10 }
	      ] },
	      { code: "GEN-DOCS-VALUATION", name: "Документы оценки", defaultValue: collateral?.appraisalStatus === "Действует" ? "valid" : "attention", values: [
	        { code: "valid", label: "Отчет оценки актуален", score: 100 },
	        { code: "attention", label: "Отчет оценки близок к истечению", score: 60 },
	        { code: "expired", label: "Отчет оценки истек", score: 15 }
	      ] }
	    ] }
  ];
}

function renderTaskFormGrid(fields, className = "task-form-grid") {
  return `
    <div class="${className}">
      ${fields.map((field) => renderTaskField(field)).join("")}
    </div>
  `;
}

function renderTaskField(field) {
  const value = field.value ?? "";
  const classes = ["task-field", field.wide ? "wide" : "", field.full ? "full-span" : ""].filter(Boolean).join(" ");
  if (field.textarea) {
    return `<label class="${classes}">${escapeHtml(field.label)}<textarea ${field.readonly ? "readonly" : ""}>${escapeHtml(value)}</textarea></label>`;
  }
  if (field.type === "select") {
    const options = [...new Set([...(field.options || []), value].filter((item) => item !== undefined && item !== null && item !== ""))];
    return `<label class="${classes}">${escapeHtml(field.label)}<select>${options.map((option) => `<option ${String(option) === String(value) ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }
  return `<label class="${classes}">${escapeHtml(field.label)}<input type="${escapeHtml(field.type || "text")}" value="${escapeHtml(value)}" ${field.readonly ? "readonly" : ""}></label>`;
}

function renderMonitoringTaskBlock(task, collateral) {
  if (!collateral) return `<section class="panel"><p class="hint">Для задачи мониторинга не найден связанный объект залога.</p></section>`;
  return `
    <section class="monitoring-task-layout">
      ${renderMonitoringObjectComponent(collateral, {
        note: collateral.id,
        showInspectionTable: false,
        showLatestValuation: true
      })}
      <section class="panel">
        <div class="panel-title"><h2>Сигналы риска</h2><span class="panel-note">${escapeHtml(collateral.id)}</span></div>
        ${renderRiskPanel(collateral)}
      </section>
      ${renderInsuranceBlock(collateral, { note: collateral.id, description: "Компонент повторяет данные страхования из карточки выбранного залога." })}
    </section>
  `;
}

function renderPledgeOperationBlock(task, collateral) {
  return `
    <section class="task-specific-form pledge-operation-form">
      <section class="panel">
        <h2>${escapeHtml(task.type)}: регистрационные данные</h2>
        ${renderInfoGrid({
          "Объект": collateral?.description,
          "Статус обременения": collateral?.encumbrances?.[0]?.status,
          "Источник данных": collateral?.source,
          "Внешняя проверка": collateral?.externalData?.["Дата проверки"]
        })}
        <label>Основание операции<textarea>Операция выполняется по заявке и проверенным данным внешних источников.</textarea></label>
      </section>
      ${renderInsuranceBlock(collateral, { note: collateral?.id || "", description: "Единый блок страхования активного залога. Данные полиса не редактируются в задаче." })}
      <section class="panel integration-call">
        <h2>Интеграционный вызов АБС ЦФТ</h2>
        <p>Метод: передача статуса залога и результата задачи. До завершения задачи статус обмена фиксируется системой.</p>
        <button class="btn btn-primary" data-action="send-abs" data-task="${task.id}">Передать в АБС ЦФТ</button>
      </section>
    </section>
  `;
}

function renderTaskDocumentsPanel(task, collaterals, activeCollateral) {
  return renderDocumentWidget({
    context: "task",
    ownerId: task.id,
    task,
    documents: task.documents || [],
    collaterals,
    activeCollateral,
    title: "Документы",
    subtitle: "Единый контейнер файлов задачи",
    description: "Файлы привязываются к задаче и выбранному залогу."
  });
}

function renderTaskExpertConclusion(task, collateral) {
  const defaults = getTaskExpertDefaults(task, collateral);
  const canGenerate = canGenerateTaskExpertConclusion(task);
  const expertAttachment = getTaskExpertAttachment(task);
  return `
    <section class="panel expert-conclusion-panel">
      <div class="panel-title">
        <div><h2>Экспертное заключение</h2><p class="hint">Единый блок для фиксации комментариев и итоговых выводов по задаче.</p></div>
        ${canGenerate ? `<button class="btn btn-secondary" data-action="generate-task-conclusion" data-task="${task.id}">Сформировать заключение</button>` : ""}
      </div>
      <div class="expert-conclusion-grid">
        <label>Комментарии<textarea data-task-expert="expertComment" data-task="${task.id}">${escapeHtml(task.expertComment ?? defaults.comment)}</textarea></label>
        <label>Выводы<textarea data-task-expert="expertConclusion" data-task="${task.id}">${escapeHtml(task.expertConclusion ?? defaults.conclusion)}</textarea></label>
        <div class="expert-conclusion-attachment">
          ${renderTaskExpertAttachmentRow(task, expertAttachment)}
        </div>
      </div>
    </section>
  `;
}

function getTaskExpertAttachment(task) {
  return (task.documents || [])
    .map((doc, index) => ({ ...doc, __documentIndex: index }))
    .find((doc) => doc.category === "expertConclusion" || doc.title === "Файл экспертного заключения") || null;
}

function renderTaskExpertAttachmentRow(task, attachment) {
  const hasFile = Boolean(attachment?.name);
  const row = attachment || {
    title: "Файл экспертного заключения",
    name: "",
    target: "task",
    status: "Ожидает файл",
    required: false
  };
  return `
    <div class="document-file-row expert-file-row ${hasFile ? "has-file" : "empty-file"}">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <span>${hasFile ? escapeHtml(row.name) : "Файл еще не прикреплен"}</span>
        <small>Задача: ${escapeHtml(task.id)} · ${escapeHtml(row.status || "Ожидает файл")}</small>
      </div>
      <div class="document-file-meta">${badge("Дополнительный", "neutral")}${hasFile ? badge("Файл", "ok") : badge("Нет файла", "neutral")}</div>
      <div class="document-row-actions">
        ${hasFile ? `
          <a class="doc-download-button" href="${createDocumentDownloadHref(row, "task", task.id)}" download="${escapeHtml(row.name)}" title="Скачать файл" aria-label="Скачать файл ${escapeHtml(row.name)}">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"></path>
            </svg>
          </a>
          <button type="button" class="doc-delete-button" data-action="delete-document" data-doc-context="task" data-doc-owner="${escapeHtml(task.id)}" data-doc-index="${escapeHtml(row.__documentIndex ?? "")}" data-doc-title="${escapeHtml(row.title)}" data-doc-target="${escapeHtml(row.target || "task")}" data-doc-name="${escapeHtml(row.name)}" title="Удалить файл" aria-label="Удалить файл ${escapeHtml(row.name)}">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"></path>
            </svg>
          </button>
        ` : ""}
        <label class="doc-add-button ${hasFile ? "secondary" : ""}" title="Прикрепить файл">+
          <input type="file" data-task-expert-file="${escapeHtml(task.id)}">
        </label>
      </div>
    </div>
  `;
}

function getTaskExpertDefaults(task, collateral) {
  if (isInspectionTaskType(task.type)) return { comment: task.result || "По результатам осмотра необходимо зафиксировать состояние объекта.", conclusion: `Объект ${collateral?.id || ""} может быть принят к дальнейшей работе после проверки документов и фото.` };
  if (isRevaluationTaskType(task.type)) return { comment: task.result || "Оценка выполняется с учетом рыночных аналогов.", conclusion: `Стоимость объекта ${collateral?.id || ""} требует подтверждения расчетом.` };
  if (isMonitoringTaskType(task.type)) return { comment: task.result || "Мониторинг выполняется по активному объекту залога.", conclusion: `По объекту ${collateral?.id || ""} требуется зафиксировать результат контроля.` };
  return { comment: task.result || "Комментарий исполнителя по результату обработки задачи.", conclusion: "Результат задачи зафиксирован и готов к дальнейшему маршруту." };
}

function canGenerateTaskExpertConclusion(task) {
  return Boolean(task && !isReportingTaskType(task.type));
}

function getTaskExpertConclusionTemplate(task) {
  if (isInspectionTaskType(task.type)) return { id: "expert-inspection", name: "Экспертное заключение по осмотру" };
  if (isMobileInspectionTaskType(task.type)) return { id: "expert-field-inspection", name: "Экспертное заключение по выездному осмотру" };
  if (isRevaluationTaskType(task.type)) return { id: "expert-valuation", name: "Экспертное заключение по оценке" };
  if (isMonitoringTaskType(task.type)) return { id: "expert-monitoring", name: "Экспертное заключение по мониторингу" };
  if (isPledgeOperationTaskType(task.type)) return { id: "expert-pledge-operation", name: "Экспертное заключение по залоговой операции" };
  return { id: "expert-task", name: "Экспертное заключение по задаче" };
}

function getGeneratedExpertConclusionText(task, collateral) {
  const objectText = collateral ? `${collateral.id} (${collateral.type})` : "объект залога не выбран";
  if (isInspectionTaskType(task.type) || isMobileInspectionTaskType(task.type)) return `Осмотр по объекту ${objectText} обработан. Результаты осмотра, документы и фотофиксация выгружены в печатную форму экспертного заключения.`;
  if (isRevaluationTaskType(task.type)) return `Оценка по объекту ${objectText} обработана. Рыночные аналоги, расчет стоимости и выводы эксперта выгружены в печатную форму экспертного заключения.`;
  if (isMonitoringTaskType(task.type)) return `Мониторинг по объекту ${objectText} обработан. Контрольные показатели, последняя оценка и результат проверки выгружены в печатную форму экспертного заключения.`;
  if (isPledgeOperationTaskType(task.type)) return `Залоговая операция по объекту ${objectText} обработана. Данные задачи, договора и объекта залога выгружены в печатную форму экспертного заключения.`;
  return `Задача ${task.id} обработана. Основные данные задачи выгружены в печатную форму экспертного заключения.`;
}

function buildTaskExpertConclusionContent(task, collateral, collaterals, template, generatedAt) {
  const activeContracts = getTaskActiveContracts(task, collateral);
  const contract = activeContracts[0] || getContract(task.contractId);
  const contractText = activeContracts.length > 1
    ? activeContracts.map((item) => item.number).join(", ")
    : contract?.number || task.contractId || "-";
  const defaults = getTaskExpertDefaults(task, collateral);
  const objectList = collaterals.length
    ? collaterals.map((item) => `${item.id} - ${item.type} - ${item.description}`).join("; ")
    : "Объекты залога не привязаны";
  return [
    "Печатная форма экспертного заключения",
    `Шаблон: ${template.name}`,
    `Код шаблона: ${template.id}`,
    `Дата формирования: ${generatedAt}`,
    `Номер задачи: ${task.id}`,
    `Тип задачи: ${task.type}`,
    `Наименование задачи: ${task.title}`,
    `Статус задачи: ${task.status}`,
    `Исполнитель: ${task.assignee || "-"}`,
    `Инициатор: ${getTaskInitiator(task)}`,
    `Клиент по договору: ${summarizeNames(activeContracts.map((item) => item.clientName))}`,
    `Роль по договору: ${summarizeNames(activeContracts.map(getContractPartyRole))}`,
    `ИНН клиента по договору: ${contract?.inn || "-"}`,
    `Залогодатель: ${collateral?.clientName || "-"}`,
    `ИНН залогодателя: ${collateral?.clientId || "-"}`,
    `Договор: ${contractText}`,
    `Активный объект залога: ${collateral ? `${collateral.id} - ${collateral.description}` : "-"}`,
    `Тип активного объекта: ${collateral?.type || "-"}`,
    `Рыночная стоимость: ${collateral ? formatMoney(collateral.marketValue || 0) : "-"}`,
    `Залоговая стоимость: ${collateral ? formatMoney(collateral.pledgeValue || 0) : "-"}`,
    `Объекты в задаче: ${objectList}`,
    `Комментарий эксперта: ${task.expertComment || defaults.comment}`,
    `Вывод эксперта: ${task.expertConclusion || defaults.conclusion}`,
    `Результат задачи: ${task.result || "-"}`
  ];
}

function buildTaskExpertConclusionDocument(task, collateral, collaterals) {
  const generatedAt = formatTaskHistoryDate();
  const template = getTaskExpertConclusionTemplate(task);
  const filename = `${template.name} ${task.id}.pdf`;
  return {
    title: "Файл экспертного заключения",
    name: filename,
    target: "task",
    required: false,
    status: "Сформирован автоматически",
    date: generatedAt.split(" ")[0],
    category: "expertConclusion",
    templateId: template.id,
    templateName: template.name,
    generatedAt,
    generatedBy: getRole().user,
    source: "Печатная форма",
    content: buildTaskExpertConclusionContent(task, collateral, collaterals, template, generatedAt)
  };
}

function upsertTaskExpertConclusionDocument(task, documentRow) {
  task.documents = task.documents || [];
  const currentIndex = task.documents.findIndex((doc) => doc.category === "expertConclusion" || doc.title === "Файл экспертного заключения");
  if (currentIndex >= 0) task.documents[currentIndex] = { ...task.documents[currentIndex], ...documentRow };
  else task.documents.push(documentRow);
}

function renderTaskRoute(task, role) {
  const canCreateFollowup = role.permissions.createTask;
  const showInspectionTask = canCreateFollowup && isMonitoringTaskType(task.type);
  const showRevaluationTask = canCreateFollowup && (isMonitoringTaskType(task.type) || isInspectionTaskType(task.type));
  const showMobileInspectionActions = canCreateFollowup && isInspectionTaskType(task.type);
  const approval = task.approval || null;
  const routeSteps = [...(task.route || [])];
  if (approval?.approver && !routeSteps.includes(approval.approver)) routeSteps.push(approval.approver);
  const closed = isTaskClosed(task);
  const disabled = closed ? "disabled" : "";
  return `
    <section class="panel task-route-panel">
      <h2>Маршрут</h2>
      <div class="timeline">${routeSteps.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      ${approval?.approver ? `
        <div class="route-approval-note">
          <strong>Согласующий: ${escapeHtml(approval.approver)}</strong>
          <span>${badge(approval.status || "Ожидает передачи", approval.status === "На согласовании" ? "warn" : "info")}</span>
          <p>${escapeHtml(approval.comment || "Комментарий для согласующего не заполнен.")}</p>
        </div>
      ` : ""}
      <div class="route-actions">
        <button class="btn btn-secondary" data-action="add-approver" data-task="${task.id}" ${disabled}>Добавить согласующего</button>
        ${showInspectionTask ? `<button class="btn btn-secondary" data-action="create-followup-task" data-task="${task.id}" data-task-type="Первичный осмотр" ${disabled}>Создать задачу на осмотр</button>` : ""}
        ${showRevaluationTask ? `<button class="btn btn-primary" data-action="create-followup-task" data-task="${task.id}" data-task-type="Единичная переоценка" ${disabled}>Создать задачу на оценку</button>` : ""}
        ${showMobileInspectionActions ? `<button class="btn btn-secondary" data-action="open-mobile-inspection-task" data-task="${task.id}" ${disabled}>Создать задачу на выездной осмотр</button>` : ""}
      </div>
    </section>
  `;
}

function renderTaskHistory(task) {
  return `
    <section class="panel task-history-panel">
      <h2>История действий по задаче</h2>
      <div class="task-history-list">
        ${(task.history || []).map((item) => `
          <article class="task-history-event">
            <div><strong>${escapeHtml(item.action)}</strong><span>${escapeHtml(item.date)} - ${escapeHtml(item.user)}</span></div>
            ${badge(item.status)}
            <p>${escapeHtml(item.comment)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getCollateralRiskSignals(collateral) {
  const insuranceDays = daysUntil(collateral?.insuranceDue || collateral?.insurance?.to);
  const appraisalDays = daysUntil(collateral?.appraisalDue);
  const evaluations = collateral ? getSortedEvaluations(collateral) : [];
  const latestEvaluation = evaluations[evaluations.length - 1];
  const previousEvaluation = evaluations[evaluations.length - 2];
  const marketDelta = latestEvaluation && previousEvaluation ? getValueDelta(latestEvaluation.market, previousEvaluation.market) : 0;
  const contracts = (collateral?.contractIds || []).map(getContract).filter(Boolean);
  const maxLtv = contracts.reduce((max, contract) => Math.max(max, Number(contract.ltv || 0)), 0);
  const external = collateral?.externalData || {};
  const hasCourtRestriction = [external["Статус взыскания"], external["Ограничения"], external["Судебный риск"]]
    .some((value) => isRiskText(value));
  const arrestText = external["Аресты"] || external["Запреты"] || "";
  const hasArrest = isRiskText(arrestText);
  return [
    {
      name: "Истечение страховки",
      level: getDueRiskLevel(collateral?.insuranceStatus, insuranceDays, { criticalStatuses: ["Не оплачена", "Просрочена"], warnStatuses: ["Истекает"] }),
      source: buildDueRiskSource(collateral?.insuranceStatus, insuranceDays, collateral?.insuranceDue || collateral?.insurance?.to)
    },
    {
      name: "Окончание срока оценки",
      level: getDueRiskLevel(collateral?.appraisalStatus, appraisalDays, { criticalStatuses: ["Просрочена"], warnStatuses: ["Истекает"] }),
      source: buildDueRiskSource(collateral?.appraisalStatus, appraisalDays, collateral?.appraisalDue)
    },
    {
      name: "Падение стоимости",
      level: marketDelta <= -15 ? "critical" : marketDelta <= -7 ? "warn" : "ok",
      source: latestEvaluation && previousEvaluation ? `Динамика оценки ${formatPercentValue(marketDelta)}` : "Недостаточно истории оценки"
    },
    {
      name: "Ухудшение LTV",
      level: maxLtv > 100 ? "critical" : maxLtv > 80 ? "warn" : "ok",
      source: contracts.length ? `Максимальный LTV ${maxLtv}%` : "Нет связанного договора"
    },
    {
      name: "Статус имущества",
      level: collateral?.status === "В залоге" && !isRiskText(collateral?.fields?.["Признак изменения"]) ? "ok" : "warn",
      source: collateral?.status || collateral?.fields?.["Состояние"] || "Статус не указан"
    },
    {
      name: "Судебные ограничения",
      level: hasCourtRestriction ? "critical" : "ok",
      source: hasCourtRestriction ? "Есть ограничение во внешних данных" : "Проверка без замечаний"
    },
    {
      name: "Двойной залог",
      level: collateral?.crossPledge ? "warn" : "ok",
      source: collateral?.crossPledge ? `Связан с ${collateral?.contractIds?.length || 0} договорами` : "Объект привязан к одному договору"
    },
    {
      name: "Арест имущества",
      level: hasArrest ? "critical" : "ok",
      source: arrestText || "Аресты и запреты не выявлены"
    }
  ];
}

const collateralRiskSignalWeights = {
  "Истечение страховки": 15,
  "Окончание срока оценки": 15,
  "Падение стоимости": 15,
  "Ухудшение LTV": 20,
  "Статус имущества": 10,
  "Судебные ограничения": 10,
  "Двойной залог": 5,
  "Арест имущества": 10
};

function getRiskSignalLevelRatio(level) {
  if (level === "critical") return 1;
  if (level === "warn") return 0.5;
  return 0;
}

function getCollateralRiskScore(collateral) {
  const score = getCollateralRiskSignals(collateral).reduce((sum, signal) => {
    const weight = collateralRiskSignalWeights[signal.name] || 0;
    return sum + weight * getRiskSignalLevelRatio(signal.level);
  }, 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getCollateralRiskState(collateral) {
  const score = getCollateralRiskScore(collateral);
  if (score >= 75) return "Критическое";
  if (score >= 45) return "Требует внимания";
  if (score > 0) return "Удовлетворительное";
  return "Хорошее";
}

function getDueRiskLevel(status, days, options = {}) {
  const criticalStatuses = options.criticalStatuses || [];
  const warnStatuses = options.warnStatuses || [];
  if (criticalStatuses.includes(status)) return "critical";
  if (warnStatuses.includes(status)) return "warn";
  if (days !== null && days < 0) return "critical";
  if (days !== null && days <= 30) return "warn";
  return "ok";
}

function buildDueRiskSource(status, days, dueDate) {
  if (!dueDate) return status || "Срок не указан";
  if (days === null) return `${status || "Статус"}, дата ${dueDate}`;
  if (days < 0) return `${status || "Статус"}, просрочено на ${Math.abs(days)} дн.`;
  if (days <= 30) return `${status || "Статус"}, осталось ${days} дн.`;
  return `${status || "Статус"}, срок до ${dueDate}`;
}

function isRiskText(value) {
  const text = String(value || "").toLowerCase();
  if (!text || text === "нет" || text.includes("не выяв") || text.includes("без замеч")) return false;
  return text.includes("есть") || text.includes("арест") || text.includes("запрет") || text.includes("иск") || text.includes("суд") || text.includes("огранич") || text.includes("риск");
}

function formatPercentValue(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${String(rounded).replace(".", ",")}%`;
}

function renderRiskPanel(collateral) {
  return `<div class="risk-panel">${getCollateralRiskSignals(collateral).map((risk) => `<div class="risk-item ${risk.level === "critical" ? "critical" : risk.level === "warn" ? "warn" : "ok"}"><span>${escapeHtml(risk.name)}</span><small>${escapeHtml(risk.source)}</small><strong>${escapeHtml(risk.level === "critical" ? "Критично" : risk.level === "warn" ? "Внимание" : "Норма")}</strong></div>`).join("")}</div>`;
}

function riskTone(collateral) {
  const score = getCollateralRiskScore(collateral);
  const state = getCollateralRiskState(collateral);
  if (state === "Критическое" || score >= 75) return "danger";
  if (state === "Требует внимания" || score >= 45) return "warn";
  return "ok";
}

function renderInsuranceFields(collateral) {
  const insurance = collateral?.insurance || {};
  return renderInfoGrid({
    "Страховая компания": insurance.company,
    "Номер полиса": insurance.policy,
    "Срок действия с": insurance.from,
    "Срок действия до": insurance.to,
    "Страховая сумма": formatMoney(insurance.amount || 0),
    "Оплата премии": insurance.premiumStatus,
    "Источник": insurance.source,
    "Статус в карточке": collateral?.insuranceStatus
  });
}

function renderInsuranceBlock(collateral, options = {}) {
  const { note = "", description = "Параметры страхования поступают из конвейера или АБС ЦФТ и не редактируются в Залоговом модуле." } = options;
  return `
    <section class="panel insurance-panel">
      <div class="panel-title">
        <div><h2>Страхование</h2><p class="hint">${escapeHtml(description)}</p></div>
        ${note ? `<span class="panel-note">${escapeHtml(note)}</span>` : ""}
      </div>
      ${renderInsuranceFields(collateral)}
    </section>
  `;
}

function getCollateralPhotoAngles(collateral) {
  if (collateral?.type === "Автотранспорт") return ["VIN", "Госномер", "Вид спереди", "Вид сзади", "Шины", "Панель приборов"];
  if (collateral?.type === "Недвижимость") return ["Фасад", "Входная группа", "Помещение 1", "Помещение 2", "Кадастровая табличка"];
  if (collateral?.type === "Скот") return ["Общий вид стада", "Бирки", "Место содержания", "Кормовая зона"];
  return ["Общий вид", "Маркировка", "Состояние", "Место хранения"];
}

function getTaskPhotoValue(task, collateralId, angle) {
  return task.photoShots?.[collateralId]?.[angle] || state.mobile.employeePhotos[`${task.id}::${collateralId}::${angle}`];
}

function getMobilePhotoValue(taskId, collateralId, angle) {
  return state.mobile.employeePhotos[`${taskId}::${collateralId}::${angle}`];
}

function getMobileInspectionProgress(task, collateral) {
  const collateralId = collateral?.id || task?.collateralId || "";
  const angles = getCollateralPhotoAngles(collateral);
  const done = angles.filter((angle) => getMobilePhotoValue(task.id, collateralId, angle)).length;
  return { done, total: angles.length, angles, kind: "employee" };
}

function getRelatedMobileInspectionTasks(task) {
  if (!task?.id) return [];
  return state.data.tasks.filter((item) => item.parentTaskId === task.id && isMobileInspectionTaskType(item.type));
}

function renderMobileInspectionResults(task, collateral) {
  const related = getRelatedMobileInspectionTasks(task);
  const includeCurrentTaskResult = isInspectionTaskType(task.type) && (
    task.mobileResult ||
    task.mobileDraft ||
    (!related.length && (
      task.mobileInspectionResults?.some((entry) => entry.taskId === task.id) ||
      task.route?.includes("Выездной сотрудник")
    ))
  );
  const sources = includeCurrentTaskResult ? [task, ...related] : related;
  if (!sources.length) return "";
  return `
    <section class="panel mobile-inspection-results-panel">
      <div class="panel-title">
        <div><h2>Результаты выездного осмотра</h2><p class="hint">Данные поступают из созданных мобильных подзадач и отображаются в основной задаче осмотра.</p></div>
        ${badge(`${sources.length} источник(ов)`, "info")}
      </div>
      <div class="mobile-inspection-results">
        ${sources.map((item) => {
          const itemCollateral = getCollateral(item.collateralId) || collateral;
          const result = getMobileInspectionProgress(item, itemCollateral);
          const transmitted = item.mobileResult || task.mobileInspectionResults?.find((entry) => entry.taskId === item.id) || null;
          const checklistText = transmitted?.checklist
            ? `${transmitted.checklist.state}, ${transmitted.checklist.score} баллов (${transmitted.checklist.completed}/${transmitted.checklist.total})`
            : "Ожидается отправка из мобильного интерфейса";
          const contactText = transmitted?.contact
            ? `${transmitted.contact.name}, ${transmitted.contact.phone}`
            : item.assignee;
          const commentText = transmitted?.comment || item.result || "Ожидается";
          const photos = transmitted?.photos?.length
            ? transmitted.photos
            : result.angles.map((angle) => {
                const photo = getMobilePhotoValue(item.id, itemCollateral?.id || item.collateralId, angle);
                return { angle, name: photo?.name || "", status: photo ? "Получено" : "Не получено" };
              });
          return `
            <article class="mobile-result-card">
              <div class="mobile-result-head">
                <div>
                  <strong>${escapeHtml(item.type)}</strong>
                  <span>${escapeHtml(item.id)} · ${escapeHtml(itemCollateral?.id || item.collateralId || "-")}</span>
                </div>
                <div class="status-stack">${badge(item.status)}${transmitted ? badge("Передано", "ok") : badge(`${result.done}/${result.total} фото`, result.done === result.total ? "ok" : "warn")}</div>
              </div>
              <div class="mobile-result-meta">
                <div><span>Исполнитель</span><strong>${escapeHtml(item.assignee)}</strong></div>
                <div><span>Срок</span><strong>${escapeHtml(item.dueDate)}</strong></div>
                <div><span>Передано</span><strong>${escapeHtml(transmitted?.sentAt || "Нет")}</strong></div>
                <div><span>Контакт на месте</span><strong>${escapeHtml(contactText)}</strong></div>
                <div><span>Чек-лист</span><strong>${escapeHtml(checklistText)}</strong></div>
                <div><span>Комментарий</span><strong>${escapeHtml(commentText)}</strong></div>
              </div>
              ${transmitted?.checklist?.factors?.length ? `
                <div class="mobile-result-checklist">
                  ${transmitted.checklist.factors.map((factor) => `<span><strong>${escapeHtml(factor.title)}</strong>${escapeHtml(factor.value)} · ${factor.score} б. · вес ${factor.weight}%</span>`).join("")}
                </div>
              ` : ""}
              <div class="mobile-result-photos">
                ${photos.map((photo) => `<span class="mobile-photo-chip ${photo.name ? "done" : ""}">${escapeHtml(photo.angle)}${photo.name ? `: ${escapeHtml(photo.name)}` : `: ${escapeHtml(photo.status || "Не получено")}`}</span>`).join("")}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCollateralPhotoShots(task, collateral) {
  if (!collateral) return "";
  const angles = getCollateralPhotoAngles(collateral);
  return `
    <div class="panel collateral-photo-panel">
      <div class="panel-title"><div><h2>Фото снимки объекта залога</h2><p class="hint">Фото прикрепляются по каждому обязательному ракурсу с привязкой к задаче ${escapeHtml(task.id)} и залогу ${escapeHtml(collateral.id)}.</p></div>${badge(`${angles.length} ракурсов`, "info")}</div>
      <div class="collateral-photo-list">
        ${angles.map((angle) => {
          const photo = getTaskPhotoValue(task, collateral.id, angle);
          return `
            <div class="collateral-photo-row ${photo ? "done" : "missing"}">
              <div class="photo-shot-icon">${photo ? "JPG" : "!"}</div>
              <div><strong>${escapeHtml(angle)}</strong><span>${escapeHtml(photo?.name || "Фото не прикреплено")}</span></div>
              <div class="collateral-photo-actions">
                <label class="btn btn-secondary file-button">Прикрепить<input type="file" accept="image/*" data-task-photo-file="${task.id}::${collateral.id}::${escapeHtml(angle)}"></label>
                <button class="btn btn-secondary" data-action="attach-task-photo" data-task="${task.id}" data-collateral="${collateral.id}" data-angle="${escapeHtml(angle)}">Демо-фото</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderRevaluationTaskBlock(task, collateral) {
  if (isListRevaluationTaskType(task.type)) {
    return `
      <section class="task-specific-form revaluation-task-form list-revaluation-task-form">
        ${renderListRevaluationPanel(task)}
      </section>
    `;
  }
  const matrix = getMarketAnalogMatrix(task, collateral);
  const valueCalc = getRevaluationValueCalculation(collateral, matrix);
  return `
    <section class="task-specific-form revaluation-task-form">
      ${renderValuationInspectionBlock(task, collateral)}
      ${renderIndependentValuationBlock(collateral)}
      ${renderTaskRiskAssessment(task, collateral)}
      <section class="panel market-analysis-panel">
        <div class="panel-title">
          <div><h2>Анализ рынка аналогичных объектов в регионе</h2><p class="hint">Один столбец таблицы соответствует одному сопоставимому объекту. Характеристики и корректировки доступны для ручной правки.</p></div>
          <button class="btn btn-secondary" data-action="search-analogs" data-task="${task.id}">Найти аналоги</button>
        </div>
        <div class="market-analysis-controls">
          <label>Регион анализа<input value="${escapeHtml(collateral?.region || "Регион не указан")}" /></label>
          <label>Тип залога<input value="${escapeHtml(collateral?.type || "Не указан")}" /></label>
          <label>Дата анализа<input type="date" value="2026-06-16" /></label>
        </div>
        ${renderMarketAnalogMatrix(task, collateral, matrix)}
      </section>
      ${renderValuationCostsBlock(collateral)}
      ${renderValuationValueBlock(collateral, valueCalc)}
    </section>
  `;
}

function renderListRevaluationPanel(task) {
  const collaterals = getTaskCollaterals(task);
  const settings = getListRevaluationSettings(task);
  syncListRevaluationMethodSource(settings, collaterals);
  const methodConfig = getListRevaluationMethodConfig(settings, collaterals);
  const rows = getListRevaluationRows(task, collaterals, settings);
  const summary = getListRevaluationSummary(rows, settings);
  const typeDiscounts = getListRevaluationTypeDiscountRows(collaterals, settings);
  const excelDocument = getListRevaluationExcelDocument(task);
  const control = getListRevaluationControlSummary(rows, { ...settings, excelFileAttached: Boolean(excelDocument?.name) });
  const discountMode = isListRevaluationDiscountMode(settings);
  const methodOptions = getListRevaluationMethodOptions();
  return `
    <section class="panel table-panel list-revaluation-panel">
      <div class="panel-title">
        <div><h2>Списочная переоценка</h2><p class="hint">Работа с готовым пакетом залогов: расчет новых стоимостей, контроль исключений и применение результата в карточки залогов.</p></div>
        <div class="status-stack">${badge(`${summary.selectedCount} из ${rows.length} в расчете`, "info")}${badge(control.applyToneLabel, control.applyTone)}</div>
      </div>

      <div class="list-revaluation-summary package-summary">
        <div><span>Объектов в пакете</span><strong>${rows.length}</strong><small>состав зафиксирован при создании задачи</small></div>
        <div><span>В расчете</span><strong>${summary.selectedCount}</strong><small>${escapeHtml(summary.scopeLabel)}</small></div>
        <div><span>Рыночная стоимость</span><strong>${formatMoney(summary.newMarket)}</strong><small>${formatMoney(summary.currentMarket)} до</small></div>
        <div><span>Залоговая стоимость</span><strong>${formatMoney(summary.newPledge)}</strong><small>${formatMoney(summary.currentPledge)} до</small></div>
        <div><span>Изменение портфеля</span><strong class="${summary.totalDelta < 0 ? "negative" : "positive"}">${summary.totalDelta > 0 ? "+" : ""}${summary.totalDelta}%</strong><small>${summary.reviewCount} на ручную проверку</small></div>
      </div>

      <div class="list-revaluation-workflow-grid">
        <section class="list-revaluation-step-panel list-revaluation-package-panel">
          <div class="list-revaluation-control-head">
            <div><h3>Пакет списочной переоценки</h3><p class="hint">Объекты уже включены в задачу; здесь фиксируются причина, дата и основание массового пересчета.</p></div>
            ${badge(settings.scope, "info")}
          </div>
          <div class="task-form-grid compact list-revaluation-form-grid package-fields">
            ${renderListRevaluationField(task, "Причина переоценки", "reason", settings.reason, "textarea", [], false, "reason-field")}
            ${renderListRevaluationField(task, "Дата переоценки", "valuationDate", settings.valuationDate, "date", [], false, "date-field")}
            ${renderListRevaluationField(task, "Комментарий", "comment", settings.comment, "textarea", [], true, "comment-field")}
          </div>
        </section>

        <section class="list-revaluation-step-panel list-revaluation-tools-panel">
          <div class="list-revaluation-control-head">
            <div><h3>Инструменты пакета</h3><p class="hint">Быстрые действия меняют расчетный контур и источник данных, но не удаляют объекты из задачи.</p></div>
          </div>
          <div class="list-revaluation-tool-grid">
            <button class="list-revaluation-tool" data-action="bulk-revaluation-action" data-bulk-action="select-old" data-task="${escapeHtml(task.id)}"><strong>Оценка старше 6 мес.</strong><span>Оставить в расчете залоги с устаревшей оценкой</span></button>
            <button class="list-revaluation-tool" data-action="bulk-revaluation-action" data-bulk-action="select-problem" data-task="${escapeHtml(task.id)}"><strong>Проблемные объекты</strong><span>Сфокусировать расчет на объектах с сигналами контроля</span></button>
            <button class="list-revaluation-tool" data-action="bulk-revaluation-action" data-bulk-action="refresh-market" data-task="${escapeHtml(task.id)}"><strong>Обновить рынок</strong><span>Перезапросить доступные рыночные источники</span></button>
          </div>
        </section>

        <section class="list-revaluation-step-panel list-revaluation-method-panel">
          <div class="list-revaluation-control-head">
            <div><h3>Метод расчета</h3><p class="hint">Метод определяет источник рыночной стоимости и набор параметров расчета.</p></div>
            ${badge(settings.method, "info")}
          </div>
          <div class="task-form-grid compact list-revaluation-form-grid method-fields">
            ${renderListRevaluationField(task, "Метод / основание", "method", settings.method, "select", methodOptions, true, "method-field")}
            ${methodConfig.showMarketDelta
              ? renderListRevaluationField(task, methodConfig.marketDeltaLabel, "marketDelta", settings.marketDelta, "number")
              : renderListRevaluationStaticField("Рыночная стоимость", methodConfig.marketValueMode)}
            ${renderListRevaluationField(task, "Расчет залоговой", "pledgeMode", settings.pledgeMode, "select", ["От рыночной и дисконта", "Процент к текущей залоговой"])}
            ${discountMode
              ? renderListRevaluationField(task, "Единый залоговый дисконт, %", "discount", settings.discount, "number")
              : renderListRevaluationField(task, "Изменить залоговую, %", "pledgeDelta", settings.pledgeDelta, "number")}
            ${renderListRevaluationField(task, "Округление", "roundTo", settings.roundTo, "select", ["Без округления", "1 000", "10 000", "100 000", "1 000 000"])}
            ${renderListRevaluationField(task, "Порог ручной проверки, %", "reviewThreshold", settings.reviewThreshold, "number")}
          </div>
          ${settings.method === "Загрузка из Excel" ? renderListRevaluationExcelUploadWidget(task) : ""}
          ${renderListRevaluationMethodNote(methodConfig)}
          ${discountMode ? renderListRevaluationTypeDiscounts(task, typeDiscounts) : `<div class="list-revaluation-muted-note">Дисконт по видам имущества скрыт: залоговая стоимость считается процентом к текущей залоговой.</div>`}
        </section>

        <section class="list-revaluation-step-panel list-revaluation-control-panel">
          <div class="list-revaluation-control-head">
            <div><h3>Контроль перед применением</h3><p class="hint">Строки с сильным отклонением или контрольными сигналами требуют внимания перед обновлением карточек.</p></div>
            ${badge(control.applyToneLabel, control.applyTone)}
          </div>
          ${renderListRevaluationControlCards(control)}
          ${renderListRevaluationReviewList(summary)}
        </section>
      </div>

      <div class="list-revaluation-table-head">
        <div><h3>Объекты пакета переоценки</h3><p class="hint">Состав задачи отображается полностью; отключенные строки остаются в пакете, но не участвуют в расчете.</p></div>
        <div class="status-stack">${badge(`${summary.selectedCount} в расчете`, "info")}${badge(`${rows.length - summary.selectedCount} исключено`, rows.length - summary.selectedCount ? "warn" : "ok")}</div>
      </div>
      <div class="table-wrap list-revaluation-table-wrap">
        <table class="list-revaluation-table improved">
          <thead>
            <tr>
              <th>В расчете</th>
              <th>Залог</th>
              <th>Вид имущества</th>
              <th>Последняя оценка</th>
              <th>Стоимость до</th>
              <th>Стоимость после</th>
              <th>Отклонение</th>
              <th>Контроль</th>
            </tr>
          </thead>
          <tbody>${rows.map((row) => `
            <tr class="${row.selected ? "" : "is-muted"}">
              <td><input type="checkbox" ${row.selected ? "checked" : ""} data-list-revaluation-row data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(row.collateral.id)}" aria-label="Участвует в расчете ${escapeHtml(row.collateral.id)}"></td>
              <td><a class="link registry-object-link" href="#/app/collaterals/${escapeHtml(row.collateral.id)}">${escapeHtml(row.collateral.id)}</a><br><small>${escapeHtml(row.collateral.description)}</small></td>
              <td>${escapeHtml(row.collateral.type)}<br><small>${escapeHtml(row.collateral.region || "-")}</small></td>
              <td>${escapeHtml(row.lastEvaluationDate)}<br><small>${escapeHtml(row.lastEvaluationMethod)}</small></td>
              <td><strong>${formatMoney(row.currentMarket)}</strong><small>залоговая ${formatMoney(row.currentPledge)}</small></td>
              <td>
                <label class="inline-edit-field"><span>Рын.</span><input type="number" value="${row.newMarket}" data-list-revaluation-row-value data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(row.collateral.id)}" data-field="newMarket"></label>
                <label class="inline-edit-field"><span>Залог.</span><input type="number" value="${row.newPledge}" data-list-revaluation-row-value data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(row.collateral.id)}" data-field="newPledge"></label>
                ${discountMode ? `<label class="inline-edit-field"><span>Дисконт</span><div class="percent-input"><input type="number" value="${row.discount}" data-list-revaluation-row-value data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(row.collateral.id)}" data-field="discount"><span>%</span></div></label>` : ""}
              </td>
              <td>${badge(`${row.marketDeltaPercent}%`, Math.abs(row.marketDeltaPercent) >= Number(settings.reviewThreshold || 0) ? "warn" : "ok")}<br><small>${formatMoney(row.newMarket - row.currentMarket)}</small></td>
              <td>${badge(row.status, row.statusTone)}<br><small>${escapeHtml(row.controlReason)}</small></td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>

      <section class="list-revaluation-step-panel list-revaluation-impact-panel">
        <div class="list-revaluation-control-head">
          <div><h3>Влияние на договоры</h3><p class="hint">Оценка последствий для покрытия и LTV после выбранной переоценки.</p></div>
          ${badge(`${control.contractImpactCount} договор(ов)`, "info")}
        </div>
        ${renderListRevaluationContractImpact(task, rows)}
        <div class="list-revaluation-apply-actions">
          <button class="btn btn-secondary" data-action="bulk-revaluation-action" data-bulk-action="create-individual" data-task="${escapeHtml(task.id)}">Создать задачи оценки по отклонениям</button>
          <button class="btn btn-primary" data-action="bulk-revaluation-action" data-bulk-action="apply" data-task="${escapeHtml(task.id)}" ${control.canApply ? "" : "disabled"}>Применить переоценку</button>
        </div>
      </section>
    </section>
  `;
}



function isListRevaluationDiscountMode(settings) {
  return !String(settings.pledgeMode || "").includes("Процент к текущей залоговой");
}

function renderListRevaluationTypeDiscounts(task, typeDiscounts) {
  return `
    <div class="list-revaluation-type-discounts compact-discounts">
      <h4>Дисконт по видам имущества</h4>
      <div class="list-revaluation-type-discount-grid">
        ${typeDiscounts.map((item) => `
          <label>
            <span>${escapeHtml(item.type)}</span>
            <div class="percent-input">
              <input type="number" value="${escapeHtml(item.discount)}" data-list-revaluation-type-discount data-task="${escapeHtml(task.id)}" data-type="${escapeHtml(item.type)}">
              <span>%</span>
            </div>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderListRevaluationControlCards(control) {
  return `
    <div class="list-revaluation-control-cards">
      ${control.cards.map((card) => `
        <div class="list-revaluation-control-card ${card.tone}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <small>${escapeHtml(card.hint)}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderListRevaluationReviewList(summary) {
  return `
    <div class="list-revaluation-review-list improved">
      <h4>Требуют ручной проверки</h4>
      ${summary.reviewRows.length ? summary.reviewRows.map((row) => `
        <div>
          <strong>${escapeHtml(row.collateral.id)}</strong>
          <span>${escapeHtml(row.controlReason)}</span>
          ${badge(`${row.marketDeltaPercent}%`, "warn")}
        </div>
      `).join("") : `<p class="hint">Нет объектов с отклонением выше заданного порога.</p>`}
    </div>
  `;
}

function renderListRevaluationContractImpact(task, rows) {
  const impacts = getListRevaluationContractImpacts(task, rows);
  if (!impacts.length) return `<p class="hint">Нет выбранных объектов для расчета влияния на договоры.</p>`;
  return `
    <div class="table-wrap list-revaluation-impact-table-wrap">
      <table class="list-revaluation-impact-table">
        <thead><tr><th>Договор</th><th>Долг</th><th>Залоговая до</th><th>Залоговая после</th><th>LTV до / после</th><th>Покрытие</th></tr></thead>
        <tbody>${impacts.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.contract?.number || item.contractId)}</strong><small>${escapeHtml(item.contract?.clientName || task.client)}</small></td>
            <td>${formatMoney(item.debt)}</td>
            <td>${formatMoney(item.beforeValue)}</td>
            <td>${formatMoney(item.afterValue)}<small class="${item.delta >= 0 ? "positive" : "negative"}">${item.delta >= 0 ? "+" : ""}${formatMoney(item.delta)}</small></td>
            <td>${item.ltvBefore}% → <strong>${item.ltvAfter}%</strong></td>
            <td>${badge(`${item.coverageBefore} → ${item.coverageAfter}`, item.coverageTone)}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderListRevaluationField(task, label, field, value, type = "text", options = [], wide = false, extraClass = "") {
  const baseAttrs = `data-list-revaluation-field data-task="${escapeHtml(task.id)}" data-field="${escapeHtml(field)}"`;
  const className = ["readonly-field", wide ? "wide" : "", extraClass].filter(Boolean).join(" ");
  if (type === "textarea") {
    return `<label class="${className}"><span>${escapeHtml(label)}</span><textarea ${baseAttrs}>${escapeHtml(value)}</textarea></label>`;
  }
  if (type === "select") {
    return `
      <label class="${className}">
        <span>${escapeHtml(label)}</span>
        <select ${baseAttrs}>
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${String(option) === String(value) ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }
  return `<label class="${className}"><span>${escapeHtml(label)}</span><input type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${baseAttrs}></label>`;
}

function renderListRevaluationStaticField(label, value, hint = "", wide = false, extraClass = "") {
  const className = ["readonly-field", "computed-list-field", wide ? "wide" : "", extraClass].filter(Boolean).join(" ");
  return `
    <div class="${className}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "-")}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
}

function renderListRevaluationMethodNote(config) {
  return `
    <div class="list-revaluation-method-note">
      <strong>${escapeHtml(config.effectTitle)}</strong>
      <span>${escapeHtml(config.effectText)}</span>
    </div>
  `;
}

function getListRevaluationExcelDocument(task) {
  return (task.documents || []).find((doc) => {
    const name = String(doc.name || doc.title || "");
    return doc.category === "listRevaluationExcel"
      || doc.title === "Файл списочной переоценки"
      || (doc.target === "task" && /\.(xlsx|xls)$/i.test(name) && /переоценк|реестр|пул/i.test(name));
  }) || null;
}

function renderListRevaluationExcelUploadWidget(task) {
  const doc = getListRevaluationExcelDocument(task);
  const hasFile = Boolean(doc?.name);
  return `
    <div class="list-revaluation-excel-widget ${hasFile ? "has-file" : "empty-file"}">
      <div>
        <strong>${hasFile ? escapeHtml(doc.name) : "Excel-файл не прикреплен"}</strong>
        <span>${hasFile ? "Файл загружен и добавлен в Документы задачи" : "Прикрепите файл со значениями для объектов пакета переоценки"}</span>
        <small>Колонки: ID залога, рыночная стоимость, залоговая стоимость</small>
      </div>
      <label class="btn btn-secondary file-button">
        ${hasFile ? "Заменить Excel" : "Прикрепить Excel"}
        <input type="file" accept=".xlsx,.xls" data-list-revaluation-excel-file="${escapeHtml(task.id)}">
      </label>
    </div>
  `;
}

function getListRevaluationMethodOptions() {
  return ["Индексация по рынку", "Рыночные источники", "Загрузка из Excel"];
}

function normalizeListRevaluationMethod(value) {
  const method = String(value || "").trim();
  if (method === "Расчет по рыночным источникам") return "Рыночные источники";
  return getListRevaluationMethodOptions().includes(method) ? method : "Индексация по рынку";
}

function normalizeListRevaluationSourceLabel(value) {
  return String(value || "")
    .replace(/\s*\/\s*SpectrumData/g, "")
    .replace(/SpectrumData\s*\/\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getDefaultListRevaluationSettings() {
  return {
    strategy: "Единый процент",
    reason: "Плановая списочная переоценка",
    valuationDate: "2026-06-19",
    method: "Индексация по рынку",
    scope: "Все объекты",
    marketDelta: -7,
    pledgeMode: "От рыночной и дисконта",
    pledgeDelta: -7,
    discount: 22,
    roundTo: "10 000",
    reviewThreshold: 10,
    source: "Индекс рынка / ручная корректировка",
    comment: "Массовый пересчет по объектам, включенным в задачу.",
    excludedCollateralIds: [],
    typeDiscounts: {},
    rowOverrides: {}
  };
}

function getListRevaluationSettings(task) {
  const defaults = getDefaultListRevaluationSettings();
  task.listRevaluation = {
    ...defaults,
    ...(task.listRevaluation || {}),
    excludedCollateralIds: task.listRevaluation?.excludedCollateralIds || defaults.excludedCollateralIds,
    typeDiscounts: task.listRevaluation?.typeDiscounts || defaults.typeDiscounts,
    rowOverrides: task.listRevaluation?.rowOverrides || defaults.rowOverrides
  };
  task.listRevaluation.method = normalizeListRevaluationMethod(task.listRevaluation.method);
  task.listRevaluation.source = normalizeListRevaluationSourceLabel(task.listRevaluation.source) || defaults.source;
  return task.listRevaluation;
}

function getListRevaluationTypeDiscountDefault(type) {
  if (type === "Недвижимость") return 18;
  if (type === "Автотранспорт") return 22;
  if (type === "Оборудование") return 28;
  if (type === "Товары в обороте") return 30;
  if (type === "Скот") return 35;
  return 25;
}

function getListRevaluationTypeDiscountRows(collaterals, settings) {
  return [...new Set(collaterals.map((item) => item.type || "Иное имущество"))].map((type) => ({
    type,
    discount: settings.typeDiscounts?.[type] ?? getListRevaluationTypeDiscountDefault(type)
  }));
}

function parseListRevaluationRoundTo(value) {
  const numeric = Number(String(value || "").replace(/\s/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundListRevaluationValue(value, roundTo) {
  const numeric = Number(value || 0);
  const step = parseListRevaluationRoundTo(roundTo);
  if (!step) return Math.round(numeric);
  return Math.round(numeric / step) * step;
}

function getListRevaluationLatestEvaluation(collateral) {
  const evaluations = [...(collateral?.evaluations || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return evaluations[0] || null;
}

function isListRevaluationOldEvaluation(collateral) {
  const latest = getListRevaluationLatestEvaluation(collateral);
  if (!latest?.date) return true;
  const date = new Date(`${latest.date}T00:00:00`);
  const today = new Date("2026-06-19T00:00:00");
  if (Number.isNaN(date.getTime())) return true;
  return Math.ceil((today - date) / 86400000) > 183;
}

function hasListRevaluationProblemSignal(collateral) {
  const inspectionDays = daysUntil(collateral?.monitoring?.nextInspection);
  return getCollateralRiskScore(collateral) >= 45
    || collateral?.appraisalStatus !== "Действует"
    || collateral?.insuranceStatus !== "Оплачена"
    || (inspectionDays !== null && inspectionDays <= 7);
}

function isListRevaluationRowSelected(collateral, settings) {
  if ((settings.excludedCollateralIds || []).includes(collateral.id)) return false;
  if (settings.scope === "Оценка старше 6 месяцев") return isListRevaluationOldEvaluation(collateral);
  if (settings.scope === "Проблемные объекты") return hasListRevaluationProblemSignal(collateral);
  return true;
}

function getListRevaluationDiscount(collateral, settings) {
  const type = collateral?.type || "Иное имущество";
  const value = settings.typeDiscounts?.[type] ?? settings.discount ?? getListRevaluationTypeDiscountDefault(type);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : getListRevaluationTypeDiscountDefault(type);
}


function getListRevaluationComputedSource(settings, collaterals = []) {
  if (settings.method === "Рыночные источники" || settings.scope === "По внешним данным") return getListRevaluationMarketSourceLabel(collaterals);
  if (settings.method === "Загрузка из Excel" || settings.scope === "По загруженному Excel") {
    const source = normalizeListRevaluationSourceLabel(settings.source);
    return source && source !== "Индекс рынка / ручная корректировка" ? source : "Реестр объектов для списочной переоценки.xlsx";
  }
  return "Индекс рынка / ручная корректировка";
}

function syncListRevaluationMethodSource(settings, collaterals = []) {
  settings.source = getListRevaluationComputedSource(settings, collaterals);
}

function getListRevaluationMethodConfig(settings, collaterals = []) {
  const source = getListRevaluationComputedSource(settings, collaterals);
  const common = { source, sourceHint: "Заполняется системой по методу расчета", showMarketDelta: true };
  if (settings.method === "Рыночные источники") {
    return {
      ...common,
      marketDeltaLabel: "Корректировка к источнику, %",
      sourceHint: "Ценовые источники выбираются по типам залогов",
      marketValueMode: "По ценовым ориентирам источника",
      effectTitle: "Расчет от рыночных источников",
      effectText: "Рыночная стоимость берется из ценовых ориентиров по типу залога, процент применяется как корректировка к источнику."
    };
  }
  if (settings.method === "Загрузка из Excel") {
    return {
      ...common,
      showMarketDelta: false,
      sourceHint: "Имя файла фиксируется после загрузки",
      marketDeltaLabel: "Корректировка, %",
      marketValueMode: "Из загруженного файла",
      effectTitle: "Расчет из файла",
      effectText: "Файл прикрепляется в блок Документы задачи. Обязательные колонки: ID залога, рыночная стоимость, залоговая стоимость; желательно указать дату оценки, источник и комментарий."
    };
  }
  return {
    ...common,
    marketDeltaLabel: "Индекс изменения рынка, %",
    marketValueMode: "По индексу рынка",
    effectTitle: "Индексация по рынку",
    effectText: "Рыночная стоимость пересчитывается от текущей стоимости на заданный индекс изменения рынка."
  };
}

function applyListRevaluationMethodDefaults(settings, collaterals = []) {
  if (settings.method === "Рыночные источники") {
    settings.scope = "По внешним данным";
  } else if (settings.method === "Загрузка из Excel") {
    settings.scope = "По загруженному Excel";
  } else if (["По внешним данным", "По загруженному Excel"].includes(settings.scope)) {
    settings.scope = "Все объекты";
  }
  syncListRevaluationMethodSource(settings, collaterals);
}

function getListRevaluationMarketBenchmark(collateral) {
  const currentMarket = Number(collateral?.marketValue || 0);
  const analogRows = (marketAnalogs || []).filter((item) => getMarketAnalogItemType(item) === collateral?.type);
  if (!analogRows.length) return currentMarket;
  const objectText = String([
    collateral?.description,
    collateral?.fields?.["Марка/модель"],
    collateral?.fields?.["Модель"],
    collateral?.fields?.["Адрес"]
  ].filter(Boolean).join(" ")).toLowerCase();
  const tokens = objectText.split(/[^a-zа-я0-9]+/i).filter((token) => token.length >= 4);
  const matchedRows = analogRows.filter((item) => {
    const analogText = String([item.object, item.subtype, item.condition].filter(Boolean).join(" ")).toLowerCase();
    return tokens.some((token) => analogText.includes(token));
  });
  const rows = matchedRows.length ? matchedRows : [];
  if (!rows.length) return currentMarket;
  return Math.round(sumBy(rows, (item) => item.result || item.price) / rows.length);
}

function getListRevaluationImportedMarketValue(collateral) {
  const currentMarket = Number(collateral?.marketValue || 0);
  const seed = String(collateral?.id || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const delta = (seed % 9) - 4;
  return Math.round(currentMarket * (1 + delta / 100));
}

function getListRevaluationMethodMarketValue(collateral, settings) {
  const currentMarket = Number(collateral?.marketValue || 0);
  const delta = Number(settings.marketDelta || 0);
  let baseValue = currentMarket;
  if (settings.method === "Рыночные источники") {
    baseValue = getListRevaluationMarketBenchmark(collateral);
  } else if (settings.method === "Загрузка из Excel") {
    baseValue = getListRevaluationImportedMarketValue(collateral);
    return roundListRevaluationValue(baseValue, settings.roundTo);
  }
  return roundListRevaluationValue(baseValue * (1 + delta / 100), settings.roundTo);
}

function getListRevaluationRows(task, collaterals, settings = getListRevaluationSettings(task)) {
  const reviewThreshold = Number(settings.reviewThreshold || 0);
  return collaterals.map((collateral) => {
    const currentMarket = Number(collateral.marketValue || 0);
    const currentPledge = Number(collateral.pledgeValue || 0);
    const override = settings.rowOverrides?.[collateral.id] || {};
    const manualOverrideText = getListRevaluationManualOverrideText(override);
    const selected = isListRevaluationRowSelected(collateral, settings);
    let discount = getListRevaluationDiscount(collateral, settings);
    if (override.discount !== undefined) discount = Number(override.discount);
    let newMarket = getListRevaluationMethodMarketValue(collateral, settings);
    if (override.newMarket !== undefined) newMarket = Number(override.newMarket);
    let newPledge = String(settings.pledgeMode || "").includes("процент")
      ? roundListRevaluationValue(currentPledge * (1 + Number(settings.pledgeDelta || 0) / 100), settings.roundTo)
      : roundListRevaluationValue(newMarket * (1 - Number(discount || 0) / 100), settings.roundTo);
    if (override.newPledge !== undefined) newPledge = Number(override.newPledge);
    const marketDeltaPercent = currentMarket ? Math.round(((newMarket - currentMarket) / currentMarket) * 1000) / 10 : 0;
    const latest = getListRevaluationLatestEvaluation(collateral);
    let status = "Готово к применению";
    let statusTone = "ok";
    let statusHint = settings.method;
    if (!selected) {
      status = "Исключен";
      statusTone = "neutral";
      statusHint = "Не участвует в массовом действии";
    } else if (Math.abs(marketDeltaPercent) >= reviewThreshold) {
      status = "На ручную проверку";
      statusTone = "warn";
      statusHint = "Отклонение выше порога";
    } else if (hasListRevaluationProblemSignal(collateral)) {
      status = "Есть сигнал";
      statusTone = "info";
      statusHint = "Проверьте оценку, страховку или мониторинг";
    } else if (manualOverrideText) {
      status = "Ручная корректировка";
      statusTone = "info";
      statusHint = manualOverrideText;
    }
    const sourceBasis = getListRevaluationRowSourceBasis(collateral, settings, override);
    const controlReason = getListRevaluationControlReason(collateral, selected, marketDeltaPercent, reviewThreshold, statusHint, manualOverrideText);
    return {
      collateral,
      selected,
      currentMarket,
      currentPledge,
      newMarket,
      newPledge,
      discount: Number(discount || 0),
      marketDeltaPercent,
      lastEvaluationDate: latest?.date || "Нет оценки",
      lastEvaluationMethod: latest?.method || "Не указан",
      status,
      statusTone,
      statusHint,
      sourceBasis,
      controlReason
    };
  });
}

function getListRevaluationScopeLabel(scope) {
  if (scope === "Оценка старше 6 месяцев") return "объекты с устаревшей оценкой";
  if (scope === "Проблемные объекты") return "объекты с контрольными сигналами";
  if (scope === "По загруженному Excel") return "значения из загруженного файла";
  if (scope === "По внешним данным") return "расчет от внешних рыночных ориентиров";
  return "по всему пакету задачи";
}


function getListRevaluationTypeSources(type) {
  if (type === "Автотранспорт") return "Авто.ру";
  if (type === "Недвижимость") return "Циан / Сервис данных ЕГРН";
  if (type === "Оборудование") return "Авито";
  if (type === "Товары в обороте") return "Складская сверка / данные учета залогодателя";
  if (type === "Скот") return "Реестр поголовья / данные выездного осмотра";
  return "Ручная оценка";
}

function getListRevaluationRowSourceBasis(collateral, settings, override = {}) {
  if (override.newMarket !== undefined || override.newPledge !== undefined || override.discount !== undefined) return "Ручная корректировка";
  if (settings.method === "Загрузка из Excel" || settings.scope === "По загруженному Excel") return settings.source || "Загруженный Excel";
  if (settings.method === "Рыночные источники" || settings.scope === "По внешним данным") return getListRevaluationTypeSources(collateral.type);
  return `Индекс рынка ${Number(settings.marketDelta || 0)}%`;
}

function getListRevaluationManualOverrideText(override = {}) {
  const fields = [];
  if (override.newMarket !== undefined) fields.push("рыночная стоимость");
  if (override.newPledge !== undefined) fields.push("залоговая стоимость");
  if (override.discount !== undefined) fields.push("дисконт");
  return fields.length ? `Ручная корректировка: ${fields.join(", ")}` : "";
}

function getListRevaluationControlReason(collateral, selected, marketDeltaPercent, reviewThreshold, fallback = "", manualOverrideText = "") {
  if (!selected) return "Не участвует в расчете по правилу пакета";
  if (Math.abs(marketDeltaPercent) >= Number(reviewThreshold || 0)) {
    return [`Отклонение ${marketDeltaPercent}% выше порога ${reviewThreshold}%`, manualOverrideText].filter(Boolean).join("; ");
  }
  const reasons = [];
  if (manualOverrideText) reasons.push(manualOverrideText);
  if (collateral.appraisalStatus !== "Действует") reasons.push(`оценка: ${collateral.appraisalStatus || "не указана"}`);
  if (collateral.insuranceStatus !== "Оплачена") reasons.push(`страхование: ${collateral.insuranceStatus || "не указано"}`);
  const inspectionDays = daysUntil(collateral.monitoring?.nextInspection);
  if (inspectionDays !== null && inspectionDays <= 7) reasons.push(`осмотр через ${inspectionDays} дн.`);
  const riskScore = getCollateralRiskScore(collateral);
  if (riskScore >= 45) reasons.push(`риск ${riskScore}`);
  return reasons.length ? reasons.join("; ") : (fallback || "Контроль пройден");
}

function hasListRevaluationEvaluationDocument(collateral) {
  return (collateral.documents || []).some((doc) => String(doc.type || doc.name || "").toLowerCase().includes("оцен"));
}

function getListRevaluationControlSummary(rows, settings = {}) {
  const selectedRows = rows.filter((row) => row.selected);
  const reviewRows = selectedRows.filter((row) => row.status === "На ручную проверку");
  const warningRows = selectedRows.filter((row) => row.status !== "Готово к применению");
  const staleRows = selectedRows.filter((row) => isListRevaluationOldEvaluation(row.collateral));
  const documentGapRows = selectedRows.filter((row) => !hasListRevaluationEvaluationDocument(row.collateral));
  const contractImpactCount = getListRevaluationContractImpacts(null, rows).length;
  const excelMissing = settings.method === "Загрузка из Excel" && !settings.excelFileAttached;
  const canApply = selectedRows.length > 0 && !excelMissing;
  const applyTone = !canApply ? "danger" : (reviewRows.length ? "warn" : "ok");
  const applyToneLabel = excelMissing ? "Нужен Excel" : (canApply ? (reviewRows.length ? "Нужна проверка" : "Можно применить") : "Нет объектов");
  return {
    selectedCount: selectedRows.length,
    reviewCount: reviewRows.length,
    warningCount: warningRows.length,
    staleCount: staleRows.length,
    documentGapCount: documentGapRows.length,
    contractImpactCount,
    canApply,
    applyTone,
    applyToneLabel,
    cards: [
      { label: "В расчете", value: String(selectedRows.length), hint: "объектов участвует в расчете", tone: selectedRows.length ? "ok" : "danger" },
      ...(settings.method === "Загрузка из Excel" ? [{ label: "Excel-файл", value: settings.excelFileAttached ? "Загружен" : "Не загружен", hint: "обязателен для метода загрузки", tone: settings.excelFileAttached ? "ok" : "danger" }] : []),
      { label: "Ручная проверка", value: String(reviewRows.length), hint: `порог ${settings.reviewThreshold || 0}%`, tone: reviewRows.length ? "warn" : "ok" },
      { label: "Контрольные сигналы", value: String(warningRows.length), hint: "оценка, страхование, мониторинг, риск", tone: warningRows.length ? "warn" : "ok" },
      { label: "Оценка старше 6 мес.", value: String(staleRows.length), hint: "проверить актуальность основания", tone: staleRows.length ? "warn" : "ok" },
      { label: "Нет отчета оценки", value: String(documentGapRows.length), hint: "не найден документ оценки в карточке", tone: documentGapRows.length ? "warn" : "ok" }
    ]
  };
}

function getListRevaluationPrimaryContract(collateral, fallbackTask = null) {
  return getContract(collateral?.contractIds?.[0] || fallbackTask?.contractId);
}

function getListRevaluationCoverageLabel(value, debt) {
  if (!debt) return "Нет долга";
  const ratio = value / debt;
  if (ratio >= 1) return "Полное";
  if (ratio >= 0.7) return "Частичное";
  return "Недостаточное";
}

function getListRevaluationCoverageTone(label) {
  if (label.includes("Недостат")) return "danger";
  if (label.includes("Частич")) return "warn";
  return "ok";
}

function getListRevaluationContractImpacts(task, rows) {
  const selectedRows = rows.filter((row) => row.selected);
  const byContract = new Map();
  selectedRows.forEach((row) => {
    const contract = getListRevaluationPrimaryContract(row.collateral, task);
    const contractId = contract?.id || row.collateral.contractIds?.[0] || task?.contractId || "Без договора";
    if (!byContract.has(contractId)) byContract.set(contractId, { contractId, contract, rows: [] });
    byContract.get(contractId).rows.push(row);
  });
  return [...byContract.values()].map((group) => {
    const contract = group.contract;
    const debt = Number(contract?.debt || 0);
    const contractCollateralIds = new Set(contract?.collateralIds || group.rows.map((row) => row.collateral.id));
    const beforeValue = state.data.collaterals
      .filter((collateral) => contractCollateralIds.has(collateral.id))
      .reduce((sum, collateral) => sum + Number(collateral.pledgeValue || 0), 0);
    const selectedCurrent = group.rows.reduce((sum, row) => sum + Number(row.currentPledge || 0), 0);
    const selectedNew = group.rows.reduce((sum, row) => sum + Number(row.newPledge || 0), 0);
    const afterValue = beforeValue - selectedCurrent + selectedNew;
    const ltvBefore = beforeValue ? Math.round((debt / beforeValue) * 100) : 0;
    const ltvAfter = afterValue ? Math.round((debt / afterValue) * 100) : 0;
    const coverageBefore = getListRevaluationCoverageLabel(beforeValue, debt);
    const coverageAfter = getListRevaluationCoverageLabel(afterValue, debt);
    return {
      ...group,
      debt,
      beforeValue,
      afterValue,
      delta: afterValue - beforeValue,
      ltvBefore,
      ltvAfter,
      coverageBefore,
      coverageAfter,
      coverageTone: getListRevaluationCoverageTone(coverageAfter)
    };
  }).sort((a, b) => String(a.contract?.number || a.contractId).localeCompare(String(b.contract?.number || b.contractId), "ru"));
}

function getListRevaluationSummary(rows, settings = {}) {
  const selectedRows = rows.filter((row) => row.selected);
  const sum = (field) => selectedRows.reduce((total, row) => total + Number(row[field] || 0), 0);
  const currentMarket = sum("currentMarket");
  const newMarket = sum("newMarket");
  const currentPledge = sum("currentPledge");
  const newPledge = sum("newPledge");
  const reviewRows = selectedRows.filter((row) => row.status === "На ручную проверку");
  const totalDelta = currentMarket ? Math.round(((newMarket - currentMarket) / currentMarket) * 1000) / 10 : 0;
  const avgDiscount = selectedRows.length ? Math.round((selectedRows.reduce((total, row) => total + row.discount, 0) / selectedRows.length) * 10) / 10 : 0;
  const maxDeviation = selectedRows.length ? Math.max(...selectedRows.map((row) => Math.abs(row.marketDeltaPercent))) : 0;
  return {
    selectedCount: selectedRows.length,
    currentMarket,
    newMarket,
    currentPledge,
    newPledge,
    totalDelta,
    avgDiscount,
    maxDeviation,
    reviewCount: reviewRows.length,
    reviewRows,
    scopeLabel: getListRevaluationScopeLabel(settings.scope || "")
  };
}

function updateListRevaluationField(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  if (!task) return;
  const settings = getListRevaluationSettings(task);
  const field = fieldEl.dataset.field;
  settings[field] = fieldEl.type === "number" ? Number(fieldEl.value) : fieldEl.value;
  const collaterals = getTaskCollaterals(task);
  if (field === "scope") settings.strategy = fieldEl.value;
  if (field === "method") {
    settings.rowOverrides = {};
    applyListRevaluationMethodDefaults(settings, collaterals);
  } else {
    syncListRevaluationMethodSource(settings, collaterals);
  }
  persistTaskState();
}

function updateListRevaluationTypeDiscount(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  if (!task) return;
  const settings = getListRevaluationSettings(task);
  settings.typeDiscounts[fieldEl.dataset.type] = Number(fieldEl.value);
  persistTaskState();
}

function updateListRevaluationRowValue(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  if (!task) return;
  const settings = getListRevaluationSettings(task);
  settings.rowOverrides[fieldEl.dataset.collateral] = settings.rowOverrides[fieldEl.dataset.collateral] || {};
  settings.rowOverrides[fieldEl.dataset.collateral][fieldEl.dataset.field] = Number(fieldEl.value);
  persistTaskState();
}

function toggleListRevaluationRow(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  if (!task) return;
  const settings = getListRevaluationSettings(task);
  const ids = new Set(settings.excludedCollateralIds || []);
  if (fieldEl.checked) ids.delete(fieldEl.dataset.collateral);
  else ids.add(fieldEl.dataset.collateral);
  settings.excludedCollateralIds = [...ids];
  persistTaskState();
}

function getListRevaluationMarketSourceLabel(collaterals) {
  const sources = new Set();
  collaterals.forEach((collateral) => {
    if (collateral.type === "Автотранспорт") {
      sources.add("Авто.ру");
    } else if (collateral.type === "Недвижимость") {
      sources.add("Циан");
      sources.add("Сервис данных ЕГРН");
    } else if (collateral.type === "Оборудование") {
      sources.add("Авито");
    } else if (collateral.type === "Товары в обороте") {
      sources.add("Складская сверка");
      sources.add("Данные учета залогодателя");
    } else if (collateral.type === "Скот") {
      sources.add("Реестр поголовья");
      sources.add("Данные выездного осмотра");
    }
  });
  return [...sources].join(" / ") || "Рыночные источники";
}

function attachListRevaluationExcel(task, filename) {
  task.documents = task.documents || [];
  const title = "Файл списочной переоценки";
  const documentRow = {
    title,
    name: filename,
    target: "task",
    required: false,
    status: "Загружен и проверен",
    date: "2026-06-19",
    category: "listRevaluationExcel",
    content: [
      "Назначение: загрузка готовых значений для списочной переоценки.",
      "Обязательные колонки: ID залога, рыночная стоимость, залоговая стоимость.",
      "Рекомендуемые колонки: дата оценки, источник/основание, комментарий, валюта, признак исключения из расчета."
    ]
  };
  const index = task.documents.findIndex((doc) => doc.category === "listRevaluationExcel" || doc.title === title);
  if (index >= 0) task.documents[index] = { ...task.documents[index], ...documentRow };
  else task.documents.push(documentRow);
}

function attachListRevaluationExcelFromInput(input) {
  const task = getTask(input.dataset.listRevaluationExcelFile);
  if (!task) return;
  const filename = input.files?.[0]?.name || "";
  if (!filename) return;
  if (!/\.(xlsx|xls)$/i.test(filename)) {
    addToast("Файл не загружен", "Для списочной переоценки нужен файл Excel: .xlsx или .xls.", "warn");
    return;
  }
  const settings = getListRevaluationSettings(task);
  settings.method = "Загрузка из Excel";
  settings.scope = "По загруженному Excel";
  settings.strategy = "Загрузка Excel";
  settings.source = filename;
  settings.rowOverrides = {};
  attachListRevaluationExcel(task, filename);
  addTaskHistoryEvent(task, { action: "Загружен файл для списочной переоценки", comment: `${filename}; колонки: ID залога, рыночная стоимость, залоговая стоимость.` });
  persistTaskState();
  addToast("Excel загружен", "Файл добавлен в Документы задачи, значения подставлены в расчет.", "ok");
}

function handleListRevaluationAction(actionEl) {
  const task = getTask(actionEl.dataset.task);
  if (!task) return;
  const settings = getListRevaluationSettings(task);
  const action = actionEl.dataset.bulkAction;
  const collaterals = getTaskCollaterals(task);
  if (action === "select-old") {
    settings.scope = "Оценка старше 6 месяцев";
    settings.strategy = "Отбор по сроку оценки";
    settings.excludedCollateralIds = [];
    addToast("Расчетный контур обновлен", "В расчете оставлены объекты с оценкой старше 6 месяцев.", "info");
    return;
  }
  if (action === "select-problem") {
    settings.scope = "Проблемные объекты";
    settings.strategy = "Отбор по сигналам";
    settings.excludedCollateralIds = [];
    addToast("Расчетный контур обновлен", "В расчете оставлены объекты с контрольными сигналами.", "info");
    return;
  }
  if (action === "refresh-market") {
    settings.scope = "По внешним данным";
    settings.method = "Рыночные источники";
    settings.strategy = "Внешние источники";
    settings.source = getListRevaluationMarketSourceLabel(collaterals);
    addTaskHistoryEvent(task, { action: "Обновлены рыночные данные", comment: "Перезапрошены источники для применимых видов имущества." });
    persistTaskState();
    addToast("Рыночные данные обновлены", "Предпросмотр пересчитан по доступным источникам.", "ok");
    return;
  }
  if (action === "create-individual") {
    const rows = getListRevaluationRows(task, collaterals, settings).filter((row) => row.selected && row.status === "На ручную проверку");
    rows.forEach((row) => {
      const exists = state.data.tasks.some((item) => item.parentTaskId === task.id && item.collateralId === row.collateral.id && item.type === "Единичная переоценка");
      if (!exists) {
        createTask({
          type: "Единичная переоценка",
          title: `Индивидуально проверить стоимость ${row.collateral.id}`,
          collateralId: row.collateral.id,
          contractId: row.collateral.contractIds?.[0] || task.contractId,
          assignee: task.assignee,
          dueDate: task.dueDate,
          priority: "Высокий",
          source: "Списочная переоценка",
          parentTaskId: task.id,
          comment: `Отклонение ${row.marketDeltaPercent}%, требуется ручная проверка.`
        });
      }
    });
    addTaskHistoryEvent(task, { action: "Созданы связанные задачи оценки", comment: `Создано/проверено задач: ${rows.length}.` });
    addToast("Задачи оценки созданы", `${rows.length} объект(ов) требуют ручной проверки.`, rows.length ? "ok" : "info");
    return;
  }
  if (action === "apply") {
    const rows = getListRevaluationRows(task, collaterals, settings).filter((row) => row.selected);
    rows.forEach((row) => {
      row.collateral.marketValue = row.newMarket;
      row.collateral.pledgeValue = row.newPledge;
      row.collateral.appraisalStatus = "Действует";
      row.collateral.appraisalDue = "2027-06-19";
      row.collateral.updatedAt = `${settings.valuationDate} 12:00`;
      row.collateral.evaluations = row.collateral.evaluations || [];
      row.collateral.evaluations.unshift({
        date: settings.valuationDate,
        appraiser: "Внутренняя списочная переоценка",
        market: row.newMarket,
        pledge: row.newPledge,
        method: settings.method,
        status: "Действует"
      });
    });
    task.result = `Переоценено ${rows.length} объект(ов). ${settings.comment}`;
    addTaskHistoryEvent(task, { action: "Применена списочная переоценка", comment: `Обновлены стоимости по ${rows.length} объект(ам).` });
    addToast("Переоценка применена", `Обновлены стоимости по ${rows.length} объект(ам).`, "ok");
  }
}

function renderReportingTaskBlock(task, collaterals) {
  return `
    <section class="task-specific-form reporting-task-form">
      <section class="panel table-panel">
        <div class="panel-title"><h2>Доступные отчеты</h2><button class="btn btn-secondary" data-action="report-export">Сформировать</button></div>
        <table><thead><tr><th>Отчет</th><th>Параметры</th><th>Строк демо</th></tr></thead><tbody>${reportCatalog.map((report) => `
          <tr><td>${escapeHtml(report.name)}</td><td>${report.parameters.map(escapeHtml).join(", ")}</td><td>${report.rows.length}</td></tr>
        `).join("")}</tbody></table>
      </section>
    </section>
  `;
}

function renderValuationInspectionBlock(task, collateral) {
  const result = getInspectionResult(task, collateral);
  return `
    <section class="panel task-form-panel">
      <div class="panel-title">
        <div><h2>Осмотр объекта залога</h2><p class="hint">Данные первичного/повторного осмотра, используемые при единичной переоценке.</p></div>
      </div>
      ${renderTaskFormGrid([
        { label: "Требуется первичный осмотр", value: "ДА", type: "select", options: ["ДА", "НЕТ"] },
        { label: "Первичный осмотр проведен", value: result.state === "Неудовлетворительное" ? "НЕТ" : "ДА", type: "select", options: ["ДА", "НЕТ"] },
        { label: "Дата осмотра", value: collateral?.monitoring?.lastInspection || "2026-06-01", type: "date" },
        { label: "Тип первичного осмотра", value: "Дистанционный", type: "select", options: ["Дистанционный", "Выездной", "Документарный"] },
        { label: "Ресурс для осмотра", value: task.assignee || "Сотрудник Банка", type: "select", options: ["Сотрудник Банка", "Аутсорсер", task.assignee || "Сотрудник Банка"] },
        { label: "Результат первичного осмотра", value: result.state, type: "select", options: ["Удовлетворительное", "Требует внимания", "Неудовлетворительное"] },
        { label: "Балл", value: result.score, type: "number" }
      ], "task-form-grid compact")}
    </section>
  `;
}

function renderIndependentValuationBlock(collateral) {
  const evaluation = collateral?.evaluations?.[0] || {};
  const market = Number(evaluation.market || collateral?.marketValue || 0);
  const methods = getValuationMethods(collateral, market);
  const weightedMarket = getWeightedValuationMarketValue(methods);
  return `
    <section class="panel task-form-panel independent-valuation-panel" data-independent-valuation-panel data-collateral="${escapeHtml(collateral?.id || "")}">
      <div class="panel-title">
        <div><h2>Независимая оценка объекта залога</h2></div>
        ${badge(collateral?.appraisalStatus || "Не указано")}
      </div>
      ${renderTaskFormGrid([
        { label: "Требуется независимая оценка", value: "ДА", type: "select", options: ["ДА", "НЕТ"] },
        { label: "Независимая оценка проведена", value: evaluation.date ? "ДА" : "НЕТ", type: "select", options: ["ДА", "НЕТ"] },
        { label: "Дата оценки", value: evaluation.date || "2026-06-01", type: "date" },
        { label: "Аккредитованный оценщик", value: evaluation.appraiser || "ООО Центр оценки" },
        { label: "Статус аккредитации", value: "Действующая", type: "select", options: ["Действующая", "Требует проверки", "Не аккредитована"] },
        { label: "Тип независимой оценки", value: evaluation.method || "Все методы" }
      ], "task-form-grid compact")}
      <div class="method-table-wrap">
        <table class="method-table">
          <thead><tr><th>Метод оценки</th>${methods.map((item) => `<th>${escapeHtml(item.name)}</th>`).join("")}</tr></thead>
          <tbody>
            <tr><td>Результат оценки</td>${methods.map((item, index) => `<td><input value="${escapeHtml(formatMoney(item.value))}" data-valuation-method-value data-method-index="${index}"></td>`).join("")}</tr>
            <tr><td>Вес оценки</td>${methods.map((item, index) => `<td><div class="percent-input"><input value="${escapeHtml(item.weight)}" data-valuation-method-weight data-method-index="${index}"><span>%</span></div></td>`).join("")}</tr>
          </tbody>
        </table>
      </div>
      <label class="valuation-weighted-result">Рыночная стоимость объекта
        <input value="${escapeHtml(formatMoney(weightedMarket))}" data-valuation-weighted-market readonly>
      </label>
    </section>
  `;
}

function getValuationMethods(collateral, market) {
  const isRealty = collateral?.type === "Недвижимость";
  return [
    { name: "Доходный метод", value: Math.round(market * (isRealty ? 0.73 : 0.89)), weight: isRealty ? 30 : 30 },
    { name: "Сравнительный метод", value: Math.round(market * (isRealty ? 1.21 : 1.15)), weight: isRealty ? 40 : 50 },
    { name: "Затратный метод", value: Math.round(market * (isRealty ? 1.03 : 1.27)), weight: isRealty ? 30 : 20 }
  ];
}

function getWeightedValuationMarketValue(methods) {
  return Math.round(methods.reduce((sum, item) => sum + Number(item.value || 0) * Number(item.weight || 0) / 100, 0));
}

function recalculateIndependentValuationPanel(inputEl) {
  const panel = inputEl.closest("[data-independent-valuation-panel]");
  if (!panel) return;
  const valueInputs = [...panel.querySelectorAll("[data-valuation-method-value]")];
  const weightInputs = [...panel.querySelectorAll("[data-valuation-method-weight]")];
  const total = valueInputs.reduce((sum, valueInput, index) => {
    const weightInput = weightInputs[index];
    return sum + parseNumericInput(valueInput.value) * parseNumericInput(weightInput?.value || 0) / 100;
  }, 0);
  const target = panel.querySelector("[data-valuation-weighted-market]");
  if (target) target.value = formatMoney(Math.round(total));
}

function renderTaskRiskAssessment(task, collateral) {
  const result = calculateValuationRiskResult(task, collateral);
  return `
    <section class="panel risk-assessment-panel">
      <div class="panel-title">
        <div><h2>Оценка рисков объекта залога</h2></div>
        <div class="status-stack">${badge(result.liquidity, result.tone)}${badge(`Балл ${result.score}`, result.tone)}</div>
      </div>
      <div class="valuation-risk-summary">
        <div><span>Ликвидность</span><strong>${escapeHtml(result.liquidity)}</strong></div>
        <div><span>Срок экспозиции</span><strong>${escapeHtml(result.exposurePeriod)}</strong></div>
        <div><span>Диапазон мастер-шкалы</span><strong>${result.scale.min}-${result.scale.max}</strong></div>
      </div>
      <div class="risk-factor-grid">
        ${result.groups.map((group) => `
          <article class="risk-factor-group">
            <div class="inspection-factor-group-head">
              <h3>${escapeHtml(group.title)}</h3>
              <div class="risk-group-metrics">
                <div><span>Балл группы</span><strong>${group.weightedScore}</strong></div>
                <div><span>Вес группы</span><strong>${group.weight}%</strong></div>
              </div>
            </div>
            <div class="risk-factor-items">
              ${group.items.map((item) => `
                <div class="inspection-check-row">
                  <div class="inspection-factor-name"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.code)}</span></div>
                  <select data-valuation-risk-factor data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(collateral?.id || "")}" data-factor="${escapeHtml(item.code)}" aria-label="${escapeHtml(item.name)}">
                    ${item.values.map((option) => `<option value="${escapeHtml(option.code)}" ${option.code === item.selected.code ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                  <div class="inspection-factor-score"><strong>${item.score}</strong><span>вес ${item.weight}%</span></div>
                </div>
              `).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getTaskRiskFactorGroups(collateral) {
  const riskScore = getCollateralRiskScore(collateral);
  const high = riskScore >= 70;
  const medium = riskScore >= 35;
  return [
    { code: "STOP", title: "Стоп-факторы", weight: 60, items: [
      { code: "STOP-ARREST", name: "Аресты, суды и ограничения", weight: 35, defaultValue: high ? "yes" : "no", values: yesNoRiskValues() },
      { code: "STOP-OWNER", name: "Права третьих лиц", weight: 25, defaultValue: medium ? "yes" : "no", values: yesNoRiskValues() },
      { code: "STOP-CROSS", name: "Двойной залог / кросс-связь", weight: 20, defaultValue: collateral?.crossPledge ? "yes" : "no", values: yesNoRiskValues() },
      { code: "STOP-REGISTRATION", name: "Регистрационные ограничения", weight: 20, defaultValue: high ? "yes" : "no", values: yesNoRiskValues() }
    ] },
    { code: "RISK", title: "Риск-факторы", weight: 40, items: [
      { code: "RISK-DEMAND", name: "Спрос и ликвидность объекта", weight: 25, defaultValue: medium ? "medium" : "minimal", values: liquidityRiskValues() },
      { code: "RISK-CONDITION", name: "Физическое состояние объекта", weight: 25, defaultValue: high ? "high" : "minimal", values: liquidityRiskValues() },
      { code: "RISK-ANALOGS", name: "Доступность аналогов", weight: 15, defaultValue: "absent", values: liquidityRiskValues() },
      { code: "RISK-MARKET", name: "Изменение рыночной стоимости", weight: 15, defaultValue: medium ? "medium" : "minimal", values: liquidityRiskValues() },
      { code: "RISK-LTV", name: "Ухудшение LTV", weight: 10, defaultValue: high ? "high" : "minimal", values: liquidityRiskValues() },
      { code: "RISK-COSTS", name: "Расходы на реализацию", weight: 10, defaultValue: "medium", values: liquidityRiskValues() }
    ] }
  ];
}

function yesNoRiskValues() {
  return [
    { code: "no", label: "Нет", score: 0 },
    { code: "yes", label: "Да", score: 100 }
  ];
}

function liquidityRiskValues() {
  return [
    { code: "absent", label: "Риск отсутствует", score: 0 },
    { code: "minimal", label: "Риск минимальный", score: 25 },
    { code: "medium", label: "Риск средний", score: 60 },
    { code: "high", label: "Риск высокий", score: 100 }
  ];
}

function calculateValuationRiskResult(task, collateral) {
  const groups = getTaskRiskFactorGroups(collateral).map((group) => {
    const items = group.items.map((factor, index) => {
      const selected = getValuationRiskSelectedOption(task, collateral, factor);
      const factorWeight = Number(factor.weight ?? Math.round(100 / Math.max(1, group.items.length || index + 1)));
      const maxScore = Math.max(...factor.values.map((item) => item.score));
      const weightedFactorScore = selected.score * (factorWeight / 100);
      const maxWeightedFactorScore = maxScore * (factorWeight / 100);
      return { ...factor, weight: factorWeight, selected, score: selected.score, maxScore, weightedFactorScore, maxWeightedFactorScore };
    });
    const rawScore = items.reduce((sum, item) => sum + item.weightedFactorScore, 0);
    const maxRawScore = items.reduce((sum, item) => sum + item.maxWeightedFactorScore, 0);
    const weightedScore = Math.round(rawScore * (group.weight / 100));
    const maxWeightedScore = Math.round(maxRawScore * (group.weight / 100));
    return { ...group, items, rawScore, maxRawScore, weightedScore, maxWeightedScore };
  });
  const score = Math.max(0, Math.round(groups.reduce((sum, group) => sum + group.weightedScore, 0)));
  const maxScore = Math.max(1, groups.reduce((sum, group) => sum + group.maxWeightedScore, 0));
  const scale = getValuationRiskMasterScale(score, maxScore);
  return { groups, score, maxScore, scale, liquidity: scale.liquidity, exposurePeriod: scale.exposurePeriod, tone: scale.tone };
}

function getValuationRiskMasterScale(score, maxScore = 100) {
  const low = Math.round(maxScore * 0.2);
  const medium = Math.round(maxScore * 0.45);
  const high = Math.round(maxScore * 0.7);
  if (score <= low) return { liquidity: "Высокая", exposurePeriod: "до 3 месяцев", min: 0, max: low, tone: "ok" };
  if (score <= medium) return { liquidity: "Средняя", exposurePeriod: "3-6 месяцев", min: low + 1, max: medium, tone: "info" };
  if (score <= high) return { liquidity: "Низкая", exposurePeriod: "6-12 месяцев", min: medium + 1, max: high, tone: "warn" };
  return { liquidity: "Критически низкая", exposurePeriod: "свыше 12 месяцев", min: high + 1, max: maxScore, tone: "danger" };
}

function getValuationRiskSelectedOption(task, collateral, factor) {
  const value = task?.valuationRiskAnswers?.[collateral?.id]?.[factor.code] || factor.defaultValue || factor.values[0]?.code;
  return factor.values.find((item) => item.code === value) || factor.values[0];
}

function updateTaskValuationRiskFactor(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  if (!task || !fieldEl.dataset.collateral || !fieldEl.dataset.factor) return;
  task.valuationRiskAnswers = task.valuationRiskAnswers || {};
  task.valuationRiskAnswers[fieldEl.dataset.collateral] = task.valuationRiskAnswers[fieldEl.dataset.collateral] || {};
  task.valuationRiskAnswers[fieldEl.dataset.collateral][fieldEl.dataset.factor] = fieldEl.value;
}

function renderValuationCostsBlock(collateral) {
  const costs = getValuationCosts(collateral);
  return `
    <section class="panel task-form-panel valuation-costs-panel">
      <div class="panel-title">
        <div><h2>Затраты на содержание и реализацию объекта залога</h2><p class="hint">Проценты используются в формуле расчета расходов на реализацию.</p></div>
        ${badge(`Итого ${costs.total}%`, costs.total > 8 ? "warn" : "info")}
      </div>
      ${renderTaskFormGrid(costs.items.map((item) => ({ label: item.label, value: item.value, type: "number" })), "task-form-grid compact")}
    </section>
  `;
}

function getValuationCosts(collateral) {
  const isRealty = collateral?.type === "Недвижимость";
  const items = [
    { label: "Затраты на фондирование на период, %", value: isRealty ? "4.19" : "4.19" },
    { label: "Оплата услуг по реализации, %", value: isRealty ? "0.74" : "0.74" },
    { label: "Организация торгов по реализации, %", value: isRealty ? "1.73" : "1.73" },
    { label: "Оформление собственности, %", value: isRealty ? "1.23" : "1.23" },
    { label: "Организация охраны, %", value: isRealty ? "0.00" : "0.05" },
    { label: "Ставка страховой компании, %", value: "0.05" },
    { label: "Коммунальные услуги, %", value: isRealty ? "0.00" : "0.00" },
    { label: "Налог на имущество, %", value: isRealty ? "0.00" : "0.00" },
    { label: "Транспортировка, %", value: isRealty ? "0.00" : "0.07" },
    { label: "Аренда склада, %", value: isRealty ? "0.00" : "0.02" },
    { label: "Мониторинг и оценка, %", value: "0.02" }
  ];
  const total = Number(items.reduce((sum, item) => sum + Number(item.value), 0).toFixed(2));
  return { items, total };
}

function renderValuationValueBlock(collateral, calc) {
  return `
    <section class="panel task-form-panel valuation-value-panel" data-valuation-value-panel data-collateral="${escapeHtml(collateral?.id || "")}">
      <div class="panel-title">
        <div><h2>Определение стоимости объекта залога</h2></div>
        <button class="btn btn-secondary" data-action="recalculate-valuation" data-collateral="${escapeHtml(collateral?.id || "")}">Обновить расчет</button>
      </div>
      <div class="valuation-formula-grid">
        <div><span>Рыночная стоимость</span><strong data-valuation-field="marketValue">${formatMoney(calc.marketValue)}</strong></div>
        <div><span>Залоговый дисконт</span><strong data-valuation-field="discount">${calc.discount}%</strong></div>
        <div><span>Залоговая стоимость</span><strong data-valuation-field="pledgeValue">${formatMoney(calc.pledgeValue)}</strong></div>
        <div><span>Предполагаемый срок реализации</span><strong data-valuation-field="realizationYears">${calc.realizationYears} года</strong></div>
        <div><span>Дисконтированная стоимость</span><strong data-valuation-field="discountedValue">${formatMoney(calc.discountedValue)}</strong></div>
      </div>
      ${renderTaskFormGrid([
        { label: "Дополнительные данные по оценке объекта", value: calc.comment, textarea: true, wide: true },
        { label: "Выводы", value: calc.conclusion, textarea: true, wide: true }
      ])}
    </section>
  `;
}

function getRevaluationValueCalculation(collateral, matrix) {
  const marketValue = matrix.finalMarketValue || collateral?.marketValue || 0;
  const baseDiscount = collateral?.marketValue ? Math.max(10, Math.round((1 - (collateral?.pledgeValue || 0) / collateral.marketValue) * 10000) / 100) : 30;
  const riskScore = getCollateralRiskScore(collateral);
  const riskAdd = riskScore >= 70 ? 10 : riskScore >= 35 ? 5 : 0;
  const discount = Number((baseDiscount + riskAdd).toFixed(2));
  const pledgeValue = Math.round(marketValue * (1 - discount / 100));
  const realizationYears = collateral?.type === "Недвижимость" ? 4 : 3;
  const cor = 3.6;
  const discountedValue = Math.round(pledgeValue / Math.pow(1 + cor / 100, realizationYears));
  return {
    marketValue,
    discount,
    pledgeValue,
    realizationYears,
    cor,
    discountedValue,
    comment: "Обеспечение степени ликвидности объекта залога, допущения и ограничения в отношении определенной стоимости объекта залога, иные комментарии.",
    conclusion: `Ликвидность имущества может быть оценена как ${riskScore >= 45 ? "средняя" : "очень высокая"}, ожидаемый срок продажи не превысит ${realizationYears * 12} месяцев.`
  };
}

function normalizeMarketAnalogType(type) {
  return String(type || "").trim();
}

function getMarketAnalogItemType(item) {
  const type = normalizeMarketAnalogType(item?.type);
  if (type) return type;
  const source = String(item?.source || "");
  const object = String(item?.object || "");
  if (/Авто\.ру/i.test(source)) return "Автотранспорт";
  if (/Циан|Яндекс Недвижимость/i.test(source)) return "Недвижимость";
  if (/Авито/i.test(source) && /оборуд|линия|станок|печати|упаков/i.test(object)) return "Оборудование";
  return "";
}

function getMarketAnalogItemSubtype(item) {
  return String(item?.subtype || "").trim();
}

function inferCollateralAnalogSubtype(collateral) {
  const type = normalizeMarketAnalogType(collateral?.type);
  const text = `${collateral?.description || ""} ${Object.values(collateral?.fields || {}).join(" ")}`.toLowerCase();
  if (type === "Автотранспорт") {
    if (/actros|тягач|седельн/i.test(text)) return "Седельный тягач";
    if (/hyundai|грузов|фургон/i.test(text)) return "Грузовой автомобиль";
    return "Автотранспорт";
  }
  if (type === "Недвижимость") {
    if (/квартир/i.test(text)) return "Квартира";
    if (/склад|логист/i.test(text)) return "Складская недвижимость";
    return "Недвижимость";
  }
  if (type === "Оборудование") {
    if (/heidelberg|печат/i.test(text)) return "Печатная линия";
    if (/упаков|фасов/i.test(text)) return "Упаковочная линия";
    return "Оборудование";
  }
  if (type === "Товары в обороте") {
    if (/текст|одежд|ткан/i.test(text)) return "Текстиль";
    if (/упаков/i.test(text)) return "Упаковочные материалы";
    return "Товарная партия";
  }
  if (type === "Скот") return "КРС";
  return type;
}

function getMarketAnalogCandidates(collateral) {
  const collateralType = normalizeMarketAnalogType(collateral?.type);
  const collateralSubtype = inferCollateralAnalogSubtype(collateral);
  const sameType = marketAnalogs.filter((item) => getMarketAnalogItemType(item) === collateralType);
  const sameSubtype = sameType.filter((item) => getMarketAnalogItemSubtype(item) === collateralSubtype);
  const selected = sameSubtype.length ? sameSubtype : sameType;
  return ensureMarketAnalogPool(selected, collateral, collateralSubtype);
}

function ensureMarketAnalogPool(pool, collateral, subtype) {
  if (pool.length >= 3) return pool;
  const generated = buildFallbackMarketAnalogs(collateral, subtype);
  const seen = new Set(pool.map((item) => item.object));
  return [
    ...pool,
    ...generated.filter((item) => {
      if (seen.has(item.object)) return false;
      seen.add(item.object);
      return true;
    })
  ].slice(0, 3);
}

function buildFallbackMarketAnalogs(collateral, subtype = "") {
  const type = normalizeMarketAnalogType(collateral?.type) || "Иное имущество";
  const region = collateral?.region || "Регион не указан";
  const base = Number(collateral?.marketValue || 0) || 100000000;
  const namesBySubtype = {
    "Седельный тягач": ["Седельный тягач 2021", "Седельный тягач 2022", "Седельный тягач 2020"],
    "Грузовой автомобиль": ["Грузовой автомобиль 2021", "Грузовой автомобиль 2022", "Грузовой автомобиль 2020"],
    "Квартира": ["Квартира сопоставимой площади 1", "Квартира сопоставимой площади 2", "Квартира сопоставимой площади 3"],
    "Складская недвижимость": ["Складской комплекс сопоставимого класса 1", "Складской комплекс сопоставимого класса 2", "Складской комплекс сопоставимого класса 3"],
    "Печатная линия": ["Печатная линия сопоставимой мощности 1", "Печатная линия сопоставимой мощности 2", "Печатная линия сопоставимой мощности 3"],
    "Упаковочная линия": ["Упаковочная линия сопоставимой мощности 1", "Упаковочная линия сопоставимой мощности 2", "Упаковочная линия сопоставимой мощности 3"],
    "Текстиль": ["Партия текстиля сопоставимого ассортимента 1", "Партия текстиля сопоставимого ассортимента 2", "Партия текстиля сопоставимого ассортимента 3"],
    "Упаковочные материалы": ["Партия упаковочных материалов 1", "Партия упаковочных материалов 2", "Партия упаковочных материалов 3"],
    "КРС": ["Партия КРС сопоставимого возраста 1", "Партия КРС сопоставимого возраста 2", "Партия КРС сопоставимого возраста 3"]
  };
  const namesByType = {
    "Автотранспорт": ["Сопоставимый автомобиль 2021", "Сопоставимый автомобиль 2022", "Сопоставимый автомобиль 2020"],
    "Недвижимость": ["Сопоставимый объект недвижимости 1", "Сопоставимый объект недвижимости 2", "Сопоставимый объект недвижимости 3"],
    "Оборудование": ["Сопоставимая производственная линия", "Сопоставимый комплект оборудования", "Сопоставимый станочный комплекс"],
    "Товары в обороте": ["Сопоставимая товарная партия", "Складской остаток сопоставимой номенклатуры", "Сопоставимый товарный запас"],
    "Скот": ["Сопоставимая партия поголовья", "Сопоставимое стадо", "Сопоставимая партия сельхозживотных"]
  };
  const names = namesBySubtype[subtype] || namesByType[type] || [];
  const multipliers = [0.96, 1.02, 0.99];
  const corrections = ["+1.0%", "-1.5%", "+0.5%"];
  return multipliers.map((multiplier, index) => {
    const price = Math.round(base * multiplier);
    const correction = corrections[index];
    const correctionValue = parseNumericInput(correction);
    return {
      type,
      subtype,
      source: "Экспертный подбор",
      object: `${names[index] || `${type} - аналог ${index + 1}`}, ${region}`,
      price,
      correction,
      result: Math.round(price * (1 + correctionValue / 100)),
      region,
      condition: "Состояние и ликвидность сопоставимы"
    };
  });
}

function getMarketAnalogYear(type, item) {
  if (item?.year) return item.year;
  if (type === "Автотранспорт") return "2021-2022";
  if (type === "Недвижимость") return "Регистрация 2020-2022";
  if (type === "Оборудование") return "Ввод 2019-2022";
  if (type === "Товары в обороте") return "Партия 2026";
  if (type === "Скот") return "Возраст 2-4 года";
  return "Период сопоставим";
}

function getMarketAnalogDetails(type, item) {
  if (item?.condition) return item.condition;
  if (item?.details) return item.details;
  if (type === "Автотранспорт") return "Пробег и состояние сопоставимы";
  if (type === "Недвижимость") return "Площадь, локация и состояние сопоставимы";
  if (type === "Оборудование") return "Назначение, мощность и год выпуска сопоставимы";
  if (type === "Товары в обороте") return "Номенклатура, срок хранения и оборачиваемость сопоставимы";
  if (type === "Скот") return "Возраст, порода и ветеринарный статус сопоставимы";
  return "Состояние сопоставимо";
}

function getMarketAnalogDynamicRows(type) {
  if (type === "Автотранспорт") return ["Марка / модель", "Регион", "Местонахождение", "Состояние", "Сопоставимость"];
  if (type === "Недвижимость") return ["Тип недвижимости", "Регион", "Местонахождение", "Состояние", "Сопоставимость"];
  if (type === "Оборудование") return ["Тип оборудования", "Регион", "Местонахождение", "Состояние", "Сопоставимость"];
  if (type === "Товары в обороте") return ["Номенклатура", "Регион", "Склад", "Состояние партии", "Сопоставимость"];
  if (type === "Скот") return ["Вид поголовья", "Регион", "Местонахождение", "Состояние", "Сопоставимость"];
  return ["Тип имущества", "Регион", "Местонахождение", "Состояние", "Сопоставимость"];
}

function getMarketAnalogDynamicValues(item, collateral) {
  return [
    item?.type || collateral?.type || "Иное",
    item?.region || collateral?.region || "Регион",
    item?.location || collateral?.address || "Местонахождение",
    item?.condition || "Состояние сопоставимо",
    item?.comparability || "Сопоставимость подтверждается экспертом"
  ];
}

function getMarketAnalogMatrix(task, collateral) {
  const collateralType = normalizeMarketAnalogType(collateral?.type);
  const sourcePool = getMarketAnalogCandidates(collateral);
  const savedAdjustments = task?.marketAnalogAdjustments?.[collateral?.id || "default"] || {};
  const columns = Array.from({ length: 3 }, (_, index) => {
    const item = sourcePool[index] || sourcePool[index % Math.max(1, sourcePool.length)] || {};
    const price = item.price || (collateral?.marketValue || 0);
    const correction = Number(String(item.correction || "0").replace(/[+%]/g, "")) || [2, -1, 0][index] || 0;
    const defaultAdjustments = [correction, -1, 0, 1, -0.5];
    const adjustments = defaultAdjustments.map((value, rowIndex) => {
      const savedValue = savedAdjustments?.[index]?.[rowIndex];
      return savedValue === undefined ? value : parseNumericInput(savedValue);
    });
    return {
      title: `Аналог ${index + 1}`,
      source: item.source || "Экспертный источник",
      name: item.object || collateral?.description || "Аналог",
      year: getMarketAnalogYear(collateralType, item),
      details: getMarketAnalogDetails(collateralType, item),
      offerDate: item.offerDate || "2026-06-12",
      price,
      link: `${item.source || "Источник"} / карточка аналога`,
      dynamic: getMarketAnalogDynamicValues(item, collateral),
      adjustments
    };
  });
  const normalized = columns.map((column) => {
    const totalCorrection = Number(column.adjustments.reduce((sum, value) => sum + value, 0).toFixed(1));
    const adjustedPrice = Math.round(column.price * (1 + totalCorrection / 100));
    return { ...column, totalCorrection, adjustedPrice };
  });
  const finalMarketValue = Math.round(normalized.reduce((sum, column) => sum + column.adjustedPrice, 0) / normalized.length);
  return {
    columns: normalized,
    dynamicRows: getMarketAnalogDynamicRows(collateralType),
    adjustmentRows: ["Корректировка за год/локацию", "Корректировка за объем/площадь", "Корректировка за комплектацию", "Корректировка за состояние", "Корректировка за торг/ликвидность"],
    totalCorrection: Number((normalized.reduce((sum, column) => sum + column.totalCorrection, 0) / normalized.length).toFixed(1)),
    finalMarketValue,
    recommendation: finalMarketValue > (collateral?.marketValue || 0) ? "Допустить повышение после независимой оценки" : "Назначить повторную независимую оценку"
  };
}

function renderMarketAnalogMatrix(task, collateral, matrix) {
  const context = { taskId: task?.id || "", collateralId: collateral?.id || "" };
  const commonRows = [
    ["Наименование/Модель аналога", (column) => column.name, "manual"],
    ["Год выпуска / Дата регистрации", (column) => column.year, "manual"],
    ["Дополнительные сведения", (column) => column.details, "manual"],
    ["Дата продажи / предложения", (column) => column.offerDate, "manual"],
    ["Цена продажи / предложения", (column) => formatMoney(column.price), "manual"],
    ["Ссылка на источник / Документ-основание", (column) => column.link, "manual source"],
    ["Источник автозаполнения", (column) => column.source, "manual"]
  ];
  return `
    <div class="market-matrix-wrap">
      <table class="market-matrix">
        <thead><tr><th>Характеристика</th>${matrix.columns.map((column) => `<th>${escapeHtml(column.title)}<small>${escapeHtml(column.source)}</small></th>`).join("")}</tr></thead>
        <tbody>
          <tr class="matrix-section"><td colspan="4">1. Характеристики объекта</td></tr>
          ${commonRows.map(([label, getter, mode]) => renderMarketMatrixRow(label, matrix.columns, getter, mode)).join("")}
          ${matrix.dynamicRows.map((label, index) => renderMarketMatrixRow(label, matrix.columns, (column) => column.dynamic[index], "manual")).join("")}
          <tr class="matrix-section"><td colspan="4">2. Корректировка цены, %</td></tr>
          ${matrix.adjustmentRows.map((label, index) => renderMarketMatrixRow(label, matrix.columns, (column) => column.adjustments[index], "percent", { ...context, rowIndex: index })).join("")}
          <tr class="matrix-section"><td colspan="4">3. Автоматические итоговые расчеты</td></tr>
          ${renderMarketMatrixRow("Итого корректировка", matrix.columns, (column) => `${column.totalCorrection}%`, "calculated", { ...context, calcType: "total" })}
          ${renderMarketMatrixRow("Скорректированная цена", matrix.columns, (column) => formatMoney(column.adjustedPrice), "calculated strong", { ...context, calcType: "adjusted" })}
          <tr class="market-final-row"><td>Итоговое значение рыночной стоимости</td><td colspan="3" data-market-final-value data-task="${escapeHtml(context.taskId)}" data-collateral="${escapeHtml(context.collateralId)}">${formatMoney(matrix.finalMarketValue)}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderMarketMatrixRow(label, columns, getter, mode = "manual", context = {}) {
  return `
    <tr class="${mode.includes("calculated") ? "calculated-row" : ""}">
      <td>${escapeHtml(label)}${mode.includes("calculated") ? "" : `<small>ручной ввод</small>`}</td>
      ${columns.map((column, columnIndex) => {
        const value = getter(column);
        if (mode === "percent") return `<td><div class="percent-input"><input value="${escapeHtml(value)}" data-market-adjustment data-task="${escapeHtml(context.taskId || "")}" data-collateral="${escapeHtml(context.collateralId || "")}" data-column="${columnIndex}" data-row="${escapeHtml(context.rowIndex ?? "")}" /><span>%</span></div></td>`;
        if (mode.includes("calculated")) return `<td><strong data-market-calc="${escapeHtml(context.calcType || "")}" data-task="${escapeHtml(context.taskId || "")}" data-collateral="${escapeHtml(context.collateralId || "")}" data-market-column="${columnIndex}">${escapeHtml(value)}</strong></td>`;
        if (mode.includes("source")) return `<td><input value="${escapeHtml(value)}" /></td>`;
        return `<td><textarea>${escapeHtml(value)}</textarea></td>`;
      }).join("")}
    </tr>
  `;
}

function parseNumericInput(value) {
  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function updateMarketAdjustment(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  const collateral = getCollateral(fieldEl.dataset.collateral);
  if (!task || !collateral) return;
  const columnIndex = Number(fieldEl.dataset.column);
  const rowIndex = Number(fieldEl.dataset.row);
  if (!Number.isInteger(columnIndex) || !Number.isInteger(rowIndex)) return;

  task.marketAnalogAdjustments = task.marketAnalogAdjustments || {};
  task.marketAnalogAdjustments[collateral.id] = task.marketAnalogAdjustments[collateral.id] || {};
  task.marketAnalogAdjustments[collateral.id][columnIndex] = task.marketAnalogAdjustments[collateral.id][columnIndex] || {};
  task.marketAnalogAdjustments[collateral.id][columnIndex][rowIndex] = parseNumericInput(fieldEl.value);

  const matrix = getMarketAnalogMatrix(task, collateral);
  const calc = getRevaluationValueCalculation(collateral, matrix);
  refreshMarketCalculationView(task, collateral, matrix, calc);
}

function refreshMarketCalculationView(task, collateral, matrix, calc) {
  matrix.columns.forEach((column, columnIndex) => {
    document.querySelectorAll(`[data-market-calc="total"][data-task="${task.id}"][data-collateral="${collateral.id}"][data-market-column="${columnIndex}"]`)
      .forEach((el) => { el.textContent = `${column.totalCorrection}%`; });
    document.querySelectorAll(`[data-market-calc="adjusted"][data-task="${task.id}"][data-collateral="${collateral.id}"][data-market-column="${columnIndex}"]`)
      .forEach((el) => { el.textContent = formatMoney(column.adjustedPrice); });
  });
  document.querySelectorAll(`[data-market-final-value][data-task="${task.id}"][data-collateral="${collateral.id}"]`)
    .forEach((el) => { el.textContent = formatMoney(matrix.finalMarketValue); });

  document.querySelectorAll(`[data-valuation-value-panel][data-collateral="${collateral.id}"]`).forEach((panel) => {
    const values = {
      marketValue: formatMoney(calc.marketValue),
      discount: `${calc.discount}%`,
      pledgeValue: formatMoney(calc.pledgeValue),
      realizationYears: `${calc.realizationYears} года`,
      discountedValue: formatMoney(calc.discountedValue)
    };
    Object.entries(values).forEach(([field, value]) => {
      const target = panel.querySelector(`[data-valuation-field="${field}"]`);
      if (target) target.textContent = value;
    });
  });
}

function renderDocumentWidget({ context, ownerId, task = null, documents = [], collaterals = [], activeCollateral = null, title = "Документы", subtitle = "Единый контейнер файлов", description = "" }) {
  const targets = context === "task" ? (collaterals.length ? collaterals : [activeCollateral].filter(Boolean)) : [];
  const activeTarget = activeCollateral?.id || targets[0]?.id || "task";
  const indexedDocuments = documents.map((doc, index) => ({ ...doc, __documentIndex: index }));
  const sourceDocuments = context === "task"
    ? indexedDocuments.filter((doc) => {
      const target = doc.target || doc.collateralId || activeTarget;
      return target === activeTarget || target === "task";
    })
    : indexedDocuments;
  const existing = sourceDocuments.map((doc) => ({
    title: doc.title || doc.type || doc.name || "Документ",
    name: doc.name || "Файл прикреплен",
    target: doc.target || doc.collateralId || activeTarget,
    required: doc.required ?? false,
    status: doc.status || "Прикреплен",
    date: doc.date || "2026-06-17",
    documentIndex: doc.__documentIndex,
    templateName: doc.templateName,
    content: doc.content
  }));
  const ruleRows = getDocumentRules(task, activeCollateral).filter((rule) => !existing.some((doc) => doc.title === rule.title && (context !== "task" || doc.target === activeTarget)));
  const rows = [...existing, ...ruleRows.map((rule) => ({ ...rule, name: "", target: activeTarget, status: "Ожидает файл" }))];
  return `
    <section class="panel document-widget">
      <div class="panel-title">
        <div><h2>${escapeHtml(title)}</h2><p class="hint">${escapeHtml(subtitle)}. ${escapeHtml(description)}</p></div>
        ${context === "task" && targets.length > 1 ? `<span class="panel-note">Активный залог: ${escapeHtml(activeTarget)}</span>` : ""}
      </div>
      <div class="document-container">
        ${rows.map((doc) => {
          const hasFile = Boolean(doc.name);
          const targetText = context === "task" ? `Залог: ${doc.target}` : `Карточка: ${ownerId}`;
          return `
            <div class="document-file-row ${hasFile ? "has-file" : "empty-file"}">
              <div>
                <strong>${escapeHtml(doc.title)}</strong>
                <span>${hasFile ? escapeHtml(doc.name) : "Файл еще не прикреплен"}</span>
                <small>${escapeHtml(targetText)} · ${escapeHtml(doc.status)}</small>
              </div>
              <div class="document-file-meta">${doc.required ? badge("Обязательный", "warn") : badge("Дополнительный", "neutral")}${hasFile ? badge("Файл", "ok") : badge("Нет файла", "neutral")}</div>
              <div class="document-row-actions">
                ${hasFile ? `
                  <a class="doc-download-button" href="${createDocumentDownloadHref(doc, context, ownerId)}" download="${escapeHtml(doc.name)}" title="Скачать файл" aria-label="Скачать файл ${escapeHtml(doc.name)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"></path>
                    </svg>
                  </a>
                  <button type="button" class="doc-delete-button" data-action="delete-document" data-doc-context="${escapeHtml(context)}" data-doc-owner="${escapeHtml(ownerId)}" data-doc-index="${escapeHtml(doc.documentIndex ?? "")}" data-doc-title="${escapeHtml(doc.title)}" data-doc-target="${escapeHtml(doc.target)}" data-doc-name="${escapeHtml(doc.name)}" title="Удалить файл" aria-label="Удалить файл ${escapeHtml(doc.name)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"></path>
                    </svg>
                  </button>
                ` : ""}
                <label class="doc-add-button ${hasFile ? "secondary" : ""}" title="Прикрепить файл">+
                  <input type="file" data-doc-file="${context}::${ownerId}::${escapeHtml(doc.title)}::${escapeHtml(doc.target)}">
                </label>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function createDocumentDownloadHref(doc, context, ownerId) {
  const generatedContent = Array.isArray(doc.content)
    ? doc.content
    : (doc.content ? [String(doc.content)] : []);
  const content = [
    "Залоговый модуль Р",
    `Документ: ${doc.title || "Документ"}`,
    `Файл: ${doc.name || "Файл"}`,
    `Контекст: ${context}`,
    `Объект: ${ownerId}`,
    `Статус: ${doc.status || "Прикреплен"}`,
    `Дата: ${doc.date || "-"}`,
    ...(doc.templateName ? [`Шаблон: ${doc.templateName}`] : []),
    ...(generatedContent.length ? ["", ...generatedContent] : [])
  ].join("\n");
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}

function taskTypeMatchesRule(taskType, ruleTaskType) {
  if (ruleTaskType === "any") return true;
  if (taskType === ruleTaskType) return true;
  const taskText = normalizeTaskType(taskType);
  const ruleText = normalizeTaskType(ruleTaskType);
  if (taskText.includes(ruleText)) return true;
  if (taskText.includes("переоценк") && ruleText.includes("переоценк")) return true;
  return false;
}

function getDocumentRules(task, collateral) {
  return documentRules.filter((rule) => {
    const byType = rule.collateralType === "any" || rule.collateralType === collateral?.type;
    const byClient = rule.clientType === "any" || rule.clientType === collateral?.clientType;
    const byTask = !task || taskTypeMatchesRule(task.type, rule.taskType);
    return byType && byClient && byTask;
  });
}

function renderContractCard(contractId) {
  const contract = getContract(contractId);
  if (!contract) return renderNotFound("Договор не найден", "/app/contracts");
  const collaterals = contract.collateralIds.map(getCollateral).filter(Boolean);
  return `
    ${renderPageHeader(`Договор ${contract.number}`, `${contract.clientName}. Карточка договора доступна только для просмотра.`, `<button class="btn btn-secondary" data-route="/app/contracts">Назад</button>`)}
    <section class="object-hero">
      <div><span class="eyebrow">Статус покрытия</span><h2>${badge(contract.coverageStatus)} ${badge(`${contract.ltv}%`, contract.ltv >= 100 ? "danger" : contract.ltv > 70 ? "warn" : "ok")}</h2><p>Категория качества и расчетный резерв получены из АБС ЦФТ и не редактируются в модуле.</p></div>
      <div class="hero-metrics"><div><span>Остаток долга</span><strong>${formatMoney(contract.debt, contract.currency)}</strong></div><div><span>Аллоцированная стоимость</span><strong>${formatMoney(contract.allocatedValue)}</strong></div><div><span>Резерв</span><strong>${formatMoney(contract.reserve)}</strong></div></div>
    </section>
    <section class="grid-2 contract-card-info-grid">
      <div class="panel contract-general-panel"><h2>Общая информация</h2>${renderInfoGrid({ "Номер": contract.number, "Дата": contract.startDate, "Дата окончания": contract.endDate, "Продукт": contract.product, "Валюта": contract.currency, "Лимит": formatMoney(contract.limit, contract.currency), "Статус": contract.status, "Категория качества": contract.loanQuality })}</div>
      <div class="panel table-panel contract-participants-panel"><h2>Участники сделки</h2><table><thead><tr><th>Роль</th><th>Наименование/ФИО</th><th>ИНН</th><th>Доля</th><th>Статус</th></tr></thead><tbody>${contract.participants.map((item) => `<tr><td>${escapeHtml(item.role)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.idn)}</td><td>${escapeHtml(item.share)}</td><td>${escapeHtml(item.contact)}</td></tr>`).join("")}</tbody></table></div>
    </section>
    <section class="panel table-panel"><h2>Связанные залоги</h2><table class="contract-linked-collaterals-table"><thead><tr><th>ID</th><th>Тип</th><th>Описание</th><th>Залогодатель</th><th>Рыночная</th><th>Залоговая</th><th>Аллоцированная</th><th>Статус</th></tr></thead><tbody>${collaterals.map((item) => `<tr><td><a class="link registry-object-link" href="#/app/collaterals/${escapeHtml(item.id)}">${escapeHtml(item.id)}</a></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.clientName)}</td><td>${formatMoney(item.marketValue)}</td><td>${formatMoney(item.pledgeValue)}</td><td>${formatMoney(item.allocatedValue)}</td><td>${badge(item.status)}</td></tr>`).join("")}</tbody></table></section>
  `;
}

function renderCollateralCard(collateralId, query = new URLSearchParams()) {
  const collateral = getCollateral(collateralId);
  if (!collateral) return renderNotFound("Залог не найден", "/app/collaterals");
  const tabs = [
    ["overview", "Общая информация"], ["monitoring", "Мониторинг и осмотры"], ["values", "Оценки"], ["insurance", "Страхование"], ["contracts", "Договоры и обременения"], ["pledgors", "Залогодатели"], ["risks", "Риски"], ["external", "Внешние данные"], ["documents", "Документы"]
  ];
  const requestedTab = query.get("tab");
  if (tabs.some(([id]) => id === requestedTab)) state.collateralTab = requestedTab;
  if (!tabs.some(([id]) => id === state.collateralTab)) state.collateralTab = "overview";
  return `
    ${renderPageHeader(`${collateral.id} - ${collateral.type}`, collateral.description, `<button class="btn btn-secondary" data-route="/app/collaterals">Назад</button><button class="btn btn-secondary" data-route="/app/tasks/new?collateral=${collateral.id}">Создать задачу</button><button class="btn btn-primary" data-action="refresh-external" data-collateral="${collateral.id}">Обновить внешние данные</button>`)}
    <section class="object-hero">
      <div><span class="eyebrow">${collateral.clientType === "ФЛ" ? "ФИО / ИНН" : "Наименование / ИНН"}</span><h2>${escapeHtml(collateral.clientName)}</h2><p>${escapeHtml(collateral.clientId)} - ${escapeHtml(collateral.gsz)} - ${escapeHtml(collateral.region)}</p></div>
      <div class="hero-metrics"><div><span>Рыночная стоимость</span><strong>${formatMoney(collateral.marketValue)}</strong></div><div><span>Залоговая стоимость</span><strong>${formatMoney(collateral.pledgeValue)}</strong></div><div><span>Риск</span><strong>${badge(getCollateralRiskState(collateral), riskTone(collateral))}</strong></div></div>
    </section>
    <div class="tabs wrap">${tabs.map(([id, label]) => `<button class="${state.collateralTab === id ? "active" : ""}" data-action="collateral-tab" data-tab="${id}">${escapeHtml(label)}</button>`).join("")}</div>
    ${renderCollateralTab(collateral)}
  `;
}

function renderCollateralTab(collateral) {
  if (state.collateralTab === "monitoring") return renderCollateralMonitoring(collateral);
  if (state.collateralTab === "values") return renderCollateralValues(collateral);
  if (state.collateralTab === "insurance") return renderInsuranceBlock(collateral);
  if (state.collateralTab === "contracts") return renderCollateralContracts(collateral);
  if (state.collateralTab === "pledgors") return renderCollateralPledgors(collateral);
  if (state.collateralTab === "risks") return renderCollateralRisks(collateral);
  if (state.collateralTab === "external") return renderCollateralExternal(collateral);
  if (state.collateralTab === "documents") return renderDocumentWidget({ context: "collateral", ownerId: collateral.id, documents: collateral.documents || [], activeCollateral: collateral, title: "Документы", subtitle: "Единый контейнер файлов карточки залога", description: "Документы привязываются к залогу. Обязательные пустые строки формируются по справочнику документов." });
  return renderCollateralOverview(collateral);
}

function renderCollateralOverview(collateral) {
  const subtype = getCollateralSubtype(collateral);
  const category = getCollateralCategory(collateral);
  const fieldEntries = Object.entries(collateral.fields || {});
  const objectFields = {
    "Идентификатор залога": collateral.id,
    "Вид залога": collateral.type,
    "Подтип": subtype,
    "Категория": category,
    "Статус объекта": collateral.status,
    "Регион": collateral.region,
    "Полный адрес / место хранения": collateral.address,
    "Описание": collateral.description
  };
  const ownershipFields = {
    [collateral.clientType === "ФЛ" ? "ФИО залогодателя" : "Залогодатель / организация"]: collateral.clientName,
    "ИНН": collateral.clientId,
    "Тип залогодателя": collateral.clientType,
    "ГСЗ": collateral.gsz,
    "Ответственный": collateral.responsible,
    "Источник загрузки": collateral.source,
    "Дата обновления": collateral.updatedAt,
    "Признак кросс-залога": collateral.crossPledge ? "Да" : "Нет"
  };
  const valueFields = {
    "Метод оценки": collateral.evaluations?.[0]?.method || "По последней действующей оценке",
    "Рыночная стоимость": formatMoney(collateral.marketValue),
    "Залоговая стоимость": formatMoney(collateral.pledgeValue),
    "Аллоцированная стоимость": formatMoney(collateral.allocatedValue),
    "Дата последней оценки": collateral.evaluations?.[0]?.date || "-",
    "Статус оценки": collateral.appraisalStatus,
    "Страхование": collateral.insuranceStatus,
    "Следующий контроль": collateral.monitoring?.nextInspection || "-"
  };
  return `
    <section class="collateral-tab-view collateral-overview-view">
      <div class="tab-summary-card overview-summary">
        <div>
          <span class="eyebrow">Паспорт залогового имущества</span>
          <h2>${escapeHtml(collateral.type)} / ${escapeHtml(subtype)}</h2>
          <p>${escapeHtml(collateral.description)}. Вкладка содержит паспортные данные объекта, параметры залогодателя, характеристики по виду залога и контроль стоимости.</p>
        </div>
        <div class="overview-metrics">
          <div><span>Рыночная стоимость</span><strong>${formatMoney(collateral.marketValue)}</strong></div>
          <div><span>Залоговая стоимость</span><strong>${formatMoney(collateral.pledgeValue)}</strong></div>
          <div><span>Риск</span><strong>${badge(getCollateralRiskState(collateral), riskTone(collateral))}</strong></div>
        </div>
      </div>
      <section class="panel">
        <div class="panel-title">
          <div><h2>Основные реквизиты</h2><p class="hint">Паспортные поля объекта, залогодатель, источник загрузки и ответственный.</p></div>
          <span class="panel-note">${escapeHtml(collateral.updatedAt)}</span>
        </div>
        ${renderReadonlyFieldGrid({ ...objectFields, ...ownershipFields })}
      </section>
      <section class="panel">
        <div class="panel-title">
          <div><h2>Характеристики по виду залога</h2><p class="hint">Состав полей зависит от типа объекта: недвижимость, транспорт, оборудование, товары в обороте или скот.</p></div>
          ${badge(collateral.type, "info")}
        </div>
        ${fieldEntries.length ? renderReadonlyFieldGrid(Object.fromEntries(fieldEntries)) : `<div class="empty-state"><h2>Характеристики не заполнены</h2><p>Для этого объекта нет дополнительных полей по виду залога.</p></div>`}
      </section>
      <section class="panel">
        <div class="panel-title">
          <div><h2>Стоимость и контроль</h2><p class="hint">Стоимостные параметры, оценка, страхование и ближайший контроль объекта.</p></div>
        </div>
        ${renderReadonlyFieldGrid(valueFields)}
      </section>
    </section>
  `;
}

function renderReadonlyFieldGrid(items) {
  return `
    <div class="readonly-field-grid collateral-field-grid">
      ${Object.entries(items).map(([key, value]) => {
        const displayValue = value ?? "-";
        const wide = String(displayValue).length > 45 || ["Описание", "Полный адрес / место хранения"].includes(key);
        return `
          <div class="readonly-field ${wide ? "wide" : ""}">
            <span>${escapeHtml(key)}</span>
            <strong>${typeof displayValue === "string" && displayValue.startsWith("<") ? displayValue : escapeHtml(displayValue)}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getCollateralSubtype(collateral) {
  return collateral.fields?.["Подтип"]
    || collateral.fields?.["Назначение"]
    || collateral.fields?.["Марка/модель"]
    || collateral.fields?.["Производитель"]
    || collateral.fields?.["Порода"]
    || collateral.type;
}

function getCollateralCategory(collateral) {
  if (collateral.type === "Недвижимость") return collateral.fields?.["Назначение"] || "Недвижимое имущество";
  if (collateral.type === "Автотранспорт") return collateral.fields?.["Марка/модель"] || "Транспортное средство";
  if (collateral.type === "Оборудование") return collateral.fields?.["Производитель"] || "Производственное оборудование";
  if (collateral.type === "Товары в обороте") return collateral.fields?.["Группа товаров"] || "Товарные запасы";
  if (collateral.type === "Скот") return collateral.fields?.["Порода"] || "Сельскохозяйственные животные";
  return collateral.type;
}

function renderCollateralMonitoring(collateral) {
  return renderMonitoringObjectComponent(collateral, {
    note: collateral.id,
    showMonitoringSettings: true
  });
}

function renderMonitoringObjectComponent(collateral, options = {}) {
  const { note = "", showInspectionTable = true, showLatestValuation = false, showMonitoringSettings = false } = options;
  const monitoring = collateral.monitoring || {};
  const schedule = monitoring.schedule || [];
  const last = [...schedule].reverse().find((item) => item.status === "Завершен") || schedule[0] || {};
  const previousControl = monitoring.lastInspection || last.date || "";
  return `
    <section class="collateral-inspections-view collateral-tab-view monitoring-object-component">
      ${showMonitoringSettings ? renderMonitoringSettingsPanel(collateral, note) : ""}
      <section class="panel inspection-card">
        <div class="panel-title">
          <h2>Последний осмотр</h2>
          ${note ? `<span class="panel-note">${escapeHtml(note)}</span>` : ""}
        </div>
        ${renderInfoGrid({ "Дата": last.date || previousControl, "Тип": last.type, "Результат": last.result, "Инспектор": last.inspector || monitoring.inspector, "Статус": last.status })}
      </section>
      ${showLatestValuation ? renderLatestValuationPanel(collateral, note) : ""}
      ${showInspectionTable ? `<section class="panel table-panel inspection-table"><h2>Таблица осмотров</h2><table><thead><tr><th>Дата</th><th>Тип</th><th>Результат</th><th>Инспектор</th><th>Статус</th></tr></thead><tbody>${schedule.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.result)}</td><td>${escapeHtml(item.inspector)}</td><td>${badge(item.status)}</td></tr>`).join("")}</tbody></table></section>` : ""}
    </section>
  `;
}


function renderMonitoringSettingsPanel(collateral, note = "") {
  const monitoring = collateral.monitoring || {};
  const schedule = monitoring.schedule || [];
  const last = [...schedule].reverse().find((item) => item.status === "Завершен") || schedule[0] || {};
  const next = schedule.find((item) => item.status === "Запланирован") || {};
  const currentPeriodicity = monitoring.periodicity || "Ежеквартально";
  const periodicities = [...new Set(["Ежемесячно", "Ежеквартально", "Раз в два месяца", "Раз в полгода", "Ежегодно", "По событию", currentPeriodicity].filter(Boolean))];
  const monitoringRequired = monitoring.required || "ДА";
  const previousControl = monitoring.lastInspection || last.date || "";
  const nextControl = monitoring.nextInspection || next.date || "";
  return `
    <section class="panel monitoring-settings-panel">
      <div class="panel-title">
        <div><h2>Настройки мониторинга</h2><p class="hint">Требование мониторинга, периодичность и следующий контроль редактируются. Предыдущий контроль фиксируется по последнему завершенному осмотру.</p></div>
        ${note ? `<span class="panel-note">${escapeHtml(note)}</span>` : ""}
        <button class="btn btn-secondary" data-action="save-monitoring" data-collateral="${escapeHtml(collateral.id)}">Сохранить настройки</button>
      </div>
      <div class="form-grid monitoring-settings-grid">
        <label>Требуется мониторинг
          <select data-monitoring-field="required" data-collateral="${escapeHtml(collateral.id)}">
            ${["ДА", "НЕТ"].map((item) => `<option value="${escapeHtml(item)}" ${item === monitoringRequired ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
        </label>
        <label>Периодичность
          <select data-monitoring-field="periodicity" data-collateral="${escapeHtml(collateral.id)}">
            ${periodicities.map((item) => `<option value="${escapeHtml(item)}" ${item === currentPeriodicity ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
        </label>
        <label>Предыдущий контроль
          <input type="date" value="${escapeHtml(previousControl)}" readonly>
        </label>
        <label>Следующий контроль
          <input type="date" value="${escapeHtml(nextControl)}" data-monitoring-field="nextInspection" data-collateral="${escapeHtml(collateral.id)}">
        </label>
      </div>
    </section>
  `;
}
function renderLatestValuationPanel(collateral, note = "") {
  const evaluations = getSortedEvaluations(collateral);
  const latest = evaluations[evaluations.length - 1];
  const previous = evaluations[evaluations.length - 2];
  if (!latest) {
    return `
      <section class="panel inspection-card latest-valuation-card">
        <div class="panel-title">
          <h2>Последняя оценка</h2>
          ${note ? `<span class="panel-note">${escapeHtml(note)}</span>` : ""}
        </div>
        <div class="empty-state compact">По объекту ${escapeHtml(collateral.id)} пока нет сохраненных оценок.</div>
      </section>
    `;
  }
  return `
    <section class="panel inspection-card latest-valuation-card">
      <div class="panel-title">
        <h2>Последняя оценка</h2>
        ${note ? `<span class="panel-note">${escapeHtml(note)}</span>` : ""}
      </div>
      ${renderInfoGrid({
        "Дата": latest.date,
        "Оценщик": latest.appraiser,
        "Рыночная стоимость": formatMoney(latest.market),
        "Залоговая стоимость": formatMoney(latest.pledge),
        "Метод": latest.method,
        "Статус": badge(latest.status),
        ...(previous ? { "Изменение рынка": badge(formatSignedPercent(getValueDelta(latest.market, previous.market)), getDeltaTone(latest.market, previous.market)) } : {})
      })}
    </section>
  `;
}

function renderCollateralValues(collateral) {
  const evaluations = getSortedEvaluations(collateral);
  return `
    <section class="collateral-values-view collateral-tab-view">
      ${renderValuationHistoryChart(collateral, evaluations)}
      <section class="panel table-panel">
        <div class="panel-title">
          <div><h2>Оценки</h2><p class="hint">История рыночной и залоговой стоимости по отчетам оценки.</p></div>
          <span class="panel-note">${evaluations.length} записей</span>
        </div>
        <table>
          <thead><tr><th>Дата</th><th>Оценщик</th><th>Рыночная</th><th>Залоговая</th><th>Изменение рынка</th><th>Метод</th><th>Статус</th></tr></thead>
          <tbody>${evaluations.map((item, index) => {
            const previous = evaluations[index - 1];
            return `
              <tr>
                <td>${escapeHtml(item.date)}</td>
                <td>${escapeHtml(item.appraiser)}</td>
                <td>${formatMoney(item.market)}</td>
                <td>${formatMoney(item.pledge)}</td>
                <td>${previous ? badge(formatSignedPercent(getValueDelta(item.market, previous.market)), getDeltaTone(item.market, previous.market)) : badge("База", "neutral")}</td>
                <td>${escapeHtml(item.method)}</td>
                <td>${badge(item.status)}</td>
              </tr>
            `;
          }).join("")}</tbody>
        </table>
      </section>
    </section>
  `;
}

function getSortedEvaluations(collateral) {
  return [...(collateral.evaluations || [])]
    .filter((item) => item?.date && (item.market || item.pledge))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function renderValuationHistoryChart(collateral, evaluations) {
  if (!evaluations.length) {
    return `<section class="panel valuation-history-panel"><h2>Динамика стоимости</h2><div class="empty-state">По залогу ${escapeHtml(collateral.id)} пока нет сохраненных оценок.</div></section>`;
  }
  const chart = getValuationChartModel(evaluations);
  const first = evaluations[0];
  const last = evaluations[evaluations.length - 1];
  return `
    <section class="panel valuation-history-panel">
      <div class="panel-title">
        <div>
          <h2>Динамика стоимости</h2>
          <p class="hint">Рыночная и залоговая стоимость по датам оценок.</p>
        </div>
        <span class="panel-note">${escapeHtml(first.date)} - ${escapeHtml(last.date)}</span>
      </div>
      <div class="valuation-chart-summary">
        <div><span>Последняя рыночная</span><strong>${formatMoney(last.market)}</strong></div>
        <div><span>Последняя залоговая</span><strong>${formatMoney(last.pledge)}</strong></div>
        <div><span>Изменение рынка</span><strong class="${getDeltaClass(last.market, first.market)}">${formatSignedPercent(getValueDelta(last.market, first.market))}</strong></div>
        <div><span>Изменение залоговой</span><strong class="${getDeltaClass(last.pledge, first.pledge)}">${formatSignedPercent(getValueDelta(last.pledge, first.pledge))}</strong></div>
      </div>
      <div class="valuation-chart-box">
        <svg class="valuation-line-chart" viewBox="0 0 ${chart.width} ${chart.height}" role="img" aria-label="График динамики оценки стоимостей">
          ${chart.ticks.map((tick) => `
            <line class="valuation-grid-line" x1="${chart.left}" y1="${tick.y}" x2="${chart.right}" y2="${tick.y}"></line>
            <text class="valuation-axis-label y-label" x="${chart.left - 14}" y="${tick.y + 5}">${escapeHtml(tick.label)}</text>
          `).join("")}
          <line class="valuation-axis" x1="${chart.left}" y1="${chart.top}" x2="${chart.left}" y2="${chart.bottom}"></line>
          <line class="valuation-axis" x1="${chart.left}" y1="${chart.bottom}" x2="${chart.right}" y2="${chart.bottom}"></line>
          ${chart.marketLine ? `<polyline class="valuation-series market" points="${chart.marketLine}"></polyline>` : ""}
          ${chart.pledgeLine ? `<polyline class="valuation-series pledge" points="${chart.pledgeLine}"></polyline>` : ""}
          ${chart.points.map((point) => `
            <g>
              <line class="valuation-date-guide" x1="${point.x}" y1="${chart.top}" x2="${point.x}" y2="${chart.bottom}"></line>
              <circle class="valuation-point market" cx="${point.x}" cy="${point.marketY}" r="5.8"></circle>
              <circle class="valuation-point pledge" cx="${point.x}" cy="${point.pledgeY}" r="5.8"></circle>
              <text class="valuation-axis-label x-label" x="${point.x}" y="${chart.height - 14}">${escapeHtml(formatEvaluationDate(point.date))}</text>
            </g>
          `).join("")}
        </svg>
        <div class="valuation-chart-legend">
          <span><i class="market"></i>Рыночная стоимость</span>
          <span><i class="pledge"></i>Залоговая стоимость</span>
        </div>
      </div>
      ${evaluations.length === 1 ? `<p class="hint">Для полноценной динамики нужна минимум еще одна оценка. Сейчас показана последняя сохраненная точка.</p>` : ""}
    </section>
  `;
}

function getValuationChartModel(evaluations) {
  const width = 820;
  const height = 300;
  const left = 108;
  const right = width - 34;
  const top = 24;
  const bottom = height - 52;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const values = evaluations.flatMap((item) => [Number(item.market || 0), Number(item.pledge || 0)]).filter((value) => value > 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rawSpan = maxValue - minValue || Math.max(maxValue * 0.08, 1);
  const yMin = Math.max(0, minValue - rawSpan * 0.22);
  const yMax = maxValue + rawSpan * 0.22;
  const ySpan = yMax - yMin || 1;
  const xFor = (index) => evaluations.length === 1 ? left + plotWidth / 2 : left + (index / (evaluations.length - 1)) * plotWidth;
  const yFor = (value) => bottom - ((Number(value || 0) - yMin) / ySpan) * plotHeight;
  const points = evaluations.map((item, index) => ({
    date: item.date,
    x: roundChartValue(xFor(index)),
    marketY: roundChartValue(yFor(item.market)),
    pledgeY: roundChartValue(yFor(item.pledge))
  }));
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const value = yMax - (ySpan / 3) * index;
    return {
      y: roundChartValue(yFor(value)),
      label: formatShortMoney(value)
    };
  });
  const toLine = (key) => points.map((point) => `${point.x},${point[key]}`).join(" ");
  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    points,
    ticks,
    marketLine: points.length ? toLine("marketY") : "",
    pledgeLine: points.length ? toLine("pledgeY") : ""
  };
}

function roundChartValue(value) {
  return Math.round(value * 10) / 10;
}

function getValueDelta(current, previous) {
  const base = Number(previous || 0);
  if (!base) return 0;
  return ((Number(current || 0) - base) / base) * 100;
}

function formatSignedPercent(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  if (!rounded) return "0%";
  return `${rounded > 0 ? "+" : ""}${String(rounded).replace(".", ",")}%`;
}

function getDeltaTone(current, previous) {
  const delta = getValueDelta(current, previous);
  if (delta < -5) return "danger";
  if (delta < 0) return "warn";
  if (delta > 0) return "ok";
  return "neutral";
}

function getDeltaClass(current, previous) {
  return `valuation-delta ${getDeltaTone(current, previous)}`;
}

function formatEvaluationDate(dateValue) {
  const [year, month] = String(dateValue || "").split("-");
  return year && month ? `${month}.${year}` : String(dateValue || "-");
}

function renderCollateralContracts(collateral) {
  const contracts = (collateral.contractIds || []).map(getContract).filter(Boolean);
  return `<section class="panel table-panel"><h2>Договоры и обременения</h2><table><thead><tr><th>Договор</th><th>Клиент по договору</th><th>Роль по договору</th><th>Остаток</th><th>LTV</th><th>Обременение</th><th>Статус</th></tr></thead><tbody>${contracts.map((contract) => `<tr><td><button class="link" data-route="/app/contracts/${contract.id}">${escapeHtml(contract.number)}</button></td><td>${escapeHtml(contract.clientName)}</td><td>${escapeHtml(getContractPartyRole(contract))}</td><td>${formatMoney(contract.debt, contract.currency)}</td><td>${badge(`${contract.ltv}%`)}</td><td>${escapeHtml(collateral.encumbrances?.[0]?.number || "-")}</td><td>${badge(contract.status)}</td></tr>`).join("")}</tbody></table></section>`;
}

function renderCollateralPledgors(collateral) {
  return `<section class="panel table-panel"><h2>Залогодатели</h2><table><thead><tr><th>Доля</th><th>Наименование/ФИО</th><th>ИНН</th><th>Роль</th><th>Проверка</th></tr></thead><tbody>${(collateral.pledgors || []).map((item) => `<tr><td>${escapeHtml(item.share)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.idn)}</td><td>${escapeHtml(item.role)}</td><td>${badge(item.check)}</td></tr>`).join("")}</tbody></table></section>`;
}

function renderCollateralRisks(collateral) {
  const signals = getCollateralRiskSignals(collateral);
  const riskScore = getCollateralRiskScore(collateral);
  const riskState = getCollateralRiskState(collateral);
  const levels = signals.reduce((acc, risk) => {
    acc[risk.level] = (acc[risk.level] || 0) + 1;
    return acc;
  }, {});
  return `
    <section class="collateral-risks-view collateral-tab-view">
      <div class="tab-summary-card">
        <div>
          <span class="eyebrow">Риск-профиль залога</span>
          <h2>${escapeHtml(riskState)}</h2>
          <p>Критичных сигналов: ${levels.critical || 0}, требуют внимания: ${levels.warn || 0}, без замечаний: ${levels.ok || 0}. Контроль строится по данным карточки, страхования, оценки, кросс-залогов и внешних источников.</p>
        </div>
        <div class="risk-score-ring" title="Балл риска">
          <span>${escapeHtml(riskScore)}</span>
        </div>
      </div>
      <section class="grid-2 tab-feature-grid">
        <div class="panel risk-signals-panel">
          <div class="panel-title">
            <div><h2>Сигналы рисков</h2><p class="hint">Состояние объекта по контрольным правилам и последним проверкам.</p></div>
            ${badge(riskState, riskTone(collateral))}
          </div>
          ${renderRiskPanel(collateral)}
          <div class="score-card">
            <span>Балл риска</span>
            <p>${escapeHtml(riskState)}</p>
            <strong>${escapeHtml(riskScore)}</strong>
          </div>
        </div>
        <div class="panel risk-rules-panel">
          <div class="panel-title">
            <div><h2>Контрольные правила</h2></div>
          </div>
          ${renderCollateralRiskRules(collateral)}
        </div>
      </section>
    </section>
  `;
}

function renderCollateralRiskRules(collateral) {
  const nextInspection = collateral.monitoring?.nextInspection || "-";
  const rules = [
    {
      title: "Страхование",
      description: `Статус ${collateral.insuranceStatus || "-"}, срок действия до ${collateral.insuranceDue || collateral.insurance?.to || "-"}.`,
      status: collateral.insuranceStatus || "Не указано",
      tone: collateral.insuranceStatus === "Оплачена" ? "ok" : "warn"
    },
    {
      title: "Оценка",
      description: `Статус ${collateral.appraisalStatus || "-"}, следующая переоценка до ${collateral.appraisalDue || "-"}.`,
      status: collateral.appraisalStatus || "Не указано",
      tone: collateral.appraisalStatus === "Действует" ? "ok" : "warn"
    },
    {
      title: "Кросс-залог",
      description: collateral.crossPledge ? `Объект участвует в ${collateral.contractIds.length} договорах, требуется контроль аллокации.` : "Объект привязан к одному договору.",
      status: collateral.crossPledge ? "Да" : "Нет",
      tone: collateral.crossPledge ? "warn" : "ok"
    },
    {
      title: "Мониторинг",
      description: `Следующий контроль: ${nextInspection}. Последний осмотр: ${collateral.monitoring?.lastInspection || "-"}.`,
      status: collateral.monitoring?.condition || "По графику",
      tone: "info"
    },
    {
      title: "Внешние ограничения",
      description: collateral.externalData?.["Аресты"] || collateral.externalData?.["Ограничения"] || collateral.externalData?.["Запреты"] || "Проверка выполнена по внешним источникам.",
      status: collateral.externalData?.["Аресты"] === "Не выявлены" || collateral.externalData?.["Ограничения"] === "Не выявлены" ? "Без ограничений" : "Проверить",
      tone: collateral.externalData?.["Аресты"] === "Не выявлены" || collateral.externalData?.["Ограничения"] === "Не выявлены" ? "ok" : "warn"
    }
  ];
  return `
    <div class="risk-rule-list">
      ${rules.map((rule) => `
        <button data-action="risk-rule" data-rule="${escapeHtml(rule.title)}">
          <span>${escapeHtml(rule.title)}</span>
          ${badge(rule.status, rule.tone)}
          <small>${escapeHtml(rule.description)}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderCollateralExternal(collateral) {
  const allSourceRows = getCollateralExternalRows(collateral);
  const applicableSourceRows = allSourceRows.filter((row) => row.applicable);
  const unavailableSourceRows = allSourceRows.filter((row) => !row.applicable);
  const sourceRows = [...applicableSourceRows, ...unavailableSourceRows];
  const errorRows = applicableSourceRows.filter((row) => /ошиб/i.test(row.status)).length;
  const lastSync = applicableSourceRows.map((row) => row.updatedAt).filter(Boolean).sort().slice(-1)[0] || collateral.updatedAt;
  const attributeRows = getCollateralExternalAttributeRows(collateral, applicableSourceRows);
  const attributeGroups = getExternalAttributeGroups(attributeRows);
  return `
    <section class="collateral-external-view">
      <section class="panel external-summary tab-summary-card">
        <div>
          <span class="eyebrow">Внешние данные</span>
          <h2>Источники проверки объекта ${escapeHtml(collateral.id)}</h2>
          <p>По каждому источнику показаны назначение проверки, результат по объекту, статус обмена, дата последнего обновления и сообщение из последней синхронизации.</p>
        </div>
        <div class="external-summary-meta">
          <div><span>Источников всего</span><strong>${sourceRows.length}</strong></div>
          <div><span>Применимо к объекту</span><strong>${applicableSourceRows.length}</strong></div>
          <div><span>Ошибок обмена</span><strong>${errorRows}</strong></div>
          <div><span>Последнее обновление</span><strong>${escapeHtml(lastSync)}</strong></div>
        </div>
      </section>
      <section class="panel external-attribute-panel">
        <div class="panel-title">
          <div><h2>Полученные атрибуты объекта</h2></div>
          <span class="panel-note">${formatExternalAttributePanelNote(attributeGroups)}</span>
        </div>
        ${renderExternalAttributeGroups(attributeGroups)}
      </section>
      <section class="panel table-panel external-source-panel">
        <div class="panel-title">
          <div><h2>Проверки по источникам</h2></div>
        </div>
        <table>
          <thead><tr><th>Источник</th><th>Тип данных</th><th>Данные по залогу</th><th>Дата обновления</th><th>Статус</th><th>Сообщение</th><th>Действие</th></tr></thead>
          <tbody>
            ${sourceRows.length ? sourceRows.map((row) => `
              <tr class="${row.applicable ? "" : "external-source-row-unavailable"}">
                <td><strong>${escapeHtml(row.source)}</strong><br><small>${escapeHtml(row.group)}</small></td>
                <td>${escapeHtml(row.dataType)}</td>
                <td>${escapeHtml(row.value)}</td>
                <td>${escapeHtml(row.updatedAt)}</td>
                <td>${badge(row.status, row.tone)}</td>
                <td>${escapeHtml(row.message)}</td>
                <td>${row.applicable
                  ? `<button class="btn btn-secondary btn-small external-row-sync" data-action="refresh-external-source" data-collateral="${escapeHtml(collateral.id)}" data-source="${escapeHtml(row.source)}">Синхронизировать</button>`
                  : `<button class="btn btn-secondary btn-small external-row-sync" disabled aria-disabled="true">Недоступно</button>`}</td>
              </tr>
            `).join("") : `<tr><td colspan="7">Внешние источники не настроены.</td></tr>`}
          </tbody>
        </table>
      </section>
    </section>
  `;
}

function renderExternalAttributeGroups(groups) {
  if (!groups.length) return `<div class="empty-state">По применимым источникам пока нет полученных атрибутов.</div>`;
  const columns = getExternalAttributeColumns(groups);
  return `
    <div class="external-attribute-groups">
      ${columns.map((column) => `
        <div class="external-attribute-column">
          ${column.map(renderExternalAttributeCard).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderExternalAttributeCard(group) {
  return `
    <article class="external-attribute-card">
      <div class="external-attribute-card-head">
        <div>
          <h3>${escapeHtml(group.source)}</h3>
          <span>${escapeHtml(formatExternalAttributeGroupDate(group))}</span>
        </div>
        <div class="external-attribute-card-badges">
          ${badge(group.status, group.tone)}
        </div>
      </div>
      <div class="external-attribute-list">
        ${group.rows.map((row) => `
          <div class="external-attribute-item ${row.tone || ""}">
            <span>${escapeHtml(row.parameter)}</span>
            <strong>${escapeHtml(row.value)}</strong>
            ${group.dates.length > 1 ? `<small>${escapeHtml(row.updatedAt)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function getExternalAttributeColumns(groups) {
  const columns = [[], []];
  const weights = [0, 0];
  [...groups]
    .sort((a, b) => b.rows.length - a.rows.length || a.source.localeCompare(b.source, "ru"))
    .forEach((group) => {
      const target = weights[0] <= weights[1] ? 0 : 1;
      columns[target].push(group);
      weights[target] += Math.max(1, Math.ceil(group.rows.length / 2)) + 1;
    });
  return columns.filter((column) => column.length);
}

function formatExternalAttributePanelNote(groups) {
  const attributeCount = sumBy(groups, (group) => group.rows.length);
  return `${attributeCount} ${pluralize(attributeCount, "атрибут", "атрибута", "атрибутов")} · ${groups.length} ${pluralize(groups.length, "источник", "источника", "источников")}`;
}

function formatExternalAttributeGroupDate(group) {
  return [...group.dates].filter(Boolean).sort().slice(-1)[0] || "-";
}

function pluralize(value, one, few, many) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function getExternalAttributeGroups(attributeRows) {
  const groups = [];
  attributeRows.forEach((row) => {
    const source = normalizeExternalAttributeSource(row.source);
    let group = groups.find((item) => item.source === source);
    if (!group) {
      group = { source, rows: [] };
      groups.push(group);
    }
    const parameter = normalizeExternalAttributeParameter(row.parameter);
    const existingIndex = group.rows.findIndex((item) => normalizeExternalAttributeParameter(item.parameter) === parameter);
    if (existingIndex === -1) {
      group.rows.push(row);
    } else if (shouldUseExternalAttributeRow(row, group.rows[existingIndex])) {
      group.rows[existingIndex] = row;
    }
  });
  return groups.map((group) => {
    const status = getExternalAttributeGroupStatus(group.rows);
    const dates = group.rows
      .map((row) => row.updatedAt)
      .filter(Boolean)
      .filter((date, index, items) => items.indexOf(date) === index);
    return {
      ...group,
      dates,
      status,
      tone: externalAttributeTone(status)
    };
  });
}

function normalizeExternalAttributeParameter(parameter) {
  return String(parameter || "").trim().toLowerCase();
}

function shouldUseExternalAttributeRow(row, existing) {
  const rowPriority = getExternalAttributeStatusPriority(row.status);
  const existingPriority = getExternalAttributeStatusPriority(existing.status);
  if (rowPriority !== existingPriority) return rowPriority > existingPriority;
  const dateCompare = String(row.updatedAt || "").localeCompare(String(existing.updatedAt || ""));
  if (dateCompare !== 0) return dateCompare > 0;
  return String(row.source || "").length > String(existing.source || "").length;
}

function getExternalAttributeStatusPriority(status) {
  if (/требует/i.test(status)) return 3;
  if (/ожидает/i.test(status)) return 2;
  return 1;
}

function normalizeExternalAttributeSource(source) {
  const value = String(source || "Источник");
  if (value.startsWith("SpectrumData")) return "SpectrumData";
  if (value === "Сервис данных ЕГРН") return "ЕГРН";
  return value;
}

function getExternalAttributeGroupStatus(rows) {
  if (rows.some((row) => row.status === "Требует проверки")) return "Требует проверки";
  if (rows.some((row) => row.status === "Ожидает данных")) return "Ожидает данных";
  return "Получено";
}

function getCollateralExternalRows(collateral) {
  const sources = (state.data.integrations || []).filter((source) => source.group === "Внешняя");
  return sources.map((source) => {
    const log = getExternalSourceLog(source, collateral);
    const detail = getCollateralExternalSourceDetail(source, collateral);
    const applicable = detail.applicable !== false;
    const rawStatus = log?.result || detail.status || source.status;
    const status = normalizeExternalSourceStatus(rawStatus, applicable);
    return {
      source: source.name,
      group: source.group,
      applicable,
      dataType: detail.dataType || source.method,
      value: detail.value,
      updatedAt: detail.updatedAt || log?.time || source.lastSync || collateral.updatedAt,
      status,
      tone: externalStatusTone(status),
      message: detail.message || log?.message || source.method
    };
  });
}

function getExternalSourceLog(source, collateral) {
  return (source.logs || []).find((item) => item.object === collateral.id)
    || (source.logs || []).find((item) => item.message?.includes(collateral.id))
    || (source.logs || []).find((item) => item.object === "Портфель");
}

function normalizeExternalSourceStatus(status, applicable = true) {
  if (!applicable) return "Не применимо";
  const value = String(status || "");
  if (/ошиб/i.test(value)) return "Ошибка обмена";
  if (/предуп/i.test(value)) return "Требует проверки";
  if (/успеш|прототип/i.test(value)) return "Данные получены";
  return value || "Данные получены";
}

function externalStatusTone(status) {
  if (/ошиб/i.test(status)) return "danger";
  if (/требует|предуп/i.test(status)) return "warn";
  if (/не применимо|ожидает/i.test(status)) return "neutral";
  return "ok";
}

function getCollateralExternalSourceDetail(source, collateral) {
  const data = collateral.externalData || {};
  if (source.id === "infosphere") {
    return {
      applicable: true,
      dataType: "Проверка собственника и предмета залога",
      value: data["Реестр залогов ФНП"] || data["Проверка собственника"] || data["Признак двойного залога"] || "Проверка через ФНП выполнена",
      message: data["Ограничения"] || data["Запреты"] || "Сведения Инфосферы сопоставлены с карточкой залога"
    };
  }
  if (source.id === "egrn") {
    const applicable = collateral.type === "Недвижимость";
    return {
      applicable,
      dataType: "Данные ЕГРН и ограничения недвижимости",
      value: applicable ? `${data["Право собственности"] || "Право проверено"}; ${data["Ограничения"] || data["Запреты"] || "ограничения проверены"}` : "Источник не применяется к типу объекта",
      message: applicable ? (data["Дата проверки"] ? `Проверка от ${data["Дата проверки"]}` : "Сведения ЕГРН проверены") : "Используется только для недвижимости"
    };
  }
  if (source.id === "spectrum-auto") {
    const applicable = collateral.type === "Автотранспорт";
    return {
      applicable,
      dataType: "Проверка VIN и рыночная цена ТС",
      value: applicable ? (data["Оптимальное значение стоимости ТС"] || data["Регистрация"] || "Результат проверки VIN получен") : "Источник не применяется к типу объекта",
      message: applicable ? "Данные SpectrumData сопоставлены с VIN и карточкой ТС" : "Используется только для автотранспорта"
    };
  }
  if (source.id === "spectrum-realty") {
    const applicable = collateral.type === "Недвижимость";
    return {
      applicable,
      dataType: "Проверка недвижимости по кадастровому номеру",
      value: applicable ? (data["Кадастровый номер"] || data["Право собственности"] || "Результат проверки недвижимости получен") : "Источник не применяется к типу объекта",
      message: applicable ? "Данные SpectrumData сопоставлены с кадастровым номером" : "Используется только для недвижимости"
    };
  }
  if (source.id === "avito") {
    const applicable = ["Автотранспорт", "Оборудование"].includes(collateral.type);
    return {
      applicable,
      dataType: "Объявления и статистика цен",
      value: applicable ? "Аналоги доступны для задачи переоценки" : "Источник не применяется к типу объекта",
      message: applicable ? "Результаты Авито используются в анализе рынка аналогичных объектов" : "Используется для транспорта, спецтехники и оборудования"
    };
  }
  if (source.id === "auto-ru") {
    const applicable = collateral.type === "Автотранспорт";
    return {
      applicable,
      dataType: "Средняя цена автомобиля",
      value: applicable ? "Средняя цена доступна для расчета стоимости" : "Источник не применяется к типу объекта",
      message: applicable ? "Данные Авто.ру используются для оценки автомобиля" : "Используется только для автомобилей"
    };
  }
  if (source.id === "yandex-realty" || source.id === "cian" || source.id === "mobile-appraiser") {
    const applicable = collateral.type === "Недвижимость";
    return {
      applicable,
      dataType: source.id === "mobile-appraiser" ? "Оценка стоимости недвижимости" : "Оценка недвижимости и поиск аналогов",
      value: applicable ? "Аналоги доступны для сравнительного анализа" : "Источник не применяется к типу объекта",
      message: applicable ? `Результаты ${source.name} используются в анализе рынка аналогичных объектов` : "Используется только для недвижимости"
    };
  }
  return {
    applicable: true,
    dataType: source.method,
    value: data["Источник"] || "Данные источника сопоставлены с карточкой",
    message: source.method
  };
}

function getCollateralExternalAttributeRows(collateral, sourceRows = []) {
  const data = collateral.externalData || {};
  const rows = [];
  const add = (source, parameter, value, options = {}) => {
    if (value === undefined || value === null || value === "") return;
    const status = options.status || getExternalAttributeStatus(value);
    const row = {
      source,
      parameter,
      value: String(value),
      updatedAt: options.updatedAt || data["Дата проверки"] || collateral.updatedAt || "-",
      status,
      tone: options.tone || externalAttributeTone(status)
    };
    const key = `${row.source}|${row.parameter}|${row.value}`;
    if (!rows.some((item) => `${item.source}|${item.parameter}|${item.value}` === key)) rows.push(row);
  };
  const infosphereDate = getExternalRowDate(sourceRows, "Инфосфера") || data["Дата проверки"];
  add("Инфосфера", "Проверка залогодателя", collateral.pledgors?.map((item) => `${item.name}: ${item.check}`).join("; "), { updatedAt: infosphereDate });
  add("Инфосфера", "Проверка связей залогодателя", collateral.crossPledge ? "Есть связь с несколькими договорами" : "Связи с несколькими договорами не выявлены", { updatedAt: infosphereDate });
  add("ФНП", "Реестр уведомлений о залоге", data["Внешний залоговый реестр"] || data["Признак двойного залога"] || "Проверка выполнена", { updatedAt: infosphereDate });

  if (collateral.type === "Недвижимость") {
    const egrnDate = getExternalRowDate(sourceRows, "Сервис данных ЕГРН") || data["Дата проверки"];
    add("ЕГРН", "Кадастровый номер", collateral.fields?.["Кадастровый номер"], { updatedAt: egrnDate });
    add("ЕГРН", "Право собственности", data["Право собственности"] || "Проверяется по правообладателю", { updatedAt: egrnDate });
    add("ЕГРН", "Аресты", data["Аресты"] || "Не выявлены", { updatedAt: egrnDate });
    add("ЕГРН", "Запреты и ограничения", data["Запреты"] || data["Ограничения"] || data["Судебные ограничения"] || "Не выявлены", { updatedAt: egrnDate });
    add("ЕГРН", "Адрес объекта", collateral.address, { updatedAt: egrnDate });
    add("ЕГРН", "Площадь / назначение", [collateral.fields?.["Площадь"], collateral.fields?.["Площадь строений"], collateral.fields?.["Назначение"]].filter(Boolean).join("; "), { updatedAt: egrnDate });

    const spectrumDate = getExternalRowDate(sourceRows, "SpectrumData: недвижимость") || egrnDate;
    add("SpectrumData: недвижимость", "Кадастровые характеристики", [collateral.fields?.["Кадастровый номер"], collateral.fields?.["Площадь"], collateral.fields?.["Площадь строений"]].filter(Boolean).join("; "), { updatedAt: spectrumDate });
    add("SpectrumData: недвижимость", "Сопоставление адреса", collateral.address, { updatedAt: spectrumDate });

    addRealtyValuationAttributes(collateral, sourceRows, add);
  }

  if (collateral.type === "Автотранспорт") {
    const spectrumDate = getExternalRowDate(sourceRows, "SpectrumData: авто") || data["Дата проверки"];
    add("SpectrumData: авто", "VIN", collateral.fields?.["VIN"], { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Госномер", collateral.fields?.["Госномер"], { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Марка / модель", collateral.fields?.["Марка/модель"], { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Год выпуска", collateral.fields?.["Год выпуска"], { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Пробег", collateral.fields?.["Пробег"], { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Регистрация ТС", data["Регистрация ТС"] || data["Регистрация"] || "Проверена", { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Аресты", data["Аресты"] || "Не выявлены", { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Запрет регистрационных действий", data["Запрет регистрационных действий"] || data["Запреты"] || "Не выявлен", { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Розыск", data["Розыск"] || "Не числится", { updatedAt: spectrumDate });
    add("SpectrumData: авто", "Оптимальное значение стоимости ТС", formatMoney(collateral.marketValue), { updatedAt: spectrumDate });
    addVehicleMarketAttributes(collateral, sourceRows, add);
  }

  if (collateral.type === "Оборудование") {
    const avitoDate = getExternalRowDate(sourceRows, "Авито") || data["Дата проверки"];
    add("Авито", "Поиск аналогов оборудования", "Доступен по фильтрам производителя, модели, года выпуска и состояния", { updatedAt: avitoDate, status: "Ожидает данных", tone: "neutral" });
    add("Авито", "Статистика цен", `Базовая рыночная стоимость в карточке: ${formatMoney(collateral.marketValue)}`, { updatedAt: avitoDate });
  }

  if (collateral.type === "Товары в обороте") {
    add("Триггер мониторинга", "Складской остаток", data["Складской остаток"] || collateral.fields?.["Объем"], { updatedAt: data["Дата проверки"] });
    add("Триггер мониторинга", "Место хранения", collateral.fields?.["Место хранения"] || collateral.address, { updatedAt: data["Дата проверки"] });
    add("Триггер мониторинга", "Метод контроля", collateral.fields?.["Метод контроля"], { updatedAt: data["Дата проверки"] });
    add("Триггер мониторинга", "Сигнал реализации", data["Сигнал реализации"] || "Нет", { updatedAt: data["Дата проверки"] });
  }

  if (collateral.type === "Скот") {
    add("Триггер мониторинга", "Поголовье", collateral.fields?.["Поголовье"], { updatedAt: data["Дата проверки"] });
    add("Триггер мониторинга", "Метод идентификации", collateral.fields?.["Метод идентификации"], { updatedAt: data["Дата проверки"] });
    add("Триггер мониторинга", "Сигнал мониторинга", data["Сигнал мониторинга"], { updatedAt: data["Дата проверки"] });
    add("Триггер мониторинга", "Требование", data["Требование"], { updatedAt: data["Дата проверки"] });
  }

  return rows;
}

function getExternalRowDate(sourceRows, sourceName) {
  return sourceRows.find((row) => row.source === sourceName)?.updatedAt || "";
}

function getExternalAttributeStatus(value) {
  const text = String(value || "");
  if (/ошиб|спор|проверить|расхожд|не оплачен|требует|частич/i.test(text)) return "Требует проверки";
  if (/ожидает|не загруж/i.test(text)) return "Ожидает данных";
  return "Получено";
}

function externalAttributeTone(status) {
  if (/требует/i.test(status)) return "warn";
  if (/ожидает/i.test(status)) return "neutral";
  return "ok";
}

function addVehicleMarketAttributes(collateral, sourceRows, add) {
  const model = collateral.fields?.["Марка/модель"] || "";
  const modelKey = model.split(",")[0].trim();
  const autoRuRows = marketAnalogs.filter((item) => getMarketAnalogItemType(item) === "Автотранспорт" && item.source === "Авто.ру" && (!modelKey || item.object.includes(modelKey)));
  const autoRuDate = getExternalRowDate(sourceRows, "Авто.ру") || collateral.updatedAt;
  if (autoRuRows.length) {
    add("Авто.ру", "Количество аналогов", `${autoRuRows.length}`, { updatedAt: autoRuDate });
    add("Авто.ру", "Средняя цена автомобиля", formatMoney(Math.round(sumBy(autoRuRows, (item) => item.result || item.price) / autoRuRows.length)), { updatedAt: autoRuDate });
    add("Авто.ру", "Диапазон цен аналогов", `${formatMoney(Math.min(...autoRuRows.map((item) => item.price)))} - ${formatMoney(Math.max(...autoRuRows.map((item) => item.price)))}`, { updatedAt: autoRuDate });
  } else {
    add("Авто.ру", "Средняя цена автомобиля", "Нет загруженных аналогов в демо-выборке", { updatedAt: autoRuDate, status: "Ожидает данных", tone: "neutral" });
  }
  const avitoRows = marketAnalogs.filter((item) => getMarketAnalogItemType(item) === "Автотранспорт" && item.source === "Авито");
  const avitoDate = getExternalRowDate(sourceRows, "Авито") || collateral.updatedAt;
  add("Авито", "Поиск объявлений", avitoRows.length ? `${avitoRows.length} аналогов` : "Поиск доступен, аналоги не загружены в демо-выборке", { updatedAt: avitoDate, status: avitoRows.length ? "Получено" : "Ожидает данных", tone: avitoRows.length ? "ok" : "neutral" });
}

function addRealtyValuationAttributes(collateral, sourceRows, add) {
  const isApartment = /квартир/i.test(`${collateral.description} ${collateral.fields?.["Назначение"] || ""}`);
  const cianRows = marketAnalogs.filter((item) => getMarketAnalogItemType(item) === "Недвижимость" && item.source === "Циан" && isApartment && /квартир/i.test(item.object));
  const cianDate = getExternalRowDate(sourceRows, "Циан") || collateral.updatedAt;
  if (cianRows.length) {
    add("Циан", "Количество аналогов", `${cianRows.length}`, { updatedAt: cianDate });
    add("Циан", "Средняя стоимость аналогов", formatMoney(Math.round(sumBy(cianRows, (item) => item.result || item.price) / cianRows.length)), { updatedAt: cianDate });
    add("Циан", "Ближайший аналог", cianRows[0].object, { updatedAt: cianDate });
  }
  const yandexDate = getExternalRowDate(sourceRows, "Яндекс Недвижимость") || collateral.updatedAt;
  add("Яндекс Недвижимость", "Оценка объекта", formatMoney(collateral.marketValue), { updatedAt: yandexDate });
  add("Яндекс Недвижимость", "Поиск аналогов", cianRows.length ? `Учтено ${cianRows.length} сопоставимых объектов` : "Аналоги ожидают загрузки", { updatedAt: yandexDate, status: cianRows.length ? "Получено" : "Ожидает данных", tone: cianRows.length ? "ok" : "neutral" });

  const appraiserDate = getExternalRowDate(sourceRows, "Мобильный оценщик") || collateral.updatedAt;
  add("Мобильный оценщик", "Оценка стоимости недвижимости", formatMoney(collateral.evaluations?.[0]?.market || collateral.marketValue), { updatedAt: appraiserDate });
}

function renderCollateralHistory(collateral) {
  return `<section class="panel table-panel"><h2>История изменений</h2><table><thead><tr><th>Дата</th><th>Пользователь</th><th>Поле</th><th>Было</th><th>Стало</th><th>Основание</th><th>Источник</th></tr></thead><tbody>${(collateral.history || []).map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.user)}</td><td>${escapeHtml(item.field)}</td><td>${escapeHtml(item.oldValue)}</td><td>${escapeHtml(item.newValue)}</td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.source)}</td></tr>`).join("")}</tbody></table></section>`;
}

function renderTaskCreate(query) {
  ensureNewTaskDraft(query);
  const draftTaskId = "new-task-draft";
  const type = getUnifiedTaskType(state.newTask.type || query.get("type") || state.modal?.taskType || "Плановый мониторинг");
  const selectedIds = state.newTask.selectedCollateralIds;
  const collaterals = selectedIds.map(getCollateral).filter(Boolean);
  const activeId = state.taskActiveCollateral[draftTaskId];
  const activeCollateral = collaterals.find((item) => item.id === activeId) || collaterals[0] || null;
  if (activeCollateral) state.taskActiveCollateral[draftTaskId] = activeCollateral.id;
  const draftTask = {
    id: draftTaskId,
    type,
    contractId: activeCollateral?.contractIds?.[0] || "",
    documents: state.newTask.documents
  };
  return `
    ${renderPageHeader("Создание задачи", "Форма создания задачи с выбором залогов и привязкой сканов документов по каждому объекту.", `<button class="btn btn-secondary" data-route="/app/tasks">Назад</button>`)}
    <section class="task-create-layout">
      <div class="panel">
        <div class="panel-title">
          <h2>Основные параметры</h2>
        </div>
        <div class="form-grid">
          <label>Тип задачи<select id="newTaskType" data-new-task-field="type">${taskTypes.map((item) => `<option ${item === type ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>
          <label>Исполнитель<select id="newTaskAssignee">${employees.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select></label>
          <label>Плановый срок<input id="newTaskDue" type="date" value="2026-06-24"></label>
          <label>Приоритет<select id="newTaskPriority"><option>Средний</option><option>Высокий</option><option>Критический</option></select></label>
        </div>
        <label>Комментарий<textarea id="newTaskComment">Создать задачу по выбранным объектам залога и приложенным сканам.</textarea></label>
        <div class="task-create-footer">
          <div class="task-create-selection-note">${collaterals.length ? `Выбрано объектов залога: ${collaterals.length}` : "Объекты залога пока не добавлены"}</div>
          <div class="inline-actions task-create-actions">
            <button class="btn task-create-action pick" data-action="open-collateral-registry-picker">Выбрать объекты из реестра</button>
            <button class="btn task-create-action add" data-action="open-new-collateral-form">Добавить новый объект</button>
            <button class="btn task-create-action import" data-action="open-task-import-collaterals">Загрузить объекты из таблицы</button>
          </div>
        </div>
      </div>
    </section>
    ${collaterals.length ? renderTaskCollateralObjectsInfo(draftTask, collaterals, activeCollateral) : ""}
    ${collaterals.length ? renderDocumentWidget({
      context: "task",
      ownerId: draftTaskId,
      task: draftTask,
      documents: state.newTask.documents,
      collaterals,
      activeCollateral,
      title: "Документы",
      subtitle: "Единый контейнер файлов",
      description: "Выберите строку залога выше, чтобы увидеть обязательные документы именно по этому объекту."
    }) : ""}
    <section class="panel task-confirm-panel">
      <div class="inline-actions"><button class="btn btn-primary" data-action="create-task-submit" ${collaterals.length ? "" : "disabled"}>Создать задачу</button></div>
    </section>
  `;
}

function ensureNewTaskDraft(query) {
  const preselected = query.get("collateral") || "";
  const key = preselected ? `collateral:${preselected}` : "registry";
  if (state.newTask.key === key) return;
  state.newTask = {
    key,
    type: getUnifiedTaskType(query.get("type") || state.modal?.taskType || "Плановый мониторинг"),
    selectedCollateralIds: preselected ? [preselected] : [],
    documents: []
  };
  state.taskActiveCollateral["new-task-draft"] = preselected || "";
}

function reportCell(html, className = "") {
  return { html, className };
}

function renderReportTable({ title, note, columns, rows, className = "" }) {
  return `
    <section class="panel table-panel report-panel ${className}">
      <div class="panel-title report-table-title">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${note ? `<span class="panel-note">${escapeHtml(note)}</span>` : ""}
        </div>
        <button class="btn btn-secondary btn-small" data-action="report-export">Сформировать</button>
      </div>
      <div class="report-table-scroll">
        <table class="report-table">
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((cells) => `
              <tr>
                ${cells.map((cell) => {
                  const isObjectCell = typeof cell === "object" && cell !== null && Object.hasOwn(cell, "html");
                  const content = isObjectCell ? cell.html : escapeHtml(cell ?? "-");
                  const classAttr = isObjectCell && cell.className ? ` class="${escapeHtml(cell.className)}"` : "";
                  return `<td${classAttr}>${content}</td>`;
                }).join("")}
              </tr>
            `).join("") : `<tr><td colspan="${columns.length}"><div class="empty-state compact">Нет данных для отчета</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderReports() {
  const tasks = state.data.tasks || [];
  const activeTasks = tasks.filter((task) => !isTaskClosed(task));
  const completedTasks = tasks.filter((task) => isTaskClosed(task));
  const collaterals = state.data.collaterals || [];
  const contracts = state.data.contracts || [];
  const insuranceRows = getInsurancePolicyRows();
  const overdueTasks = activeTasks.filter((task) => getTaskUrgency(task) === "Просрочены");
  const todayTasks = activeTasks.filter((task) => getTaskUrgency(task) === "Сегодня");
  const activeContracts = contracts.filter((contract) => contract.status === "Активен");
  const highLtvContracts = activeContracts.filter((contract) => Number(contract.ltv || 0) > 80 || contract.coverageStatus !== "Полное");
  const appraisalAttention = collaterals.filter((collateral) => collateral.appraisalStatus === "Истекает" || collateral.appraisalStatus === "Просрочена");
  const insuranceExpiring = insuranceRows.filter((row) => matchesInsuranceKpi(row, "expiring"));
  const insuranceUnpaid = insuranceRows.filter((row) => matchesInsuranceKpi(row, "unpaid"));
  const monitoringAttention = collaterals.filter((collateral) => {
    const days = daysUntil(collateral.monitoring?.nextInspection);
    return days !== null && days <= 7;
  });
  const encumbranceRows = collaterals.flatMap((collateral) => (collateral.encumbrances || []).map((encumbrance) => ({ collateral, encumbrance })));
  const assignees = [...new Set([...employees, ...tasks.map((task) => task.assignee).filter(Boolean)])];
  const assigneeRows = assignees.map((assignee) => {
    const assigned = tasks.filter((task) => task.assignee === assignee);
    const assignedActive = assigned.filter((task) => !isTaskClosed(task));
    const assignedOverdue = assignedActive.filter((task) => getTaskUrgency(task) === "Просрочены");
    const assignedToday = assignedActive.filter((task) => getTaskUrgency(task) === "Сегодня");
    const assignedCompleted = assigned.filter((task) => isTaskClosed(task));
    const priorityTasks = assignedActive.filter((task) => task.priority === "Высокий" || task.priority === "Критический");
    const nextTask = assignedActive.slice().sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")))[0];
    const focus = assignedOverdue.length
      ? `Просрочки: ${assignedOverdue.map((task) => task.id).join(", ")}`
      : assignedToday.length
        ? `Сегодня: ${assignedToday.map((task) => task.id).join(", ")}`
        : nextTask
          ? `${nextTask.id}, срок ${nextTask.dueDate}`
          : "Нет активных задач";
    return {
      assignee,
      active: assignedActive.length,
      overdue: assignedOverdue.length,
      today: assignedToday.length,
      completed: assignedCompleted.length,
      priority: priorityTasks.length,
      focus
    };
  }).filter((row) => row.active || row.completed).sort((a, b) => b.overdue - a.overdue || b.active - a.active || a.assignee.localeCompare(b.assignee, "ru"));
  const taskTypeNames = [...new Set([...taskTypes, ...tasks.map((task) => task.type).filter(Boolean)])];
  const taskTypeRows = taskTypeNames.map((type) => {
    const rows = tasks.filter((task) => task.type === type);
    const activeRows = rows.filter((task) => !isTaskClosed(task));
    const topAssignee = toSegments(countBy(activeRows, (task) => task.assignee), { limit: 1 })[0]?.label || "-";
    return {
      type,
      active: activeRows.length,
      completed: rows.filter((task) => isTaskClosed(task)).length,
      overdue: activeRows.filter((task) => getTaskUrgency(task) === "Просрочены").length,
      today: activeRows.filter((task) => getTaskUrgency(task) === "Сегодня").length,
      week: activeRows.filter((task) => getTaskUrgency(task) === "На неделе").length,
      topAssignee
    };
  }).filter((row) => row.active || row.completed).sort((a, b) => b.overdue - a.overdue || b.today - a.today || b.active - a.active || a.type.localeCompare(b.type, "ru"));
  const collateralTypeRows = toSegments(countBy(collaterals, (collateral) => collateral.type)).map((typeItem) => {
    const rows = collaterals.filter((collateral) => collateral.type === typeItem.label);
    return {
      type: typeItem.label,
      count: rows.length,
      market: sumBy(rows, (collateral) => collateral.marketValue),
      pledge: sumBy(rows, (collateral) => collateral.pledgeValue),
      critical: rows.filter((collateral) => riskTone(collateral) === "danger").length,
      attention: rows.filter((collateral) => collateral.appraisalStatus === "Истекает" || collateral.insuranceStatus !== "Оплачена").length
    };
  }).sort((a, b) => b.pledge - a.pledge);
  const reportIndexRows = [
    { code: "Р-01", object: "Задачи", report: "Задачи и SLA", rows: `${activeTasks.length} активных / ${completedTasks.length} завершенных`, control: `${overdueTasks.length} просрочено, ${todayTasks.length} сегодня`, owner: "Руководитель залогового центра" },
    { code: "Р-02", object: "Исполнители", report: "Нагрузка сотрудников", rows: `${assigneeRows.length} сотрудников`, control: "Очередь, просрочки, приоритет", owner: "Руководитель группы" },
    { code: "Р-03", object: "Договоры", report: "Покрытие кредитных договоров залогом", rows: `${contracts.length} договоров`, control: `${highLtvContracts.length} с риском покрытия`, owner: "Кредитный контроль" },
    { code: "Р-04", object: "Залоги", report: "Залоговый портфель и риск", rows: `${collaterals.length} объектов`, control: `${collaterals.filter((item) => riskTone(item) === "danger").length} критичных`, owner: "Залоговый центр" },
    { code: "Р-05", object: "Страхование", report: "Страховые полисы", rows: `${insuranceRows.length} полисов`, control: `${insuranceExpiring.length} истекает, ${insuranceUnpaid.length} не оплачено`, owner: "Специалист по страхованию" },
    { code: "Р-06", object: "Оценка", report: "Актуальность оценки стоимости", rows: `${collaterals.length} объектов`, control: `${appraisalAttention.length} требуют действия`, owner: "Оценщик / специалист" },
    { code: "Р-07", object: "Мониторинг", report: "График осмотров и мониторинга", rows: `${collaterals.length} объектов`, control: `${monitoringAttention.length} до 7 дней или просрочено`, owner: "Выездные сотрудники" },
    { code: "Р-08", object: "Обременения", report: "Контроль регистрации залога", rows: `${encumbranceRows.length} записей`, control: "Статус регистрации и сумма обременения", owner: "Залоговый центр" }
  ];
  const contractRows = contracts.slice().sort((a, b) => Number(b.ltv || 0) - Number(a.ltv || 0)).map((contract) => {
    const linkedCollaterals = (contract.collateralIds || []).map(getCollateral).filter(Boolean);
    const contractPledge = sumBy(linkedCollaterals, (collateral) => collateral.pledgeValue);
    const ltvTone = Number(contract.ltv || 0) > 100 ? "danger" : Number(contract.ltv || 0) > 80 || contract.coverageStatus !== "Полное" ? "warn" : "ok";
    const control = contract.status !== "Активен"
      ? "Проверить закрытие и снятие обременений"
      : ltvTone === "danger"
        ? "Недостаточное покрытие, требуется решение"
        : ltvTone === "warn"
          ? "Проверить достаточность обеспечения"
          : "Покрытие в норме";
    return { contract, linkedCollaterals, contractPledge, ltvTone, control };
  });
  const detailedCollateralRows = collaterals.slice().sort((a, b) => {
    const toneWeight = { danger: 3, warn: 2, ok: 1 };
    return (toneWeight[riskTone(b)] || 0) - (toneWeight[riskTone(a)] || 0) || Number(b.pledgeValue || 0) - Number(a.pledgeValue || 0);
  });
  const policyRows = insuranceRows.slice().sort((a, b) => {
    const aWeight = matchesInsuranceKpi(a, "unpaid") ? 3 : matchesInsuranceKpi(a, "expiring") ? 2 : 1;
    const bWeight = matchesInsuranceKpi(b, "unpaid") ? 3 : matchesInsuranceKpi(b, "expiring") ? 2 : 1;
    return bWeight - aWeight || Number(a.daysLeft ?? 9999) - Number(b.daysLeft ?? 9999);
  });
  const appraisalRows = collaterals.slice().sort((a, b) => Number(daysUntil(a.appraisalDue) ?? 9999) - Number(daysUntil(b.appraisalDue) ?? 9999));
  const monitoringRows = collaterals.slice().sort((a, b) => Number(daysUntil(a.monitoring?.nextInspection) ?? 9999) - Number(daysUntil(b.monitoring?.nextInspection) ?? 9999));
  const formatDaysControl = (days) => {
    if (days === null) return { label: "Срок не задан", tone: "neutral" };
    if (days < 0) return { label: `${Math.abs(days)} дн. проср.`, tone: "danger" };
    if (days <= 7) return { label: `${days} дн.`, tone: "warn" };
    if (days <= 30) return { label: `${days} дн.`, tone: "info" };
    return { label: `${days} дн.`, tone: "ok" };
  };
  return `
    ${renderPageHeader("Отчеты", "Табличные управленческие отчеты по основным объектам системы: задачам, договорам, залогам, полисам, оценке, мониторингу и обременениям.")}
    <section class="reports-table-stack">
      ${renderReportTable({
        title: "Реестр табличных отчетов",
        note: "операционная дата 18.06.2026",
        columns: ["Код", "Объект системы", "Отчет", "Объем данных", "Контроль", "Ответственный"],
        rows: reportIndexRows.map((row) => [
          reportCell(`<strong>${escapeHtml(row.code)}</strong>`, "report-code-cell"),
          row.object,
          row.report,
          row.rows,
          row.control,
          row.owner
        ])
      })}
      ${renderReportTable({
        title: "Задачи и SLA по типам задач",
        note: "реестр задач, очередь обработки, нормативные сроки",
        columns: ["Тип задачи", "Активные / завершенные", "Просрочки", "Сегодня", "На неделе", "Основной исполнитель"],
        rows: taskTypeRows.map((row) => [
          reportCell(`<strong>${escapeHtml(row.type)}</strong>`),
          reportCell(`${row.active}<br><small>завершено: ${row.completed}</small>`, "num"),
          reportCell(badge(String(row.overdue), row.overdue ? "danger" : "ok"), "num"),
          reportCell(badge(String(row.today), row.today ? "warn" : "ok"), "num"),
          reportCell(badge(String(row.week), row.week ? "info" : "ok"), "num"),
          row.topAssignee
        ])
      })}
      ${renderReportTable({
        title: "Нагрузка исполнителей",
        note: "контроль распределения задач и приоритета",
        columns: ["Исполнитель", "Активные", "Просрочены", "Сегодня", "Приоритет", "Завершено", "Фокус контроля"],
        rows: assigneeRows.map((row) => [
          reportCell(`<strong>${escapeHtml(row.assignee)}</strong>`),
          reportCell(String(row.active), "num"),
          reportCell(badge(String(row.overdue), row.overdue ? "danger" : "ok"), "num"),
          reportCell(badge(String(row.today), row.today ? "warn" : "ok"), "num"),
          reportCell(badge(String(row.priority), row.priority ? "warn" : "ok"), "num"),
          reportCell(String(row.completed), "num"),
          row.focus
        ])
      })}
      ${renderReportTable({
        title: "Договоры и покрытие залогом",
        note: "договоры, долг, залоговая стоимость, LTV",
        columns: ["Договор", "Клиент по договору", "Роль", "Долг", "Залоговая стоимость", "LTV", "Покрытие", "Контроль"],
        rows: contractRows.map(({ contract, linkedCollaterals, contractPledge, ltvTone, control }) => [
          reportCell(`<strong>${escapeHtml(contract.number)}</strong><br><small>${escapeHtml(contract.id)}</small>`),
          contract.clientName,
          getContractPartyRole(contract),
          formatShortMoney(getContractDebtRub(contract)),
          reportCell(`${formatShortMoney(contractPledge || contract.allocatedValue)}<br><small>${linkedCollaterals.length} объектов</small>`),
          reportCell(badge(`${contract.ltv}%`, ltvTone), "num"),
          reportCell(badge(contract.coverageStatus, ltvTone)),
          control
        ])
      })}
      ${renderReportTable({
        title: "Залоговый портфель по видам имущества",
        note: "агрегированный отчет по реестру залогов",
        columns: ["Вид залога", "Объектов", "Рыночная стоимость", "Залоговая стоимость", "Критичные", "Требуют контроля"],
        rows: collateralTypeRows.map((row) => [
          reportCell(`<strong>${escapeHtml(row.type)}</strong>`),
          reportCell(String(row.count), "num"),
          formatShortMoney(row.market),
          formatShortMoney(row.pledge),
          reportCell(badge(String(row.critical), row.critical ? "danger" : "ok"), "num"),
          row.attention ? `${row.attention} объект(ов)` : "Нет срочного контроля"
        ])
      })}
      ${renderReportTable({
        title: "Детальный отчет по объектам залога",
        note: "объект, залогодатель, стоимость, риск, оценка и страхование",
        columns: ["Объект залога", "Залогодатель", "Вид / регион", "Стоимость", "Риск", "Оценка", "Страхование"],
        rows: detailedCollateralRows.map((collateral) => [
          reportCell(`<strong>${escapeHtml(collateral.id)}</strong><br><small>${escapeHtml(collateral.description)}</small>`),
          collateral.clientName,
          reportCell(`${escapeHtml(collateral.type)}<br><small>${escapeHtml(collateral.region)}</small>`),
          reportCell(`${formatShortMoney(collateral.marketValue)}<br><small>залоговая: ${formatShortMoney(collateral.pledgeValue)}</small>`),
          reportCell(badge(getCollateralRiskState(collateral), riskTone(collateral))),
          reportCell(`${badge(collateral.appraisalStatus)}<br><small>до ${escapeHtml(collateral.appraisalDue)}</small>`),
          reportCell(`${badge(collateral.insuranceStatus)}<br><small>до ${escapeHtml(collateral.insuranceDue)}</small>`)
        ])
      })}
      ${renderReportTable({
        title: "Страховые полисы",
        note: "полисы, сроки действия, страховая сумма и оплата премии",
        columns: ["Полис", "Страхователь / объект", "Страховая компания", "Страховая сумма", "Срок действия", "Премия", "Контроль"],
        rows: policyRows.map((row) => {
          const control = matchesInsuranceKpi(row, "unpaid")
            ? "Получить подтверждение оплаты"
            : matchesInsuranceKpi(row, "expiring")
              ? "Проконтролировать продление"
              : "Без срочного действия";
          return [
            reportCell(`<strong>${escapeHtml(row.id)}</strong><br><small>${escapeHtml(row.source)}</small>`),
            reportCell(`${escapeHtml(row.clientName)}<br><small>${escapeHtml(row.collateral.id)} · ${escapeHtml(row.collateral.type)}</small>`),
            row.company,
            formatShortMoney(row.amount),
            reportCell(`${escapeHtml(row.from)} - ${escapeHtml(row.to)}<br><small>${row.daysLeft === null ? "срок не рассчитан" : `${row.daysLeft} дн.`}</small>`),
            reportCell(badge(row.premiumStatus, row.premiumStatus === "Оплачена" ? "ok" : "warn")),
            control
          ];
        })
      })}
      ${renderReportTable({
        title: "Актуальность оценки стоимости",
        note: "оценки, сроки переоценки, оценщики и методики",
        columns: ["Объект", "Последняя оценка", "Оценщик / метод", "Рыночная стоимость", "Залоговая стоимость", "Срок", "Действие"],
        rows: appraisalRows.map((collateral) => {
          const evaluation = collateral.evaluations?.[0] || {};
          const days = formatDaysControl(daysUntil(collateral.appraisalDue));
          const action = days.tone === "danger"
            ? "Срочно запустить переоценку"
            : days.tone === "warn" || days.tone === "info"
              ? "Запланировать переоценку"
              : "По графику";
          return [
            reportCell(`<strong>${escapeHtml(collateral.id)}</strong><br><small>${escapeHtml(collateral.clientName)}</small>`),
            evaluation.date || "-",
            reportCell(`${escapeHtml(evaluation.appraiser || "-")}<br><small>${escapeHtml(evaluation.method || "-")}</small>`),
            formatShortMoney(evaluation.market || collateral.marketValue),
            formatShortMoney(evaluation.pledge || collateral.pledgeValue),
            reportCell(`${badge(collateral.appraisalStatus)}<br><small>${escapeHtml(collateral.appraisalDue)} · ${escapeHtml(days.label)}</small>`),
            action
          ];
        })
      })}
      ${renderReportTable({
        title: "Мониторинг и осмотры",
        note: "график мониторинга, выездные осмотры и связанные задачи",
        columns: ["Объект", "Последний осмотр", "Следующий осмотр", "Исполнитель", "Состояние", "Связанная задача", "Контроль"],
        rows: monitoringRows.map((collateral) => {
          const monitoring = collateral.monitoring || {};
          const days = formatDaysControl(daysUntil(monitoring.nextInspection));
          const linkedTask = activeTasks.find((task) => task.collateralId === collateral.id || task.collateralIds?.includes(collateral.id));
          const control = days.tone === "danger"
            ? "Осмотр просрочен"
            : days.tone === "warn"
              ? "Назначить или подтвердить выезд"
              : "По графику";
          return [
            reportCell(`<strong>${escapeHtml(collateral.id)}</strong><br><small>${escapeHtml(collateral.type)} · ${escapeHtml(collateral.region)}</small>`),
            monitoring.lastInspection || "-",
            reportCell(`${escapeHtml(monitoring.nextInspection || "-")}<br><small>${escapeHtml(days.label)}</small>`),
            monitoring.inspector || "-",
            monitoring.condition || "-",
            linkedTask ? reportCell(`${escapeHtml(linkedTask.id)}<br><small>${escapeHtml(linkedTask.type)}</small>`) : "Нет активной задачи",
            reportCell(badge(control, days.tone))
          ];
        })
      })}
      ${renderReportTable({
        title: "Обременения и регистрация залога",
        note: "контроль зарегистрированных обременений по объектам и договорам",
        columns: ["Обременение", "Объект / залогодатель", "Тип", "Договор", "Сумма", "Выделено / LTV", "Статус"],
        rows: encumbranceRows.map(({ collateral, encumbrance }) => [
          reportCell(`<strong>${escapeHtml(encumbrance.number)}</strong><br><small>${escapeHtml(encumbrance.date)}</small>`),
          reportCell(`${escapeHtml(collateral.id)} · ${escapeHtml(collateral.clientName)}<br><small>${escapeHtml(collateral.description)}</small>`),
          encumbrance.type,
          encumbrance.contract,
          formatShortMoney(encumbrance.amount),
          reportCell(`${formatShortMoney(encumbrance.allocated)}<br><small>LTV ${escapeHtml(encumbrance.ltv)}%</small>`),
          reportCell(badge(encumbrance.status))
        ])
      })}
    </section>
  `;
}

function renderPrintPreview(id) {
  const collateral = getCollateral(id);
  const contract = getContract(id);
  const form = printFormCatalog.find((item) => item.id === id);
  const title = collateral ? `${collateral.id} - ${collateral.description}` : contract ? `Договор ${contract.number}` : form ? form.name : id;
  const description = form
    ? `Этап: ${form.stage}. Владелец: ${form.owner}. Объем: ${form.pages} страниц, ${form.params} параметров.`
    : "Форма содержит реквизиты клиента по договору, договора, объекта залога, стоимости, страхования и истории согласования.";
  const backRoute = form ? "/app/reports" : contract ? "/app/contracts" : "/app/tasks";
  return `${renderPageHeader("Печатная форма", "Демонстрационный предпросмотр документа.", `<button class="btn btn-secondary" data-route="${backRoute}">Назад</button><button class="btn btn-primary" data-action="print">Печать</button>`)}<section class="print-preview"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>`;
}

function renderMobileShell(title, content, subtitle = "") {
  return `
    <section class="mobile-stage">
      <div class="mobile-wrap" role="region" aria-label="${escapeHtml(title)}">
        <div class="phone-speaker"></div>
        <div class="mobile-screen">
          <div class="mobile-header">
            <div>
              <h1>${escapeHtml(title)}</h1>
              ${subtitle ? `<p class="mobile-muted">${escapeHtml(subtitle)}</p>` : ""}
            </div>
          </div>
          <div class="mobile-content">${content}</div>
          <div class="phone-home-indicator"></div>
        </div>
      </div>
    </section>
  `;
}

function getMobileInspectionContactDetails(task, collateral) {
  const organization = collateral?.clientName || task?.client || "Представитель залогодателя";
  const routeContact = task?.clientContact ? `Контакт из маршрута: ${task.clientContact}` : "";
  const detailsByType = {
    "Автотранспорт": {
      name: "Игорь Мельников",
      role: "Механик автопарка",
      phone: "+7 920 555-18-42",
      availability: "Сегодня 14:00-17:00",
      note: "Встречает у КПП, подготовит СТС, ключи и доступ к стоянке."
    },
    "Недвижимость": {
      name: "Ольга Романова",
      role: "Управляющий объектом",
      phone: "+7 495 214-08-77",
      availability: "Сегодня 10:00-18:00",
      note: "Откроет помещения, покажет инженерные зоны и эксплуатационные документы."
    },
    "Скот": {
      name: "Виктор Савельев",
      role: "Заведующий фермой",
      phone: "+7 918 440-27-16",
      availability: "Сегодня 08:00-12:30",
      note: "Проводит к месту содержания, показывает бирки, ветсправки и журнал учета."
    },
    "Оборудование": {
      name: "Станислав Громов",
      role: "Начальник производства",
      phone: "+7 903 771-62-15",
      availability: "Сегодня 11:00-16:00",
      note: "Обеспечит доступ к цеху, серийным номерам и журналу эксплуатации."
    }
  };
  const details = detailsByType[collateral?.type] || {
    name: "Наталья Борисова",
    role: "Представитель залогодателя",
    phone: "+7 916 300-41-09",
    availability: "Сегодня 09:00-16:00",
    note: "Обеспечит доступ к объекту, документам и ответственному за хранение."
  };
  return {
    ...details,
    organization,
    note: routeContact ? `${details.note} ${routeContact}` : details.note
  };
}

function getMobileGeoPosition(collateral) {
  const region = `${collateral?.region || ""} ${collateral?.address || ""}`.toLowerCase();
  if (region.includes("нижн")) return "56.3269, 44.0059 · точность 18 м";
  if (region.includes("моск")) return "55.7558, 37.6173 · точность 16 м";
  if (region.includes("краснодар")) return "45.0355, 38.9753 · точность 22 м";
  if (region.includes("клин")) return "56.3333, 36.7333 · точность 19 м";
  return "55.7512, 37.6184 · точность 25 м";
}

const mobileInspectionFactorCatalog = [
  { code: "access", title: "Доступ к объекту", weight: 20, options: [
    { code: "free", label: "Доступ свободный, объект предъявлен полностью", score: 100 },
    { code: "limited", label: "Доступ частичный, часть зон недоступна", score: 55 },
    { code: "blocked", label: "Доступ не предоставлен", score: 0 }
  ] },
  { code: "technical", title: "Техническое состояние", weight: 20, options: [
    { code: "working", label: "Состояние рабочее, критичных дефектов нет", score: 100 },
    { code: "repair", label: "Есть замечания, требуется текущий ремонт", score: 60 },
    { code: "critical", label: "Состояние неудовлетворительное", score: 15 }
  ] },
  { code: "storage", title: "Условия хранения", weight: 15, options: [
    { code: "proper", label: "Условия хранения соответствуют требованиям", score: 100 },
    { code: "remarks", label: "Есть замечания к хранению", score: 60 },
    { code: "violated", label: "Условия хранения нарушены", score: 10 }
  ] },
  { code: "identity", title: "Соответствие карточке залога", weight: 15, options: [
    { code: "match", label: "Объект соответствует описанию и идентификаторам", score: 100 },
    { code: "minor", label: "Есть несущественные расхождения", score: 65 },
    { code: "major", label: "Есть существенные расхождения", score: 10 }
  ] },
  { code: "documents", title: "Документы на месте", weight: 15, options: [
    { code: "ready", label: "Документы предъявлены и совпадают с данными задачи", score: 100 },
    { code: "partial", label: "Документы предъявлены частично", score: 55 },
    { code: "missing", label: "Документы не предъявлены", score: 0 }
  ] },
  { code: "photos", title: "Фотофиксация", weight: 15, options: [
    { code: "complete", label: "Все обязательные ракурсы доступны", score: 100 },
    { code: "partial", label: "Часть ракурсов недоступна", score: 55 },
    { code: "impossible", label: "Фотофиксация невозможна", score: 0 }
  ] }
];

function getMobileInspectionFactors(collateral) {
  if (collateral?.type === "Автотранспорт") {
    return mobileInspectionFactorCatalog.map((factor) => factor.code === "technical"
      ? { ...factor, title: "Техническое состояние транспорта" }
      : factor.code === "storage"
        ? { ...factor, title: "Условия стоянки и хранения" }
        : factor);
  }
  if (collateral?.type === "Недвижимость") {
    return mobileInspectionFactorCatalog.map((factor) => factor.code === "technical"
      ? { ...factor, title: "Состояние здания / помещений" }
      : factor.code === "storage"
        ? { ...factor, title: "Условия эксплуатации объекта" }
        : factor);
  }
  return mobileInspectionFactorCatalog;
}

function getMobileChecklistResult(task, collateral) {
  const answers = task?.mobileChecklistAnswers?.[collateral?.id] || {};
  const factors = getMobileInspectionFactors(collateral).map((factor) => {
    const selected = factor.options.find((option) => option.code === answers[factor.code]) || null;
    const weightedScore = selected ? selected.score * (factor.weight / 100) : 0;
    return { ...factor, selected, weightedScore };
  });
  const completed = factors.filter((factor) => factor.selected).length;
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.weightedScore, 0));
  if (completed < factors.length) {
    return { factors, completed, total: factors.length, score, state: completed ? "Заполняется" : "Не заполнен", tone: "warn" };
  }
  if (score >= 85) return { factors, completed, total: factors.length, score, state: "Хорошее", tone: "ok" };
  if (score >= 65) return { factors, completed, total: factors.length, score, state: "Есть замечания", tone: "warn" };
  if (score >= 40) return { factors, completed, total: factors.length, score, state: "Требуется контроль", tone: "warn" };
  return { factors, completed, total: factors.length, score, state: "Критичное", tone: "danger" };
}

function getMobileInspectionComment(task, collateral) {
  return task?.mobileInspectionComments?.[collateral?.id] || "";
}

function renderMobileContactCard(task, collateral) {
  const contact = getMobileInspectionContactDetails(task, collateral);
  return `
    <div class="mobile-contact-card">
      <span class="mobile-kicker">Контакт на месте</span>
      <h3>${escapeHtml(contact.name)}</h3>
      <p>${escapeHtml(contact.role)} · ${escapeHtml(contact.organization)}</p>
      <a class="mobile-contact-phone" href="tel:${escapeHtml(contact.phone.replaceAll(" ", ""))}">${escapeHtml(contact.phone)}</a>
      <div class="mobile-contact-grid">
        <div><span>Окно встречи</span><strong>${escapeHtml(contact.availability)}</strong></div>
        <div><span>Инструкция</span><strong>${escapeHtml(contact.note)}</strong></div>
      </div>
      <button class="btn btn-secondary" data-action="mobile-call-contact" data-phone="${escapeHtml(contact.phone)}">Позвонить контакту</button>
    </div>
  `;
}

function renderMobileEmployeeChecklist(task, collateral, checklist) {
  return `
    <div class="mobile-section mobile-checklist-summary">
      <div class="mobile-section-head">
        <h3>Чек-лист выездного осмотра</h3>
        ${badge(`${checklist.score} баллов`, checklist.tone)}
      </div>
      <div class="mobile-check-form">
        ${checklist.factors.map((factor) => `
          <label class="mobile-check-field">
            <span><strong>${escapeHtml(factor.title)}</strong><small>Вес ${factor.weight}%</small></span>
            <select data-mobile-check-factor data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(collateral?.id || "")}" data-factor="${escapeHtml(factor.code)}">
              <option value="">Выберите результат</option>
              ${factor.options.map((option) => `<option value="${escapeHtml(option.code)}" ${factor.selected?.code === option.code ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
        `).join("")}
      </div>
      <div class="mobile-check-result">
        <div><span>Результат осмотра</span><strong>${escapeHtml(checklist.state)}</strong></div>
        <b>${checklist.completed}/${checklist.total}</b>
      </div>
      <label class="mobile-comment-field">
        <span>Комментарий сотрудника</span>
        <textarea data-mobile-inspection-comment data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(collateral?.id || "")}" placeholder="Например: доступ предоставлен через представителя, требуется повторно запросить фото складской зоны.">${escapeHtml(getMobileInspectionComment(task, collateral))}</textarea>
      </label>
    </div>
  `;
}

function renderMobileInspectionSubmitActions(task, collateral, checklist) {
  const sentAt = task.mobileResult?.sentAt || "";
  const savedAt = task.mobileDraft?.savedAt || "";
  const status = sentAt
    ? `Передано в основной модуль: ${sentAt}`
    : savedAt
      ? `Черновик сохранен: ${savedAt}`
      : "Данные еще не сохранены";
  return `
    <div class="mobile-submit-panel">
      <div class="mobile-submit-status">
        <span>Статус передачи</span>
        <strong>${escapeHtml(status)}</strong>
        <small>Чек-лист заполнен: ${checklist.completed}/${checklist.total}, текущий балл: ${checklist.score}</small>
      </div>
      <div class="mobile-submit-actions">
        <button class="btn btn-secondary" data-action="mobile-save-inspection" data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(collateral?.id || "")}">Сохранить</button>
        <button class="btn btn-primary" data-action="mobile-submit-inspection" data-task="${escapeHtml(task.id)}" data-collateral="${escapeHtml(collateral?.id || "")}">${sentAt ? "Отправить повторно" : "Отправить"}</button>
      </div>
    </div>
  `;
}

function renderMobileEmployeeTaskCard(task) {
  const collateral = getCollateral(task.collateralId);
  const collaterals = getTaskCollaterals(task);
  const progress = getMobileInspectionProgress(task, collateral);
  const address = collateral?.address || "Адрес не указан";
  return `
    <article class="mobile-card mobile-task-card">
      <div class="mobile-card-top">
        <div>
          <span class="mobile-kicker">${escapeHtml(task.id)} · ${escapeHtml(task.type)}</span>
          <h2>${escapeHtml(task.title)}</h2>
        </div>
        ${badge(task.priority || "Обычный", badgeTone(task.priority || ""))}
      </div>
      <p>${escapeHtml(collateral?.description || "Объект залога не указан")}</p>
      <div class="mobile-card-grid">
        <div><span>Клиент по договору / залогодатель</span><strong>${escapeHtml(getTaskClientSummary(task, collaterals))}</strong></div>
        <div><span>Дата выезда</span><strong>${escapeHtml(task.dueDate || "-")}</strong></div>
        <div class="wide"><span>Адрес</span><strong>${escapeHtml(address)}</strong></div>
      </div>
      <div class="mobile-card-meta">
        <span>${escapeHtml(collateral?.id || task.collateralId || "-")}</span>
        ${badge(`${progress.done}/${progress.total} фото`, progress.done === progress.total ? "ok" : "warn")}
      </div>
      <div class="mobile-actions">
        <button class="btn btn-primary" data-route="/mobile/employee/tasks/${task.id}/photos">Открыть задачу</button>
      </div>
    </article>
  `;
}

function renderMobileEmployeeTasks() {
  const tasks = state.data.tasks
    .filter((task) => task.mobileKind === "employeeInspection" || task.type === "Выездной осмотр" || (isInspectionTaskType(task.type) && task.route?.includes("Выездной сотрудник")))
    .slice(0, 8);
  const content = `<div class="mobile-list">${tasks.length
    ? tasks.map(renderMobileEmployeeTaskCard).join("")
    : `<article class="mobile-card detail"><h2>Задач нет</h2><p>Создайте задачу на выездной осмотр из маршрута основного осмотра.</p></article>`}</div>`;
  return renderMobileShell("Мобильный осмотр", content, "Задачи выездного сотрудника");
}

function renderMobilePhotos(taskId) {
  const task = getTask(taskId) || state.data.tasks.find((item) => isInspectionTaskType(item.type)) || state.data.tasks[0];
  const collateral = getCollateral(task.collateralId);
  const angles = getCollateralPhotoAngles(collateral);
  const mobileChecklist = getMobileChecklistResult(task, collateral);
  const content = `
    <div class="mobile-photo-toolbar"><button class="btn btn-secondary" data-route="/mobile/employee/tasks">Назад</button></div>
    <div class="mobile-section mobile-object-summary">
      <div class="mobile-section-head">
        <span class="mobile-kicker">${escapeHtml(task.id)} · ${escapeHtml(task.type)}</span>
        ${badge(mobileChecklist.state, mobileChecklist.tone)}
      </div>
      <h2>${escapeHtml(collateral?.description || "Объект залога")}</h2>
      <div class="mobile-card-grid">
        <div><span>ID залога</span><strong>${escapeHtml(collateral?.id || "-")}</strong></div>
        <div><span>Договор</span><strong>${escapeHtml(task.contractId || "-")}</strong></div>
        <div class="wide"><span>Адрес залога</span><strong>${escapeHtml(collateral?.address || "Адрес не указан")}</strong></div>
        <div><span>Геопозиция</span><strong>${escapeHtml(getMobileGeoPosition(collateral))}</strong></div>
      </div>
    </div>
    ${renderMobileContactCard(task, collateral)}
    ${renderMobileEmployeeChecklist(task, collateral, mobileChecklist)}
    <div class="mobile-section photo-wizard-section">
      <h3>Фото снимки объекта залога</h3>
      <div class="photo-wizard">${angles.map((angle) => {
        const photo = getMobilePhotoValue(task.id, collateral?.id || "", angle);
        return `<div class="photo-step ${photo ? "done" : ""}"><strong>${escapeHtml(angle)}</strong><span>${escapeHtml(photo?.name || "Фото не сделано")}</span><button class="btn btn-primary" data-action="mobile-take-photo" data-task="${task.id}" data-collateral="${collateral?.id || ""}" data-angle="${escapeHtml(angle)}">${photo ? "Переснять" : "Сделать фото"}</button></div>`;
      }).join("")}</div>
    </div>
    ${renderMobileInspectionSubmitActions(task, collateral, mobileChecklist)}
  `;
  return renderMobileShell("Фото осмотра", content, "Выездной сотрудник");
}

function renderCollateralRegistryPickerModal() {
  const search = state.modal.search || "";
  const selected = new Set(state.newTask.selectedCollateralIds);
  const rows = state.data.collaterals.filter((item) => {
    const haystack = [item.id, item.type, item.description, item.address, item.clientName, item.clientId, item.gsz].join(" ");
    return matches(haystack, search);
  });
  return `
    <div class="modal-backdrop">
      <section class="modal wide">
        <div class="modal-head"><h2>Выбрать из реестра залогов</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
        <div class="task-pool-search">
          <label>Поиск по ID, залогодателю, адресу, ГСЗ или типу<input value="${escapeHtml(search)}" data-modal-collateral-search></label>
          <span>${rows.length} объектов найдено</span>
        </div>
        <div class="table-wrap collateral-picker-table">
          <table>
            <thead><tr><th></th><th>ID</th><th>Тип</th><th>Объект</th><th>Залогодатель</th><th>ГСЗ</th><th>Залоговая стоимость</th><th>Риск</th></tr></thead>
            <tbody>${rows.map((item) => `
              <tr>
                <td><input type="checkbox" data-modal-collateral-choice="${escapeHtml(item.id)}" ${selected.has(item.id) ? "checked" : ""}></td>
                <td><strong>${escapeHtml(item.id)}</strong></td>
                <td>${escapeHtml(item.type)}</td>
                <td>${escapeHtml(item.description)}<br><small>${escapeHtml(item.address)}</small></td>
                <td>${escapeHtml(item.clientName)}<br><small>${escapeHtml(item.clientId)}</small></td>
                <td>${escapeHtml(item.gsz)}</td>
                <td>${formatMoney(item.pledgeValue || 0)}</td>
                <td>${badge(getCollateralRiskState(item), riskTone(item))}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        </div>
        <div class="modal-actions"><button class="btn btn-primary" data-action="submit-collateral-picker">Добавить выбранные</button></div>
      </section>
    </div>
  `;
}

function renderNewCollateralModal() {
  const types = [...new Set(state.data.collaterals.map((item) => item.type))];
  const contracts = state.data.contracts;
  const nextId = getNextCollateralId();
  return `
    <div class="modal-backdrop">
      <section class="modal wide">
        <div class="modal-head"><h2>Добавить объект залога</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
        <div class="form-grid">
          <label>Идентификатор объекта залога<input id="newCollateralId" value="${escapeHtml(nextId)}" required></label>
          <label>Тип залога<select id="newCollateralType">${types.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select></label>
          <label>Договор<select id="newCollateralContract"><option value="">Не выбран</option>${contracts.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.number)} - ${escapeHtml(item.clientName)}</option>`).join("")}</select></label>
          <label>Наименование/ФИО залогодателя<input id="newCollateralClient" value="ООО Нью Пласт"></label>
          <label>ИНН залогодателя<input id="newCollateralClientId" value="5259555771"></label>
          <label>ГСЗ<input id="newCollateralGsz" value="ГСЗ Нью Пласт"></label>
          <label>Полный адрес / место хранения<input id="newCollateralAddress" value="Московская область, г. Клин, промышленная зона, склад 7"></label>
        </div>
        <label>Описание объекта<textarea id="newCollateralDescription">Линия термопластавтоматов Haitian Mars II, 2024 год выпуска, комплект пресс-форм и шкаф управления.</textarea></label>
        <div class="modal-actions"><button class="btn btn-primary" data-action="submit-new-collateral">Добавить в задачу</button></div>
      </section>
    </div>
  `;
}

function renderImportCollateralsModal() {
  const rows = state.modal.fileLoaded ? (state.data.importRows || []) : [];
  const isTaskContext = state.modal.context === "taskCreate";
  return `
    <div class="modal-backdrop">
      <section class="modal wide">
        <div class="modal-head"><h2>Загрузка объектов залога из таблицы</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
        <p class="hint">${isTaskContext ? "Корректные строки будут добавлены в пул объектов создаваемой задачи." : "Имитация загрузки Excel: строки проверены, часть объектов готова к созданию или обновлению."}</p>
        <label class="import-file-drop">Excel-файл<input type="file" accept=".xlsx,.xls" data-import-file></label>
        ${rows.length ? `<table>
            <thead><tr><th>Строка</th><th>ID залога</th><th>Тип</th><th>Владелец</th><th>Договор</th><th>Статус</th><th>Комментарий</th></tr></thead>
            <tbody>${rows.map((row) => `<tr><td>${row.row}</td><td>${escapeHtml(row.collateralId || "-")}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.owner)}</td><td>${escapeHtml(row.contract)}</td><td>${badge(row.status, row.status === "Ошибка" ? "danger" : row.status === "Создать" ? "ok" : "warn")}</td><td>${escapeHtml(row.message)}</td></tr>`).join("")}</tbody>
          </table>`
        : `<div class="empty-state import-empty-state"><h2>Файл не загружен</h2><p>Выберите Excel-файл, после этого здесь появится предварительная проверка строк.</p></div>`}
        <div class="modal-actions"><button class="btn btn-primary" data-action="confirm-import" ${rows.length ? "" : "disabled"}>Загрузить корректные строки</button></div>
      </section>
    </div>
  `;
}

function renderMobileInspectionModal() {
  const parent = getTask(state.modal.parentTaskId);
  const collaterals = getTaskCollaterals(parent);
  const active = getTaskActiveCollateral(parent, collaterals) || collaterals[0];
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <div class="modal-head"><h2>Создать задачу на выездной осмотр</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
        <div class="form-grid">
          <label>Основная задача<input value="${escapeHtml(parent?.id || "")}" readonly></label>
          <label>Объект залога<select id="mobileInspectionCollateral">
            ${collaterals.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === active?.id ? "selected" : ""}>${escapeHtml(item.id)} - ${escapeHtml(item.description)}</option>`).join("")}
          </select></label>
          <label>Выездной сотрудник<select id="mobileInspectionAssignee">${employees.map((item) => `<option ${item === "Алексей Соколов" ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>
          <label>Плановый срок<input id="mobileInspectionDue" type="date" value="2026-06-21"></label>
          <label>Канал выполнения<select id="mobileInspectionChannel">
            <option>Мобильный АРМ сотрудника</option>
            <option>Мобильный АРМ аутсорсера</option>
          </select></label>
        </div>
        <label>Комментарий<textarea id="mobileInspectionComment">Необходимо выполнить выездной осмотр и приложить фото по обязательным ракурсам.</textarea></label>
        <div class="modal-actions"><button class="btn btn-primary" data-action="submit-mobile-inspection-task">Создать</button></div>
      </section>
    </div>
  `;
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal.type === "reassign") return renderReassignModal();
  if (state.modal.type === "approver") return renderApproverModal();
  if (state.modal.type === "followup") {
    const isInspection = isInspectionTaskType(state.modal.taskType);
    const title = isInspection ? "Создать задачу на осмотр" : "Создать задачу на оценку";
    return `
      <div class="modal-backdrop">
        <section class="modal">
          <div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
          <div class="form-grid">
            <label>Исполнитель<select id="followupAssignee">${employees.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select></label>
            <label>Срок<input id="followupDue" type="date" value="2026-06-24"></label>
          </div>
          <label>Комментарий<textarea id="followupComment">${escapeHtml(`${title} создана из маршрута ${state.modal.parentTaskId}.`)}</textarea></label>
          <div class="modal-actions"><button class="btn btn-primary" data-action="submit-followup">Создать</button></div>
        </section>
      </div>
    `;
  }
  if (state.modal.type === "mobileInspection") return renderMobileInspectionModal();
  if (state.modal.type === "import") return renderImportCollateralsModal();
  if (state.modal.type === "collateralPicker") return renderCollateralRegistryPickerModal();
  if (state.modal.type === "newCollateral") return renderNewCollateralModal();
	  return "";
	}

function renderReassignModal() {
  const task = getTask(state.modal.taskId);
  if (!task) return "";
  const assignees = [...new Set([task.assignee, ...employees].filter(Boolean))];
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <div class="modal-head"><h2>Переназначить задачу</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
        <div class="form-grid">
          <label>Задача<input value="${escapeHtml(task.id)}" readonly></label>
          <label>Текущий исполнитель<input value="${escapeHtml(task.assignee || "-")}" readonly></label>
          <label>Новый исполнитель<select id="reassignAssignee">
            ${assignees.map((item) => `<option ${item === task.assignee ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select></label>
        </div>
        <label>Комментарий<textarea id="reassignComment">Переназначение задачи руководителем.</textarea></label>
        <div class="modal-actions"><button class="btn btn-primary" data-action="submit-reassign" data-task="${escapeHtml(task.id)}">Переназначить</button></div>
      </section>
    </div>
  `;
}

function renderApproverModal() {
  const task = getTask(state.modal.taskId);
  if (!task) return "";
  const approvers = getApproverOptions(task);
  const selected = task.approval?.approver || approvers[0] || "";
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <div class="modal-head"><h2>Добавить согласующего</h2><button class="btn btn-secondary" data-action="close-modal">Закрыть</button></div>
        <div class="form-grid">
          <label>Задача<input value="${escapeHtml(task.id)}" readonly></label>
          <label>Согласующий<select id="approverUser">
            ${approvers.map((item) => `<option ${item === selected ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select></label>
        </div>
        <label>Комментарий<textarea id="approverComment">${escapeHtml(task.approval?.comment || "Прошу согласовать результат обработки задачи.")}</textarea></label>
        <div class="modal-actions"><button class="btn btn-primary" data-action="confirm-approver" data-task="${escapeHtml(task.id)}">Подтвердить</button></div>
      </section>
    </div>
  `;
}

function renderToasts() {
  return `<div class="toast-stack">${state.toasts.map((toast) => `<div class="toast ${toast.tone || ""}"><strong>${escapeHtml(toast.title)}</strong><span>${escapeHtml(toast.text || "")}</span></div>`).join("")}</div>`;
}

function addToast(title, text = "", tone = "") {
  const id = Date.now() + Math.random();
  state.toasts.push({ id, title, text, tone });
  render();
  setTimeout(() => {
    state.toasts = state.toasts.filter((toast) => toast.id !== id);
    render();
  }, 2600);
}

function updateCollateralMonitoringField(fieldEl) {
  const collateral = getCollateral(fieldEl.dataset.collateral);
  const field = fieldEl.dataset.monitoringField;
  if (!collateral || !field) return;
  collateral.monitoring = collateral.monitoring || {};
  collateral.monitoring[field] = fieldEl.value;
  if (field === "nextInspection") {
    const planned = collateral.monitoring.schedule?.find((item) => item.status === "Запланирован");
    if (planned) planned.date = fieldEl.value;
  }
}

function createTask(payload) {
  const id = `TSK-2026-${String(1200 + state.data.tasks.length).padStart(4, "0")}`;
  const taskType = getUnifiedTaskType(payload.type);
  const collateral = getCollateral(payload.collateralId);
  const contract = getContract(payload.contractId || collateral?.contractIds?.[0]);
  const task = {
    id,
    type: taskType,
    title: payload.title || `${taskType} по объекту ${payload.collateralId}`,
    collateralId: payload.collateralId,
    collateralIds: payload.collateralIds?.length > 1 ? payload.collateralIds : undefined,
    contractId: contract?.id,
    client: contract?.clientName || collateral?.clientName || "Участник не указан",
    assignee: payload.assignee || employees[0],
    status: "Назначена",
    dueDate: payload.dueDate || "2026-06-24",
    createdAt: "2026-06-17",
    sla: "Норма",
    priority: payload.priority || "Средний",
    source: payload.source || "Вручную",
    route: payload.route || ["Специалист", "Руководитель"],
    result: payload.comment || "Задача создана пользователем",
    documents: payload.documents || [],
    history: [{ date: "2026-06-17 20:40", user: getRole().user, action: "Создана задача", status: "Назначена", comment: payload.comment || "Создано из прототипа" }]
  };
  if (payload.status) task.status = payload.status;
  if (payload.parentTaskId) task.parentTaskId = payload.parentTaskId;
  if (payload.mobileKind) task.mobileKind = payload.mobileKind;
  if (payload.clientContact) task.clientContact = payload.clientContact;
  state.data.tasks.unshift(task);
  persistTaskState();
  return task;
}

document.addEventListener("click", (event) => {
  const routeEl = event.target.closest("[data-route]");
  if (routeEl) {
    window.location.hash = routeEl.dataset.route;
    return;
  }
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === "change-role") return;
  if (action === "reset-filters") {
    const scope = actionEl.dataset.scope;
    state.pendingScrollRestore = { top: window.scrollY, left: window.scrollX };
    state.filters[scope] = Object.fromEntries(Object.keys(state.filters[scope]).map((key) => [key, key === "status" && scope === "contracts" ? "Активен" : ""]));
    if (state.visualFilters[scope]) state.visualFilters[scope] = Object.fromEntries(Object.keys(state.visualFilters[scope]).map((key) => [key, ""]));
    state.pendingRegistryFocus = "";
  }
  if (action === "visual-filter") {
    const scope = actionEl.dataset.scope;
    const filter = actionEl.dataset.filter;
    const value = actionEl.dataset.value;
    if (state.visualFilters[scope]) state.visualFilters[scope][filter] = state.visualFilters[scope][filter] === value ? "" : value;
    state.pendingRegistryFocus = scope;
  }
  if (action === "task-risk-row") {
    const type = actionEl.dataset.type || "";
    const isSameSlice = state.visualFilters.tasks.type === type && !state.visualFilters.tasks.urgency;
    state.visualFilters.tasks.type = isSameSlice ? "" : type;
    state.visualFilters.tasks.urgency = "";
    state.pendingRegistryFocus = "tasks";
  }
  if (action === "registry-kpi") {
    applyRegistryKpiFilter(actionEl.dataset.scope, actionEl.dataset.filter, actionEl.dataset.value || "");
  }
  if (action === "task-assignee-filter") {
    const value = actionEl.dataset.value || "";
    state.filters.tasks.assignee = state.filters.tasks.assignee === value ? "" : value;
    state.pendingRegistryFocus = "tasks";
  }
  if (action === "task-registry-tab") {
    state.taskRegistryTab = actionEl.dataset.tab || "mine";
  }
  if (action === "collateral-tab") {
    updateCollateralTabRoute(actionEl.dataset.tab);
    return;
  }
  if (action === "select-task-collateral") state.taskActiveCollateral[actionEl.dataset.task] = actionEl.dataset.collateral;
  if (action === "task-defer") deferTask(actionEl.dataset.task);
  if (action === "task-return") returnTaskToPreviousAssignee(actionEl.dataset.task);
  if (action === "task-complete") completeTask(actionEl.dataset.task);
  if (action === "open-reassign") state.modal = { type: "reassign", taskId: actionEl.dataset.task };
  if (action === "submit-reassign") submitTaskReassign(actionEl.dataset.task);
  if (action === "add-approver") state.modal = { type: "approver", taskId: actionEl.dataset.task };
  if (action === "confirm-approver") confirmTaskApprover(actionEl.dataset.task);
  if (action === "create-followup-task") openFollowup(actionEl.dataset.task, actionEl.dataset.taskType);
  if (action === "submit-followup") submitFollowup();
  if (action === "open-mobile-inspection-task") openMobileInspectionTask(actionEl.dataset.task);
  if (action === "submit-mobile-inspection-task") submitMobileInspectionTask();
  if (action === "mobile-call-contact") addToast("Набор контакта на месте", actionEl.dataset.phone || "Телефон не указан", "info");
  if (action === "mobile-save-inspection") saveMobileInspectionDraft(actionEl.dataset.task, actionEl.dataset.collateral);
  if (action === "mobile-submit-inspection") submitMobileInspectionResult(actionEl.dataset.task, actionEl.dataset.collateral);
  if (action === "close-modal") state.modal = null;
  if (action === "open-collateral-registry-picker") state.modal = { type: "collateralPicker", search: "" };
  if (action === "open-new-collateral-form") state.modal = { type: "newCollateral" };
  if (action === "submit-collateral-picker") submitCollateralPicker();
  if (action === "submit-new-collateral") submitNewCollateral();
  if (action === "generate-task-conclusion") generateConclusion(actionEl.dataset.task);
  if (action === "send-abs") addToast("Передано в АБС ЦФТ", "Статус обмена: успешно.", "ok");
  if (action === "search-analogs") addToast("Аналоги обновлены", "Найдены 3 сопоставимых объекта.", "ok");
  if (action === "recalculate-valuation") addToast("Расчет обновлен", `Стоимость пересчитана по объекту ${actionEl.dataset.collateral || ""}.`, "ok");
  if (action === "attach-task-photo") attachPhoto(actionEl.dataset.task, actionEl.dataset.collateral, actionEl.dataset.angle);
  if (action === "mobile-take-photo") attachMobilePhoto(actionEl.dataset.task, actionEl.dataset.collateral, actionEl.dataset.angle);
  if (action === "refresh-external") addToast("Внешние данные обновлены", actionEl.dataset.collateral || "", "ok");
  if (action === "refresh-external-source") addToast("Запрос отправлен", `${actionEl.dataset.source || "Источник"} · ${actionEl.dataset.collateral || ""}`, "ok");
  if (action === "delete-document") deleteDocument(actionEl.dataset);
  if (action === "risk-rule") addToast("Контрольное правило", `${actionEl.dataset.rule}: проверка выполнена по данным карточки залога.`, "info");
  if (action === "save-monitoring") {
    document.querySelectorAll(`[data-monitoring-field][data-collateral="${actionEl.dataset.collateral}"]`).forEach(updateCollateralMonitoringField);
    addToast("Настройки мониторинга сохранены", actionEl.dataset.collateral, "ok");
  }
  if (action === "open-import-collaterals") state.modal = { type: "import", fileLoaded: false };
  if (action === "open-task-import-collaterals") state.modal = { type: "import", context: "taskCreate", fileLoaded: false };
  if (action === "confirm-import") submitImportCollaterals();
  if (action === "run-integration-sync") addToast("Интеграция запущена", actionEl.dataset.integration || "Источник", "ok");
  if (action === "bulk-revaluation-action") handleListRevaluationAction(actionEl);
  if (action === "report-export") addToast("Отчет сформирован", "Файл подготовлен в демо-режиме.", "ok");
  if (action === "print") window.print();
  if (action === "create-task-submit") submitNewTask();
  render();
});

document.addEventListener("input", (event) => {
  const mobileComment = event.target.closest("[data-mobile-inspection-comment]");
  if (mobileComment) {
    updateMobileInspectionComment(mobileComment);
    return;
  }
  const marketAdjustment = event.target.closest("[data-market-adjustment]");
  if (marketAdjustment) {
    updateMarketAdjustment(marketAdjustment);
    return;
  }
  const valuationMethod = event.target.closest("[data-valuation-method-value], [data-valuation-method-weight]");
  if (valuationMethod) {
    recalculateIndependentValuationPanel(valuationMethod);
    return;
  }
  const filter = event.target.closest("[data-filter-scope]");
  if (filter) {
    updateRegistryFilter(filter);
    if (isTextRegistryFilter(filter)) scheduleRegistryFilterRender(filter);
    else render();
    return;
  }
	  const expert = event.target.closest("[data-task-expert]");
	  if (expert) {
	    const task = getTask(expert.dataset.task);
	    if (task) task[expert.dataset.taskExpert] = expert.value;
	  }
  const modalSearch = event.target.closest("[data-modal-collateral-search]");
  if (modalSearch && state.modal?.type === "collateralPicker") {
    state.modal.search = modalSearch.value;
    render();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-mobile-check-factor]")) {
    rememberMobileScrollPosition(event.target);
    updateMobileChecklistFactor(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-inspection-factor]")) {
    updateTaskInspectionFactor(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-valuation-risk-factor]")) {
    updateTaskValuationRiskFactor(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-list-revaluation-field]")) {
    updateListRevaluationField(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-list-revaluation-type-discount]")) {
    updateListRevaluationTypeDiscount(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-list-revaluation-row-value]")) {
    updateListRevaluationRowValue(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-list-revaluation-row]")) {
    toggleListRevaluationRow(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-list-revaluation-excel-file]")) {
    attachListRevaluationExcelFromInput(event.target);
    render();
    return;
  }
  if (event.target.matches("[data-new-task-field]")) {
    state.newTask[event.target.dataset.newTaskField] = event.target.value;
    render();
    return;
  }
  if (event.target.matches("[data-import-file]")) {
    state.modal = { ...(state.modal || {}), fileLoaded: Boolean(event.target.files?.length || event.target.value) };
    addToast("Файл загружен", "Выполнена предварительная проверка строк Excel.", "ok");
    render();
    return;
  }
  if (event.target.matches("[data-action='change-role']")) {
    state.roleId = event.target.value;
    rememberSelectedRole(state.roleId);
    const role = getRole();
    state.taskRegistryTab = role.permissions.reassign || role.permissions.reports ? "all" : "mine";
    if (role.menu.includes("mobileEmployee")) window.location.hash = "/mobile/employee/tasks";
    else window.location.hash = "/app/tasks";
    render();
  }
  if (event.target.matches("[data-filter-scope]")) {
    if (registryFilterRenderTimer) {
      clearTimeout(registryFilterRenderTimer);
      registryFilterRenderTimer = null;
    }
    updateRegistryFilter(event.target);
    state.pendingScrollRestore = { top: window.scrollY, left: window.scrollX };
    render();
  }
  if (event.target.matches("[data-doc-file]")) {
    attachDocument(event.target.dataset.docFile, event.target.files?.[0]?.name);
  }
  if (event.target.matches("[data-task-expert-file]")) {
    attachTaskExpertFile(event.target.dataset.taskExpertFile, event.target.files?.[0]?.name);
  }
  if (event.target.matches("[data-task-photo-file]")) {
    const [taskId, collateralId, angle] = event.target.dataset.taskPhotoFile.split("::");
    attachPhoto(taskId, collateralId, angle, event.target.files?.[0]?.name);
  }
});

function formatTaskHistoryDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addTaskHistoryEvent(task, event = {}) {
  if (!task) return;
  const {
    action,
    status = task.status,
    comment = "",
    date = formatTaskHistoryDate(),
    user = getRole().user
  } = event;
  if (!action) return;
  task.history = task.history || [];
  task.history.unshift({
    date,
    user,
    action,
    status,
    comment
  });
  persistTaskState();
}

function deferTask(taskId) {
  const task = getTask(taskId);
  if (!task || isTaskClosed(task)) return;
  task.status = "Отложена";
  addTaskHistoryEvent(task, {
    action: "Задача отложена",
    status: task.status,
    comment: "Задача переведена в отложенные."
  });
  addToast("Задача отложена", taskId, "warn");
}

function completeTask(taskId) {
  const task = getTask(taskId);
  if (!task || isTaskClosed(task)) return;
  if (shouldSendTaskToApprover(task)) {
    sendTaskToApprover(task);
    return;
  }
  if (task.approval?.approver && task.assignee === task.approval.approver) {
    task.approval.status = "Согласовано";
    task.approval.completedAt = formatTaskHistoryDate();
  }
  task.status = "Завершена";
  addTaskHistoryEvent(task, {
    action: "Задача завершена",
    status: task.status,
    comment: task.approval?.approver ? "Задача согласована и переведена в статус Завершена." : "Задача переведена в статус Завершена."
  });
  addToast("Задача завершена", `${taskId}: Завершена`, "ok");
}

function shouldSendTaskToApprover(task) {
  return Boolean(task.approval?.approver && task.approval.status !== "На согласовании" && task.approval.status !== "Согласовано" && task.assignee !== task.approval.approver);
}

function sendTaskToApprover(task) {
  const previousAssignee = task.assignee || "-";
  task.assignee = task.approval.approver;
  task.status = "На согласовании";
  task.approval.status = "На согласовании";
  task.approval.sentAt = formatTaskHistoryDate();
  addTaskHistoryEvent(task, {
    action: "Задача передана на согласование",
    status: task.status,
    comment: `Согласующий: ${task.approval.approver}. Предыдущий исполнитель: ${previousAssignee}. Комментарий: ${task.approval.comment || "-"}`
  });
  addToast("Задача передана согласующему", `${task.id}: ${task.approval.approver}`, "warn");
}

function returnTaskToPreviousAssignee(taskId) {
  const task = getTask(taskId);
  const role = getRole();
  if (!task || isTaskClosed(task) || !isTaskApprover(role, task)) return;
  const previousAssignee = getPreviousTaskAssignee(task, role);
  const oldAssignee = task.assignee || "-";
  task.status = "На доработке";
  if (previousAssignee) task.assignee = previousAssignee;
  addTaskHistoryEvent(task, {
    action: "Задача возвращена",
    status: task.status,
    comment: `Возврат на предыдущего исполнителя: ${oldAssignee} -> ${task.assignee || "-"}`
  });
  addToast("Задача возвращена", `${taskId}: ${task.assignee || "исполнитель не определен"}`, "warn");
}

function getPreviousTaskAssignee(task, role) {
  if (task.assignee && task.assignee !== role.user) return task.assignee;
  const historyUser = [...(task.history || [])]
    .reverse()
    .map((event) => event.user)
    .find((user) => employees.includes(user) && user !== role.user);
  return historyUser || employees.find((employee) => employee !== role.user) || task.assignee || "";
}

function submitTaskReassign(taskId) {
  const task = getTask(taskId);
  const role = getRole();
  if (!task || !isManagerRole(role) || isTaskClosed(task)) return;
  const assignee = document.getElementById("reassignAssignee")?.value || task.assignee;
  const comment = document.getElementById("reassignComment")?.value || "Переназначение задачи руководителем.";
  const oldAssignee = task.assignee || "-";
  task.assignee = assignee;
  addTaskHistoryEvent(task, {
    action: "Задача переназначена",
    status: task.status,
    comment: `Исполнитель: ${oldAssignee} -> ${assignee}. ${comment}`
  });
  state.modal = null;
  addToast("Задача переназначена", `${taskId}: ${assignee}`, "ok");
}

function confirmTaskApprover(taskId) {
  const task = getTask(taskId);
  if (!task || isTaskClosed(task)) return;
  const approver = document.getElementById("approverUser")?.value || getApproverOptions(task)[0] || "";
  const comment = document.getElementById("approverComment")?.value || "";
  if (!approver) return;
  task.approval = {
    approver,
    comment,
    status: "Ожидает передачи",
    addedBy: getRole().user,
    addedAt: formatTaskHistoryDate()
  };
  task.route = [...new Set([...(task.route || []), "Согласующий"])];
  addTaskHistoryEvent(task, {
    action: "Добавлен согласующий",
    status: task.status,
    comment: `Добавлен согласующий ${approver}. ${comment}`
  });
  state.modal = null;
  addToast("Согласующий добавлен", `${taskId}: ${approver}`, "ok");
}

function openFollowup(taskId, taskType) {
  const parent = getTask(taskId);
  if (!parent || isTaskClosed(parent)) return;
  const collaterals = getTaskCollaterals(parent);
  const active = getTaskActiveCollateral(parent, collaterals);
  state.modal = { type: "followup", parentTaskId: taskId, taskType, collateralId: active?.id || parent?.collateralId };
}

function submitFollowup() {
  const parent = getTask(state.modal.parentTaskId);
  if (!parent || isTaskClosed(parent)) return;
  const task = createTask({
    type: state.modal.taskType,
    collateralId: state.modal.collateralId || parent?.collateralId,
    assignee: document.getElementById("followupAssignee")?.value || employees[0],
    dueDate: document.getElementById("followupDue")?.value,
    comment: document.getElementById("followupComment")?.value,
    source: "Маршрут",
    parentTaskId: parent?.id
  });
  if (parent) {
    addTaskHistoryEvent(parent, {
      action: "Создана связанная задача",
      status: parent.status,
      comment: `Создана связанная задача ${task.id}: ${task.type}. Исполнитель: ${task.assignee}.`
    });
  }
  state.modal = null;
  window.location.hash = `/app/tasks/${task.id}`;
  addToast("Связанная задача создана", task.id, "ok");
}

function openMobileInspectionTask(taskId) {
  const parent = getTask(taskId);
  if (!parent || isTaskClosed(parent)) return;
  const collaterals = getTaskCollaterals(parent);
  const active = getTaskActiveCollateral(parent, collaterals);
  state.modal = { type: "mobileInspection", parentTaskId: taskId, collateralId: active?.id || parent?.collateralId };
}

function submitMobileInspectionTask() {
  const parent = getTask(state.modal?.parentTaskId);
  if (!parent || isTaskClosed(parent)) return;
  const collateralId = document.getElementById("mobileInspectionCollateral")?.value || state.modal.collateralId || parent.collateralId;
  const collateral = getCollateral(collateralId);
  const assignee = document.getElementById("mobileInspectionAssignee")?.value || "Алексей Соколов";
  const dueDate = document.getElementById("mobileInspectionDue")?.value || "2026-06-21";
  const channel = document.getElementById("mobileInspectionChannel")?.value || "Мобильный АРМ сотрудника";
  const comment = document.getElementById("mobileInspectionComment")?.value || "";
  const task = createTask({
    type: "Выездной осмотр",
    title: `Выездной осмотр по объекту ${collateralId}`,
    collateralId,
    assignee,
    dueDate,
    priority: parent.priority,
    source: "Маршрут основного осмотра",
    status: "Назначена",
    parentTaskId: parent.id,
    mobileKind: "employeeInspection",
    route: ["Специалист", "Выездной сотрудник", "Контроль специалиста"],
    comment: `${comment} Канал: ${channel}. Основная задача: ${parent.id}.`
  });
  addTaskHistoryEvent(parent, {
    date: "2026-06-17 20:45",
    user: getRole().user,
    action: "Создана задача на выездной осмотр",
    status: parent.status,
    comment: `${task.id}: ${collateral?.description || collateralId}`
  });
  state.modal = null;
  addToast("Задача на выездной осмотр создана", `${task.id} доступна в мобильном интерфейсе.`, "ok");
}

function submitCollateralPicker() {
  const checked = [...document.querySelectorAll("[data-modal-collateral-choice]:checked")].map((item) => item.dataset.modalCollateralChoice);
  const selected = [...new Set([...state.newTask.selectedCollateralIds, ...checked])];
  state.newTask.selectedCollateralIds = selected;
  const activeId = state.taskActiveCollateral["new-task-draft"];
  if (!selected.includes(activeId)) state.taskActiveCollateral["new-task-draft"] = selected[0] || "";
  state.modal = null;
  addToast("Пул объектов обновлен", selected.length ? `Выбрано объектов: ${selected.length}` : "Объекты не выбраны", selected.length ? "ok" : "warn");
}

function submitNewCollateral() {
  const collateral = createDraftCollateralFromForm();
  if (!collateral) return;
  state.data.collaterals.push(collateral);
  state.newTask.selectedCollateralIds = [...new Set([...state.newTask.selectedCollateralIds, collateral.id])];
  state.taskActiveCollateral["new-task-draft"] = collateral.id;
  state.modal = null;
  addToast("Объект залога добавлен", collateral.id, "ok");
}

function submitImportCollaterals() {
  const context = state.modal?.context || "registry";
  const imported = (state.data.importRows || [])
    .filter((row) => row.status !== "Ошибка" && row.collateralId)
    .map(ensureImportedCollateral)
    .filter(Boolean);

  if (context === "taskCreate") {
    const ids = imported.map((item) => item.id);
    state.newTask.selectedCollateralIds = [...new Set([...state.newTask.selectedCollateralIds, ...ids])];
    const activeId = state.taskActiveCollateral["new-task-draft"];
    if (!state.newTask.selectedCollateralIds.includes(activeId)) state.taskActiveCollateral["new-task-draft"] = ids[0] || state.newTask.selectedCollateralIds[0] || "";
  }

  state.modal = null;
  addToast(
    "Таблица обработана",
    context === "taskCreate"
      ? `В задачу добавлено объектов: ${imported.length}`
      : `Корректные строки загружены в реестр: ${imported.length}`,
    imported.length ? "ok" : "warn"
  );
}

function ensureImportedCollateral(row) {
  const existing = getCollateral(row.collateralId);
  if (existing) {
    existing.source = "Excel";
    existing.updatedAt = "2026-06-18 00:45";
    existing.history = existing.history || [];
    existing.history.unshift({
      date: "2026-06-18 00:45",
      user: getRole().user,
      field: "Карточка залога",
      oldValue: "Текущие данные",
      newValue: row.message,
      reason: "Загрузка из Excel",
      source: "Excel"
    });
    return existing;
  }

  const collateral = createImportedCollateral(row);
  state.data.collaterals.push(collateral);
  return collateral;
}

function createImportedCollateral(row) {
  const contract = getContractByNumber(row.contract);
  const id = row.collateralId || getNextCollateralId();
  const type = row.type || "Оборудование";
  const owner = row.owner || contract?.clientName || "Залогодатель из Excel";
  const clientId = contract?.inn || "525 955 5771";
  const gsz = contract?.gsz || `ГСЗ ${owner}`;
  const address = type === "Автотранспорт"
    ? "Московская область, автобаза залогодателя, зона стоянки 4"
    : "Московская область, складской комплекс залогодателя";
  const marketValue = type === "Автотранспорт" ? 720000000 : 1250000000;
  const pledgeValue = Math.round(marketValue * 0.8);
  return {
    id,
    type,
    clientType: "ЮЛ",
    clientName: owner,
    clientId,
    gsz,
    region: address.split(",")[0] || "Регион не указан",
    address,
    description: type === "Автотранспорт"
      ? "Грузовой автотранспорт из загруженной таблицы, VIN ожидает проверки через SpectrumData"
      : `${type}: объект загружен из таблицы залогодателя`,
    contractIds: contract ? [contract.id] : [],
    status: "Загружен из Excel",
    source: "Excel",
    responsible: getRole().user,
    marketValue,
    pledgeValue,
    allocatedValue: pledgeValue,
    appraisalStatus: "Требуется оценка",
    appraisalDue: "2026-07-18",
    insuranceStatus: "Требуется проверка",
    insuranceDue: "2026-07-18",
    riskState: "Требует проверки",
    riskScore: 35,
    crossPledge: false,
    fields: { "Категория": type, "Подтип": "Импортированный объект", "Источник создания": "Excel" },
    monitoring: { required: "ДА", periodicity: "Ежеквартально", lastInspection: "-", nextInspection: "2026-07-18", condition: "Не проверялся", schedule: [] },
    insurance: { company: "Не выбрана", policy: "Не указан", from: "-", to: "-", amount: 0, premiumStatus: "Не проверено", source: "Excel" },
    evaluations: [],
    encumbrances: [],
    pledgors: [{ share: "100%", name: owner, idn: clientId, role: "Залогодатель", check: "Требует проверки" }],
    risks: [{ title: "Требуется первичная проверка данных Excel", level: "Средний", source: "Excel" }],
    documents: [],
    history: [{ date: "2026-06-18 00:45", user: getRole().user, field: "Карточка залога", oldValue: "-", newValue: "Создана из Excel", reason: row.message, source: "Excel" }],
    externalData: { "Источник": "Excel", "Дата проверки": "2026-06-18", "Статус проверки": "Ожидает обогащения" },
    updatedAt: "2026-06-18 00:45"
  };
}

function createDraftCollateralFromForm() {
  const id = (document.getElementById("newCollateralId")?.value || "").trim();
  if (!id) {
    addToast("Укажите идентификатор объекта", "Поле обязательно для создания нового залога.", "warn");
    return null;
  }
  if (state.data.collaterals.some((item) => item.id === id)) {
    addToast("Идентификатор уже существует", `${id} уже есть в реестре залогов.`, "warn");
    return null;
  }
  const type = document.getElementById("newCollateralType")?.value || "Оборудование";
  const contractId = document.getElementById("newCollateralContract")?.value || "";
  const contract = getContract(contractId);
  const clientName = document.getElementById("newCollateralClient")?.value || contract?.clientName || "ООО Нью Пласт";
  const clientId = document.getElementById("newCollateralClientId")?.value || contract?.inn || "5259555771";
  const gsz = document.getElementById("newCollateralGsz")?.value || contract?.gsz || "ГСЗ Нью Пласт";
  const address = document.getElementById("newCollateralAddress")?.value || "Московская область, г. Клин, промышленная зона, склад 7";
  const description = document.getElementById("newCollateralDescription")?.value || `${type}: новый объект залога`;
  return {
    id,
    type,
    clientType: clientName.toLowerCase().includes("ооо") || clientName.toLowerCase().includes("ooo") || clientName.toLowerCase().includes("ao") ? "ЮЛ" : "ФЛ",
    clientName,
    clientId,
    gsz,
    region: address.split(",")[0] || "Регион не указан",
    address,
    description,
    contractIds: contractId ? [contractId] : [],
    status: "Новый",
    source: "Вручную",
    responsible: getRole().user,
    marketValue: 0,
    pledgeValue: 0,
    allocatedValue: 0,
    appraisalStatus: "Требуется оценка",
    appraisalDue: "Не назначена",
    insuranceStatus: "Требуется проверка",
    insuranceDue: "Не назначено",
    riskState: "Новый",
    riskScore: 0,
    crossPledge: false,
    fields: { "Категория": "Требует заполнения", "Подтип": type, "Источник создания": "Форма задачи" },
    monitoring: { required: "ДА", periodicity: "Ежеквартально", lastInspection: "-", nextInspection: "2026-07-17", condition: "Не проверялся", schedule: [] },
    insurance: { company: "Не выбрана", policy: "Не указан", from: "-", to: "-", amount: 0, premiumStatus: "Не проверено", source: "Вручную" },
    evaluations: [],
    encumbrances: [],
    pledgors: [{ share: "100%", name: clientName, idn: clientId, role: "Залогодатель", check: "Требует проверки" }],
    risks: [],
    documents: [],
    history: [{ date: "2026-06-18 00:40", user: getRole().user, field: "Карточка залога", oldValue: "-", newValue: "Создана из задачи", reason: "Ручное добавление объекта", source: "АРМ" }],
    externalData: { "Источник": "Не запрашивался", "Дата проверки": "-", "Статус проверки": "Ожидает обогащения" },
    updatedAt: "2026-06-18 00:40"
  };
}

function getNextCollateralId() {
  const max = state.data.collaterals.reduce((value, item) => {
    const match = String(item.id || "").match(/COL-(\d+)/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  let next = max + 1;
  let id = `COL-${String(next).padStart(3, "0")}`;
  while (state.data.collaterals.some((item) => item.id === id)) {
    next += 1;
    id = `COL-${String(next).padStart(3, "0")}`;
  }
  return id;
}

function submitNewTask() {
  const selected = state.newTask.selectedCollateralIds.filter((id) => getCollateral(id));
  if (!selected.length) {
    addToast("Выберите объект залога", "Для создания задачи нужно сформировать пул объектов.", "warn");
    return;
  }
  const primary = selected[0];
  const docs = state.newTask.documents || [];
  const task = createTask({
    type: document.getElementById("newTaskType")?.value,
    collateralId: primary,
    collateralIds: selected,
    assignee: document.getElementById("newTaskAssignee")?.value,
    dueDate: document.getElementById("newTaskDue")?.value,
	    priority: document.getElementById("newTaskPriority")?.value,
	    comment: document.getElementById("newTaskComment")?.value,
	    documents: docs
	  });
  state.newTask = { key: "", type: "Плановый мониторинг", selectedCollateralIds: [], documents: [] };
  state.taskActiveCollateral["new-task-draft"] = "";
	  window.location.hash = `/app/tasks/${task.id}`;
	  addToast("Задача создана", "Документы привязаны к задаче и выбранным залогам.", "ok");
	}

function generateConclusion(taskId) {
  const task = getTask(taskId);
  if (!task || !canGenerateTaskExpertConclusion(task)) return;
  const collaterals = getTaskCollaterals(task);
  const collateral = getTaskActiveCollateral(task, collaterals) || getCollateral(task?.collateralId);
  const defaults = getTaskExpertDefaults(task, collateral);
  if (!task.expertComment) task.expertComment = defaults.comment;
  task.expertConclusion = getGeneratedExpertConclusionText(task, collateral);
  const documentRow = buildTaskExpertConclusionDocument(task, collateral, collaterals);
  upsertTaskExpertConclusionDocument(task, documentRow);
  addTaskHistoryEvent(task, {
    action: "Сформировано экспертное заключение",
    status: task.status,
    comment: `Печатная форма: ${documentRow.templateName}. Файл: ${documentRow.name}`
  });
  addToast("Заключение сформировано", documentRow.name, "ok");
}

function attachDocument(encoded, filename = "") {
  const [context, ownerId, title, target] = encoded.split("::");
  const owner = context === "task"
    ? (ownerId === "new-task-draft" ? state.newTask : getTask(ownerId))
    : getCollateral(ownerId);
  if (!owner) return;
  owner.documents = owner.documents || [];
  owner.documents.push({ title, name: filename || `${title}.pdf`, target, required: true, status: "Прикреплен", date: "2026-06-17" });
  addToast("Документ прикреплен", `${title}: ${target}`, "ok");
}

function attachTaskExpertFile(taskId, filename = "") {
  const task = getTask(taskId);
  if (!task) return;
  task.documents = task.documents || [];
  const currentIndex = task.documents.findIndex((doc) => doc.category === "expertConclusion" || doc.title === "Файл экспертного заключения");
  const documentRow = {
    title: "Файл экспертного заключения",
    name: filename || "Экспертное заключение.pdf",
    target: "task",
    required: false,
    status: "Прикреплен",
    date: "2026-06-17",
    category: "expertConclusion"
  };
  if (currentIndex >= 0) task.documents[currentIndex] = { ...task.documents[currentIndex], ...documentRow };
  else task.documents.push(documentRow);
  addToast("Файл заключения прикреплен", taskId, "ok");
}

function deleteDocument(dataset) {
  const context = dataset.docContext;
  const ownerId = dataset.docOwner;
  const owner = context === "task"
    ? (ownerId === "new-task-draft" ? state.newTask : getTask(ownerId))
    : getCollateral(ownerId);
  if (!owner?.documents) return;
  const index = Number(dataset.docIndex);
  const canUseIndex = Number.isInteger(index) && index >= 0 && index < owner.documents.length;
  const removed = canUseIndex
    ? owner.documents.splice(index, 1)[0]
    : removeDocumentByIdentity(owner.documents, dataset);
  if (removed) addToast("Файл удален", removed.name || dataset.docName || "Документ", "warn");
}

function removeDocumentByIdentity(documents, dataset) {
  const index = documents.findIndex((doc) => {
    const title = doc.title || doc.type || doc.name || "Документ";
    const target = doc.target || doc.collateralId || "task";
    return title === dataset.docTitle && target === dataset.docTarget && doc.name === dataset.docName;
  });
  if (index === -1) return null;
  return documents.splice(index, 1)[0];
}

function attachPhoto(taskId, collateralId, angle, filename = "") {
  const task = getTask(taskId);
  if (!task) return;
  task.photoShots = task.photoShots || {};
  task.photoShots[collateralId] = task.photoShots[collateralId] || {};
  task.photoShots[collateralId][angle] = { name: filename || `${angle} - демо.jpg`, date: "2026-06-17" };
  addToast("Фото прикреплено", `${collateralId}: ${angle}`, "ok");
}

function attachMobilePhoto(taskId, collateralId, angle) {
  const key = `${taskId}::${collateralId}::${angle}`;
  state.mobile.employeePhotos[key] = { name: `${angle} - мобильное фото.jpg`, date: "2026-06-19" };
  updateMobileInspectionTaskResult(taskId, collateralId);
  addToast("Фото сделано", angle, "ok");
}

function updateMobileChecklistFactor(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  const collateralId = fieldEl.dataset.collateral;
  if (!task || !collateralId || !fieldEl.dataset.factor) return;
  task.mobileChecklistAnswers = task.mobileChecklistAnswers || {};
  task.mobileChecklistAnswers[collateralId] = task.mobileChecklistAnswers[collateralId] || {};
  if (fieldEl.value) task.mobileChecklistAnswers[collateralId][fieldEl.dataset.factor] = fieldEl.value;
  else delete task.mobileChecklistAnswers[collateralId][fieldEl.dataset.factor];
  const checklist = getMobileChecklistResult(task, getCollateral(collateralId));
  task.status = task.status === "Передано в АРМ" ? "Изменения не отправлены" : "В работе";
  task.result = `Чек-лист выездного осмотра: ${checklist.completed}/${checklist.total}, ${checklist.score} баллов, результат "${checklist.state}".`;
  if (task.mobileResultSent) task.mobileResultSent = false;
}

function updateMobileInspectionComment(fieldEl) {
  const task = getTask(fieldEl.dataset.task);
  const collateralId = fieldEl.dataset.collateral;
  if (!task || !collateralId) return;
  task.mobileInspectionComments = task.mobileInspectionComments || {};
  task.mobileInspectionComments[collateralId] = fieldEl.value;
  if (task.mobileResultSent) {
    task.mobileResultSent = false;
    task.status = "Изменения не отправлены";
  }
}

function captureMobileInspectionForm(taskId, collateralId) {
  const task = getTask(taskId);
  if (!task || !collateralId) return;
  document.querySelectorAll("[data-mobile-check-factor]").forEach((field) => {
    if (field.dataset.task === taskId && field.dataset.collateral === collateralId) updateMobileChecklistFactor(field);
  });
  document.querySelectorAll("[data-mobile-inspection-comment]").forEach((field) => {
    if (field.dataset.task === taskId && field.dataset.collateral === collateralId) updateMobileInspectionComment(field);
  });
}

function buildMobileInspectionPayload(task, collateral) {
  const collateralId = collateral?.id || task?.collateralId || "";
  const progress = getMobileInspectionProgress(task, collateral);
  const checklist = getMobileChecklistResult(task, collateral);
  const contactDetails = getMobileInspectionContactDetails(task, collateral);
  return {
    kind: "employee",
    taskId: task.id,
    type: task.type,
    collateralId,
    collateralDescription: collateral?.description || "",
    collateralAddress: collateral?.address || "",
    checklist: {
      score: checklist.score,
      state: checklist.state,
      completed: checklist.completed,
      total: checklist.total,
      factors: checklist.factors.map((factor) => ({
        code: factor.code,
        title: factor.title,
        weight: factor.weight,
        value: factor.selected?.label || "Не заполнено",
        score: factor.selected?.score ?? 0
      }))
    },
    comment: getMobileInspectionComment(task, collateral),
    contact: contactDetails,
    photos: progress.angles.map((angle) => {
      const photo = getMobilePhotoValue(task.id, collateralId, angle);
      return { angle, name: photo?.name || "", date: photo?.date || "", status: photo ? "Получено" : "Не получено" };
    }),
    photoProgress: { done: progress.done, total: progress.total }
  };
}

function saveMobileInspectionDraft(taskId, collateralId, silent = false) {
  const task = getTask(taskId);
  const collateral = getCollateral(collateralId || task?.collateralId);
  if (!task || !collateral) return null;
  captureMobileInspectionForm(task.id, collateral.id);
  const payload = buildMobileInspectionPayload(task, collateral);
  task.mobileDraft = { ...payload, savedAt: "2026-06-19 10:15" };
  if (task.status !== "Передано в АРМ") task.status = "В работе";
  task.result = `Черновик выездного осмотра сохранен: ${payload.checklist.completed}/${payload.checklist.total}, ${payload.checklist.score} баллов, результат "${payload.checklist.state}".`;
  if (!silent) addToast("Данные осмотра сохранены", `${task.id}: черновик доступен в мобильной задаче.`, "ok");
  return payload;
}

function submitMobileInspectionResult(taskId, collateralId) {
  const task = getTask(taskId);
  const collateral = getCollateral(collateralId || task?.collateralId);
  if (!task || !collateral) return;
  const payload = saveMobileInspectionDraft(task.id, collateral.id, true);
  if (!payload) return;
  const sentAt = "2026-06-19 10:20";
  const transmitted = { ...payload, sentAt, status: "Передано в основной залоговый модуль" };
  task.mobileResult = transmitted;
  task.mobileResultSent = true;
  task.status = "Передано в АРМ";
  task.result = `Передано в основной модуль: ${transmitted.checklist.state}, ${transmitted.checklist.score} баллов, фото ${transmitted.photoProgress.done}/${transmitted.photoProgress.total}.`;
  pushMobileInspectionResultToParent(task, collateral, transmitted);
  addToast("Данные отправлены", `${task.id}: результат передан в основную задачу.`, "ok");
}

function pushMobileInspectionResultToParent(task, collateral, payload) {
  const parent = task.parentTaskId ? getTask(task.parentTaskId) : task;
  if (!parent) return;
  parent.mobileInspectionResults = parent.mobileInspectionResults || [];
  const index = parent.mobileInspectionResults.findIndex((item) => item.taskId === task.id);
  if (index >= 0) parent.mobileInspectionResults[index] = payload;
  else parent.mobileInspectionResults.unshift(payload);
  addTaskHistoryEvent(parent, {
    date: payload.sentAt,
    user: task.assignee || getRole().user,
    action: "Получен выездной осмотр",
    status: parent.status,
    comment: `${task.id}: ${collateral.id}, ${payload.checklist.state}, фото ${payload.photoProgress.done}/${payload.photoProgress.total}`
  });
  parent.result = `Получен результат выездного осмотра ${task.id}: ${payload.checklist.state}, ${payload.checklist.score} баллов, комментарий: ${payload.comment || "без комментария"}.`;
}

function updateMobileInspectionTaskResult(taskId, collateralId) {
  const task = getTask(taskId);
  const collateral = getCollateral(collateralId);
  if (!task || !collateral) return;
  const progress = getMobileInspectionProgress(task, collateral);
  const channelText = "выездного осмотра";
  if (task.mobileResultSent) {
    task.mobileResultSent = false;
    task.status = "Изменения не отправлены";
  } else {
    task.status = progress.done === progress.total ? "Готова к отправке" : "В работе";
  }
  task.result = progress.done === progress.total
    ? `Фотофиксация ${channelText} заполнена: фото ${progress.done}/${progress.total}. Нажмите «Отправить», чтобы передать данные в основной модуль.`
    : `Фотофиксация ${channelText}: получено ${progress.done}/${progress.total} фото.`;
}

window.addEventListener("hashchange", render);
render();
