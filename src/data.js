export const navItems = [
  { id: "tasks", label: "Задачи", path: "/app/tasks" },
  { id: "contracts", label: "Договоры", path: "/app/contracts" },
  { id: "collaterals", label: "Залоги", path: "/app/collaterals" },
  { id: "insurances", label: "Полисы", path: "/app/insurances" },
  { id: "reports", label: "Отчеты", path: "/app/reports" },
  { id: "mobileEmployee", label: "Мобильный осмотр", path: "/mobile/employee/tasks" }
];

export const roles = [
  {
    id: "specialist",
    label: "Специалист",
    user: "Анна Кузнецова",
    department: "Залоговое подразделение",
    menu: ["tasks", "contracts", "collaterals", "insurances"],
    permissions: {
      createTask: true,
      editCollateral: true,
      completeTask: true,
      returnTask: true,
      reassign: false,
      reports: false,
      admin: false,
      print: true
    }
  },
  {
    id: "manager",
    label: "Руководитель",
    user: "Сергей Иванов",
    department: "Управление залогов",
    menu: ["tasks", "contracts", "collaterals", "insurances", "reports"],
    permissions: {
      createTask: true,
      editCollateral: false,
      completeTask: false,
      returnTask: true,
      reassign: true,
      reports: true,
      admin: false,
      print: true
    }
  },
  {
    id: "field",
    label: "Выездной сотрудник",
    user: "Алексей Соколов",
    department: "Выездные осмотры",
    menu: ["mobileEmployee"],
    permissions: {
      createTask: false,
      editCollateral: false,
      completeTask: true,
      returnTask: false,
      reassign: false,
      reports: false,
      admin: false,
      print: false
    }
  },
  {
    id: "admin",
    label: "Администратор/методолог",
    user: "Ольга Васильева",
    department: "Методология и ИТ",
    menu: ["tasks", "contracts", "collaterals", "insurances", "reports"],
    permissions: {
      createTask: false,
      editCollateral: false,
      completeTask: false,
      returnTask: false,
      reassign: true,
      reports: false,
      admin: true,
      print: false
    }
  }
];

export const employees = [
  "Анна Кузнецова",
  "Дмитрий Орлов",
  "Павел Смирнов",
  "Мария Петрова",
  "Алексей Соколов",
  "Елена Морозова"
];

export const taskTypes = [
  "Первичный осмотр",
  "Повторный осмотр",
  "Выездной осмотр",
  "Единичная переоценка",
  "Списочная переоценка",
  "Плановый мониторинг",
  "Внеплановый мониторинг",
  "Постановка в залог",
  "Снятие обременения",
  "Замена залога",
  "Составление отчетности"
];

export const riskNames = [
  "Истечение страховки",
  "Окончание срока оценки",
  "Падение стоимости",
  "Ухудшение LTV",
  "Статус имущества",
  "Судебные ограничения",
  "Двойной залог",
  "Арест имущества"
];

export const taskSourceChannels = [
  {
    id: "manual",
    name: "Создание задач вручную",
    stage: "MVP1",
    status: "Активен",
    owner: "Сотрудник залогового подразделения",
    trigger: "Кнопка Создать задачу в АРМ",
    flow: ["Выбор типа задачи", "Выбор исполнителя и срока", "Добавление залогов", "Прикрепление документов", "Запуск обогащения"]
  },
  {
    id: "excel",
    name: "Импорт залогов из Excel",
    stage: "MVP1",
    status: "Активен",
    owner: "Сотрудник залогового подразделения",
    trigger: "Загрузка шаблона до 20 колонок",
    flow: ["Проверка строк", "Создание или обновление карточки залога", "Запросы во внешние источники", "Протокол ошибок"]
  },
  {
    id: "email",
    name: "Создание задач по электронным письмам",
    stage: "MVP1",
    status: "Прототип",
    owner: "Почтовый сервер",
    trigger: "Входящее письмо с шаблонными маркерами",
    flow: ["Чтение письма", "Парсинг темы и тела", "Ответ при ошибке", "Создание задачи", "Распознавание вложений"]
  },
  {
    id: "pipeline",
    name: "Создание задач по данным конвейеров",
    stage: "MVP2",
    status: "Прототип",
    owner: "Розничный, лизинговый или МСБ-конвейер",
    trigger: "API-запрос из внешней системы",
    flow: ["Прием параметров", "Передача файлов", "Распознавание документов", "Внешние проверки", "Передача задачи сотруднику"]
  },
  {
    id: "schedule",
    name: "Создание задач по расписанию",
    stage: "MVP2",
    status: "Прототип",
    owner: "Планировщик",
    trigger: "Дата планового мониторинга или списочной переоценки",
    flow: ["Проверка графика", "Создание задач", "Назначение исполнителя", "Email-уведомление"]
  },
  {
    id: "trigger",
    name: "Создание задач по сработке триггеров",
    stage: "MVP2",
    status: "Прототип",
    owner: "Справочник условий мониторинга",
    trigger: "До 3 преднастроенных риск-триггеров",
    flow: ["Получение сигнала", "Проверка условия", "Создание внепланового мониторинга", "Уведомление ответственного"]
  }
];

export const printFormCatalog = [
  { id: "pledge-kit-mvp1", stage: "MVP1", name: "Комплект печатных форм по залогу", pages: "до 20", params: "до 200", status: "Доступен", owner: "Залоговый модуль" },
  { id: "pledge-kit-mvp2", stage: "MVP2", name: "Дополнительный комплект печатных форм", pages: "до 20", params: "до 200", status: "Шаблон", owner: "Залоговый модуль" },
  { id: "expert-conclusion", stage: "MVP1", name: "Экспертное заключение", pages: "1-3", params: "до 40", status: "Доступен", owner: "Карточка задачи" },
  { id: "insurance-notice", stage: "MVP2", name: "Уведомление по страховому полису", pages: "1", params: "до 20", status: "Шаблон", owner: "Реестр полисов" }
];

export const migrationBatches = [
  {
    id: "MIG-001",
    name: "Миграция договоров залога",
    source: "Витрина Банка",
    stage: "Миграция",
    status: "Подготовка",
    fields: 40,
    records: 1280,
    errors: 14,
    owner: "Команда миграции",
    nextStep: "Согласовать методику Банка и провести 1 итерацию тестовой загрузки"
  },
  {
    id: "MIG-002",
    name: "Связи договоров и объектов залога",
    source: "АБС ЦФТ",
    stage: "Миграция",
    status: "Проверка качества",
    fields: 28,
    records: 2140,
    errors: 37,
    owner: "Бэк-офис",
    nextStep: "Разобрать строки без идентификатора объекта"
  },
  {
    id: "MIG-003",
    name: "История страхования и оценки",
    source: "ЕСМ Банка",
    stage: "Миграция",
    status: "Черновик",
    fields: 32,
    records: 690,
    errors: 0,
    owner: "Методология",
    nextStep: "Определить обязательность переноса архивных документов"
  }
];

const risks = (levels) =>
  riskNames.map((name, index) => ({
    name,
    level: levels[index] || "ok",
    source:
      levels[index] === "critical"
        ? "Внешний источник"
        : levels[index] === "warn"
          ? "Регламентный контроль"
          : "Проверка без замечаний"
  }));


const buildDemoAutoFleetCollaterals = () => [
  { id: "COL-020", model: "КАМАЗ 54901", year: "2023", plate: "Н 201 НН 152", vin: "XTC549010P0001201", market: 640000000, risk: 28, appraisal: "Действует", appraisalDue: "2026-10-15", insurance: "Оплачена", insuranceDue: "2026-12-15", mileage: "72 400 км", condition: "Исправен", evalDate: "2026-04-15", evalDoc: true },
  { id: "COL-021", model: "КАМАЗ 54901", year: "2022", plate: "Н 202 НН 152", vin: "XTC549010N0001202", market: 590000000, risk: 36, appraisal: "Действует", appraisalDue: "2026-09-28", insurance: "Оплачена", insuranceDue: "2026-11-30", mileage: "118 000 км", condition: "Исправен, требуется плановое ТО", evalDate: "2026-03-28", evalDoc: true },
  { id: "COL-022", model: "Volvo FH 460", year: "2021", plate: "Н 203 НН 152", vin: "YV2RTY0A1MB901203", market: 720000000, risk: 48, appraisal: "Истекает", appraisalDue: "2026-07-02", insurance: "Истекает", insuranceDue: "2026-06-26", mileage: "154 300 км", condition: "Рабочее, требуется фото шин", evalDate: "2026-01-02", evalDoc: true },
  { id: "COL-023", model: "MAN TGX 18.440", year: "2020", plate: "Н 204 НН 152", vin: "WMA06XZZ5LM901204", market: 515000000, risk: 63, appraisal: "Истекает", appraisalDue: "2026-07-10", insurance: "Оплачена", insuranceDue: "2026-10-10", mileage: "221 900 км", condition: "Рабочее, есть замечания по кузову", evalDate: "2025-12-10", evalDoc: false },
  { id: "COL-024", model: "Scania R450", year: "2022", plate: "Н 205 НН 152", vin: "YS2R4X200N1901205", market: 760000000, risk: 33, appraisal: "Действует", appraisalDue: "2026-11-18", insurance: "Оплачена", insuranceDue: "2026-11-18", mileage: "96 700 км", condition: "Исправен", evalDate: "2026-05-18", evalDoc: true },
  { id: "COL-025", model: "Isuzu NQR90", year: "2021", plate: "Н 206 НН 152", vin: "JALC4W168M7001206", market: 365000000, risk: 41, appraisal: "Действует", appraisalDue: "2026-08-30", insurance: "Оплачена", insuranceDue: "2026-09-30", mileage: "142 000 км", condition: "Исправен", evalDate: "2026-02-28", evalDoc: true },
  { id: "COL-026", model: "ГАЗон Next", year: "2020", plate: "Н 207 НН 152", vin: "X96C41R33L001207", market: 245000000, risk: 58, appraisal: "Просрочена", appraisalDue: "2026-04-20", insurance: "Не оплачена", insuranceDue: "2026-05-20", mileage: "188 600 км", condition: "Требуется осмотр после ремонта", evalDate: "2025-04-20", evalDoc: false },
  { id: "COL-027", model: "Ford Transit", year: "2022", plate: "Н 208 НН 152", vin: "WF0EXXTTRENA01208", market: 310000000, risk: 24, appraisal: "Действует", appraisalDue: "2026-12-05", insurance: "Оплачена", insuranceDue: "2026-12-05", mileage: "84 500 км", condition: "Исправен", evalDate: "2026-06-05", evalDoc: true }
].map((item, index) => {
  const pledge = Math.round(item.market * (item.risk >= 55 ? 0.68 : item.risk >= 45 ? 0.74 : 0.78));
  return {
    id: item.id,
    type: "Автотранспорт",
    description: `${item.model}, ${item.year} г., гос. номер ${item.plate}`,
    clientName: "ООО Волга Логистик",
    clientId: "525 944 1009",
    clientType: "ЮЛ",
    gsz: "ГСЗ Волга Логистик",
    region: "Нижний Новгород",
    address: "Нижний Новгород, ул. Ленина, автопарк 12",
    contractIds: ["CTR-2026-0192"],
    marketValue: item.market,
    pledgeValue: pledge,
    allocatedValue: pledge,
    appraisalStatus: item.appraisal,
    appraisalDue: item.appraisalDue,
    insuranceStatus: item.insurance,
    insuranceDue: item.insuranceDue,
    status: "В залоге",
    crossPledge: false,
    responsible: "Мария Петрова",
    updatedAt: "2026-06-16 11:20",
    source: "Конвейер",
    riskScore: item.risk,
    riskState: item.risk >= 55 ? "Требует внимания" : item.risk >= 45 ? "Удовлетворительное" : "Хорошее",
    risks: risks(item.risk >= 55 ? ["warn", "critical", "warn", "warn", "ok", "ok", "ok", "ok"] : item.risk >= 45 ? ["warn", "warn", "ok", "warn", "ok", "ok", "ok", "ok"] : ["ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"]),
    fields: {
      "VIN": item.vin,
      "Госномер": item.plate,
      "Марка/модель": item.model,
      "Год выпуска": item.year,
      "Пробег": item.mileage,
      "Состояние": item.condition,
      "Место хранения": "Автопарк заемщика"
    },
    monitoring: {
      lastInspection: index % 3 === 0 ? "2026-04-22" : "2026-05-18",
      inspector: "Алексей Соколов",
      condition: item.condition,
      nextInspection: index % 3 === 0 ? "2026-06-24" : "2026-08-18",
      periodicity: "Раз в два месяца",
      completed: index % 3 !== 0,
      schedule: [
        { date: index % 3 === 0 ? "2026-04-22" : "2026-05-18", type: "Плановый", result: item.condition, inspector: "Алексей Соколов", status: "Завершен" },
        { date: index % 3 === 0 ? "2026-06-24" : "2026-08-18", type: "Повторный", result: "Ожидается", inspector: "Не назначен", status: "Запланирован" }
      ]
    },
    evaluations: [
      { date: item.evalDate, appraiser: "АвтоЭксперт Плюс", market: item.market, pledge, method: "Сравнительный", status: item.appraisal }
    ],
    insurance: {
      company: "РЕСО-Гарантия",
      policy: `GI-AUTO-26-${item.id.replace("COL-", "")}`,
      from: "2025-12-01",
      to: item.insuranceDue,
      amount: pledge,
      premiumStatus: item.insurance === "Не оплачена" ? "Не оплачена" : "Оплачена",
      source: "АБС ЦФТ"
    },
    encumbrances: [
      { number: `ZL-26/192-${index + 3}`, date: "2026-01-19", type: "Залог ТС", amount: pledge, contract: "AV-26/192", allocated: pledge, ltv: 91, status: "Зарегистрировано" }
    ],
    pledgors: [
      { share: "100%", name: "ООО Волга Логистик", idn: "525 944 1009", role: "Залогодатель", check: "Проверен" }
    ],
    externalData: {
      "Источник": "SpectrumData",
      "Дата проверки": "2026-06-16 11:20",
      "Регистрация ТС": "Активна",
      "Аресты": "Не выявлены",
      "Запрет регистрационных действий": "Не выявлен",
      "Розыск": "Не числится"
    },
    documents: [
      { name: `СТС ${item.model}.pdf`, type: "Право", required: true, status: "Получен", date: "2026-01-12" },
      ...(item.evalDoc ? [{ name: `Отчет оценки ${item.id}.pdf`, type: "Оценка", required: true, status: "Подписан", date: item.evalDate }] : []),
      { name: `Полис ${item.id}.pdf`, type: "Страхование", required: true, status: item.insurance, date: "2025-12-01" }
    ],
    history: [
      { date: "2026-06-16 11:20", user: "Система", field: "Автопарк", oldValue: "-", newValue: "Добавлен в демо-пул", reason: "Списочная переоценка", source: "Конвейер" }
    ]
  };
});

