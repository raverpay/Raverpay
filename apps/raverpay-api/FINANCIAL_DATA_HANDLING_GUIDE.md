# Financial Data Handling Guide

**Document Version:** 1.0  
**Last Updated:** 2025-12-28  
**Author:** RaverPay Backend Team

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Decimal vs Float Analysis](#decimal-vs-float-analysis)
4. [Implementation Guidelines](#implementation-guidelines)
5. [Code Examples](#code-examples)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [Testing Strategy](#testing-strategy)

---

## Introduction

Financial data handling requires precision and accuracy. This guide provides technical standards for managing monetary values, decimal representations, and floating-point considerations within the RaverPay Backend API.

**Key Principles:**

- Accuracy over performance
- Explicit type handling
- Comprehensive validation
- Transparent rounding

---

## Core Concepts

### Monetary Values in Software

Financial systems deal with:

- **Currency amounts** (e.g., $100.50)
- **Exchange rates** (e.g., 1.25 USD/EUR)
- **Percentages** (e.g., 2.5% fee)
- **Micro-amounts** (e.g., fractions of cents)

### Precision Requirements

| Use Case              | Required Precision | Recommended Type |
| --------------------- | ------------------ | ---------------- |
| Account balances      | 2 decimal places   | Decimal          |
| Exchange rates        | 4-6 decimal places | Decimal          |
| Fees/commissions      | 2-4 decimal places | Decimal          |
| Interest calculations | 6+ decimal places  | Decimal          |

---

## Decimal vs Float Analysis

### 1. Floating-Point (Float/Double) Issues

**Problems with floating-point arithmetic:**

```
0.1 + 0.2 ≠ 0.3 (in most programming languages)
// Binary representation limitation
// 0.1 cannot be precisely represented in binary
```

**Why floats fail for financial data:**

```python
# Python example
balance = 0.1
balance += 0.2
print(balance)  # Output: 0.30000000000000004 ❌

# Cascading errors in calculations
total = 0.0
for i in range(10):
    total += 0.1
print(total)  # Output: 0.9999999999999999 ❌
```

**Root causes:**

- Binary floating-point cannot represent all decimal fractions
- Limited precision (53 bits for double)
- Rounding errors accumulate through operations

### 2. Decimal Advantages

**Decimal representation benefits:**

```python
from decimal import Decimal

balance = Decimal('0.1')
balance += Decimal('0.2')
print(balance)  # Output: Decimal('0.3') ✓

# Exact arithmetic
total = Decimal('0.0')
for i in range(10):
    total += Decimal('0.1')
print(total)  # Output: Decimal('1.0') ✓
```

**Key advantages:**

- Decimal arithmetic matches human expectation
- Exact representation of decimal values
- No accumulating rounding errors
- Audit trail clarity

### 3. Comparison Table

| Aspect                   | Float                     | Decimal                         |
| ------------------------ | ------------------------- | ------------------------------- |
| **Precision**            | ~15-17 significant digits | User-configurable               |
| **Rounding Errors**      | Yes, accumulates          | No, controlled                  |
| **Speed**                | Faster                    | Slower (acceptable for finance) |
| **Storage**              | 8 bytes (double)          | Variable (9+ bytes)             |
| **Auditability**         | Poor                      | Excellent                       |
| **Human Readability**    | Poor for financial        | Excellent                       |
| **Standards Compliance** | Not recommended           | Recommended (ISO 20022)         |

---

## Implementation Guidelines

### 1. Database Storage

#### PostgreSQL (Recommended)

```sql
-- Use NUMERIC/DECIMAL type
CREATE TABLE transactions (
    id BIGINT PRIMARY KEY,
    amount NUMERIC(19, 2) NOT NULL,  -- Supports up to $999,999,999,999,999.99
    commission NUMERIC(19, 4) NOT NULL,
    exchange_rate NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- Indexes for financial queries
CREATE INDEX idx_amount ON transactions(amount);
CREATE INDEX idx_created_at ON transactions(created_at);
```

#### MySQL

```sql
CREATE TABLE transactions (
    id BIGINT PRIMARY KEY,
    amount DECIMAL(19, 2) NOT NULL,
    commission DECIMAL(19, 4) NOT NULL,
    exchange_rate DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMP NOT NULL
) ENGINE=InnoDB;
```

#### MongoDB

```javascript
// Store as Decimal128
{
    _id: ObjectId(...),
    amount: Decimal128("1000.50"),
    commission: Decimal128("25.12"),
    timestamp: ISODate(...)
}
```

### 2. Application Layer

#### Python with Decimal

```python
from decimal import Decimal, ROUND_HALF_UP, getcontext

# Set precision for all Decimal operations
getcontext().prec = 28
getcontext().rounding = ROUND_HALF_UP
```

#### Node.js with Decimal.js

```javascript
const Decimal = require('decimal.js');

// Configure Decimal.js
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
```

#### Java with BigDecimal

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

BigDecimal amount = new BigDecimal("1000.50");
BigDecimal fee = new BigDecimal("25.12");
BigDecimal total = amount.add(fee);
```

### 3. API Contract

```json
{
  "transaction": {
    "id": "txn_1234567890",
    "amount": "1000.50",
    "currency": "USD",
    "commission": "25.12",
    "commission_currency": "USD",
    "exchange_rate": "1.250000",
    "net_amount": "975.38",
    "timestamp": "2025-12-28T13:08:49Z"
  }
}
```

**Important:** Always represent monetary values as **strings** in JSON/API responses to preserve precision.

---

## Code Examples

### Python Implementation

#### Example 1: Transaction Calculation

```python
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from enum import Enum

class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"

@dataclass
class Money:
    """Represents a monetary amount with currency."""
    amount: Decimal
    currency: Currency

    def __post_init__(self):
        if not isinstance(self.amount, Decimal):
            self.amount = Decimal(str(self.amount))
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} and {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def multiply(self, factor: Decimal, decimal_places: int = 2) -> 'Money':
        result = (self.amount * factor).quantize(
            Decimal(10) ** -decimal_places,
            rounding=ROUND_HALF_UP
        )
        return Money(result, self.currency)

    def __str__(self) -> str:
        return f"{self.currency} {self.amount:.2f}"

# Usage
principal = Money(Decimal('1000.00'), Currency.USD)
fee_rate = Decimal('0.025')  # 2.5%
fee = principal.multiply(fee_rate)
net = principal.add(Money(-fee.amount, principal.currency))

print(f"Principal: {principal}")  # USD 1000.00
print(f"Fee: {fee}")               # USD 25.00
print(f"Net: {net}")               # USD 975.00
```

#### Example 2: Commission Calculation

```python
from decimal import Decimal, ROUND_HALF_UP, Context, DefaultContext

class CommissionCalculator:
    """Calculates commissions with proper rounding."""

    def __init__(self, decimal_places: int = 2):
        self.decimal_places = decimal_places
        self.context = Context(
            prec=28,
            rounding=ROUND_HALF_UP
        )

    def calculate_percentage_fee(
        self,
        amount: Decimal,
        percentage: Decimal
    ) -> Decimal:
        """Calculate percentage-based fee."""
        if percentage < 0 or percentage > 100:
            raise ValueError("Percentage must be between 0 and 100")

        fee = amount * (percentage / Decimal('100'))
        return self._round(fee)

    def calculate_tiered_fee(
        self,
        amount: Decimal,
        tiers: list[tuple[Decimal, Decimal]]
    ) -> Decimal:
        """
        Calculate tiered fee.
        tiers: List of (threshold, percentage) tuples
        Example: [(Decimal('1000'), Decimal('1.0')),
                  (Decimal('5000'), Decimal('0.8'))]
        """
        fee = Decimal('0')
        sorted_tiers = sorted(tiers, key=lambda x: x[0])

        previous_threshold = Decimal('0')
        for threshold, percentage in sorted_tiers:
            if amount > threshold:
                taxable = min(amount, threshold) - previous_threshold
                fee += self.calculate_percentage_fee(taxable, percentage)
                previous_threshold = threshold

        return fee

    def _round(self, value: Decimal) -> Decimal:
        """Round to configured decimal places."""
        quantizer = Decimal(10) ** -self.decimal_places
        return value.quantize(quantizer, rounding=ROUND_HALF_UP)

# Usage
calculator = CommissionCalculator(decimal_places=2)

# Simple fee
amount = Decimal('1000.50')
fee = calculator.calculate_percentage_fee(amount, Decimal('2.5'))
print(f"Fee on {amount}: {fee}")  # Output: 25.01

# Tiered fee
tiers = [
    (Decimal('1000'), Decimal('1.0')),
    (Decimal('5000'), Decimal('0.8')),
    (Decimal('10000'), Decimal('0.5'))
]
amount = Decimal('7500.00')
tiered_fee = calculator.calculate_tiered_fee(amount, tiers)
print(f"Tiered fee on {amount}: {tiered_fee}")
```

#### Example 3: Currency Conversion

```python
class ExchangeRate:
    """Represents currency exchange rate."""

    def __init__(
        self,
        from_currency: Currency,
        to_currency: Currency,
        rate: Decimal,
        timestamp: str
    ):
        if rate <= 0:
            raise ValueError("Exchange rate must be positive")

        self.from_currency = from_currency
        self.to_currency = to_currency
        self.rate = Decimal(str(rate))
        self.timestamp = timestamp

    def convert(self, amount: Money) -> Money:
        """Convert money using this exchange rate."""
        if amount.currency != self.from_currency:
            raise ValueError(
                f"Amount currency {amount.currency} does not match "
                f"rate from_currency {self.from_currency}"
            )

        converted = amount.amount * self.rate
        quantizer = Decimal('0.01')
        converted = converted.quantize(
            quantizer,
            rounding=ROUND_HALF_UP
        )
        return Money(converted, self.to_currency)

# Usage
usd_amount = Money(Decimal('100.00'), Currency.USD)
usd_to_eur = ExchangeRate(
    Currency.USD,
    Currency.EUR,
    Decimal('0.92'),
    "2025-12-28T13:08:49Z"
)
eur_amount = usd_to_eur.convert(usd_amount)
print(f"{usd_amount} = {eur_amount}")  # USD 100.00 = EUR 92.00
```

### Node.js Implementation

#### Example 1: Transaction with Decimal.js

```javascript
const Decimal = require('decimal.js');

// Configure Decimal.js
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 9,
});

class Money {
  constructor(amount, currency) {
    if (!(amount instanceof Decimal)) {
      this.amount = new Decimal(String(amount));
    } else {
      this.amount = amount;
    }
    this.currency = currency;

    if (this.amount.isNegative()) {
      throw new Error('Amount cannot be negative');
    }
  }

  add(other) {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add ${this.currency} and ${other.currency}`);
    }
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  subtract(other) {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot subtract ${this.currency} and ${other.currency}`);
    }
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  multiply(factor, decimalPlaces = 2) {
    const result = this.amount.times(factor);
    const rounded = result.toDecimalPlaces(
      decimalPlaces,
      Decimal.ROUND_HALF_UP,
    );
    return new Money(rounded, this.currency);
  }

  toString() {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON() {
    return {
      amount: this.amount.toString(),
      currency: this.currency,
    };
  }
}

// Usage
const principal = new Money('1000.00', 'USD');
const feeRate = new Decimal('0.025');
const fee = principal.multiply(feeRate);
const net = principal.subtract(fee);

console.log(principal.toString()); // USD 1000.00
console.log(fee.toString()); // USD 25.00
console.log(net.toString()); // USD 975.00
```

#### Example 2: Commission Calculator

```javascript
class CommissionCalculator {
  constructor(decimalPlaces = 2) {
    this.decimalPlaces = decimalPlaces;
  }

  calculatePercentageFee(amount, percentage) {
    if (percentage.isNegative() || percentage.greaterThan(100)) {
      throw new Error('Percentage must be between 0 and 100');
    }

    const fee = new Decimal(String(amount)).times(percentage).dividedBy(100);

    return fee.toDecimalPlaces(this.decimalPlaces, Decimal.ROUND_HALF_UP);
  }

  calculateTieredFee(amount, tiers) {
    amount = new Decimal(String(amount));
    let fee = new Decimal(0);
    let previousThreshold = new Decimal(0);

    const sortedTiers = tiers.sort((a, b) =>
      new Decimal(a[0]).minus(new Decimal(b[0])).toNumber(),
    );

    for (const [threshold, percentage] of sortedTiers) {
      const thresholdDec = new Decimal(String(threshold));

      if (amount.greaterThan(thresholdDec)) {
        const taxable = Decimal.min(amount, thresholdDec).minus(
          previousThreshold,
        );

        fee = fee.plus(this.calculatePercentageFee(taxable, percentage));
        previousThreshold = thresholdDec;
      }
    }

    return fee;
  }
}

// Usage
const calculator = new CommissionCalculator(2);
const amount = new Decimal('1000.50');
const fee = calculator.calculatePercentageFee(amount, new Decimal('2.5'));
console.log(`Fee: ${fee.toString()}`); // Output: 25.01
```

### Java Implementation

#### Example 1: Money Class

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

public class Money implements Comparable<Money> {
    private final BigDecimal amount;
    private final Currency currency;
    private static final int DEFAULT_SCALE = 2;

    public Money(BigDecimal amount, Currency currency) {
        Objects.requireNonNull(amount, "Amount cannot be null");
        Objects.requireNonNull(currency, "Currency cannot be null");

        if (amount.signum() < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }

        this.amount = amount.setScale(DEFAULT_SCALE, RoundingMode.HALF_UP);
        this.currency = currency;
    }

    public Money(String amount, Currency currency) {
        this(new BigDecimal(amount), currency);
    }

    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "Cannot add different currencies"
            );
        }
        return new Money(
            this.amount.add(other.amount),
            this.currency
        );
    }

    public Money subtract(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "Cannot subtract different currencies"
            );
        }
        return new Money(
            this.amount.subtract(other.amount),
            this.currency
        );
    }

    public Money multiply(BigDecimal factor) {
        return new Money(
            this.amount.multiply(factor),
            this.currency
        );
    }

    public Money multiply(BigDecimal factor, int scale) {
        BigDecimal result = this.amount.multiply(factor)
            .setScale(scale, RoundingMode.HALF_UP);
        return new Money(result, this.currency);
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Currency getCurrency() {
        return currency;
    }

    @Override
    public String toString() {
        return String.format("%s %s", currency.getSymbol(), amount);
    }

    @Override
    public int compareTo(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "Cannot compare different currencies"
            );
        }
        return this.amount.compareTo(other.amount);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money)) return false;
        Money money = (Money) o;
        return amount.equals(money.amount) &&
               currency.equals(money.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount, currency);
    }
}
```

#### Example 2: Commission Calculation Service

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.List;

public class CommissionService {
    private static final int DEFAULT_SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    public Money calculatePercentageFee(
        Money amount,
        BigDecimal percentage
    ) {
        if (percentage.compareTo(BigDecimal.ZERO) < 0 ||
            percentage.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException(
                "Percentage must be between 0 and 100"
            );
        }

        BigDecimal fee = amount.getAmount()
            .multiply(percentage)
            .divide(new BigDecimal("100"), DEFAULT_SCALE, ROUNDING);

        return new Money(fee, amount.getCurrency());
    }

    public Money calculateTieredFee(
        Money amount,
        List<CommissionTier> tiers
    ) {
        BigDecimal fee = BigDecimal.ZERO;
        BigDecimal previousThreshold = BigDecimal.ZERO;

        for (CommissionTier tier : tiers) {
            if (amount.getAmount().compareTo(tier.getThreshold()) > 0) {
                BigDecimal taxable = amount.getAmount()
                    .min(tier.getThreshold())
                    .subtract(previousThreshold);

                Money taxableMoney = new Money(taxable, amount.getCurrency());
                fee = fee.add(
                    calculatePercentageFee(taxableMoney, tier.getPercentage())
                        .getAmount()
                );
                previousThreshold = tier.getThreshold();
            }
        }

        return new Money(fee.setScale(DEFAULT_SCALE, ROUNDING),
                        amount.getCurrency());
    }

    public static class CommissionTier {
        private final BigDecimal threshold;
        private final BigDecimal percentage;

        public CommissionTier(BigDecimal threshold, BigDecimal percentage) {
            this.threshold = threshold;
            this.percentage = percentage;
        }

        public BigDecimal getThreshold() {
            return threshold;
        }

        public BigDecimal getPercentage() {
            return percentage;
        }
    }
}
```

---

## Best Practices

### 1. Type Safety

```python
# ✓ GOOD: Explicit type conversion
amount_str = "1000.50"
amount = Decimal(amount_str)

# ✗ BAD: Implicit conversion from float
amount = Decimal(1000.50)  # Loss of precision already occurred
```

### 2. String Conversion

```javascript
// ✓ GOOD: Always convert from strings
const amount = new Decimal('1000.50');

// ✗ BAD: Converting from float
const amount = new Decimal(1000.5); // Already imprecise
```

### 3. Rounding Strategies

```python
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN, ROUND_CEILING

# ROUND_HALF_UP: Standard banker's rounding (use for most calculations)
value = Decimal('10.125')
value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)  # 10.13

