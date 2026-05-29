## 6. Enterprise Data Models (EDM)

### Проблем без EDM

- Секоја апликација/оддел има сопствен data model → **интеграциски хаос**
- Ист објект / Различно име → тежок за интеграција
- Различни интерфејси, репрезентации, дупликати

### Дефиниција на EDM

- **EDM** = **интегриран поглед на податоците** произведени и консумирани низ целата организација
- Независен од апликациите и технологијата
- Обезбедува единечна дефиниција за секој елемент на податоци
- **Задолжителен** за data integration — основа за сите останати системи

### Нивоа на EDM

| Ниво        | Назив                   | Опис                                                                                   |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------- |
| **Level 1** | Subject Area Model      | Највисоко ниво на апстракција; главни области на интерес (Revenue, Operation, Support) |
| **Level 2** | Conceptual Model        | Business концепти поврзани со Subject Areas                                            |
| **Level 3** | Conceptual Entity Model | Концепти дефинирани како business entities со врски                                    |

### Современи предизвици за EDM

1. **Data Quality** (квалитет на податоци)
2. **Data Ownership** (сопственост на податоци)
3. **Data Integration** (интеграција на податоци)
4. **Strategic Systems Planning** (стратешко планирање)

> Забелешка: **Data System Extensibility НЕ е** вклучена во стандардниот список

### Придобивки од EDM

- Елиминирање на хаос
- Градење стабилна основа за другите системи
- Единствена дефиниција на секој податочен елемент

---

## 7. Data vs Information Architecture

### Data vs Information

|            | Data                               | Information                                      |
| ---------- | ---------------------------------- | ------------------------------------------------ |
| Дефиниција | Сирови, **некатегоризирани** факти | Неколку парчиња податоци во **значаен контекст** |

### Типови на модели на податоци

- **Conceptual** — сите деловни ентитети
- **Logical** — врски меѓу ентитетите
- **Physical** — реализација / имплементација

### Data Model vs Data Architecture

|       | Data Model                               | Data Architecture                                 |
| ----- | ---------------------------------------- | ------------------------------------------------- |
| Фокус | **Репрезентација, точност, доверливост** | **Алатки, платформи, инфраструктура, безбедност** |

### Data Architecture — Процеси

1. **Conceptual** — сите деловни ентитети
2. **Logical** — како ентитетите се поврзуваат
3. **Physical** — реализација и имплементација

### Data Architecture Management

- **Inputs**: бизнис цели, стратегии, IT цели, data issues
- **Outputs**: EDM, DW/BI архитектура, metadata архитектура
- **Participants**: Data Stewards, SMEs, DBA, Data Architects

### Чинители во Data Architecture (7)

1. Data Architect
2. Project Manager
3. Solution Architect
4. Cloud Architect / Data Center Engineer
5. DBA / Data Engineer
6. Data Analyst
7. Data Scientists

### Enterprise Information Architecture (EIA)

- Ги **поврзува** data, application и technical архитектурата со **стратешкиот план**
- Логичка организација на информации за: стратешки цели, бизнис правила, барања, апликациски системи, технолошка инфраструктура

---

## 8. Information Architecture (IA)

### Компоненти на IA (4)

1. **Organization systems** (организациски системи)
2. **Labeling systems** (системи за означување)
3. **Navigation systems** (навигациски системи)
4. **Searching systems** (системи за пребарување)

> **Security systems НЕ е компонента** на Information Architecture

### 8 Принципи на IA Дизајн

1. **Objects** — содржината е предмет со животен циклус
2. **Choices** — мали количини значајни опции
3. **Disclosure** — покажи само тоа што е потребно
4. **Exemplars** — примери за прикажување на содржина
5. **Front Doors** — корисниците влегуваат од различни места
6. **Multiple Classifications** — различни начини за пристап до истата содржина
7. **Focused Navigation** — не мешај различни навигациски системи
8. **Growth** — дизајнирај за раст на содржина

### Content Organization — Модели (6)

1. Single page
2. Flat
3. Index
4. Daisy (Moodle)
5. Strict hierarchy (Moodle)
6. Multidimensional hierarchy (Wikipedia)

### Content Organization — Шеми

- По тема (topic)
- По задача
- По аудиториум
- По метафора
- Хибридни комбинации

---