export const initialData = {
  contracts: [
    {
      id: "CTR-2026-0148",
      number: "KM-26/148",
      startDate: "2025-11-18",
      endDate: "2028-11-18",
      product: "Кредитная линия для оборотного капитала",
      currency: "RUB",
      limit: 3800000000,
      debt: 2520000000,
      marketValue: 5200000000,
      allocatedValue: 3600000000,
      ltv: 70,
      coverageStatus: "Полное",
      status: "Активен",
      loanQuality: "2 класс",
      reserve: 126000000,
      clientType: "ЮЛ",
      clientName: "ООО СеверТекстиль",
      inn: "771 482 2110",
      gsz: "ГСЗ СеверТекстиль",
      collateralIds: ["COL-001", "COL-004"],
      participants: [
        { role: "Заемщик", name: "ООО СеверТекстиль", idn: "771 482 2110", share: "100%", contact: "Подтвержден" },
        { role: "Залогодатель", name: "ООО СеверСклад", idn: "771 492 2776", share: "Долевой объект", contact: "Актуален" }
      ]
    },
    {
      id: "CTR-2026-0192",
      number: "AV-26/192",
      startDate: "2026-01-12",
      endDate: "2029-01-12",
      product: "Автокредит для корпоративного парка",
      currency: "RUB",
      limit: 1650000000,
      debt: 1380000000,
      marketValue: 6685000000,
      allocatedValue: 5095000000,
      ltv: 27,
      coverageStatus: "Полное",
      status: "Активен",
      loanQuality: "3 класс",
      reserve: 207000000,
      clientType: "ЮЛ",
      clientName: "ООО Волга Логистик",
      inn: "525 944 1009",
      gsz: "ГСЗ Волга Логистик",
      collateralIds: ["COL-002", "COL-006", "COL-020", "COL-021", "COL-022", "COL-023", "COL-024", "COL-025", "COL-026", "COL-027"],
      participants: [
        { role: "Заемщик", name: "ООО Волга Логистик", idn: "525 944 1009", share: "100%", contact: "Подтвержден" },
        { role: "Поручитель", name: "ИП Никитин А.А.", idn: "525 178 233 001", share: "Поручительство", contact: "Требует обновления" }
      ]
    },
    {
      id: "CTR-2025-0771",
      number: "IP-25/771",
      startDate: "2025-04-09",
      endDate: "2030-04-09",
      product: "Ипотечный кредит",
      currency: "RUB",
      limit: 920000000,
      debt: 812000000,
      marketValue: 1040000000,
      allocatedValue: 755000000,
      ltv: 108,
      coverageStatus: "Не обеспечено",
      status: "Активен",
      loanQuality: "4 класс",
      reserve: 324800000,
      clientType: "ФЛ",
      clientName: "Смирнова Елена Викторовна",
      inn: "772 345 678 901",
      gsz: "ГСЗ Смирнова",
      collateralIds: ["COL-003"],
      participants: [
        { role: "Заемщик", name: "Смирнова Елена Викторовна", idn: "772 345 678 901", share: "100%", contact: "Доступен" },
        { role: "Созаемщик", name: "Смирнов Алексей Викторович", idn: "772 345 678 902", share: "50%", contact: "Актуален" }
      ]
    },
    {
      id: "CTR-2026-0228",
      number: "BG-26/228",
      startDate: "2026-02-05",
      endDate: "2027-08-05",
      product: "Банковская гарантия",
      currency: "RUB",
      limit: 2400000000,
      debt: 1180000000,
      marketValue: 3600000000,
      allocatedValue: 1720000000,
      ltv: 69,
      coverageStatus: "Полное",
      status: "Активен",
      loanQuality: "1 класс",
      reserve: 23600000,
      clientType: "ЮЛ",
      clientName: "АО Кубань Агро Экспорт",
      inn: "231 011 8454",
      gsz: "ГСЗ Агро Экспорт",
      collateralIds: ["COL-005", "COL-008"],
      participants: [
        { role: "Принципал", name: "АО Кубань Агро Экспорт", idn: "231 011 8454", share: "100%", contact: "Подтвержден" },
        { role: "Залогодатель", name: "ООО АгроТерминал", idn: "231 177 1628", share: "Имущество", contact: "Актуален" }
      ]
    },
    {
      id: "CTR-2026-0316",
      number: "LC-26/316",
      startDate: "2026-03-18",
      endDate: "2027-03-18",
      product: "Кредитная линия на экспортный контракт",
      currency: "RUB",
      limit: 800000000,
      debt: 580000000,
      marketValue: 3600000000,
      allocatedValue: 680000000,
      ltv: 85,
      coverageStatus: "Частичное",
      status: "Активен",
      loanQuality: "2 класс",
      reserve: 46400000,
      clientType: "ЮЛ",
      clientName: "АО Кубань Агро Экспорт",
      inn: "231 011 8454",
      gsz: "ГСЗ Агро Экспорт",
      collateralIds: ["COL-005", "COL-008"],
      participants: [
        { role: "Заемщик", name: "АО Кубань Агро Экспорт", idn: "231 011 8454", share: "100%", contact: "Подтвержден" },
        { role: "Залогодатель", name: "АО Кубань Агро Экспорт", idn: "231 011 8454", share: "Имущество", contact: "Актуален" }
      ]
    },
    {
      id: "CTR-2024-0644",
      number: "KL-24/644",
      startDate: "2024-09-20",
      endDate: "2027-09-20",
      product: "Кредит на оборудование",
      currency: "RUB",
      limit: 470000,
      debt: 344000,
      marketValue: 4950000000,
      allocatedValue: 3710000000,
      ltv: 92,
      coverageStatus: "Частичное",
      status: "Активен",
      loanQuality: "3 класс",
      reserve: 51600000,
      clientType: "ЮЛ",
      clientName: "ООО Север Принт Пак",
      inn: "780 600 2779",
      gsz: "ГСЗ Север Принт Пак",
      collateralIds: ["COL-007"],
      participants: [
        { role: "Заемщик", name: "ООО Север Принт Пак", idn: "780 600 2779", share: "100%", contact: "Подтвержден" }
      ]
    }
  ],
  collaterals: [
    {
      id: "COL-001",
      type: "Недвижимость",
      description: "Складской комплекс 4 200 кв.м, Московская область",
      clientName: "ООО СеверСклад",
      clientId: "771 492 2776",
      clientType: "ЮЛ",
      gsz: "ГСЗ СеверТекстиль",
      region: "Московская область",
      address: "Московская область, г. Клин, промзона Северная, участок 18",
      contractIds: ["CTR-2026-0148"],
      marketValue: 4200000000,
      pledgeValue: 3360000000,
      allocatedValue: 2900000000,
      appraisalStatus: "Действует",
      appraisalDue: "2026-09-20",
      insuranceStatus: "Оплачена",
      insuranceDue: "2026-12-31",
      status: "В залоге",
      crossPledge: false,
      responsible: "Анна Кузнецова",
      updatedAt: "2026-06-14 10:30",
      source: "АБС ЦФТ",
      riskScore: 18,
      riskState: "Хорошее",
      risks: risks(["ok", "warn", "ok", "ok", "ok", "ok", "ok", "ok"]),
      fields: {
        "Кадастровый номер": "10:04:01:02:0031",
        "Назначение": "Склад и офис",
        "Площадь земли": "1.8 га",
        "Площадь строений": "4 200 кв.м",
        "Год ввода": "2018",
        "Материал стен": "Металлоконструкции, сэндвич-панели",
        "Состояние": "Эксплуатируется",
        "Признак изменения": "Нет изменений после проверки"
      },
      monitoring: {
        lastInspection: "2026-05-21",
        inspector: "Дмитрий Орлов",
        condition: "Удовлетворительное",
        nextInspection: "2026-08-21",
        periodicity: "Ежеквартально",
        completed: true,
        schedule: [
          { date: "2026-02-21", type: "Плановый", result: "Без замечаний", inspector: "Дмитрий Орлов", status: "Завершен" },
          { date: "2026-05-21", type: "Плановый", result: "Требуется обновить фото фасада", inspector: "Дмитрий Орлов", status: "Завершен" },
          { date: "2026-08-21", type: "Плановый", result: "Ожидается", inspector: "Не назначен", status: "Запланирован" }
        ]
      },
      evaluations: [
        { date: "2026-03-20", appraiser: "ООО Центр оценки", market: 4200000000, pledge: 3360000000, method: "Доходный и сравнительный", status: "Действует" },
        { date: "2025-03-18", appraiser: "ООО Центр оценки", market: 4050000000, pledge: 3240000000, method: "Сравнительный", status: "Архив" }
      ],
      insurance: {
        company: "АльфаСтрахование",
        policy: "KS-26-000184",
        from: "2026-01-01",
        to: "2026-12-31",
        amount: 3360000000,
        premiumStatus: "Оплачена",
        source: "Конвейер"
      },
      encumbrances: [
        { number: "ZL-26/148-1", date: "2026-01-24", type: "Ипотека", amount: 2900000000, contract: "KM-26/148", allocated: 2900000000, ltv: 70, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "ООО СеверСклад", idn: "771 492 2776", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "Сервис данных ЕГРН",
        "Дата проверки": "2026-06-14 09:20",
        "Право собственности": "Подтверждено",
        "Аресты": "Не выявлены",
        "Запреты": "Не выявлены",
        "Внешний залоговый реестр": "Запись активна"
      },
      documents: [
        { name: "Кадастровая выписка.pdf", type: "Право", required: true, status: "Получен из ЕСМ Банка", date: "2026-06-10" },
        { name: "Отчет оценки FV-183.pdf", type: "Оценка", required: true, status: "Подписан", date: "2026-03-20" },
        { name: "Полис KS-26-000184.pdf", type: "Страхование", required: true, status: "Получен из конвейера", date: "2026-01-02" }
      ],
      history: [
        { date: "2026-06-14 10:30", user: "Система", field: "Внешние данные", oldValue: "Проверка от 2026-05-14", newValue: "Проверка от 2026-06-14", reason: "Ежемесячный регламент", source: "Сервис данных ЕГРН" },
        { date: "2026-05-21 16:18", user: "Дмитрий Орлов", field: "Осмотр", oldValue: "Запланирован", newValue: "Завершен", reason: "Плановый мониторинг", source: "Мобильный АРМ" }
      ]
    },
    {
      id: "COL-002",
      type: "Автотранспорт",
      description: "Mercedes-Benz Actros 1845, 2022 г., гос. номер 30 A 884 CB",
      clientName: "ООО Волга Логистик",
      clientId: "525 944 1009",
      clientType: "ЮЛ",
      gsz: "ГСЗ Волга Логистик",
      region: "Нижний Новгород",
      address: "Нижний Новгород, ул. Ленина, автопарк 12",
      contractIds: ["CTR-2026-0192"],
      marketValue: 980000000,
      pledgeValue: 784000000,
      allocatedValue: 760000000,
      appraisalStatus: "Истекает",
      appraisalDue: "2026-07-05",
      insuranceStatus: "Истекает",
      insuranceDue: "2026-06-28",
      status: "В залоге",
      crossPledge: false,
      responsible: "Мария Петрова",
      updatedAt: "2026-06-15 15:45",
      source: "Конвейер",
      riskScore: 54,
      riskState: "Требует внимания",
      risks: risks(["critical", "warn", "ok", "warn", "ok", "ok", "ok", "ok"]),
      fields: {
        "VIN": "W1K9634031L978401",
        "Госномер": "30 A 884 CB",
        "Марка/модель": "Mercedes-Benz Actros 1845",
        "Год выпуска": "2022",
        "Пробег": "148 400 км",
        "Состояние": "Рабочее, требуется фото шин",
        "Место хранения": "Автопарк заемщика"
      },
      monitoring: {
        lastInspection: "2026-04-04",
        inspector: "Алексей Соколов",
        condition: "Рабочее",
        nextInspection: "2026-06-20",
        periodicity: "Раз в два месяца",
        completed: false,
        schedule: [
          { date: "2026-04-04", type: "Первичный", result: "Без критических замечаний", inspector: "Алексей Соколов", status: "Завершен" },
          { date: "2026-06-20", type: "Повторный", result: "Ожидается", inspector: "Алексей Соколов", status: "Назначен" }
        ]
      },
      evaluations: [
        { date: "2026-01-09", appraiser: "АвтоЭксперт Плюс", market: 980000000, pledge: 784000000, method: "Сравнительный", status: "Истекает" }
      ],
      insurance: {
        company: "РЕСО-Гарантия",
        policy: "GI-AUTO-26-7791",
        from: "2025-06-29",
        to: "2026-06-28",
        amount: 784000000,
        premiumStatus: "Оплачена",
        source: "АБС ЦФТ"
      },
      encumbrances: [
        { number: "ZL-26/192-1", date: "2026-01-19", type: "Залог ТС", amount: 760000000, contract: "AV-26/192", allocated: 760000000, ltv: 91, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "ООО Волга Логистик", idn: "525 944 1009", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "SpectrumData",
        "Дата проверки": "2026-06-15 14:10",
        "Регистрация ТС": "Активна",
        "Аресты": "Не выявлены",
        "Запрет регистрационных действий": "Не выявлен",
        "Розыск": "Не числится"
      },
      documents: [
        { name: "СТС Actros.pdf", type: "Право", required: true, status: "Получен", date: "2026-01-12" },
        { name: "Полис GI-AUTO-26-7791.pdf", type: "Страхование", required: true, status: "Истекает", date: "2025-06-29" }
      ],
      history: [
        { date: "2026-06-15 15:45", user: "Система", field: "Сигнал риска", oldValue: "Нет", newValue: "Истечение страховки", reason: "Срок менее 15 дней", source: "АБС ЦФТ" }
      ]
    },
    {
      id: "COL-003",
      type: "Недвижимость",
      description: "Квартира 82 кв.м, Москва, Хамовники",
      clientName: "Смирнова Елена Викторовна",
      clientId: "772 345 678 901",
      clientType: "ФЛ",
      gsz: "ГСЗ Смирнова",
      region: "Москва",
      address: "Москва, Хамовники, ул. Профсоюзная, дом 9",
      contractIds: ["CTR-2025-0771"],
      marketValue: 1040000000,
      pledgeValue: 755000000,
      allocatedValue: 755000000,
      appraisalStatus: "Просрочена",
      appraisalDue: "2026-04-15",
      insuranceStatus: "Оплачена",
      insuranceDue: "2027-01-10",
      status: "В залоге",
      crossPledge: false,
      responsible: "Анна Кузнецова",
      updatedAt: "2026-06-12 11:05",
      source: "Миграция",
      riskScore: 82,
      riskState: "Критическое",
      risks: risks(["ok", "critical", "warn", "critical", "ok", "critical", "ok", "ok"]),
      fields: {
        "Кадастровый номер": "10:06:04:09:1148",
        "Этаж": "7 из 9",
        "Площадь": "82 кв.м",
        "Комнат": "3",
        "Состояние": "Требуется повторная оценка",
        "Проживание": "Заемщик"
      },
      monitoring: {
        lastInspection: "2025-12-18",
        inspector: "Дмитрий Орлов",
        condition: "Удовлетворительное",
        nextInspection: "2026-06-18",
        periodicity: "Раз в полгода",
        completed: true,
        schedule: [
          { date: "2025-12-18", type: "Плановый", result: "Без замечаний", inspector: "Дмитрий Орлов", status: "Завершен" },
          { date: "2026-06-18", type: "Плановый", result: "Ожидается", inspector: "Не назначен", status: "Запланирован" }
        ]
      },
      evaluations: [
        { date: "2025-04-15", appraiser: "Российская оценочная компания", market: 1040000000, pledge: 755000000, method: "Сравнительный", status: "Просрочена" }
      ],
      insurance: {
        company: "Ингосстрах",
        policy: "UI-RE-25-8830",
        from: "2026-01-10",
        to: "2027-01-10",
        amount: 755000000,
        premiumStatus: "Оплачена",
        source: "АБС ЦФТ"
      },
      encumbrances: [
        { number: "ZL-25/771-1", date: "2025-04-14", type: "Ипотека", amount: 755000000, contract: "IP-25/771", allocated: 755000000, ltv: 108, status: "Судебный риск" }
      ],
      pledgors: [
        { share: "100%", name: "Смирнова Елена Викторовна", idn: "772 345 678 901", role: "Залогодатель", check: "Требуется проверка" }
      ],
      externalData: {
        "Источник": "Сервис данных ЕГРН",
        "Дата проверки": "2026-06-12 10:54",
        "Право собственности": "Подтверждено",
        "Аресты": "Не выявлены",
        "Судебные ограничения": "Есть спор по коммунальной задолженности",
        "Внешний залоговый реестр": "Запись активна"
      },
      documents: [
        { name: "Выписка кадастра 2025.pdf", type: "Право", required: true, status: "Просит обновления", date: "2025-04-13" },
        { name: "Отчет оценки TA-441.pdf", type: "Оценка", required: true, status: "Просрочен", date: "2025-04-15" }
      ],
      history: [
        { date: "2026-06-12 11:05", user: "Система", field: "Сигнал риска", oldValue: "Предупреждение", newValue: "Критический LTV", reason: "LTV 108%", source: "Алгоритм" }
      ]
    },
    {
      id: "COL-004",
      type: "Товары в обороте",
      description: "Хлопковая пряжа и готовая ткань на складе",
      clientName: "ООО СеверТекстиль",
      clientId: "771 482 2110",
      clientType: "ЮЛ",
      gsz: "ГСЗ СеверТекстиль",
      region: "Московская область",
      address: "Склад готовой продукции, линия B",
      contractIds: ["CTR-2026-0148"],
      marketValue: 1000000000,
      pledgeValue: 700000000,
      allocatedValue: 700000000,
      appraisalStatus: "Действует",
      appraisalDue: "2026-10-01",
      insuranceStatus: "Оплачена",
      insuranceDue: "2026-12-31",
      status: "В залоге",
      crossPledge: false,
      responsible: "Павел Смирнов",
      updatedAt: "2026-06-13 09:12",
      source: "АБС ЦФТ",
      riskScore: 29,
      riskState: "Удовлетворительное",
      risks: risks(["ok", "ok", "warn", "ok", "warn", "ok", "ok", "ok"]),
      fields: {
        "Группа товаров": "Текстильная продукция",
        "Объем": "620 тонн",
        "Место хранения": "Склад готовой продукции",
        "Метод контроля": "Складской акт и фотофиксация",
        "Периодичность сверки": "Ежемесячно"
      },
      monitoring: {
        lastInspection: "2026-06-01",
        inspector: "Павел Смирнов",
        condition: "Частичное движение партии",
        nextInspection: "2026-07-01",
        periodicity: "Ежемесячно",
        completed: true,
        schedule: [
          { date: "2026-06-01", type: "Плановый", result: "Остаток подтвержден", inspector: "Павел Смирнов", status: "Завершен" },
          { date: "2026-07-01", type: "Плановый", result: "Ожидается", inspector: "Не назначен", status: "Запланирован" }
        ]
      },
      evaluations: [
        { date: "2026-05-30", appraiser: "Внутренняя оценка", market: 1000000000, pledge: 700000000, method: "Складская сверка", status: "Действует" }
      ],
      insurance: {
        company: "АльфаСтрахование",
        policy: "KS-STOCK-26-041",
        from: "2026-01-01",
        to: "2026-12-31",
        amount: 700000000,
        premiumStatus: "Оплачена",
        source: "Конвейер"
      },
      encumbrances: [
        { number: "ZL-26/148-2", date: "2026-01-24", type: "Залог товаров", amount: 700000000, contract: "KM-26/148", allocated: 700000000, ltv: 70, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "ООО СеверТекстиль", idn: "771 482 2110", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "Триггер мониторинга",
        "Дата проверки": "2026-06-13 09:12",
        "Складской остаток": "Подтвержден частично",
        "Статус взыскания": "Нет",
        "Сигнал реализации": "Нет"
      },
      documents: [
        { name: "Складской акт 06-2026.xlsx", type: "Мониторинг", required: true, status: "Загружен", date: "2026-06-01" }
      ],
      history: [
        { date: "2026-06-13 09:12", user: "Система", field: "Остаток партии", oldValue: "680 тонн", newValue: "620 тонн", reason: "Складская сверка", source: "Триггер мониторинга" }
      ]
    },
    {
      id: "COL-005",
      type: "Оборудование",
      description: "Линия сортировки и упаковки сухофруктов Unitec",
      clientName: "АО Кубань Агро Экспорт",
      clientId: "231 011 8454",
      clientType: "ЮЛ",
      gsz: "ГСЗ Агро Экспорт",
      region: "Краснодар",
      address: "Краснодар, промышленная зона Тихорецкая",
      contractIds: ["CTR-2026-0228", "CTR-2026-0316"],
      marketValue: 2400000000,
      pledgeValue: 1920000000,
      allocatedValue: 1720000000,
      appraisalStatus: "Действует",
      appraisalDue: "2027-02-01",
      insuranceStatus: "Оплачена",
      insuranceDue: "2027-02-01",
      status: "В залоге",
      crossPledge: true,
      responsible: "Елена Морозова",
      updatedAt: "2026-06-10 13:10",
      source: "Конвейер",
      riskScore: 22,
      riskState: "Хорошее",
      risks: risks(["ok", "ok", "ok", "ok", "ok", "ok", "warn", "ok"]),
      fields: {
        "Серийный номер": "UT-DRY-22-901",
        "Производитель": "Unitec",
        "Год выпуска": "2022",
        "Местонахождение": "Производственный цех 2",
        "Техническое состояние": "Рабочее",
        "Право собственности": "Инвойс и акт ввода"
      },
      monitoring: {
        lastInspection: "2026-05-28",
        inspector: "Елена Морозова",
        condition: "Работает",
        nextInspection: "2026-08-28",
        periodicity: "Ежеквартально",
        completed: true,
        schedule: [
          { date: "2026-05-28", type: "Плановый", result: "Оборудование на месте", inspector: "Елена Морозова", status: "Завершен" }
        ]
      },
      evaluations: [
        { date: "2026-02-01", appraiser: "Tech Appraisal", market: 2400000000, pledge: 1920000000, method: "Затратный", status: "Действует" }
      ],
      insurance: {
        company: "Apex Insurance",
        policy: "APX-EQ-26-2910",
        from: "2026-02-01",
        to: "2027-02-01",
        amount: 1920000000,
        premiumStatus: "Оплачена",
        source: "Конвейер"
      },
      encumbrances: [
        { number: "ZL-26/228-1", date: "2026-02-05", type: "Залог оборудования", amount: 1200000000, contract: "BG-26/228", allocated: 1200000000, ltv: 69, status: "Зарегистрировано" },
        { number: "ZL-26/316-1", date: "2026-03-18", type: "Кросс-обременение оборудования", amount: 520000000, contract: "LC-26/316", allocated: 520000000, ltv: 85, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "АО Кубань Агро Экспорт", idn: "231 011 8454", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "АБС ЦФТ + ЕСМ Банка",
        "Дата проверки": "2026-06-10 13:10",
        "Документы собственности": "Подтверждены",
        "Ограничения": "Не выявлены",
        "Признак двойного залога": "Проверить кросс-связь"
      },
      documents: [
        { name: "Инвойс Unitec.pdf", type: "Право", required: true, status: "Получен из ЕСМ Банка", date: "2026-02-01" },
        { name: "Акт ввода оборудования.pdf", type: "Право", required: true, status: "Получен из ЕСМ Банка", date: "2026-02-02" }
      ],
      history: [
        { date: "2026-06-10 13:10", user: "Система", field: "Признак кросс-залога", oldValue: "Нет", newValue: "Да", reason: "Связка с обеспечением COL-008", source: "Аллокация" }
      ]
    },
    {
      id: "COL-006",
      type: "Автотранспорт",
      description: "Hyundai HD78, 2021 г., гос. номер 30 B 221 DA",
      clientName: "ООО Волга Логистик",
      clientId: "525 944 1009",
      clientType: "ЮЛ",
      gsz: "ГСЗ Волга Логистик",
      region: "Нижний Новгород",
      address: "Нижний Новгород, ул. Ленина, автопарк 12",
      contractIds: ["CTR-2026-0192"],
      marketValue: 780000000,
      pledgeValue: 626000000,
      allocatedValue: 650000000,
      appraisalStatus: "Действует",
      appraisalDue: "2026-11-12",
      insuranceStatus: "Оплачена",
      insuranceDue: "2026-11-12",
      status: "В залоге",
      crossPledge: false,
      responsible: "Мария Петрова",
      updatedAt: "2026-06-11 12:22",
      source: "Конвейер",
      riskScore: 32,
      riskState: "Удовлетворительное",
      risks: risks(["ok", "ok", "ok", "warn", "ok", "ok", "ok", "ok"]),
      fields: {
        "VIN": "KMFLA18APMC349121",
        "Госномер": "30 B 221 DA",
        "Марка/модель": "Hyundai HD78",
        "Год выпуска": "2021",
        "Пробег": "92 100 км",
        "Состояние": "Рабочее"
      },
      monitoring: {
        lastInspection: "2026-05-11",
        inspector: "Алексей Соколов",
        condition: "Рабочее",
        nextInspection: "2026-07-11",
        periodicity: "Раз в два месяца",
        completed: true,
        schedule: [
          { date: "2026-05-11", type: "Плановый", result: "Без замечаний", inspector: "Алексей Соколов", status: "Завершен" }
        ]
      },
      evaluations: [
        { date: "2026-02-12", appraiser: "АвтоЭксперт Плюс", market: 780000000, pledge: 626000000, method: "Сравнительный", status: "Действует" }
      ],
      insurance: {
        company: "РЕСО-Гарантия",
        policy: "GI-AUTO-26-8011",
        from: "2025-11-12",
        to: "2026-11-12",
        amount: 626000000,
        premiumStatus: "Оплачена",
        source: "АБС ЦФТ"
      },
      encumbrances: [
        { number: "ZL-26/192-2", date: "2026-02-12", type: "Залог ТС", amount: 650000000, contract: "AV-26/192", allocated: 650000000, ltv: 98, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "ООО Волга Логистик", idn: "525 944 1009", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "SpectrumData",
        "Дата проверки": "2026-06-11 12:22",
        "Регистрация ТС": "Активна",
        "Аресты": "Не выявлены",
        "Запреты": "Не выявлены"
      },
      documents: [
        { name: "СТС Hyundai.pdf", type: "Право", required: true, status: "Получен", date: "2026-02-12" }
      ],
      history: [
        { date: "2026-06-11 12:22", user: "Система", field: "Внешняя проверка", oldValue: "Не выполнялась", newValue: "Без замечаний", reason: "Регламент", source: "SpectrumData" }
      ]
    },
    {
      id: "COL-007",
      type: "Оборудование",
      description: "Печатная линия Heidelberg Speedmaster XL 106",
      clientName: "ООО Север Принт Пак",
      clientId: "780 600 2779",
      clientType: "ЮЛ",
      gsz: "ГСЗ Север Принт Пак",
      region: "Москва",
      address: "Москва, Промышленный район, цех 3",
      contractIds: ["CTR-2024-0644"],
      marketValue: 4950000000,
      pledgeValue: 3710000000,
      allocatedValue: 3710000000,
      appraisalStatus: "Действует",
      appraisalDue: "2026-12-04",
      insuranceStatus: "Не оплачена",
      insuranceDue: "2026-07-01",
      status: "В залоге",
      crossPledge: false,
      responsible: "Дмитрий Орлов",
      updatedAt: "2026-06-09 17:40",
      source: "АБС ЦФТ",
      riskScore: 61,
      riskState: "Требует внимания",
      risks: risks(["critical", "ok", "warn", "warn", "ok", "ok", "ok", "ok"]),
      fields: {
        "Серийный номер": "HDXL106-19-4781",
        "Производитель": "Heidelberg",
        "Год выпуска": "2019",
        "Состояние": "Рабочее",
        "Местонахождение": "Производственный цех 3",
        "Валюта оценки": "RUB"
      },
      monitoring: {
        lastInspection: "2026-05-30",
        inspector: "Дмитрий Орлов",
        condition: "Работает",
        nextInspection: "2026-08-30",
        periodicity: "Ежеквартально",
        completed: true,
        schedule: [
          { date: "2026-05-30", type: "Плановый", result: "Без замечаний", inspector: "Дмитрий Орлов", status: "Завершен" }
        ]
      },
      evaluations: [
        { date: "2025-12-04", appraiser: "Tech Appraisal", market: 4950000000, pledge: 3710000000, method: "Затратный", status: "Действует" }
      ],
      insurance: {
        company: "Apex Insurance",
        policy: "APX-EQ-25-712",
        from: "2025-07-01",
        to: "2026-07-01",
        amount: 3710000000,
        premiumStatus: "Ожидает оплату",
        source: "АБС ЦФТ"
      },
      encumbrances: [
        { number: "ZL-24/644-1", date: "2024-09-22", type: "Залог оборудования", amount: 3710000000, contract: "KL-24/644", allocated: 3710000000, ltv: 92, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "ООО Север Принт Пак", idn: "780 600 2779", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "АБС ЦФТ",
        "Дата проверки": "2026-06-09 17:40",
        "Статус страхования": "Премия не оплачена",
        "Статус взыскания": "Нет",
        "Ограничения": "Не выявлены"
      },
      documents: [
        { name: "Отчет оценки Heidelberg.pdf", type: "Оценка", required: true, status: "Подписан", date: "2025-12-04" },
        { name: "Полис APX-EQ-25-712.pdf", type: "Страхование", required: true, status: "Премия не оплачена", date: "2025-07-01" }
      ],
      history: [
        { date: "2026-06-09 17:40", user: "Система", field: "Оплата страховой премии", oldValue: "Оплачена", newValue: "Ожидает оплату", reason: "Сверка АБС ЦФТ", source: "АБС ЦФТ" }
      ]
    },
    {
      id: "COL-008",
      type: "Скот",
      description: "Поголовье КРС мясного направления, 340 голов",
      clientName: "АО Кубань Агро Экспорт",
      clientId: "231 011 8454",
      clientType: "ЮЛ",
      gsz: "ГСЗ Агро Экспорт",
      region: "Краснодар",
      address: "Краснодарский край, ферма Тихорецкая",
      contractIds: ["CTR-2026-0228", "CTR-2026-0316"],
      marketValue: 1200000000,
      pledgeValue: 680000000,
      allocatedValue: 680000000,
      appraisalStatus: "Действует",
      appraisalDue: "2026-08-10",
      insuranceStatus: "Оплачена",
      insuranceDue: "2026-12-20",
      status: "В залоге",
      crossPledge: true,
      responsible: "Елена Морозова",
      updatedAt: "2026-06-08 08:52",
      source: "Триггер мониторинга",
      riskScore: 45,
      riskState: "Удовлетворительное",
      risks: risks(["ok", "warn", "warn", "ok", "warn", "ok", "warn", "ok"]),
      fields: {
        "Вид имущества": "Крупный рогатый скот",
        "Поголовье": "340 голов",
        "Метод идентификации": "Бирки и ветеринарный журнал",
        "Место содержания": "Ферма Тихорецкая",
        "Последняя сверка": "2026-06-08"
      },
      monitoring: {
        lastInspection: "2026-06-08",
        inspector: "Елена Морозова",
        condition: "Поголовье подтверждено частично",
        nextInspection: "2026-07-08",
        periodicity: "Ежемесячно",
        completed: true,
        schedule: [
          { date: "2026-06-08", type: "Плановый", result: "328 голов подтверждено", inspector: "Елена Морозова", status: "Завершен" }
        ]
      },
      evaluations: [
        { date: "2026-02-10", appraiser: "Внутренняя оценка", market: 1200000000, pledge: 680000000, method: "Справочник цен", status: "Действует" }
      ],
      insurance: {
        company: "Agro Insurance",
        policy: "AGR-26-330",
        from: "2025-12-20",
        to: "2026-12-20",
        amount: 680000000,
        premiumStatus: "Оплачена",
        source: "Конвейер"
      },
      encumbrances: [
        { number: "ZL-26/228-2", date: "2026-02-06", type: "Залог скота", amount: 520000000, contract: "BG-26/228", allocated: 520000000, ltv: 69, status: "Зарегистрировано" },
        { number: "ZL-26/316-2", date: "2026-03-18", type: "Кросс-обременение скота", amount: 160000000, contract: "LC-26/316", allocated: 160000000, ltv: 85, status: "Зарегистрировано" }
      ],
      pledgors: [
        { share: "100%", name: "АО Кубань Агро Экспорт", idn: "231 011 8454", role: "Залогодатель", check: "Проверен" }
      ],
      externalData: {
        "Источник": "Триггер мониторинга",
        "Дата проверки": "2026-06-08 08:52",
        "Сигнал мониторинга": "Расхождение по 12 головам",
        "Статус взыскания": "Нет",
        "Требование": "Повторный осмотр"
      },
      documents: [
        { name: "Ветеринарный журнал 06-2026.pdf", type: "Мониторинг", required: true, status: "Загружен", date: "2026-06-08" }
      ],
      history: [
        { date: "2026-06-08 08:52", user: "Система", field: "Поголовье", oldValue: "340", newValue: "328 подтверждено", reason: "Мобильный осмотр", source: "Триггер мониторинга" }
      ]
    },
    ...buildDemoAutoFleetCollaterals()
  ],
  tasks: [
    // Generated extended demo task queue.
    {
      id: "TSK-2026-1142",
      type: "Составление отчетности",
      title: "Сформировать отчетность по залоговому портфелю за июнь",
      collateralId: "COL-001",
      collateralIds: ["COL-001", "COL-002", "COL-003"],
      contractId: "CTR-2026-0148",
      client: "Управление залогов",
      assignee: "Сергей Иванов",
      status: "Назначена",
      dueDate: "2026-06-20",
      createdAt: "2026-06-17",
      sla: "Неделя",
      priority: "Средний",
      source: "Email",
      route: ["Почтовый сервер", "Руководитель", "Печатная форма"],
      result: "Ожидается формирование сводного отчета по статусам, видам залогов и страхованию",
      history: [
        { date: "2026-06-17 09:10", user: "Почтовый сервер", action: "Создана задача", status: "Назначена", comment: "Распознан запрос на отчетность за период" }
      ]
    },
    {
      id: "TSK-2026-1152",
      type: "Списочная переоценка",
      title: "Списочная переоценка автопарка Волга Логистик: 10 машин",
      collateralId: "COL-002",
      collateralIds: ["COL-002", "COL-006", "COL-020", "COL-021", "COL-022", "COL-023", "COL-024", "COL-025", "COL-026", "COL-027"],
      contractId: "CTR-2026-0192",
      client: "ООО Волга Логистик",
      assignee: "Анна Кузнецова",
      status: "В работе",
      dueDate: "2026-06-24",
      createdAt: "2026-06-18",
      sla: "Неделя",
      priority: "Высокий",
      source: "Расписание",
      route: ["Планировщик", "Специалист", "Руководитель"],
      result: "Требуется списочно пересчитать рыночную и залоговую стоимость 10 транспортных средств автопарка",
      listRevaluation: {
        strategy: "Автопарк 10 ТС",
        reason: "Регламентная списочная переоценка автопарка",
        valuationDate: "2026-06-19",
        method: "Рыночные источники",
        scope: "Все объекты",
        marketDelta: -8,
        pledgeMode: "От рыночной и дисконта",
        discount: 24,
        roundTo: "10 000",
        reviewThreshold: 7,
        source: "Авто.ру",
        comment: "Автоматический расчет по транспортному пулу с выделением объектов на ручную проверку.",
        excludedCollateralIds: [],
        typeDiscounts: { "Автотранспорт": 24 },
        rowOverrides: {}
      },
      documents: [
        { name: "Реестр автопарка для списочной переоценки.xlsx", target: "task" }
      ],
      history: [
        { date: "2026-06-18 08:20", user: "Планировщик", action: "Создана задача", status: "Назначена", comment: "Наступил срок списочной переоценки автопарка" },
        { date: "2026-06-18 09:05", user: "Анна Кузнецова", action: "Взята в работу", status: "В работе", comment: "Запущен расчет по 10 транспортным средствам" }
      ]
    },
    {
      id: "TSK-2026-1151",
      type: "Списочная переоценка",
      title: "Списочная переоценка смешанного пула залогов",
      collateralId: "COL-001",
      collateralIds: ["COL-001", "COL-002", "COL-004", "COL-005", "COL-008"],
      contractId: "CTR-2026-0148",
      client: "Управление залогов",
      assignee: "Анна Кузнецова",
      status: "Назначена",
      dueDate: "2026-06-25",
      createdAt: "2026-06-18",
      sla: "Неделя",
      priority: "Средний",
      source: "Расписание",
      route: ["Планировщик", "Специалист", "Руководитель"],
      result: "Смешанный пул из 5 объектов разных видов имущества подготовлен для массовой переоценки",
      listRevaluation: {
        strategy: "Смешанный пул",
        reason: "Плановая переоценка разных видов имущества",
        valuationDate: "2026-06-19",
        method: "Индексация по рынку",
        scope: "Все объекты",
        marketDelta: -5,
        pledgeMode: "От рыночной и дисконта",
        discount: 25,
        roundTo: "100 000",
        reviewThreshold: 8,
        source: "Регламентная индексация по видам имущества",
        comment: "Проверить влияние на договоры и выделить объекты, требующие индивидуальной оценки.",
        excludedCollateralIds: [],
        typeDiscounts: { "Недвижимость": 18, "Автотранспорт": 22, "Товары в обороте": 30, "Оборудование": 28, "Скот": 35 },
        rowOverrides: {}
      },
      documents: [
        { name: "Смешанный пул залогов для переоценки.xlsx", target: "task" }
      ],
      history: [
        { date: "2026-06-18 08:10", user: "Планировщик", action: "Создана задача", status: "Назначена", comment: "Сформирован пул из 5 разных объектов залога" }
      ]
    },
    {
      id: "TSK-2026-1141",
      type: "Списочная переоценка",
      title: "Массово обновить стоимость транспортного пула Волга Логистик",
      collateralId: "COL-002",
      collateralIds: ["COL-002", "COL-006"],
      contractId: "CTR-2026-0192",
      client: "ООО Волга Логистик",
      assignee: "Мария Петрова",
      status: "В работе",
      dueDate: "2026-06-22",
      createdAt: "2026-06-17",
      sla: "Неделя",
      priority: "Высокий",
      source: "Расписание",
      route: ["Планировщик", "Специалист", "Руководитель"],
      result: "Два объекта в списке, требуется подтвердить новые рыночные и залоговые стоимости",
      documents: [
        { name: "Реестр объектов для списочной переоценки.xlsx", target: "task" }
      ],
      history: [
        { date: "2026-06-17 08:00", user: "Планировщик", action: "Создана задача", status: "Назначена", comment: "Наступила дата списочной переоценки" },
        { date: "2026-06-17 10:30", user: "Мария Петрова", action: "Взята в работу", status: "В работе", comment: "Запущена сверка рыночных источников" }
      ]
    },
    {
      id: "TSK-2026-1140",
      type: "Первичный осмотр",
      title: "Проверить правоустанавливающие документы по новому объекту",
      collateralId: "COL-005",
      contractId: "CTR-2026-0228",
      client: "АО Кубань Агро Экспорт",
      assignee: "Елена Морозова",
      status: "Назначена",
      dueDate: "2026-06-19",
      createdAt: "2026-06-17",
      sla: "Неделя",
      priority: "Средний",
      source: "Конвейер",
      route: ["Конвейер", "Распознавание документов", "Специалист"],
      result: "Нужно сверить документы, внешние проверки и оценку без физического выезда",
      history: [
        { date: "2026-06-17 11:42", user: "Конвейер", action: "Создана задача", status: "Назначена", comment: "Пакет документов передан из конвейера" }
      ]
    },
    {
        "id": "TSK-2026-1132",
        "type": "Единичная переоценка",
        "title": "Переоценить складской комплекс после обновления кадастра",
        "collateralId": "COL-001",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверСклад",
        "assignee": "Анна Кузнецова",
        "status": "Назначена",
        "dueDate": "2026-06-17",
        "createdAt": "2026-06-16",
        "sla": "Сегодня",
        "priority": "Высокий",
        "source": "Триггер",
        "route": [
            "Регламент",
            "Специалист",
            "Руководитель"
        ],
        "result": "Ожидается подбор аналогов недвижимости",
        "history": [
            {
                "date": "2026-06-16 17:42",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Обновлена кадастровая выписка по объекту"
            }
        ]
    },
    {
        "id": "TSK-2026-1131",
        "type": "Первичный осмотр",
        "title": "Подтвердить новый автотранспорт из таблицы залогодателя",
        "collateralId": "COL-002",
        "contractId": "CTR-2026-0192",
        "client": "ООО Волга Логистик",
        "assignee": "Алексей Соколов",
        "status": "В работе",
        "dueDate": "2026-06-17",
        "createdAt": "2026-06-16",
        "sla": "Сегодня",
        "priority": "Критический",
        "source": "Конвейер",
        "route": [
            "Конвейер",
            "Выездной сотрудник",
            "Специалист"
        ],
        "result": "Фото VIN и шин ожидаются из мобильного АРМ",
        "history": [
            {
                "date": "2026-06-16 16:10",
                "user": "Конвейер",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Объект транспорта требует первичного подтверждения"
            }
        ]
    },
    {
        "id": "TSK-2026-1130",
        "type": "Плановый мониторинг",
        "title": "Контроль складских остатков СеверТекстиль за июнь",
        "collateralId": "COL-004",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверТекстиль",
        "assignee": "Павел Смирнов",
        "status": "Назначена",
        "dueDate": "2026-06-25",
        "createdAt": "2026-06-16",
        "sla": "Неделя",
        "priority": "Средний",
        "source": "Расписание",
        "route": [
            "Планировщик",
            "Специалист",
            "ЕСМ Банка"
        ],
        "result": "Ожидается складской акт и фото партии",
        "history": [
            {
                "date": "2026-06-16 08:00",
                "user": "Планировщик",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Ежемесячный мониторинг товаров в обороте"
            }
        ]
    },
    {
        "id": "TSK-2026-1129",
        "type": "Снятие обременения",
        "title": "Проверить основание частичного снятия по Actros",
        "collateralId": "COL-002",
        "contractId": "CTR-2026-0192",
        "client": "ООО Волга Логистик",
        "assignee": "Мария Петрова",
        "status": "На доработке",
        "dueDate": "2026-06-18",
        "createdAt": "2026-06-15",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Руководитель",
            "АБС ЦФТ"
        ],
        "result": "Требуется платежное поручение по досрочному погашению",
        "history": [
            {
                "date": "2026-06-15 14:22",
                "user": "Мария Петрова",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Запрос заемщика на частичное снятие"
            }
        ]
    },
    {
        "id": "TSK-2026-1128",
        "type": "Внеплановый мониторинг",
        "title": "Проверить рисковый сигнал по квартире Смирновой",
        "collateralId": "COL-003",
        "contractId": "CTR-2025-0771",
        "client": "Смирнова Елена Викторовна",
        "assignee": "Анна Кузнецова",
        "status": "В работе",
        "dueDate": "2026-06-18",
        "createdAt": "2026-06-15",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "Циан",
        "route": [
            "Внешний источник",
            "Специалист",
            "Руководитель"
        ],
        "result": "Проверяется расхождение рыночной цены и залоговой стоимости",
        "history": [
            {
                "date": "2026-06-15 11:18",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Рыночный сигнал по району объекта"
            }
        ]
    },
    {
        "id": "TSK-2026-1127",
        "type": "Замена залога",
        "title": "Оценить замену печатной линии на новое оборудование",
        "collateralId": "COL-007",
        "contractId": "CTR-2024-0644",
        "client": "ООО Север Принт Пак",
        "assignee": "Дмитрий Орлов",
        "status": "Назначена",
        "dueDate": "2026-06-26",
        "createdAt": "2026-06-16",
        "sla": "Норма",
        "priority": "Средний",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Оценка",
            "Руководитель",
            "АБС ЦФТ"
        ],
        "result": "Ожидается карточка нового оборудования",
        "history": [
            {
                "date": "2026-06-16 13:05",
                "user": "Дмитрий Орлов",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Заемщик запросил замену предмета залога"
            }
        ]
    },
    {
        "id": "TSK-2026-1126",
        "type": "Повторный осмотр",
        "title": "Повторно осмотреть поголовье КРС после расхождения",
        "collateralId": "COL-008",
        "contractId": "CTR-2026-0228",
        "client": "АО Кубань Агро Экспорт",
        "assignee": "Елена Морозова",
        "status": "В работе",
        "dueDate": "2026-06-18",
        "createdAt": "2026-06-16",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "Триггер мониторинга",
        "route": [
            "Monitoring",
            "Выездной сотрудник",
            "Специалист"
        ],
        "result": "Назначен повторный выезд на ферму Тихорецкая",
        "history": [
            {
                "date": "2026-06-16 09:14",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Не подтверждены 12 голов по журналу"
            }
        ]
    },
    {
        "id": "TSK-2026-1125",
        "type": "Постановка в залог",
        "title": "Зарегистрировать обременение по складскому комплексу",
        "collateralId": "COL-001",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверТекстиль",
        "assignee": "Анна Кузнецова",
        "status": "В работе",
        "dueDate": "2026-06-19",
        "createdAt": "2026-06-14",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "АБС ЦФТ",
        "route": [
            "АБС ЦФТ",
            "Специалист",
            "Инфосфера / ФНП",
            "Контроль"
        ],
        "result": "Пакет документов подготовлен к отправке",
        "history": [
            {
                "date": "2026-06-14 10:35",
                "user": "АБС ЦФТ",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Новая выдача требует регистрации залога"
            }
        ]
    },
    {
        "id": "TSK-2026-1124",
        "type": "Единичная переоценка",
        "title": "Переоценить тягач Actros по новым рыночным аналогам",
        "collateralId": "COL-002",
        "contractId": "CTR-2026-0192",
        "client": "ООО Волга Логистик",
        "assignee": "Мария Петрова",
        "status": "Назначена",
        "dueDate": "2026-06-21",
        "createdAt": "2026-06-16",
        "sla": "Неделя",
        "priority": "Средний",
        "source": "Авто.ру",
        "route": [
            "Маркетплейс",
            "Специалист",
            "Руководитель"
        ],
        "result": "Найдены 3 аналога, ожидаются корректировки эксперта",
        "history": [
            {
                "date": "2026-06-16 12:02",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Автоподбор аналогов по Mercedes-Benz Actros"
            }
        ]
    },
    {
        "id": "TSK-2026-1123",
        "type": "Плановый мониторинг",
        "title": "Проверить страхование и местонахождение Hyundai HD78",
        "collateralId": "COL-006",
        "contractId": "CTR-2026-0192",
        "client": "ООО Волга Логистик",
        "assignee": "Алексей Соколов",
        "status": "Назначена",
        "dueDate": "2026-06-24",
        "createdAt": "2026-06-16",
        "sla": "Норма",
        "priority": "Средний",
        "source": "Расписание",
        "route": [
            "Планировщик",
            "Выездной сотрудник",
            "Специалист"
        ],
        "result": "Ожидается плановый выезд",
        "history": [
            {
                "date": "2026-06-16 08:15",
                "user": "Планировщик",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Плановая проверка транспорта"
            }
        ]
    },
    {
        "id": "TSK-2026-1122",
        "type": "Первичный осмотр",
        "title": "Подтвердить печатную линию после ремонта",
        "collateralId": "COL-007",
        "contractId": "CTR-2024-0644",
        "client": "ООО Север Принт Пак",
        "assignee": "Дмитрий Орлов",
        "status": "Отложена",
        "dueDate": "2026-06-16",
        "createdAt": "2026-06-12",
        "sla": "Просрочена",
        "priority": "Высокий",
        "source": "Триггер",
        "route": [
            "Риск",
            "Специалист",
            "Мобильный осмотр"
        ],
        "result": "Представитель залогодателя перенес доступ в цех",
        "history": [
            {
                "date": "2026-06-12 15:11",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Сигнал по неоплаченному страхованию"
            }
        ]
    },
    {
        "id": "TSK-2026-1121",
        "type": "Снятие обременения",
        "title": "Закрыть обременение по части товарных остатков",
        "collateralId": "COL-004",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверТекстиль",
        "assignee": "Анна Кузнецова",
        "status": "Назначена",
        "dueDate": "2026-06-20",
        "createdAt": "2026-06-15",
        "sla": "Неделя",
        "priority": "Средний",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Руководитель",
            "АБС ЦФТ"
        ],
        "result": "Ожидается сверка лимита обременения",
        "history": [
            {
                "date": "2026-06-15 10:04",
                "user": "Анна Кузнецова",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Освобождение части партии после погашения"
            }
        ]
    },
    {
        "id": "TSK-2026-1120",
        "type": "Внеплановый мониторинг",
        "title": "Проверить фактическое состояние квартиры",
        "collateralId": "COL-003",
        "contractId": "CTR-2025-0771",
        "client": "Смирнова Елена Викторовна",
        "assignee": "Дмитрий Орлов",
        "status": "Назначена",
        "dueDate": "2026-06-19",
        "createdAt": "2026-06-14",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "Триггер",
        "route": [
            "Риск",
            "Выездной сотрудник",
            "Специалист"
        ],
        "result": "Ожидается фотофиксация объекта",
        "history": [
            {
                "date": "2026-06-14 18:30",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Просроченная оценка и судебный риск"
            }
        ]
    },
    {
        "id": "TSK-2026-1119",
        "type": "Постановка в залог",
        "title": "Проверить пакет документов по оборудованию Unitec",
        "collateralId": "COL-005",
        "contractId": "CTR-2026-0228",
        "client": "АО Кубань Агро Экспорт",
        "assignee": "Елена Морозова",
        "status": "На доработке",
        "dueDate": "2026-06-18",
        "createdAt": "2026-06-13",
        "sla": "Неделя",
        "priority": "Средний",
        "source": "Конвейер",
        "route": [
            "Конвейер",
            "Специалист",
            "Руководитель"
        ],
        "result": "Не хватает акта ввода второй линии",
        "history": [
            {
                "date": "2026-06-13 09:44",
                "user": "Конвейер",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Пакет документов неполный"
            }
        ]
    },
    {
        "id": "TSK-2026-1118",
        "type": "Единичная переоценка",
        "title": "Обновить стоимость печатной линии Heidelberg",
        "collateralId": "COL-007",
        "contractId": "CTR-2024-0644",
        "client": "ООО Север Принт Пак",
        "assignee": "Анна Кузнецова",
        "status": "В работе",
        "dueDate": "2026-06-17",
        "createdAt": "2026-06-13",
        "sla": "Сегодня",
        "priority": "Критический",
        "source": "Регламент",
        "route": [
            "Регламент",
            "Специалист",
            "Руководитель"
        ],
        "result": "Оценка готовится с учетом неоплаченной страховки",
        "history": [
            {
                "date": "2026-06-13 08:50",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Истекает срок контроля рыночной стоимости"
            }
        ]
    },
    {
        "id": "TSK-2026-1117",
        "type": "Повторный осмотр",
        "title": "Доснять фасад и идентификаторы складского комплекса",
        "collateralId": "COL-001",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверСклад",
        "assignee": "Алексей Соколов",
        "status": "Завершена",
        "dueDate": "2026-06-13",
        "createdAt": "2026-06-11",
        "sla": "Норма",
        "priority": "Средний",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Выездной сотрудник",
            "Архив"
        ],
        "result": "Фото фасада и кадастровой таблички получены",
        "history": [
            {
                "date": "2026-06-13 15:20",
                "user": "Алексей Соколов",
                "action": "Завершена",
                "status": "Завершена",
                "comment": "Материалы загружены в досье"
            }
        ]
    },
    {
        "id": "TSK-2026-1116",
        "type": "Плановый мониторинг",
        "title": "Сверить документы страхования по пулу Волга Логистик",
        "collateralId": "COL-002",
        "collateralIds": [
            "COL-002",
            "COL-006"
        ],
        "contractId": "CTR-2026-0192",
        "client": "ООО Волга Логистик",
        "assignee": "Мария Петрова",
        "status": "В работе",
        "dueDate": "2026-06-18",
        "createdAt": "2026-06-12",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "АБС ЦФТ",
        "route": [
            "АБС ЦФТ",
            "Специалист",
            "ЕСМ Банка"
        ],
        "result": "Два объекта в пуле, ожидается новый полис по Actros",
        "documents": [
            {
                "name": "Полис Actros - проект.pdf",
                "target": "COL-002"
            },
            {
                "name": "Полис Hyundai действующий.pdf",
                "target": "COL-006"
            }
        ],
        "history": [
            {
                "date": "2026-06-12 13:46",
                "user": "АБС ЦФТ",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Контроль страхования по пулу транспорта"
            }
        ]
    },
    {
        "id": "TSK-2026-1115",
        "type": "Замена залога",
        "title": "Согласовать замену части товарных остатков на оборудование",
        "collateralId": "COL-004",
        "collateralIds": [
            "COL-004",
            "COL-005"
        ],
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверТекстиль",
        "assignee": "Анна Кузнецова",
        "status": "Назначена",
        "dueDate": "2026-06-27",
        "createdAt": "2026-06-16",
        "sla": "Норма",
        "priority": "Средний",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Оценка",
            "Руководитель"
        ],
        "result": "Сформирован пул объектов для сравнения стоимости",
        "documents": [
            {
                "name": "Запрос заемщика на замену.pdf",
                "target": "task"
            },
            {
                "name": "Инвентаризационная ведомость.xlsx",
                "target": "COL-004"
            }
        ],
        "history": [
            {
                "date": "2026-06-16 15:03",
                "user": "Анна Кузнецова",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Сравнение товарных остатков и оборудования"
            }
        ]
    },
    {
        "id": "TSK-2026-1114",
        "type": "Снятие обременения",
        "title": "Передать в АБС ЦФТ снятие по закрытому лимиту",
        "collateralId": "COL-005",
        "contractId": "CTR-2026-0228",
        "client": "АО Кубань Агро Экспорт",
        "assignee": "Елена Морозова",
        "status": "Завершена",
        "dueDate": "2026-06-12",
        "createdAt": "2026-06-10",
        "sla": "Норма",
        "priority": "Средний",
        "source": "АБС ЦФТ",
        "route": [
            "Специалист",
            "АБС ЦФТ",
            "Архив"
        ],
        "result": "Снятие передано и подтверждено",
        "history": [
            {
                "date": "2026-06-12 12:10",
                "user": "Елена Морозова",
                "action": "Завершена",
                "status": "Завершена",
                "comment": "АБС ЦФТ приняла изменение обременения"
            }
        ]
    },
    {
        "id": "TSK-2026-1113",
        "type": "Первичный осмотр",
        "title": "Проверить склад хранения товарных остатков",
        "collateralId": "COL-004",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверТекстиль",
        "assignee": "Павел Смирнов",
        "status": "В работе",
        "dueDate": "2026-06-17",
        "createdAt": "2026-06-14",
        "sla": "Сегодня",
        "priority": "Высокий",
        "source": "Триггер",
        "route": [
            "Риск",
            "Специалист",
            "Фотофиксация"
        ],
        "result": "Проверяется соответствие склада B учетным данным",
        "history": [
            {
                "date": "2026-06-14 09:08",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Сигнал о движении партии без акта"
            }
        ]
    },
    {
        "id": "TSK-2026-1112",
        "type": "Плановый мониторинг",
        "title": "Плановый контроль квартиры Смирновой",
        "collateralId": "COL-003",
        "contractId": "CTR-2025-0771",
        "client": "Смирнова Елена Викторовна",
        "assignee": "Анна Кузнецова",
        "status": "Отложена",
        "dueDate": "2026-06-15",
        "createdAt": "2026-06-08",
        "sla": "Просрочена",
        "priority": "Средний",
        "source": "Расписание",
        "route": [
            "Планировщик",
            "Специалист",
            "Залогодатель"
        ],
        "result": "Представитель залогодателя не подтвердил дату доступа",
        "history": [
            {
                "date": "2026-06-15 18:40",
                "user": "Анна Кузнецова",
                "action": "Отложена",
                "status": "Отложена",
                "comment": "Ожидается согласование времени осмотра"
            }
        ]
    },
    {
        "id": "TSK-2026-1111",
        "type": "Внеплановый мониторинг",
        "title": "Проверить залоговый реестр по оборудованию Heidelberg",
        "collateralId": "COL-007",
        "contractId": "CTR-2024-0644",
        "client": "ООО Север Принт Пак",
        "assignee": "Дмитрий Орлов",
        "status": "Назначена",
        "dueDate": "2026-06-20",
        "createdAt": "2026-06-16",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "Инфосфера",
        "route": [
            "Инфосфера / ФНП",
            "Специалист",
            "Руководитель"
        ],
        "result": "Ожидается ручная сверка номера обременения",
        "history": [
            {
                "date": "2026-06-16 11:45",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Найдено расхождение статуса регистрации"
            }
        ]
    },
    {
        "id": "TSK-2026-1110",
        "type": "Постановка в залог",
        "title": "Проверить ГСЗ и залогодателей по квартире",
        "collateralId": "COL-003",
        "contractId": "CTR-2025-0771",
        "client": "Смирнова Елена Викторовна",
        "assignee": "Анна Кузнецова",
        "status": "На доработке",
        "dueDate": "2026-06-17",
        "createdAt": "2026-06-11",
        "sla": "Сегодня",
        "priority": "Критический",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Юридическая проверка",
            "Руководитель"
        ],
        "result": "Нужно обновить проверку залогодателя",
        "history": [
            {
                "date": "2026-06-11 12:00",
                "user": "Анна Кузнецова",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Дополнительная юридическая проверка"
            }
        ]
    },
    {
        "id": "TSK-2026-1109",
        "type": "Единичная переоценка",
        "title": "Контроль стоимости поголовья КРС",
        "collateralId": "COL-008",
        "contractId": "CTR-2026-0228",
        "client": "АО Кубань Агро Экспорт",
        "assignee": "Елена Морозова",
        "status": "Назначена",
        "dueDate": "2026-06-23",
        "createdAt": "2026-06-15",
        "sla": "Неделя",
        "priority": "Средний",
        "source": "Регламент",
        "route": [
            "Регламент",
            "Специалист",
            "Руководитель"
        ],
        "result": "Ожидается подтверждение поголовья перед расчетом",
        "history": [
            {
                "date": "2026-06-15 08:30",
                "user": "Система",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Контроль рыночной стоимости биологических активов"
            }
        ]
    },
    {
        "id": "TSK-2026-1108",
        "type": "Повторный осмотр",
        "title": "Повторная проверка линии Unitec после замечаний",
        "collateralId": "COL-005",
        "contractId": "CTR-2026-0228",
        "client": "АО Кубань Агро Экспорт",
        "assignee": "Алексей Соколов",
        "status": "Назначена",
        "dueDate": "2026-06-22",
        "createdAt": "2026-06-16",
        "sla": "Неделя",
        "priority": "Средний",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Выездной сотрудник",
            "Контроль"
        ],
        "result": "Ожидается выезд для проверки маркировки",
        "history": [
            {
                "date": "2026-06-16 10:21",
                "user": "Елена Морозова",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Нужна повторная фотофиксация маркировки"
            }
        ]
    },
    {
        "id": "TSK-2026-1107",
        "type": "Плановый мониторинг",
        "title": "Проверить платеж страховой премии Heidelberg",
        "collateralId": "COL-007",
        "contractId": "CTR-2024-0644",
        "client": "ООО Север Принт Пак",
        "assignee": "Анна Кузнецова",
        "status": "В работе",
        "dueDate": "2026-06-18",
        "createdAt": "2026-06-15",
        "sla": "Неделя",
        "priority": "Высокий",
        "source": "АБС ЦФТ",
        "route": [
            "АБС ЦФТ",
            "Специалист",
            "Страхование"
        ],
        "result": "Премия не подтверждена, запрошен платежный документ",
        "history": [
            {
                "date": "2026-06-15 09:36",
                "user": "АБС ЦФТ",
                "action": "Создана задача",
                "status": "Назначена",
                "comment": "Неоплаченная страховая премия"
            }
        ]
    },
    {
        "id": "TSK-2026-1106",
        "type": "Замена залога",
        "title": "Предварительно проверить новый складской объект",
        "collateralId": "COL-001",
        "contractId": "CTR-2026-0148",
        "client": "ООО СеверСклад",
        "assignee": "Павел Смирнов",
        "status": "Завершена",
        "dueDate": "2026-06-11",
        "createdAt": "2026-06-07",
        "sla": "Норма",
        "priority": "Средний",
        "source": "Вручную",
        "route": [
            "Специалист",
            "Оценка",
            "Архив"
        ],
        "result": "Предварительная проверка завершена, объект пригоден",
        "history": [
            {
                "date": "2026-06-11 17:25",
                "user": "Павел Смирнов",
                "action": "Завершена",
                "status": "Завершена",
                "comment": "Пакет предварительной проверки заполнен"
            }
        ]
    },
    {
        "id": "TSK-2026-1105",
        "type": "Снятие обременения",
        "title": "Архивировать старое обременение по квартире",
        "collateralId": "COL-003",
        "contractId": "CTR-2025-0771",
        "client": "Смирнова Елена Викторовна",
        "assignee": "Анна Кузнецова",
        "status": "Завершена",
        "dueDate": "2026-06-10",
        "createdAt": "2026-06-06",
        "sla": "Норма",
        "priority": "Низкий",
        "source": "АБС ЦФТ",
        "route": [
            "АБС ЦФТ",
            "Специалист",
            "Архив"
        ],
        "result": "Архивная запись закрыта",
        "history": [
            {
                "date": "2026-06-10 12:15",
                "user": "Анна Кузнецова",
                "action": "Завершена",
                "status": "Завершена",
                "comment": "Старое обременение перенесено в архив"
            }
        ]
    },
    {
      id: "TSK-2026-1104",
      type: "Повторный осмотр",
      title: "Проверить страхование и фото шин Actros",
      collateralId: "COL-002",
      contractId: "CTR-2026-0192",
      client: "ООО Волга Логистик",
      assignee: "Алексей Соколов",
      status: "Назначена",
      dueDate: "2026-06-20",
      createdAt: "2026-06-15",
      sla: "Неделя",
      priority: "Высокий",
      source: "Триггер",
      route: ["Автораспределение", "Выездной сотрудник", "Контроль специалиста"],
      result: "Ожидает осмотра",
      history: [
        { date: "2026-06-15 15:49", user: "Система", action: "Создана задача", status: "Назначена", comment: "Сработал риск истечения страховки" }
      ]
    },
    {
      id: "TSK-2026-1098",
      type: "Единичная переоценка",
      title: "Переоценка квартиры по просроченному отчету",
      collateralId: "COL-003",
      contractId: "CTR-2025-0771",
      client: "Смирнова Елена Викторовна",
      assignee: "Анна Кузнецова",
      status: "В работе",
      dueDate: "2026-06-17",
      createdAt: "2026-06-12",
      sla: "Сегодня",
      priority: "Критический",
      source: "Регламент",
      route: ["Специалист", "Руководитель"],
      result: "Аналоги загружены частично",
      history: [
        { date: "2026-06-12 11:07", user: "Система", action: "Создана задача", status: "Назначена", comment: "Окончание срока оценки" },
        { date: "2026-06-13 09:30", user: "Анна Кузнецова", action: "Взята в работу", status: "В работе", comment: "Запущен поиск аналогов Циан" }
      ]
    },
    {
      id: "TSK-2026-1081",
      type: "Плановый мониторинг",
      title: "Складская сверка товаров СеверТекстиль",
      collateralId: "COL-004",
      contractId: "CTR-2026-0148",
      client: "ООО СеверТекстиль",
      assignee: "Павел Смирнов",
      status: "Отложена",
      dueDate: "2026-06-14",
      createdAt: "2026-06-01",
      sla: "Просрочена",
      priority: "Средний",
      source: "Расписание",
      route: ["Специалист", "ЕСМ Банка"],
      result: "Ожидается складской акт от залогодателя",
      history: [
        { date: "2026-06-01 08:00", user: "Система", action: "Создана задача", status: "Назначена", comment: "Ежемесячный мониторинг" },
        { date: "2026-06-13 18:12", user: "Павел Смирнов", action: "Отложена", status: "Отложена", comment: "Нет складского акта" }
      ]
    },
    {
      id: "TSK-2026-1055",
      type: "Постановка в залог",
      title: "Передать складской комплекс в АБС ЦФТ",
      collateralId: "COL-001",
      contractId: "CTR-2026-0148",
      client: "ООО СеверТекстиль",
      assignee: "Анна Кузнецова",
      status: "В работе",
      dueDate: "2026-06-18",
      createdAt: "2026-06-10",
      sla: "Неделя",
      priority: "Высокий",
      source: "Конвейер",
      route: ["Конвейер", "Специалист", "АБС ЦФТ"],
      result: "Регистрационные данные проверены",
      history: [
        { date: "2026-06-10 10:00", user: "Конвейер", action: "Создана задача", status: "Назначена", comment: "Новая выдача KM-26/148" }
      ]
    },
    {
      id: "TSK-2026-1022",
      type: "Снятие обременения",
      title: "Снять ограничение по старому договору",
      collateralId: "COL-006",
      contractId: "CTR-2026-0192",
      client: "ООО Волга Логистик",
      assignee: "Мария Петрова",
      status: "На доработке",
      dueDate: "2026-06-19",
      createdAt: "2026-06-11",
      sla: "Неделя",
      priority: "Средний",
      source: "Вручную",
      route: ["Специалист", "Руководитель", "АБС ЦФТ"],
      result: "Не приложено основание снятия",
      history: [
        { date: "2026-06-11 14:10", user: "Мария Петрова", action: "Создана задача", status: "Назначена", comment: "Запрос заемщика" },
        { date: "2026-06-12 17:00", user: "Сергей Иванов", action: "Вернул", status: "На доработке", comment: "Нет основания снятия" }
      ]
    },
    {
      id: "TSK-2026-0999",
      type: "Первичный осмотр",
      title: "Осмотреть линию сортировки Unitec",
      collateralId: "COL-005",
      contractId: "CTR-2026-0228",
      client: "АО Кубань Агро Экспорт",
      assignee: "Елена Морозова",
      status: "Завершена",
      dueDate: "2026-06-09",
      createdAt: "2026-06-05",
      sla: "Норма",
      priority: "Средний",
      source: "Конвейер",
      route: ["Конвейер", "Выездной сотрудник", "Специалист"],
      result: "Оборудование подтверждено",
      history: [
        { date: "2026-06-05 12:30", user: "Конвейер", action: "Создана задача", status: "Назначена", comment: "Новая гарантия" },
        { date: "2026-06-09 16:20", user: "Елена Морозова", action: "Завершена", status: "Завершена", comment: "Фото и GPS получены" }
      ]
    },
    {
      id: "TSK-2026-0987",
      type: "Внеплановый мониторинг",
      title: "Проверить поголовье КРС после сигнала Monitoring",
      collateralId: "COL-008",
      contractId: "CTR-2026-0228",
      client: "АО Кубань Агро Экспорт",
      assignee: "Елена Морозова",
      status: "Назначена",
      dueDate: "2026-06-21",
      createdAt: "2026-06-16",
      sla: "Неделя",
      priority: "Высокий",
      source: "Триггер мониторинга",
      route: ["Monitoring", "Выездной сотрудник", "Специалист"],
      result: "Ожидает осмотра",
      history: [
        { date: "2026-06-16 08:52", user: "Система", action: "Создана задача", status: "Назначена", comment: "Расхождение по 12 головам" }
      ]
    },
    {
      id: "TSK-2026-0974",
      type: "Замена залога",
      title: "Сравнить старый и новый объект обеспечения",
      collateralId: "COL-007",
      contractId: "CTR-2024-0644",
      client: "ООО Север Принт Пак",
      assignee: "Дмитрий Орлов",
      status: "В работе",
      dueDate: "2026-06-24",
      createdAt: "2026-06-14",
      sla: "Норма",
      priority: "Средний",
      source: "Вручную",
      route: ["Специалист", "Руководитель", "АБС ЦФТ"],
      result: "Новый объект ожидает внешнюю проверку",
      history: [
        { date: "2026-06-14 09:25", user: "Дмитрий Орлов", action: "Создана задача", status: "Назначена", comment: "Запрос на замену оборудования" }
      ]
    }
  ],
  integrations: [
    {
      id: "email",
      name: "Почтовый сервер Банка",
      group: "Внутренняя",
      status: "Успешно",
      lastSync: "2026-06-17 09:10",
      nextSync: "Каждые 5 минут",
      method: "Скачивание входящих писем с определенного ящика",
      fields: 18,
      imported: 4,
      errors: 1,
      logs: [
        { time: "2026-06-17 09:10", result: "Успешно", object: "TSK-2026-1142", message: "Письмо распознано, задача на отчетность создана" },
        { time: "2026-06-17 08:55", result: "Ошибка", object: "EMAIL-445", message: "Нет обязательного маркера типа задачи" }
      ]
    },
    {
      id: "ocr",
      name: "Система распознавания документов",
      group: "Внутренняя",
      status: "Успешно",
      lastSync: "2026-06-17 11:42",
      nextSync: "По вложению",
      method: "Асинхронная отправка документа и получение результата",
      fields: 50,
      imported: 12,
      errors: 0,
      logs: [
        { time: "2026-06-17 11:42", result: "Успешно", object: "TSK-2026-1140", message: "Извлечены реквизиты правоустанавливающего документа" }
      ]
    },
    {
      id: "ecm",
      name: "ЕСМ Банка",
      group: "Внутренняя",
      status: "Прототип",
      lastSync: "2026-06-16 18:20",
      nextSync: "По документу",
      method: "Хранение и получение документов залогового досье",
      fields: 20,
      imported: 9,
      errors: 0,
      logs: [
        { time: "2026-06-16 18:20", result: "Успешно", object: "COL-001", message: "Документы карточки синхронизированы с досье" }
      ]
    },
    {
      id: "avito",
      name: "Авито",
      group: "Внешняя",
      status: "Прототип",
      lastSync: "2026-06-17 10:30",
      nextSync: "По задаче оценки",
      method: "Поиск объявлений и получение статистики цен для транспорта, спецтехники и оборудования",
      fields: 30,
      imported: 5,
      errors: 0,
      logs: [
        { time: "2026-06-17 10:30", result: "Успешно", object: "TSK-2026-1141", message: "Найдены аналоги для транспортного пула" }
      ]
    },
    {
      id: "auto-ru",
      name: "Авто.ру",
      group: "Внешняя",
      status: "Прототип",
      lastSync: "2026-06-17 10:31",
      nextSync: "По задаче оценки",
      method: "Получение средней цены автомобиля",
      fields: 15,
      imported: 2,
      errors: 0,
      logs: [
        { time: "2026-06-17 10:31", result: "Успешно", object: "COL-002", message: "Средняя цена передана в расчет оценки" }
      ]
    },
    {
      id: "yandex-realty",
      name: "Яндекс Недвижимость",
      group: "Внешняя",
      status: "Прототип",
      lastSync: "2026-06-16 12:15",
      nextSync: "По задаче оценки",
      method: "Оценка недвижимости и поиск аналогов",
      fields: 30,
      imported: 3,
      errors: 0,
      logs: [
        { time: "2026-06-16 12:15", result: "Успешно", object: "COL-003", message: "Получены аналоги квартиры" }
      ]
    },
    {
      id: "cian",
      name: "Циан",
      group: "Внешняя",
      status: "Предупреждение",
      lastSync: "2026-06-16 12:16",
      nextSync: "Повтор вручную",
      method: "Оценка объекта недвижимости и поиск аналогов",
      fields: 30,
      imported: 2,
      errors: 1,
      logs: [
        { time: "2026-06-16 12:16", result: "Предупреждение", object: "COL-003", message: "Один аналог исключен как дубль" }
      ]
    },
    {
      id: "egrn",
      name: "Сервис данных ЕГРН",
      group: "Внешняя",
      status: "Прототип",
      lastSync: "2026-06-16 07:50",
      nextSync: "По запросу",
      method: "Получение сведений о недвижимости и ограничениях",
      fields: 40,
      imported: 2,
      errors: 1,
      logs: [
        { time: "2026-06-16 07:50", result: "Ошибка", object: "COL-003", message: "Источник вернул временную ошибку" }
      ]
    },
    {
      id: "spectrum-auto",
      name: "SpectrumData: авто",
      group: "Внешняя",
      status: "Успешно",
      lastSync: "2026-06-17 10:40",
      nextSync: "По VIN",
      method: "Рыночная цена ТС с учетом истории эксплуатации",
      fields: 30,
      imported: 6,
      errors: 0,
      logs: [
        { time: "2026-06-17 10:40", result: "Успешно", object: "COL-002", message: "Оптимальное значение стоимости ТС получено" }
      ]
    },
    {
      id: "spectrum-realty",
      name: "SpectrumData: недвижимость",
      group: "Внешняя",
      status: "Прототип",
      lastSync: "2026-06-16 12:20",
      nextSync: "По кадастровому номеру",
      method: "Инициирование проверки недвижимости и получение результата",
      fields: 30,
      imported: 2,
      errors: 0,
      logs: [
        { time: "2026-06-16 12:20", result: "Успешно", object: "COL-001", message: "Кадастровые характеристики сопоставлены" }
      ]
    },
    {
      id: "mobile-appraiser",
      name: "Мобильный оценщик",
      group: "Внешняя",
      status: "Прототип",
      lastSync: "2026-06-16 12:35",
      nextSync: "По объекту недвижимости",
      method: "Получение оценки стоимости недвижимости",
      fields: 18,
      imported: 1,
      errors: 0,
      logs: [
        { time: "2026-06-16 12:35", result: "Успешно", object: "COL-003", message: "Оценка недвижимости получена" }
      ]
    },
    {
      id: "infosphere",
      name: "Инфосфера",
      group: "Внешняя",
      status: "Успешно",
      lastSync: "2026-06-17 07:30",
      nextSync: "По проверке",
      method: "Проверка собственников и объектов через ФНП",
      fields: 20,
      imported: 8,
      errors: 0,
      logs: [
        { time: "2026-06-17 07:30", result: "Успешно", object: "Портфель", message: "Проверка объектов и собственников завершена" }
      ]
    },
    {
      id: "abs",
      name: "АБС ЦФТ",
      group: "Внутренняя",
      status: "Успешно",
      lastSync: "2026-06-16 06:30",
      nextSync: "2026-06-17 06:30",
      method: "Проверка на дубли, создание залога под форму 0409310, привязка залога к кредиту",
      fields: 60,
      imported: 42,
      errors: 1,
      logs: [
        { time: "2026-06-16 06:30", result: "Успешно", object: "42 сделки", message: "Проверка дублей и привязка залогов выполнены" },
        { time: "2026-06-15 06:30", result: "Ошибка", object: "COL-003", message: "Не совпал формат даты оценки, строка пропущена" }
      ]
    },
    {
      id: "conveyor",
      name: "Конвейеры",
      group: "Внутренняя",
      status: "Успешно",
      lastSync: "2026-06-16 10:15",
      nextSync: "По событию",
      method: "API: создание задачи на залог, передача файлов документов, получение вердикта",
      fields: 100,
      imported: 7,
      errors: 0,
      logs: [
        { time: "2026-06-16 10:15", result: "Успешно", object: "TSK-2026-1055", message: "Создана задача постановки в залог" }
      ]
    }
  ],
  importRows: [
    { row: 2, collateralId: "COL-009", type: "Автотранспорт", owner: "ООО Урал Доставка", contract: "AV-26/240", status: "Создать", message: "Новый VIN, проверка SpectrumData доступна" },
    { row: 3, collateralId: "COL-003", type: "Недвижимость", owner: "Смирнова Е.В.", contract: "IP-25/771", status: "Обновить", message: "Обновить дату оценки и рыночную стоимость" },
    { row: 4, collateralId: "", type: "Оборудование", owner: "ООО Нью Пласт", contract: "KL-26/331", status: "Ошибка", message: "Не заполнен ID залога" },
    { row: 5, collateralId: "COL-010", type: "Ценные бумаги", owner: "АО Капитал Инвест", contract: "BG-26/260", status: "Ошибка", message: "Тип залога не входит в согласованный шаблон" },
    { row: 6, collateralId: "COL-007", type: "Оборудование", owner: "ООО Север Принт Пак", contract: "KL-24/644", status: "Обновить", message: "Обновить статус страхования" }
  ],
  audit: [
    { date: "2026-06-16 10:15", user: "Конвейер", object: "TSK-2026-1055", action: "Создание задачи", oldValue: "-", newValue: "Назначена", source: "API конвейера" },
    { date: "2026-06-16 08:52", user: "Система", object: "COL-008", action: "Сигнал риска", oldValue: "Нет", newValue: "Расхождение поголовья", source: "Триггер мониторинга" },
    { date: "2026-06-15 15:45", user: "Система", object: "COL-002", action: "Сигнал риска", oldValue: "Нет", newValue: "Истечение страховки", source: "АБС ЦФТ" },
    { date: "2026-06-13 18:12", user: "Павел Смирнов", object: "TSK-2026-1081", action: "Отложение задачи", oldValue: "В работе", newValue: "Отложена", source: "АРМ" },
    { date: "2026-06-12 17:00", user: "Сергей Иванов", object: "TSK-2026-1022", action: "Возврат задачи", oldValue: "В работе", newValue: "На доработке", source: "АРМ руководителя" }
  ],
  comments: [
    { object: "COL-003", date: "2026-06-13 09:40", user: "Анна Кузнецова", text: "Нужно запросить свежую кадастровую выписку перед завершением переоценки." },
    { object: "TSK-2026-1104", date: "2026-06-15 16:05", user: "Мария Петрова", text: "Попросила страхователя подготовить обновленный страховой полис." }
  ]
};