# ROUND_DOWN: For calculations favoring the business
commission_fee = Decimal('25.126')
commission_fee.quantize(Decimal('0.01'), rounding=ROUND_DOWN)  # 25.12

# ROUND_CEILING: For customer refunds
refund = Decimal('99.994')
refund.quantize(Decimal('0.01'), rounding=ROUND_CEILING)  # 100.00
```

### 4. Validation

```python
def validate_money(amount: Decimal, currency: str) -> bool:
    """Validate monetary amount."""
    # Check positive
    if amount <= 0:
        return False

    # Check reasonable scale (max 4 decimal places for most currencies)
    if amount.as_tuple().exponent < -4:
        return False

    # Check reasonable bounds
    if amount > Decimal('999999999999.99'):
        return False

    # Check currency validity
    valid_currencies = ['USD', 'EUR', 'GBP', 'JPY']
    if currency not in valid_currencies:
        return False

    return True
```

### 5. Audit Trail

```python
@dataclass
class TransactionAudit:
    """Audit trail for financial transactions."""
    transaction_id: str
    timestamp: str
    operation: str
    amount: Decimal
    currency: str
    previous_balance: Decimal
    new_balance: Decimal
    rounding_method: str
    calculated_by: str

    def to_audit_log(self) -> dict:
        """Convert to audit log format."""
        return {
            'transaction_id': self.transaction_id,
            'timestamp': self.timestamp,
            'operation': self.operation,
            'amount': str(self.amount),
            'currency': self.currency,
            'previous_balance': str(self.previous_balance),
            'new_balance': str(self.new_balance),
            'rounding_method': self.rounding_method,
            'calculated_by': self.calculated_by
        }