## 9. Data Architecture Frameworks

### TOGAF (The Open Group Architecture Framework)

**ADM Фази:**

| Фаза        | Назив                                            |
| ----------- | ------------------------------------------------ |
| Preliminary | Подготовка                                       |
| **A**       | Architecture Vision                              |
| **B**       | Business Architecture                            |
| **C**       | Information Systems Architectures                |
| — **C1**    | **Data Architecture**                            |
| — **C2**    | Solutions / Application Architecture             |
| **D**       | Technology Architecture                          |
| **E**       | Opportunities and Solutions                      |
| **F**       | Migration Planning                               |
| **G**       | Implementation Governance                        |
| **H**       | Architecture Change Management                   |
| +           | **Requirements Management** (централна, тековна) |

#### TOGAF Phase C1 (Data Architecture)

- Дефинира **главни типови и извори на податоци**
- **НЕ** се занимава со логичко/физичко дизајнирање на складирање

**Клучни разгледувања:**

- **Data Management** — управување со податоците
- **Data Migration** — миграција при транзиции
- **Data Governance** → Structure + Management System + People

### DAMA-DMBOK2

**11 Knowledge Areas** (центар: Data Governance):

1. Data Governance
2. Data Architecture
3. Data Modeling & Design
4. Data Storage & Operations
5. Data Security
6. Data Integration & Interoperability
7. Documents & Content
8. Reference & Master Data
9. Data Warehousing & Business Intelligence
10. Metadata
11. Data Quality

> **Network Management НЕ е** Knowledge Area на DAMA-DMBOK2

**DMBOK Environmental Elements (7):**
Goals and Principles, Activities, Primary Deliverables, Roles and Responsibilities, Practices and Techniques, Technology, Organisation and Culture

### Zachman Framework

**6 Прашања (колони):**
`What` (податоци) | `How` (процеси) | `Where` (мрежа) | `Who` (луѓе) | `When` (времиња) | `Why` (мотивација)

**6 Перспективи (редови):**

1. Executive / Planner (Scope)
2. Business / Owner
3. Architect / Designer → E/R модел, нормализација, вкрстување со процесни ентитети
4. Engineer / Builder
5. Technician / Subcontractor
6. Enterprise

### Data Governance — 3 аспекти

1. **Структура** (Structure)
2. **Систем за управување** (Management System)
3. **Луѓе** (People)

---

## 10. Data Warehouses и ETL

### OLTP vs Data Warehouse

|          | OLTP / DBMS                            | Data Warehouse                            |
| -------- | -------------------------------------- | ----------------------------------------- |
| Цел      | Брзи трансакции (insert/update/delete) | Брзо извлекување и **анализа**            |
| Податоци | Тековни активни                        | Историски (snapshot)                      |
| Операции | Read/Write                             | Append-only / Read                        |
| Волумен  | Мал-среден                             | Голем (GB, TB)                            |
| Примена  | OLTP                                   | OLAP, Data Mining, Information Processing |

### Data Warehouse (W.H. Inmon, 1992) — 4 карактеристики

- **Subject-oriented** — организиран по теми
- **Integrated** — обединети податоци од различни извори
- **Time-variant** — историски податоци, snapshot
- **Non-volatile** — само читање; **не се менува** откако ќе се запише; ретко се ажурира; може append-only

### Star Schema

- Популарен избор при моделирање на DW
- Овозможува **високи перформанси** при аналитички прашања

### Два пристапи

|        | Query-Driven (Lazy)                | Warehousing (Eager)          |
| ------ | ---------------------------------- | ---------------------------- |
| Начин  | On-demand, wrappers                | Унапред интегрирани          |
| Статус | **Не се прифатил** во индустријата | **Прифатен** во индустријата |

### DW Архитектури

| Архитектура      | Опис                                                   |
| ---------------- | ------------------------------------------------------ |
| **Single-layer** | Виртуелен DW, секој елемент складиран еднаш            |
| **Two-layer**    | Real-time + Derived слој; **најчеста** во индустријата |
| **Three-layer**  | Real-time → Reconciled → Derived                       |

### ETL (Extract, Transform, Load)

1. **Extract** — екстракција на податоци од извори
2. **Transform** — трансформација / чистење
3. **Load** — вчитување во Data Warehouse

> DW процес: Екстракција → Чистење → Трансформација → Вчитување

