# СКИТ — Преглед на материјалот (Mind Map)

---

## 1. Основи на тестирање

### Дефиниции
- **Testing** = Execution + observation (не е исто со debugging или fixing)
- **Debugging** = Finding fault (лоцирање на изворот по забележан failure)
- Testing не може да докаже дека нема грешки — само ја покажува **присутноста** на failures

### Fault / Error / Failure
- **Fault** → статичка грешка во кодот (дефект)
- **Error** → некоректна **внатрешна** состојба на програмата (создадена од fault)
- **Failure** → некоректно **надворешно** однесување на софтверот (видливо за корисникот)

### RIPR модел (4 услови за failure)
- **R**eachability → тестот мора да го достигне местото со fault
- **I**nfection → fault мора да создаде некоректна внатрешна состојба
- **P**ropagation → некоректната состојба мора да влијае на output
- **R**eveal → тестерот / oracle мора да ја **забележи** грешката

> Ако нема failure, тоа **не значи** дека нема fault — fault може да постои, но RIPR да не е исполнет.

### Практични факти
- Цената за поправање bugs **расте** колку подоцна се откријат
- Testing е **најскап и најдолг** дел од развојот на софтвер
- **Early test design** → faults се наоѓаат рано и поевтино се поправаат

---

## 2. Test Process Maturity Levels

| Ниво | Карактеристика |
|------|----------------|
| **Level 0** | Testing = Debugging (не се прави разлика) |
| **Level 1** | Цел: докажи correctness — проблем: ако нема failures, не знаеш дали е добар или тестовите се лоши |
| **Level 2** | Testing = негативна активност → adversarial однос меѓу testers и developers |
| **Level 4** | Testing = ментална дисциплина; тестерите го **мерат и подобруваат** квалитетот |

---

## 3. Verification vs Validation

- **Verification** → "Build the product **right**" (спрема спецификацијата)
- **Validation** → "Build the **right** product" (спрема корисничките потреби)

### Кога нема спецификација
- Не може да се верификува — нема формален референтен опис
- Може да се **explore** и делумно **валидира** спрема кориснички очекувања
- Решение: разговор со корисници, документирање претпоставки, подобрување на ситуацијата паралелно

---

## 4. Coverage Criteria — Основни поими

### Клучни дефиниции
- **Coverage Criterion** → правило (или збир правила) дефинирачко **тест requirements** — кажува **ШТО** мора да се покрие
- **Test Requirement (TR)** → конкретна работа (node, edge, def-use пар) која мора да биде покриена
- **Coverage Level** = **A / B** (A = задоволени TR; B = вкупни TR)

### Два начини на употреба на criteria
1. **Директно генерирање** на test values со criterion
2. **Екстерно генерирање** на tests → мерење дали criterion е задоволен

### Generator vs Recognizer
- **Generator** → автоматски создава test values за задоволување на criterion
- **Recognizer** → проверува дали даден test set го задоволува criterion

---

## 5. Graph Coverage

### Control Flow Graph (CFG)
- Графички модел на **сите можни извршувања** на метода преку control structures
- **Nodes** = statements или секвенци (basic blocks)
- **Edges** = transfers of control (if, while, for — не data dependencies)
- **Basic block** = секвенца од statements без внатрешно branch-ирање (ако прв се изврши, сите се извршуваат)
- **SESE** (Single-Entry, Single-Exit) → точно по еден N₀ и Nf јазол

### Правила за цртање CFG
- Повеќе `return` наредби → **посебни (distinct) nodes** за секоја
- `if-return` → return nodes мора да бидат **distinct**

### Патеки (Paths)
| Поим | Дефиниција |
|------|-----------|
| **Path** | Секвенца од nodes поврзани со edges |
| **Test path** | Патека од initial до final node (едно целосно извршување) |
| **Simple path** | Ниту еден node не се повторува (освен евентуално прв = последен за cycle) |
| **Prime path** | Simple path што не е proper subpath на ниту еден друг simple path (максимален) |

#### Tours (обиколки)
- **p tours q** → q е subpath (подниза) на p
- **Tour with detours** → дозволени дополнителни nodes, редоследот на nodes се зачувува
- **Tour with sidetrips** → секој edge од target subpath мора да се помине во истиот редослед

### Graph Coverage Критериуми