```

---

## Common Pitfalls

### 1. Float Literals in Code

```python
# ✗ WRONG
balance = 0.1 + 0.2  # Result: 0.30000000000000004

# ✓ CORRECT
balance = Decimal('0.1') + Decimal('0.2')  # Result: Decimal('0.3')
```

### 2. Database Type Mismatches

```sql
-- ✗ WRONG: Using FLOAT for financial data
CREATE TABLE accounts (
    balance FLOAT  -- DO NOT USE
);

-- ✓ CORRECT: Using DECIMAL/NUMERIC
CREATE TABLE accounts (
    balance NUMERIC(19, 2)  -- Maximum $999,999,999,999,999.99
);
```

### 3. Missing Scale Configuration

```javascript
// ✗ WRONG: No rounding configuration
const fee = amount * 0.025;

// ✓ CORRECT: Explicit rounding
const fee = amount.times('0.025').toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
```

### 4. String Representation Without Quotes

```json
// ✗ WRONG: Number representation loses precision
{
    "amount": 1000.50,
    "fee": 25.125
}

// ✓ CORRECT: String representation preserves precision
{
    "amount": "1000.50",
    "fee": "25.13"
}
```

### 5. Not Handling Edge Cases

```python
# ✗ WRONG: No validation
def calculate_fee(amount: Decimal) -> Decimal:
    return amount * Decimal('0.025')