export const reportCatalog = [
  {
    id: "tasks",
    name: "Отчет руководителя по задачам подразделения",
    parameters: ["Период", "Подразделение", "Статус", "Тип задачи"],
    rows: [
      ["Анна Кузнецова", "4", "1", "2", "94%"],
      ["Павел Смирнов", "3", "1", "1", "88%"],
      ["Мария Петрова", "2", "0", "1", "91%"],
      ["Елена Морозова", "3", "0", "2", "97%"]
    ],
    headers: ["Сотрудник", "Всего задач", "Просрочено", "Завершено", "SLA"]
  },
  {
    id: "employees",
    name: "Отчет по сотрудникам",
    parameters: ["Период", "Регион", "Роль"],
    rows: [
      ["Алексей Соколов", "Выездные осмотры", "6", "5", "1"],
      ["Дмитрий Орлов", "Специалисты", "5", "4", "0"],
      ["Анна Кузнецова", "Специалисты", "7", "5", "1"]
    ],
    headers: ["Сотрудник", "Роль", "Назначено", "Закрыто", "Возвраты"]
  },
  {
    id: "collaterals",
    name: "Отчет по видам залогов",
    parameters: ["Период", "Тип залога", "ГСЗ"],
    rows: [
      ["Недвижимость", "2", "5 240 000 000", "1", "94%"],
      ["Автотранспорт", "2", "1 760 000 000", "1", "89%"],
      ["Оборудование", "2", "7 350 000 000", "1", "74%"],
      ["Товары в обороте", "1", "1 000 000 000", "0", "70%"],
      ["Скот", "1", "1 200 000 000", "0", "56%"]
    ],
    headers: ["Тип залога", "Кол-во", "Рыночная стоимость", "Критические", "Средний LTV"]
  }
];