| Критериум | Барање | Subsumes |
|-----------|--------|---------|
| **Node Coverage (NC)** | TR = секој reachable node | — |
| **Edge Coverage (EC)** | TR = секој reachable path со должина до 1 (секој edge) | NC |
| **Edge-Pair Coverage (EPC)** | TR = секој reachable path со должина до 2 | EC |
| **Prime Path Coverage (PPC)** | TR = секој prime path | NC, EC (не секогаш EPC) |

> EC е дефиниран со "должина до 1" (не точно 1) за да важи и за графови со само еден node и без edges.

---

## 6. Data Flow Coverage

### Клучни поими
- **def** → assignment на променлива (запишување вредност)
- **use** → читање на променлива (употреба на вредноста)
- **Def-clear path** → по патеката нема нова redefinition на променливата меѓу def и use
- **DU-path** → def-clear path од def до use

### Критериуми

| Критериум | Барање |
|-----------|--------|
| **All-defs coverage** | Од секое def → до **барем едно** use (по def-clear path) |
| **All-uses coverage** | Од секое def → до **сите** reachable uses (посилен) |

---

## 7. Logic Coverage (Покривање на логика)

### Каде се предикати
- Во условите на **контролни структури**: `if`, `while`, `for`, итн.

### Поими
- **Predicate** → целиот Boolean услов
- **Clause** → атомска Boolean под-изразна (дел од predicate)
- **Major clause** → клаузулата чија вредност го одредува predicate-от
- **Minor clauses** → останатите клаузули

### Критериуми (по сила — од слаб кон силен)

| Критериум | Барање |
|-----------|--------|
| **Predicate Coverage (PC)** | Целиот predicate true барем еднаш, false барем еднаш |
| **Clause Coverage (CC)** | Секоја clause true барем еднаш, false барем еднаш |
| **General Active Clause Coverage (GACC)** | За секоја major clause: по 2 test cases (true/false) кога таа го одредува predicate-от; minor clauses не мора да бидат исти |
| **Correlated Active Clause Coverage (CACC)** | Major clause го менува predicate-от; minor clauses може да варираат |
| **Restricted Active Clause Coverage (RACC)** | CACC + minor clauses **мора да бидат исти** во двата test cases |
| **Combinatorial Coverage (CoC)** | Сите можни комбинации на clause вредности |

> **Кога PC = CC**: кога predicate-от има само **една клауза**  
> **CoC** е практичен само за мали предикати (≤ 2 клаузули)  
> **Active clause coverage** е највреден за **поголеми предикати**

---

## 8. Input Space Partitioning (ISP)

### Основни поими
- **Input domain** = сите можни inputs (честопати бесконечен простор)
- **Partition** = поделба на domain на блокови; мора да биде:
  - **Disjoint** (без преклопување)
  - **Complete** (ги покрива сите inputs)
- **Characteristic** → димензија/особина за партиционирање
- **Block** → вредност или опсег во рамките на карактеристика

### Чекори на моделирање на влезниот домен
1. Идентификација на функции кои може да се тестираат
2. Наоѓање на сите параметри
3. Моделирање на влезниот домен
4. Примена на критериум за тестирање (избор на комбинации на вредности)
5. Избирање комбинации од блокови за дефинирање влезни податоци

### Interface-based vs Functionality-based

| | Interface-based | Functionality-based |
|-|----------------|---------------------|
| Основа | Индивидуални input параметри | Однесување на програмата |
| Едноставност | Едноставна примена | Потешко за развивање |
| Откривање | Параметрите се видливи директно | Карактеристиките се откриваат од однесувањето |
| Автоматизација | Може делумно да се автоматизира | — |
| Квалитет | — | Резултира со подобри тестови |

### ISP Критериуми (по сила)

| Критериум | Барање | Тестови |
|-----------|--------|---------|
| **ECC** (Each Choice Coverage) | Секој block барем еднаш | Мал број |
| **BCC** (Base Choice Coverage) | Base test + варијации по **1** non-base characteristic | Умерен |
| **MBCC** (Multiple BCC) | Повеќе base choices → повеќе base tests | Поголем |
| **ACoC** (All Combinations Coverage) | Сите комбинации на сите blocks | Многу голем |

#### BCC специфики
- Base test мора да биде **feasible** (base choices компатибилни меѓусебно)
- Infeasible combinations → **замена со друга non-base choice** (не се бришат)
- **MBCC** = проширување на BCC со повеќе base choices