# ✓ CORRECT: With validation and error handling
def calculate_fee(amount: Decimal) -> Decimal:
    if not isinstance(amount, Decimal):
        raise TypeError("Amount must be Decimal")
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if amount > Decimal('999999999999.99'):
        raise ValueError("Amount exceeds maximum")

    fee = amount * Decimal('0.025')
    return fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

---

## Testing Strategy

### 1. Unit Tests - Python

```python
import pytest
from decimal import Decimal, ROUND_HALF_UP

class TestMoneyCalculations:
    """Test suite for money calculations."""

    def test_addition_exact_decimal(self):
        """Test that decimal addition is exact."""
        m1 = Money(Decimal('0.1'), Currency.USD)
        m2 = Money(Decimal('0.2'), Currency.USD)
        result = m1.add(m2)

        assert result.amount == Decimal('0.3')

    def test_fee_calculation_rounding(self):
        """Test fee calculation with proper rounding."""
        calculator = CommissionCalculator(decimal_places=2)

        # Test case: 0.025 * 1000.50 = 25.0125 → rounds to 25.01
        fee = calculator.calculate_percentage_fee(
            Decimal('1000.50'),
            Decimal('2.5')
        )
        assert fee == Decimal('25.01')

    def test_currency_conversion(self):
        """Test currency conversion maintains precision."""
        usd = Money(Decimal('100.00'), Currency.USD)
        rate = ExchangeRate(Currency.USD, Currency.EUR, Decimal('0.92'), "")

        eur = rate.convert(usd)
        assert eur.amount == Decimal('92.00')

    def test_negative_amount_rejection(self):
        """Test that negative amounts are rejected."""
        with pytest.raises(ValueError):
            Money(Decimal('-100.00'), Currency.USD)

    def test_currency_mismatch(self):
        """Test that currency mismatch raises error."""
        usd = Money(Decimal('100.00'), Currency.USD)
        eur = Money(Decimal('100.00'), Currency.EUR)

        with pytest.raises(ValueError):
            usd.add(eur)

    @pytest.mark.parametrize('percentage,expected', [
        (Decimal('2.5'), Decimal('25.01')),
        (Decimal('2.0'), Decimal('20.01')),
        (Decimal('1.5'), Decimal('15.01')),
        (Decimal('0.1'), Decimal('1.00')),
    ])
    def test_percentage_fees(self, percentage, expected):
        """Parametrized test for various fee percentages."""
        calculator = CommissionCalculator()
        result = calculator.calculate_percentage_fee(
            Decimal('1000.50'),
            percentage
        )
        assert result == expected

    def test_balance_reconciliation(self):
        """Test that balance reconciliation maintains precision."""
        initial = Decimal('1000.00')
        transactions = [
            Decimal('100.50'),
            Decimal('-50.25'),
            Decimal('75.75')
        ]

        balance = initial
        for txn in transactions:
            balance += txn

        expected = Decimal('1125.00')
        assert balance == expected
```

