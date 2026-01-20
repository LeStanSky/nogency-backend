# План улучшения покрытия branches (65.86% → 80%+)

## Текущая ситуация

- **Текущее покрытие branches:** 65.86%
- **Целевое покрытие:** 80%
- **Разница:** -14.14%

## Критические файлы с низким покрытием branches

### 1. Controllers (много условных веток)

#### ApplicationController

**Непокрытые ветки:**

- `getApplications`: ветки для tenant/owner/no profile
- `getApplicationById`: проверка доступа (isTenantOwner/isListingOwner)
- `updateApplicationStatus`: различные статусы и проверки
- `withdrawApplication`: проверка прав tenant
- `calculateScore`: проверка прав owner

**Необходимые тесты:**

```typescript
// tests/applications.test.ts - добавить:

describe('GET /api/v1/applications', () => {
  it('should return tenant applications when user is tenant', async () => {
    // Тест ветки: tenantProfileId exists
  });

  it('should return owner applications when user is owner', async () => {
    // Тест ветки: ownerProfileId exists
  });

  it('should return empty array when user has no profile', async () => {
    // Тест ветки: no profile found
  });
});

describe('GET /api/v1/applications/:id', () => {
  it('should return application when user is tenant owner', async () => {
    // Тест ветки: isTenantOwner === true
  });

  it('should return application when user is listing owner', async () => {
    // Тест ветки: isListingOwner === true
  });

  it('should return 403 when user has no access', async () => {
    // Тест ветки: !isTenantOwner && !isListingOwner
  });
});
```

#### ListingController

**Непокрытые ветки:**

- `getListings`: ветка для пустого массива (no ownerProfileId)
- `getListingById`: проверка доступа (owner vs ACTIVE status)
- `updateListing`: проверка ownership
- `deleteListing`: проверка ownership
- `pauseListing`: проверка ownership и статуса

**Необходимые тесты:**

```typescript
// tests/listings.test.ts - добавить:

describe('GET /api/v1/listings', () => {
  it('should return empty array when user has no owner profile', async () => {
    // Тест ветки: !ownerProfileId
  });
});

describe('GET /api/v1/listings/:id', () => {
  it('should return listing when user is owner', async () => {
    // Тест ветки: listing.ownerId === ownerProfileId
  });

  it('should return ACTIVE listing for non-owner', async () => {
    // Тест ветки: listing.status === 'ACTIVE'
  });

  it('should return 403 for non-ACTIVE listing for non-owner', async () => {
    // Тест ветки: listing.ownerId !== ownerProfileId && listing.status !== 'ACTIVE'
  });
});
```

#### PropertyController

**Непокрытые ветки:**

- `getProperties`: ветка для пустого массива
- `getPropertyById`: проверка ownership
- `updateProperty`: проверка ownership
- `deleteProperty`: проверка ownership
- `addPhoto`: проверка ownership
- `deletePhoto`: проверка ownership

**Необходимые тесты:**

```typescript
// tests/properties.test.ts - добавить:

describe('GET /api/v1/properties', () => {
  it('should return empty array when user has no owner profile', async () => {
    // Тест ветки: !ownerProfileId
  });
});

describe('GET /api/v1/properties/:id', () => {
  it('should return 403 when user is not owner', async () => {
    // Тест ветки: property.ownerId !== ownerProfileId
  });
});
```

#### ProfileController

**Непокрытые ветки:**

- `getProfile`: проверка существования профиля
- `updateProfile`: ветки для owner/tenant профилей

**Необходимые тесты:**

```typescript
// tests/profiles.test.ts - добавить:

describe('GET /api/v1/profiles/me', () => {
  it('should return owner profile', async () => {
    // Тест ветки: profile.type === 'owner'
  });

  it('should return tenant profile', async () => {
    // Тест ветки: profile.type === 'tenant'
  });

  it('should return 404 when profile not found', async () => {
    // Тест ветки: !result
  });
});

describe('PATCH /api/v1/profiles/me', () => {
  it('should update owner profile', async () => {
    // Тест ветки: profileResult.type === 'owner'
  });

  it('should update tenant profile', async () => {
    // Тест ветки: profileResult.type === 'tenant'
  });
});
```

### 2. Services (много условной логики)

#### ScoringService

**Непокрытые ветки:**

- `calculateIncomeScore`: все диапазоны ratio (>=4, >=3, >=2.5, >=2, >=1.5, <1.5)
- `calculateEmploymentScore`: различные комбинации документов
- `calculateVerificationScore`: различные статусы документов
- `calculateCriteriaMatchScore`: все проверки критериев
- `calculateRiskLevel`: все три уровня (LOW, MEDIUM, HIGH)
- `generateNotes`: все условия для рекомендаций

**Необходимые тесты:**

