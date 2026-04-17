# Coding Standards & Architecture Guidelines

A comprehensive guide to Clean Architecture and Clean Code principles for TypeScript projects.

## Table of Contents

1. [Clean Architecture](#clean-architecture)
2. [Variables & Naming](#variables--naming)
3. [Functions](#functions)
4. [Objects and Data Structures](#objects-and-data-structures)
5. [Classes](#classes)
6. [SOLID Principles](#solid-principles)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Concurrency](#concurrency)
10. [Formatting](#formatting)
11. [Comments](#comments)

---

# 1. Clean Architecture

## Overview

Clean Architecture is a way of separating responsibilities and parts of functionality according to their proximity to the application domain.

The domain is the part of the real world that we model with a program. This is the data transformations that reflect transformations in the real world.

## The Three Layers

| Layer | Responsibility | Dependencies |
|-------|---------------|--------------|
| **Domain** | Entities, data types, pure transformations | None (independent) |
| **Application** | Use cases, ports (interfaces) | Domain only |
| **Adapters** | External services, UI, API clients | Any layer |

### Domain Layer

At the center is the domain layer. It is the entities and data that describe the subject area of the application, as well as the code to transform that data. The domain is the core that distinguishes one application from another.

The domain is something that won't change if we move from React to Angular, or if we change some use case.

**Key characteristics:**
- Data structure of domain entities and their transformations are independent from the outer world
- External events *trigger* domain transformations, but *do not determine* how they will occur
- Should be pure - no side effects

### Application Layer

Around the domain is the application layer. This layer describes **use cases** - user scenarios. They are responsible for what happens after some event occurs.

Use case example (checkout scenario):
1. Retrieve items from cart and create order
2. Pay for the order
3. Notify user if payment fails
4. Clear cart and show order

The application layer also contains **ports** - specifications of how the application wants to communicate with the outside world. A port is typically an interface/contract.

**Ports serve as a buffer zone:**
- Input Ports: how the application wants to be contacted
- Output Ports: how the application will communicate with external services

### Adapters Layer

The outermost layer contains adapters to external services. Adapters turn incompatible APIs of external services into ones compatible with our application.

**Types of adapters:**
- **Driving adapters** - send signals *to* our application (e.g., UI framework handling button clicks)
- **Driven adapters** - receive signals *from* our application (e.g., API clients, storage)

The farther we are from the center, the more "service-oriented" the code is.

## Folder Structure

```
src/
├── domain/           # Entities, types, pure functions
│   ├── user.ts
│   ├── product.ts
│   ├── order.ts
│   └── cart.ts
├── application/      # Use cases, ports (interfaces)
│   ├── addToCart.ts
│   ├── authenticate.ts
│   ├── orderProducts.ts
│   └── ports.ts
├── services/        # Adapters (implementations)
│   ├── authAdapter.ts
│   ├── paymentAdapter.ts
│   ├── notificationAdapter.ts
│   ├── storageAdapter.ts
│   └── api.ts
├── ui/              # Driving adapters
└── lib/             # Shared utilities
```

## Dependency Rule

**Only outer layers can depend on inner layers:**
- Domain must be independent
- Application layer can depend on domain
- Adapters can depend on anything

**Violating this rule leads to:**
- Cyclic dependencies
- Poor testability
- High coupling

**Key principle:** External services must adapt to our needs, never the other way around.

## Impure Context for Pure Transformations

A code organization pattern where:
1. Perform side-effect to get data
2. Pure transformation on that data
3. Side-effect to store/pass result

```
[something external] → [pure domain function] → [something external]
```

This keeps main logic in pure transformations while isolating external communication.

## Designing Use Cases

Use cases orchestrate domain logic and external services:

```ts
type OrderProducts = (user: User, cart: Cart) => Promise<void>;

async function orderProducts(user: User, cart: Cart) {
    const order = createOrder(user, cart);  // Domain function
    
    const paid = await payment.tryPay(order.total);  // External service
    if (!paid) return notifier.notify('Payment failed');  // External service
    
    orderStorage.updateOrders([...orderStorage.orders, order]);  // External service
    cartStorage.emptyCart();  // External service
}
```

## Shared Kernel

Types that don't increase coupling between modules - typically primitive type aliases:

```ts
type Email = string;
type UniqueId = string;
type DateTimeString = string;
type PriceCents = number;
```

Use type aliases to make intent clearer (`DateTimeString` instead of `string`).

## MVC Analogy

When unsure which layer something belongs to:
- **Models** → Domain entities
- **Controllers** → Domain transformations + Application layer
- **View** → Driving adapters (UI)

## Costs & Tradeoffs

### When Clean Architecture May Cost Too Much

- **Small projects**: Full implementation may be overkill
- **Time constraints**: Adapters take extra time to write
- **Onboarding**: More layers can increase entry threshold
- **Bundle size**: More code to download

### Minimum Worthwhile Investment

1. **Extract Domain** - Keep business logic isolated
2. **Obey Dependency Rule** - External services adapt to us

### Split Code by Features (Advanced)

Instead of organizing by layers, organize by features:

```
src/
├── features/
│   ├── auth/
│   │   ├── domain/
│   │   ├── application/
│   │   └── adapters/
│   └── checkout/
│       ├── domain/
│       ├── application/
│       └── adapters/
└── shared/
```

---

# 2. Variables & Naming

## Meaningful Names

Distinguish names so readers understand differences:

```ts
// Bad
function between<T>(a1: T, a2: T, a3: T): boolean {
  return a2 <= a1 && a1 <= a3;
}

// Good
function between<T>(value: T, left: T, right: T): boolean {
  return left <= value && value <= right;
}
```

## Pronounceable Names

If you can't pronounce it, you can't discuss it:

```ts
// Bad
type DtaRcrd102 = {
  genymdhms: Date;
  modymdhms: Date;
  pszqint: number;
}

// Good
type Customer = {
  generationTimestamp: Date;
  modificationTimestamp: Date;
  recordId: number;
}
```

## Consistent Vocabulary

Use the same term for the same concept:

```ts
// Bad
function getUserInfo(): User;
function getUserDetails(): User;
function getUserData(): User;

// Good
function getUser(): User;
```

## Searchable Names

Extract magic numbers into named constants:

```ts
// Bad
setTimeout(restart, 86400000);

// Good
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
setTimeout(restart, MILLISECONDS_PER_DAY);
```

## Don't Add Unneeded Context

Don't repeat information from the type name:

```ts
// Bad
type Car = {
  carMake: string;
  carModel: string;
  carColor: string;
}

// Good
type Car = {
  make: string;
  model: string;
  color: string;
}
```

## Use Default Arguments

```ts
// Bad
function loadPages(count?: number) {
  const loadCount = count !== undefined ? count : 10;
}

// Good
function loadPages(count: number = 10) {
  // ...
}
```

## Use Enums for Intent

```ts
// Bad
const GENRE = {
  ROMANTIC: 'romantic',
  DRAMA: 'drama',
  COMEDY: 'comedy',
}

// Good
enum GENRE {
  ROMANTIC,
  DRAMA,
  COMEDY,
}
```

## Capitalization Rules

- `PascalCase`: Classes, interfaces, types, namespaces
- `camelCase`: Variables, functions, class members
- `SNAKE_CASE`: Constants

---

# 3. Functions

## Maximum 2-3 Parameters

More parameters = harder to test. Use objects for configuration:

```ts
// Bad
function createMenu(title: string, body: string, buttonText: string, cancellable: boolean) {
  // ...
}

// Good
function createMenu(options: { 
  title: string; 
  body: string; 
  buttonText: string; 
  cancellable: boolean 
}) {
  // ...
}

createMenu({
  title: 'Foo',
  body: 'Bar',
  buttonText: 'Baz',
  cancellable: true
});
```

## Do One Thing

The most important rule. Functions should do one thing at one level of abstraction:

```ts
// Bad
function emailActiveClients(clients: Client[]) {
  clients.forEach((client) => {
    const clientRecord = database.lookup(client);
    if (clientRecord.isActive()) {
      email(client);
    }
  });
}

// Good
function emailActiveClients(clients: Client[]) {
  clients.filter(isActiveClient).forEach(email);
}

function isActiveClient(client: Client) {
  const clientRecord = database.lookup(client);
  return clientRecord.isActive();
}
```

## Name Reveals Intent

```ts
// Bad
function addToDate(date: Date, month: number): Date { ... }
addToDate(date, 1);  // What's added?

// Good
function addMonthToDate(date: Date, month: number): Date { ... }
addMonthToDate(date, 1);  // Clear!
```

## No Flag Parameters

Flags indicate multiple responsibilities:

```ts
// Bad
function createFile(name: string, temp: boolean) {
  if (temp) {
    fs.create(`./temp/${name}`);
  } else {
    fs.create(name);
  }
}

// Good
function createTempFile(name: string) {
  createFile(`./temp/${name}`);
}

function createFile(name: string) {
  fs.create(name);
}
```

## Avoid Side Effects

Functions should either do something or return something, not both:

```ts
// Bad - mutates input
function addItemToCart(cart: CartItem[], item: Item): void {
  cart.push({ item, date: Date.now() });
}

// Good - returns new array
function addItemToCart(cart: CartItem[], item: Item): CartItem[] {
  return [...cart, { item, date: Date.now() }];
}
```

## Favor Functional Over Imperative

```ts
// Bad
let total = 0;
for (let i = 0; i < contributions.length; i++) {
  total += contributions[i].linesOfCode;
}

// Good
const total = contributions.reduce(
  (total, { linesOfCode }) => total + linesOfCode, 
  0
);
```

## Encapsulate Conditionals

```ts
// Bad
if (subscription.isTrial || account.balance > 0) { ... }

// Good
function canActivateService(subscription: Subscription, account: Account) {
  return subscription.isTrial || account.balance > 0;
}

if (canActivateService(subscription, account)) { ... }
```

## Avoid Negative Conditionals

```ts
// Bad
if (isEmailNotUsed(email)) { ... }

// Good
if (!isEmailUsed(email)) { ... }
```

## Avoid Type Checking with Polymorphism

```ts
// Bad
function travelToTexas(vehicle: Bicycle | Car) {
  if (vehicle instanceof Bicycle) {
    vehicle.pedal(currentLocation, new Location('texas'));
  } else if (vehicle instanceof Car) {
    vehicle.drive(currentLocation, new Location('texas'));
  }
}

// Good
type Vehicle = Bicycle | Car;
function travelToTexas(vehicle: Vehicle) {
  vehicle.move(currentLocation, new Location('texas'));
}
```

## Remove Dead Code

```ts
// Bad
function oldRequestModule(url: string) { ... }
function requestModule(url: string) { ... }
const req = requestModule;

// Good - just remove oldRequestModule
function requestModule(url: string) { ... }
const req = requestModule;
```

## Use Iterators/Generators for Streams

```ts
// Bad - loads all into memory
function fibonacci(n: number): number[] {
  // ...
}

// Good - lazy evaluation
function* fibonacci(): IterableIterator<number> {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

for (const fib of fibonacci()) {
  if (fib > 1000) break;
  console.log(fib);
}
```

---

# 4. Objects and Data Structures

## Use Getters and Setters

```ts
// Bad
if (value < 0) throw new Error('Cannot set negative balance.');
account.balance = value;

// Good
class BankAccount {
  private accountBalance: number = 0;

  get balance(): number {
    return this.accountBalance;
  }

  set balance(value: number) {
    if (value < 0) {
      throw new Error('Cannot set negative balance.');
    }
    this.accountBalance = value;
  }
}
```

## Private/Protected Members

```ts
// Bad
class Circle {
  radius: number;  // Public by default
}

// Good
class Circle {
  constructor(private readonly radius: number) {}
}
```

## Prefer Immutability

```ts
// Bad
interface Config {
  host: string;
  port: string;
}

// Good
interface Config {
  readonly host: string;
  readonly port: string;
}

// Bad - array can be modified
const array: number[] = [1, 3, 5];
array.push(100);

// Good - readonly array
const array: ReadonlyArray<number> = [1, 3, 5];

// Best - const assertion for literals
const config = { hello: 'world' } as const;
const array = [1, 3, 5] as const;
```

## type vs. interface

- Use `type` for unions/intersections
- Use `interface` when you need `extends` or `implements`

```ts
// For combinations
type Config = EmailConfig | DbConfig;

// For contracts
interface Shape {
  getArea(): number;
}

class Circle implements Shape { ... }
```

---

# 5. Classes

## Small Classes (Single Responsibility)

```ts
// Bad - too many responsibilities
class Dashboard {
  getLanguage(): string { ... }
  setLanguage(language: string): void { ... }
  showProgress(): void { ... }
  hideProgress(): void { ... }
  isDirty(): boolean { ... }
  disable(): void { ... }
  enable(): void { ... }
  addSubscription(): void { ... }
  removeSubscription(): void { ... }
  // ... 20+ more methods
}

// Good - split by responsibility
class Dashboard {
  disable(): void { ... }
  enable(): void { ... }
  getVersion(): string { ... }
}
```

## High Cohesion, Low Coupling

Cohesion: fields should be used by all methods
Coupling: classes should be independent

```ts
// Bad - low cohesion (some fields used by some methods only)
class UserManager {
  constructor(
    private readonly db: Database,
    private readonly emailSender: EmailSender) {}  // Email used by some methods only
  getUser() { ... }
  getTransactions() { ... }
  sendGreeting() { ... }  // Uses emailSender
  sendNotification() { ... }  // Uses emailSender
}

// Good - split by cohesion
class UserService {
  constructor(private readonly db: Database) {}
  getUser() { ... }
  getTransactions() { ... }
}

class UserNotifier {
  constructor(private readonly emailSender: EmailSender) {}
  sendGreeting() { ... }
  sendNotification() { ... }
}
```

## Prefer Composition Over Inheritance

```ts
// Bad - inheritance for "has-a" relationship
class Employee {
  constructor(
    private readonly name: string,
    private readonly email: string) {}
}

class EmployeeTaxData extends Employee {  // Employee "has" tax data, not "is" tax data
  constructor(name: string, email: string, private readonly ssn: string) {
    super(name, email);
  }
}

// Good - composition
class Employee {
  private taxData: EmployeeTaxData;
  constructor(
    private readonly name: string,
    private readonly email: string) {}
  
  setTaxData(ssn: string, salary: number) {
    this.taxData = new EmployeeTaxData(ssn, salary);
  }
}
```

## Use Method Chaining

```ts
// Bad
queryBuilder.from('users');
queryBuilder.page(1, 100);
queryBuilder.orderBy('firstName', 'lastName');
const query = queryBuilder.build();

// Good
const query = new QueryBuilder()
  .from('users')
  .page(1, 100)
  .orderBy('firstName', 'lastName')
  .build();
```

---

# 6. SOLID Principles

## Single Responsibility (SRP)

A class should have only one reason to change:

```ts
// Bad
class UserSettings {
  verifyCredentials() { ... }
  changeSettings() {
    if (this.verifyCredentials()) { ... }
  }
}

// Good
class UserAuth {
  verifyCredentials() { ... }
}

class UserSettings {
  constructor(private readonly auth: UserAuth) {}
  changeSettings() {
    if (this.auth.verifyCredentials()) { ... }
  }
}
```

## Open/Closed (OCP)

Open for extension, closed for modification:

```ts
// Bad - adding new adapters requires modifying HttpRequester
class HttpRequester {
  async fetch<T>(adapter: Adapter) {
    if (adapter instanceof AjaxAdapter) { ... }
    else if (adapter instanceof NodeAdapter) { ... }
  }
}

// Good - use polymorphism
abstract class Adapter {
  abstract request<T>(url: string): Promise<T>;
}

class HttpRequester {
  constructor(private readonly adapter: Adapter) {}
  async fetch<T>(url: string) {
    return this.adapter.request<T>(url);
  }
}
```

## Liskov Substitution (LSP)

Subtypes must be substitutable for base types:

```ts
// Bad - Square "is-a" Rectangle but breaks expectations
class Rectangle {
  setWidth(w) { this.width = w; }
  setHeight(h) { this.height = h; }
  getArea() { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w) { this.width = w; this.height = w; }  // Violates LSP!
}

// Good - separate hierarchies
abstract class Shape {
  abstract getArea(): number;
}

class Rectangle extends Shape {
  constructor(private w, private h) { super(); }
  getArea() { return this.w * this.h; }
}

class Square extends Shape {
  constructor(private side) { super(); }
  getArea() { return this.side * this.side; }
}
```

## Interface Segregation (ISP)

Clients shouldn't depend on interfaces they don't use:

```ts
// Bad - all-in-one interface
interface SmartPrinter {
  print();
  fax();
  scan();
}

class EconomicPrinter implements SmartPrinter {
  print() { ... }
  fax() { throw new Error('Not supported'); }  // Force to implement unused method
  scan() { throw new Error('Not supported'); }
}

// Good - split by client needs
interface Printer { print(); }
interface Fax { fax(); }
interface Scanner { scan(); }

class EconomicPrinter implements Printer {
  print() { ... }
}
```

## Dependency Inversion (DIP)

High-level modules shouldn't depend on low-level modules. Both should depend on abstractions:

```ts
// Bad - depends on concrete implementation
class ReportReader {
  private formatter = new XmlFormatter();  // Hardcoded dependency
  read() {
    return this.formatter.parse(data);
  }
}

// Good - depend on abstraction
interface Formatter {
  parse<T>(content: string): T;
}

class ReportReader {
  constructor(private readonly formatter: Formatter) {}  // Injected
  read() {
    return this.formatter.parse(data);
  }
}

// Can easily switch implementations
const xmlReader = new ReportReader(new XmlFormatter());
const jsonReader = new ReportReader(new JsonFormatter());
```

---

# 7. Error Handling

## Always Use Error Objects

```ts
// Bad
throw 'Not implemented.';
return Promise.reject('Not implemented.');

// Good
throw new Error('Not implemented.');
return Promise.reject(new Error('Not implemented.'));
```

## Don't Ignore Errors

```ts
// Bad
try {
  functionThatMightThrow();
} catch (error) {
  console.log(error);  // Gets lost in logs
}

// Good
try {
  functionThatMightThrow();
} catch (error) {
  logger.log(error);  // Proper error handling
}

// Also bad - silent ignore
try {
  functionThatMightThrow();
} catch (error) {
  // Silently ignored
}
```

## Handle Rejected Promises

```ts
// Bad
getUser()
  .then(user => sendEmail(user.email))
  .catch(error => console.log(error));

// Good
getUser()
  .then(user => sendEmail(user.email))
  .catch(error => logger.log(error));

// Or with async/await
try {
  const user = await getUser();
  await sendEmail(user.email);
} catch (error) {
  logger.log(error);
}
```

---

# 8. Testing

## F.I.R.S.T. Rules

- **Fast** - Run tests frequently
- **Independent** - No dependencies between tests
- **Repeatable** - Same results every time
- **Self-Validating** - Pass or fail, no manual checking
- **Timely** - Write tests before production code

## Three Laws of TDD

1. You can't write production code unless it makes a failing test pass
2. You can't write more of a unit test than is sufficient to fail
3. You can only write production code to pass the one failing test

## Single Concept Per Test

```ts
// Bad - multiple assertions about different things
describe('AwesomeDate', () => {
  it('handles date boundaries', () => {
    assert.equal('1/31/2015', date.addDays(30));
    assert.equal('2/29/2016', date.addDays(28));
    assert.equal('3/1/2015', date.addDays(28));
  });
});

// Good - one concept per test
describe('AwesomeDate', () => {
  it('handles 30-day months', () => {
    assert.equal('1/31/2015', new AwesomeDate('1/1/2015').addDays(30));
  });

  it('handles leap year', () => {
    assert.equal('2/29/2016', new AwesomeDate('2/1/2016').addDays(28));
  });

  it('handles non-leap year', () => {
    assert.equal('3/1/2015', new AwesomeDate('2/1/2015').addDays(28));
  });
});
```

## Test Names Reveal Intent

```ts
// Bad
describe('Calendar', () => {
  it('2/29/2020', () => { ... });
  it('throws', () => { ... });
});

// Good
describe('Calendar', () => {
  it('should handle leap year', () => { ... });
  it('should throw when format is invalid', () => { ... });
});
```

---

# 9. Concurrency

## Prefer Promises Over Callbacks

```ts
// Bad - callback hell
downloadPage(url, (error, response) => {
  if (error) handleError(error);
  else writeFile(response, (error) => {
    if (error) handleError(error);
    else success();
  });
});

// Good - flat promise chain
function downloadPage(url: string): Promise<Response> {
  return get(url).then(response => write(saveTo, response));
}

downloadPage(url)
  .then(content => console.log(content))
  .catch(error => console.error(error));
```

## Prefer async/await Over Promises

```ts
// Bad - promise chains
function downloadPage(url: string) {
  return get(url)
    .then(response => write(saveTo, response))
    .then(content => console.log(content))
    .catch(error => console.error(error));
}

// Good - async/await
async function downloadPage(url: string) {
  try {
    const response = await get(url);
    await write(saveTo, response);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}
```

## Promise Helpers

| Method | Use Case |
|--------|----------|
| `Promise.resolve(v)` | Convert value to resolved promise |
| `Promise.reject(e)` | Convert error to rejected promise |
| `Promise.all([...])` | Run tasks in parallel, wait for all |
| `Promise.race([...])` | Wait for first to settle (timeouts) |

---

# 10. Formatting

## Use Automated Tools

Use ESLint + Prettier. Don't argue about formatting - automate it.

## Consistent Capitalization

- `PascalCase`: Classes, interfaces, types
- `camelCase`: Variables, functions
- `SNAKE_CASE`: Constants

## Related Code Close Together

```ts
// Bad - caller and callee far apart
class PerformanceReview {
  review() {
    this.getPeerReviews();  // Uses lookupPeers defined later
    this.getManagerReview();  // Uses lookupManager defined later
  }
  
  private lookupPeers() { ... }
  private lookupManager() { ... }
}

// Good - caller near callee
class PerformanceReview {
  review() {
    this.getPeerReviews();
    this.getManagerReview();
  }
  
  private getPeerReviews() {
    const peers = this.lookupPeers();
  }
  
  private lookupPeers() { ... }
  
  private getManagerReview() {
    const manager = this.lookupManager();
  }
  
  private lookupManager() { ... }
}
```

## Organize Imports

Grouped and ordered by dependency type:

```ts
// 1. Polyfills
import 'reflect-metadata';

// 2. Node built-ins
import fs from 'fs';

// 3. External modules
import { query } from 'itiriri';
import { Container } from 'inversify';

// 4. Internal modules
import { UserService } from '@services/UserService';

// 5. Parent directory
import foo from '../foo';

// 6. Same/sibling directory
import bar from './bar';
```

## Use Path Aliases

```ts
// Bad - long relative paths
import { UserService } from '../../../services/UserService';

// Good - clean aliases
import { UserService } from '@services/UserService';

// In tsconfig.json:
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@services": ["services/*"]
    }
  }
}
```

---

# 11. Comments

## Code Should Be Self-Documenting

Comments are an apology for unclear code:

```ts
// Bad - comment explains unclear code
// Check if subscription is active
if (subscription.endDate > Date.now) {}

// Good - code explains itself
const isSubscriptionActive = subscription.endDate > Date.now;
if (isSubscriptionActive) {}
```

## No Commented-Out Code

Use version control:

```ts
// Bad
type User = {
  name: string;
  email: string;
  // age: number;  // Deleted but kept in comments
}

// Good
type User = {
  name: string;
  email: string;
}
```

## No Journal Comments

```ts
// Bad
/**
 * 2024-01-15: Added user validation (John)
 * 2024-01-10: Fixed null pointer (Jane)
 */
function process() {}

// Good
function process() {}  // Git history tracks this
```

## Avoid Positional Markers

```ts
// Bad
////////////////////////////////////////////////////////////////////////////////
// Client class
////////////////////////////////////////////////////////////////////////////////
class Client {
  //////////////////////////////////////////////////////////////////////////////
  // public methods
  //////////////////////////////////////////////////////////////////////////////
  public describe(): string { ... }
}

// Good
class Client {
  public describe(): string { ... }
}
```

## TODO Comments (Use Sparingly)

```ts
// Bad
function getActiveSubscriptions() {
  // ensure dueDate is indexed
  return db.subscriptions.find({ dueDate: { $lte: new Date() } });
}

// Good
function getActiveSubscriptions() {
  // TODO: ensure dueDate is indexed for performance
  return db.subscriptions.find({ dueDate: { $lte: new Date() } });
}
```

---

# Quick Reference

## Naming Conventions

| Type | Convention |
|------|------------|
| Variables | `camelCase` |
| Functions | `camelCase` |
| Constants | `SNAKE_CASE` |
| Classes | `PascalCase` |
| Interfaces | `PascalCase` |
| Types | `PascalCase` |
| Enums | `PascalCase` |

## Clean Architecture Layers

```
┌─────────────────────────────────────┐
│         Adapters (Outer)            │
│   UI, API, Storage, External Svcs  │
├─────────────────────────────────────┤
│       Application (Middle)          │
│     Use Cases, Ports (Interfaces)  │
├─────────────────────────────────────┤
│          Domain (Core)              │
│    Entities, Pure Functions         │
│    No dependencies                 │
└─────────────────────────────────────┘
```

## SOLID Principles

| Principle | Summary |
|-----------|---------|
| **S**ingle Responsibility | One reason to change |
| **O**pen/Closed | Open for extension, closed for modification |
| **L**iskov Substitution | Subtypes substitutable for base types |
| **I**nterface Segregation | Clients don't depend on unused methods |
| **D**ependency Inversion | Depend on abstractions, not concretions |

## Side Effect Pattern

```
[something external] → [pure domain function] → [something external]
```

Keep domain logic pure - do side effects in outer layers only.