---

## 9. Test Levels и V-Model

### V-Model
```
Requirements        ←→  Acceptance Testing
System Design       ←→  System Testing / Integration in the large
Detailed Design     ←→  Integration Testing in the small
Code                ←→  Component Testing (Unit Testing)
```

### Нивоа на тестирање

#### Component Testing (Unit Testing)
- Најдиректно поврзано со **Code** во V-Model
- Тестирање на изолирани компоненти

#### Integration Testing in the Small
- Тестирање на **повеќе компоненти и нивната комуникација**
- Не е тестирање на еден компонент изолирано

#### Acceptance Testing
| Вид | Опис |
|-----|------|
| **Alpha testing** | Operational testing на **in-house site** (под контрола на developer) |
| **Beta testing** | Operational testing на **надворешен site** (кај реални/потенцијални корисници) |
| **Contract acceptance testing** | Тестирање против **договорот и documented agreed changes** (не против подоцнежни желби) |

> И alpha и beta ја имаат **истата цел**: тестирање на стабилен продукт на реалистичен начин со собирање feedback

---

## 10. Integration Стратегии

| Стратегија | Карактеристика |
|-----------|----------------|
| **Big-bang** | Сите компоненти одеднаш → тешко лоцирање на faults, повеќе време за поправање |
| **Incremental** | Постепено додавање на компоненти |
| **Top-down** | Почнува од главните модули надолу |
| **Bottom-up** | Почнува од ниско-ниво компоненти нагоре |
| **Functional** | Организирана по функционалности |

---

## 11. Lifecycle на тестирање

### Maintenance Testing
- Мора да вклучи: **нов/изменет код + impact analysis** (кои делови се индиректно засегнати)
- Претежно е **regression testing** (проверка дека промените не расипале постоечкото)

### Кога спецификациите се слаби/недостасуваат
- Разговор со корисници
- Документирање на претпоставки
- Паралелно подобрување на спецификацијата

### Tactical Testing Goals
- **Date criterion** → тестирање трае додека не се исцрпи буџетот или не дојде ship-date

---

## 12. Model-Based Testing

### Основи
- Тестовите се изведуваат од **модел** на софтверот (пр. UML дијаграм)
- **UML activity дијаграми** → за моделирање на workflows и user scenarios → основа за тестови на кориснички сценарија

### Model-Driven Test Design (MDTD) — Чекори по ред
1. Моделирање според софтверски артефакти
2. Дефинирање на Test Requirements (TR)
3. Прочистување на TR
4. Генерирање на влезни вредности
5. Креирање на test cases
6. Креирање на test scripts (автоматизација)
7. Извршување на тестовите
8. Набљудување на резултатите

---

## 13. Caller / Callee / Callsite

| Поим | Дефиниција |
|------|-----------|
| **Caller** | Софтверска единица која **повикува** друга |
| **Callee** | Софтверска единица која **е повикана** |
| **Callsite** | Наредба/јазол каде **се прави повикот** |
| **Actual parameter** | Променлива/вредност во **caller** (argument) |
| **Formal parameter** | Параметар дефиниран во **callee** |

### Проблем при CFG на повеќе методи
- Обединување на CFG-ови создава **недетерминизам при враќање** кон caller
- CFG бара имплементиран софтвер пред да може да се направи

---

## 14. Test Automation

- Клучна тешкотија: **controllability** (контролирање на системот) и **observability** (набљудување на резултатите)
- Не е само техничко прашање — потребно е и познавање на oracle проблемот

---

## 15. Syntax-Based Testing (Mutation Testing)

- **Мутант** = програма со мала граматичка промена
- Цел: тестовите да **убијат** (разликуваат оригинал од мутант) колку е можно повеќе мутанти
- Syntax-based критериуми се дефинираат со цел **уништување на мутанти**

---

## Брза референца — сите Coverage критериуми

### Graph Coverage
`NC` ⊆ `EC` ⊆ `EPC` / `NC, EC` ⊆ `PPC`

### Data Flow
`All-defs` ⊆ `All-uses`

### Logic Coverage
`PC` / `CC` → `GACC` → `CACC` → `RACC` → `CoC`

### ISP
`ECC` ⊆ `BCC` / `MBCC` ⊆ `ACoC`