### 2. Integration Tests - Node.js

```javascript
const Decimal = require('decimal.js');
const assert = require('assert');

describe('Money Operations', () => {
  let calculator;

  beforeEach(() => {
    Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
    calculator = new CommissionCalculator(2);
  });

  it('should calculate exact decimal addition', () => {
    const m1 = new Money('0.1', 'USD');
    const m2 = new Money('0.2', 'USD');
    const result = m1.add(m2);

    assert.strictEqual(result.amount.toString(), '0.3');
  });

  it('should handle fee calculation with rounding', () => {
    const amount = new Decimal('1000.50');
    const percentage = new Decimal('2.5');
    const fee = calculator.calculatePercentageFee(amount, percentage);

    assert.strictEqual(fee.toString(), '25.01');
  });

  it('should reject invalid percentages', () => {
    const amount = new Decimal('1000.00');

    assert.throws(
      () => calculator.calculatePercentageFee(amount, new Decimal('-1')),
      /Percentage must be between 0 and 100/,
    );
  });

  it('should handle tiered fee calculation', () => {
    const tiers = [
      [new Decimal('1000'), new Decimal('1.0')],
      [new Decimal('5000'), new Decimal('0.8')],
    ];
    const amount = new Decimal('7500.00');

    const fee = calculator.calculateTieredFee(amount, tiers);

    // First 1000: 1%, Next 4000: 0.8%, Remaining 2500: 0%
    const expected = new Decimal('10').plus(new Decimal('32'));
    assert.strictEqual(fee.toString(), expected.toString());
  });
});
```