```typescript
// tests/scoring.test.ts - создать новый файл:

describe('ScoringService', () => {
  describe('calculateIncomeScore', () => {
    it('should return 0 for null income', async () => {
      // Тест ветки: !monthlyIncome || monthlyIncome <= 0
    });

    it('should return 100 for ratio >= 4', async () => {
      // Тест ветки: ratio >= 4
    });

    it('should return 90 for ratio >= 3', async () => {
      // Тест ветки: ratio >= 3 && ratio < 4
    });

    it('should return 75 for ratio >= 2.5', async () => {
      // Тест ветки: ratio >= 2.5 && ratio < 3
    });

    it('should return 60 for ratio >= 2', async () => {
      // Тест ветки: ratio >= 2 && ratio < 2.5
    });

    it('should return 40 for ratio >= 1.5', async () => {
      // Тест ветки: ratio >= 1.5 && ratio < 2
    });

    it('should return 20 for ratio < 1.5', async () => {
      // Тест ветки: ratio < 1.5
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return LOW for score >= 75', async () => {
      // Тест ветки: totalScore >= 75
    });

    it('should return MEDIUM for score >= 50', async () => {
      // Тест ветки: totalScore >= 50 && totalScore < 75
    });

    it('should return HIGH for score < 50', async () => {
      // Тест ветки: totalScore < 50
    });
  });

  describe('calculateCriteriaMatchScore', () => {
    it('should return 100 when no criteria', async () => {
      // Тест ветки: !criteria || typeof criteria !== 'object'
    });

    it('should deduct 30 for low income', async () => {
      // Тест ветки: monthlyIncome < minIncome
    });

    it('should deduct 10 for wrong occupation', async () => {
      // Тест ветки: !employmentStatus.includes(occupation)
    });

    it('should deduct 20 for pets when not allowed', async () => {
      // Тест ветки: allowPets === false && hasPets
    });

    it('should deduct 15 for too many occupants', async () => {
      // Тест ветки: numberOfOccupants > maxOccupants
    });
  });
});
```

#### StorageService

**Непокрытые ветки:**

- `uploadFile`: обработка ошибок
- `deleteFile`: различные сценарии удаления
- `extractFilePathFromUrl`: различные форматы URL

**Необходимые тесты:**

```typescript
// tests/storage.test.ts - создать новый файл:

describe('StorageService', () => {
  describe('uploadFile', () => {
    it('should handle upload errors', async () => {
      // Тест ветки: error handling
    });
  });

  describe('deleteFile', () => {
    it('should handle missing file path', async () => {
      // Тест ветки: !filePath
    });

    it('should handle delete errors gracefully', async () => {
      // Тест ветки: error handling (не бросает исключение)
    });
  });

  describe('extractFilePathFromUrl', () => {
    it('should extract path from standard URL', async () => {
      // Тест ветки: стандартный формат URL
    });

    it('should extract path from non-URL format', async () => {
      // Тест ветки: fallback для не-URL формата
    });
  });
});
```

### 3. Error Handling

#### app.ts - Global Error Handler

**Непокрытые ветки:**

- Обработка AppError
- Обработка validation errors
- Обработка statusCode errors
- Обработка других ошибок

**Необходимые тесты:**

```typescript
// tests/error-handling.test.ts - создать новый файл:

describe('Global Error Handler', () => {
  it('should handle AppError correctly', async () => {
    // Тест ветки: error instanceof AppError
  });

  it('should handle validation errors', async () => {
    // Тест ветки: 'validation' in error
  });

  it('should handle errors with statusCode', async () => {
    // Тест ветки: 'statusCode' in error
  });

  it('should handle unknown errors', async () => {
    // Тест ветки: else branch (default 500)
  });
});
```

#### Auth Middleware

**Непокрытые ветки:**

- Отсутствие токена
- Неверный формат токена
- Неверный токен
- Обработка ошибок

**Необходимые тесты:**

```typescript
// tests/auth.middleware.test.ts - создать новый файл:

describe('Auth Middleware', () => {
  it('should throw error when no authorization header', async () => {
    // Тест ветки: !authHeader
  });

  it('should throw error when token format is wrong', async () => {
    // Тест ветки: !authHeader.startsWith('Bearer ')
  });

  it('should throw error when token is invalid', async () => {
    // Тест ветки: !decoded
  });

  it('should handle other errors', async () => {
    // Тест ветки: catch block
  });
});
```

## Приоритетный план действий

### Фаза 1: Критичные GET endpoints (2-3 часа)

**Цель:** Покрыть основные ветки в GET endpoints