export const marketAnalogs = [
  { type: "Автотранспорт", source: "Авто.ру", object: "Mercedes-Benz Actros 1845 2021", subtype: "Седельный тягач", price: 955000000, correction: "+2.5%", result: 979000000, region: "Нижний Новгород", condition: "Пробег 148 тыс. км, состояние хорошее" },
  { type: "Автотранспорт", source: "Авто.ру", object: "Mercedes-Benz Actros 1845 2022", subtype: "Седельный тягач", price: 990000000, correction: "-1.0%", result: 980100000, region: "Нижний Новгород", condition: "Пробег 132 тыс. км, состояние хорошее" },
  { type: "Автотранспорт", source: "Авито", object: "Hyundai HD78 2021", subtype: "Грузовой автомобиль", price: 635000000, correction: "+1.5%", result: 644525000, region: "Нижний Новгород", condition: "Пробег 96 тыс. км, состояние сопоставимое" },
  { type: "Недвижимость", source: "Циан", object: "Квартира 3 комн., Москва, Хамовники", subtype: "Квартира", price: 1080000000, correction: "-3.0%", result: 1047600000, region: "Москва", condition: "Площадь и локация сопоставимы" },
  { type: "Недвижимость", source: "Циан", object: "Квартира 3 комн., Москва, Пресня", subtype: "Квартира", price: 1025000000, correction: "+1.0%", result: 1035250000, region: "Москва", condition: "Сопоставимое состояние отделки" },
  { type: "Недвижимость", source: "Яндекс Недвижимость", object: "Складской комплекс, Московская область", subtype: "Складская недвижимость", price: 4120000000, correction: "-2.0%", result: 4037600000, region: "Московская область", condition: "Класс и удаленность сопоставимы" },
  { type: "Оборудование", source: "Авито", object: "Линия упаковки Unitec 2021", subtype: "Упаковочная линия", price: 1780000000, correction: "+1.0%", result: 1797800000, region: "Краснодар", condition: "Производительность и год выпуска сопоставимы" },
  { type: "Оборудование", source: "Авито", object: "Печатная линия Heidelberg XL 2019", subtype: "Печатная линия", price: 3650000000, correction: "-2.5%", result: 3558750000, region: "Москва", condition: "Состояние после сервисного обслуживания" },
  { type: "Оборудование", source: "Экспертный подбор", object: "Фасовочная линия пищевого производства 2020", subtype: "Упаковочная линия", price: 1215000000, correction: "+0.5%", result: 1221075000, region: "Краснодар", condition: "Назначение и мощность сопоставимы" },
  { type: "Товары в обороте", source: "Экспертный подбор", object: "Партия текстиля летнего ассортимента", subtype: "Текстиль", price: 690000000, correction: "-1.0%", result: 683100000, region: "Московская область", condition: "Срок хранения и ликвидность сопоставимы" },
  { type: "Товары в обороте", source: "Экспертный подбор", object: "Складской остаток упаковочных материалов", subtype: "Упаковочные материалы", price: 735000000, correction: "+0.5%", result: 738675000, region: "Московская область", condition: "Номенклатура и оборачиваемость сопоставимы" },
  { type: "Скот", source: "Экспертный подбор", object: "КРС молочного направления, партия 320 голов", subtype: "КРС", price: 515000000, correction: "+1.0%", result: 520150000, region: "Краснодар", condition: "Возраст и ветеринарный статус сопоставимы" },
  { type: "Скот", source: "Экспертный подбор", object: "Племенной скот, партия 300 голов", subtype: "КРС", price: 548000000, correction: "-2.0%", result: 537040000, region: "Краснодар", condition: "Порода и продуктивность сопоставимы" }
];