---

## 11. Data Lake vs Data Warehouse

|                 | Data Lake                                                         | Data Warehouse                                     |
| --------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| Тип на податоци | Сите: структурирани, полу-, неструктурирани во **нативен формат** | Структурирани, обработени за специфична намена     |
| Волумен         | Без ограничувања на големина                                      | Голем, но организиран                              |
| Корисници       | **Data Scientists, Data Engineers**                               | **Data Analysts, Business Analysts**               |
| Кога е подобар  | Big Data, ML/AI, брзина над точност                               | Единствен извор на вистина, self-service, квалитет |

---

## 12. Big Data

### 3Vs (примарни карактеристики)

- **Volume** (обем)
- **Velocity** (брзина)
- **Variety** (разновидност)

> Big Data 3Vs ги предизвикуваат традиционалните архитектури

### Big Data Архитектура

```
[Data Sources]
     ↓
[Data Storage] + [Real-time Message Ingestion]
     ↓
[Batch Processing] + [Stream Processing]
     ↓
[Analytical Data Store]
     ↓
[Analytics and Reporting]
     ↑ (Orchestration слој низ сè)
```

---

## 13. Data Integration Методологии

### Дефиниција

- Data Integration = **обединување на податоци од повеќе извори** во еден веродостоен поглед

### Придобивки

- Подобрена соработка
- Заштеда на време и ефикасност
- Намалување на грешки
- Поквалитетни информации

### Методи и нивни случаи на употреба

| Метод                 | Кога                             | Предности                                      | Ограничувања                                    |
| --------------------- | -------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| **Manual**            | Мал број извори, основна анализа | Намалени трошоци, поголема слобода             | Помалку пристап, тешко скалирање, повеќе грешки |
| **Middleware**        | Legacy и модерни системи         | Подобро streaming, полесен пристап             | —                                               |
| **Application-based** | Комплексна аналитика             | —                                              | Техничко знаење, варијации, тежок setup         |
| **Uniform Access**    | Кога не сакаш да копираш         | Retrieve без копирање, остава во извор         | —                                               |
| **Common Storage**    | Кога постојат ресурси            | **Најсофистицирана**, длабоки аналитички увиди | Потребни ресурси                                |

> **Common Storage** = нај-препорачана кога постојат ресурси — прави копија и овозможува најсложени аналитички прашања

---

## 14. Cloud Computing

### Предности (7)

1. Независност на уред
2. Секогаш последна верзија
3. Групна соработка
4. Веродостојност на податоци
5. **Речиси неограничено** складирање (скалабилно)
6. Моментални ажурирања
7. Компатибилност на документи

---

## 15. Практични технички теми

### NLog (Logging)

**3 главни targets:**

- **File** (датотека)
- **Console** (конзола)
- **Database** (база на податоци)

### C# ASP.NET MVC — Data Annotations

| Атрибут             | Употреба           |
| ------------------- | ------------------ |
| `[Required]`        | Задолжително поле  |
| `[MinLength(5)]`    | Минимална должина  |
| `[StringLength(n)]` | Максимална должина |

### Entity Framework — Миграции

- Промените во моделот се применуваат преку: **Креирање миграција** + **Извршување команда за ажурирање на база**
- НЕ се ажурира автоматски при зачувување на C# фајлот

### BPM (Business Process Modeling/Management)

- Методологија за моделирање, анализа и оптимизација на бизнис процеси

---

## Брза референца — Клучни поими

### Интеграција — видови

`Point-to-Point (не SI)` | `Vertical/Silo` | `Horizontal/ESB` | `Orchestration` | `API` | `Webhooks` | `ISC`

### ERP еволуција

`MRP` → `MRP II` → `ERP` → `ERP II`

### EDM нивоа

`L1: Subject Area` → `L2: Conceptual` → `L3: Conceptual Entity`

### Data Architecture Frameworks

`DAMA-DMBOK2` (11 KAs) | `Zachman` (6×6 матрица) | `TOGAF` (ADM фази A–H)

### DW пристапи

`Query-Driven (не прифатен)` vs `Warehousing/Eager (прифатен)`

### Data Integration методи (по сложеност)

`Manual` → `Middleware` → `Application` → `Uniform Access` → `Common Storage (нај-софистициран)`