1. Добавить тесты для `GET /api/v1/applications` (3 ветки)
2. Добавить тесты для `GET /api/v1/applications/:id` (3 ветки)
3. Добавить тесты для `GET /api/v1/listings` (1 ветка)
4. Добавить тесты для `GET /api/v1/listings/:id` (3 ветки)
5. Добавить тесты для `GET /api/v1/properties` (1 ветка)
6. Добавить тесты для `GET /api/v1/properties/:id` (1 ветка)
7. Добавить тесты для `GET /api/v1/profiles/me` (3 ветки)

**Ожидаемый результат:** +15-20 веток покрыто, branches: ~70%

### Фаза 2: ScoringService (2-3 часа)

**Цель:** Покрыть всю условную логику в ScoringService

1. Создать `tests/scoring.test.ts`
2. Добавить тесты для `calculateIncomeScore` (7 веток)
3. Добавить тесты для `calculateRiskLevel` (3 ветки)
4. Добавить тесты для `calculateCriteriaMatchScore` (5+ веток)
5. Добавить тесты для `calculateEmploymentScore` (4+ ветки)
6. Добавить тесты для `calculateVerificationScore` (3+ ветки)
7. Добавить тесты для `generateNotes` (5+ веток)

**Ожидаемый результат:** +25-30 веток покрыто, branches: ~75%

### Фаза 3: UPDATE/DELETE endpoints (2-3 часа)

**Цель:** Покрыть проверки ownership в UPDATE/DELETE

1. Добавить тесты для `PATCH /api/v1/profiles/me` (2 ветки)
2. Добавить тесты для `PATCH /api/v1/properties/:id` (1 ветка)
3. Добавить тесты для `DELETE /api/v1/properties/:id` (1 ветка)
4. Добавить тесты для `PATCH /api/v1/listings/:id` (1 ветка)
5. Добавить тесты для `DELETE /api/v1/listings/:id` (1 ветка)
6. Добавить тесты для `POST /api/v1/listings/:id/pause` (2 ветки)

**Ожидаемый результат:** +8-10 веток покрыто, branches: ~77%

### Фаза 4: Error Handling (1-2 часа)

**Цель:** Покрыть обработку ошибок

1. Создать `tests/error-handling.test.ts`
2. Добавить тесты для global error handler (4 ветки)
3. Создать `tests/auth.middleware.test.ts`
4. Добавить тесты для auth middleware (4 ветки)

**Ожидаемый результат:** +8 веток покрыто, branches: ~79%

### Фаза 5: StorageService и edge cases (1-2 часа)

**Цель:** Довести покрытие до 80%+

1. Создать `tests/storage.test.ts`
2. Добавить тесты для StorageService (5+ веток)
3. Добавить edge cases для существующих тестов

**Ожидаемый результат:** +5-10 веток покрыто, branches: 80%+

## Итоговый план

| Фаза      | Время     | Веток покрыто | Ожидаемое branches |
| --------- | --------- | ------------- | ------------------ |
| Фаза 1    | 2-3ч      | 15-20         | ~70%               |
| Фаза 2    | 2-3ч      | 25-30         | ~75%               |
| Фаза 3    | 2-3ч      | 8-10          | ~77%               |
| Фаза 4    | 1-2ч      | 8             | ~79%               |
| Фаза 5    | 1-2ч      | 5-10          | 80%+               |
| **Итого** | **8-13ч** | **61-78**     | **80%+**           |

## Быстрое решение (временное)

Если нужно быстро исправить CI, можно временно снизить порог:

```typescript
// vitest.config.ts
thresholds: {
  lines: 80,
  functions: 80,
  branches: 70, // Временно снижено с 80 до 70
  statements: 80,
},
```

**НО:** Это временное решение. Нужно обязательно выполнить план выше для достижения 80%+.

## Конкретные файлы для создания/обновления

### Новые файлы:

1. `tests/scoring.test.ts` - тесты для ScoringService
2. `tests/storage.test.ts` - тесты для StorageService
3. `tests/error-handling.test.ts` - тесты для global error handler
4. `tests/auth.middleware.test.ts` - тесты для auth middleware

### Обновить существующие:

1. `tests/applications.test.ts` - добавить GET endpoints
2. `tests/listings.test.ts` - добавить GET/UPDATE/DELETE endpoints
3. `tests/properties.test.ts` - добавить GET/UPDATE/DELETE endpoints
4. `tests/profiles.test.ts` - добавить GET/UPDATE endpoints
5. `tests/contracts.test.ts` - добавить GET endpoints
6. `tests/payments.test.ts` - добавить GET endpoints
7. `tests/documents.test.ts` - добавить GET endpoints

## Метрики успеха

После выполнения плана:

- ✅ Branches coverage: 80%+ (было 65.86%)
- ✅ Все критические ветки покрыты
- ✅ CI проходит без ошибок
- ✅ Улучшена надежность тестов