### 3. Edge Cases to Test

```python
# Edge cases to include in test suite
EDGE_CASES = [
    # Rounding boundaries
    Decimal('0.015'),  # Should round to 0.02
    Decimal('0.025'),  # Should round to 0.03
    Decimal('0.035'),  # Should round to 0.04

    # Very small amounts
    Decimal('0.01'),
    Decimal('0.001'),

    # Very large amounts
    Decimal('999999999999.99'),

    # Repeating decimals
    Decimal('1') / Decimal('3'),  # 0.333...

    # Cascading operations
    sum(Decimal('0.1') for _ in range(10)),  # Should equal 1.00
]
```

---

## Migration Guide

### From Float to Decimal

```python
# Step 1: Identify float usage
# grep -r "float\|\.0\s*+" apps/raverpay-api/

# Step 2: Replace in models
# BEFORE
class Transaction(models.Model):
    amount = models.FloatField()

# AFTER
from decimal import Decimal
class Transaction(models.Model):
    amount = models.DecimalField(max_digits=19, decimal_places=2)

# Step 3: Update calculations
# BEFORE
fee = amount * 0.025

# AFTER
fee = Decimal(str(amount)) * Decimal('0.025')

# Step 4: Test thoroughly
# Run comprehensive test suite with old and new calculations
```

---

## References

- [IEEE 754 Floating Point](https://en.wikipedia.org/wiki/IEEE_754)
- [Python Decimal Module](https://docs.python.org/3/library/decimal.html)
- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [ISO 20022 - Financial Data Standards](https://www.iso20022.org/)
- [PostgreSQL NUMERIC Type](https://www.postgresql.org/docs/current/datatype-numeric.html)

---

## Support & Questions

For questions or clarifications regarding this guide:

- Contact: Backend Architecture Team
- Repository: raverpay/RaverPay-Backend-Admin
- Last Updated: 2025-12-28
