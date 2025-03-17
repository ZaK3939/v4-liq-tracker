// Envio のインデックスで使用される型定義

export class BigDecimal {
  private value: string;

  constructor(value: string | number | bigint) {
    this.value = value.toString();
  }

  static fromString(value: string): BigDecimal {
    return new BigDecimal(value);
  }

  static fromNumber(value: number): BigDecimal {
    return new BigDecimal(value.toString());
  }

  static fromBigInt(value: bigint, decimals: number = 0): BigDecimal {
    if (decimals === 0) {
      return new BigDecimal(value.toString());
    }

    const divisor = BigInt(10) ** BigInt(decimals);
    const wholePart = value / divisor;
    const fractionalPart = value % divisor;

    let fractionalStr = fractionalPart.toString().padStart(decimals, "0");

    // 末尾の0を削除
    fractionalStr = fractionalStr.replace(/0+$/, "");

    if (fractionalStr.length > 0) {
      return new BigDecimal(`${wholePart}.${fractionalStr}`);
    } else {
      return new BigDecimal(wholePart.toString());
    }
  }

  toString(): string {
    return this.value;
  }

  toFixed(decimals: number): string {
    if (!this.value.includes(".")) {
      return decimals > 0
        ? `${this.value}.${"0".repeat(decimals)}`
        : this.value;
    }

    const [whole, fraction] = this.value.split(".");
    const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
    return decimals > 0 ? `${whole}.${paddedFraction}` : whole;
  }

  // 算術演算
  plus(other: BigDecimal): BigDecimal {
    // 簡易実装 - 実際には精度の処理が必要
    const result = parseFloat(this.value) + parseFloat(other.value);
    return new BigDecimal(result.toString());
  }

  minus(other: BigDecimal): BigDecimal {
    const result = parseFloat(this.value) - parseFloat(other.value);
    return new BigDecimal(result.toString());
  }

  times(other: BigDecimal): BigDecimal {
    const result = parseFloat(this.value) * parseFloat(other.value);
    return new BigDecimal(result.toString());
  }

  div(other: BigDecimal): BigDecimal {
    if (parseFloat(other.value) === 0) {
      throw new Error("Division by zero");
    }
    const result = parseFloat(this.value) / parseFloat(other.value);
    return new BigDecimal(result.toString());
  }

  // 比較演算
  eq(other: BigDecimal): boolean {
    return parseFloat(this.value) === parseFloat(other.value);
  }

  lt(other: BigDecimal): boolean {
    return parseFloat(this.value) < parseFloat(other.value);
  }

  gt(other: BigDecimal): boolean {
    return parseFloat(this.value) > parseFloat(other.value);
  }

  lte(other: BigDecimal): boolean {
    return parseFloat(this.value) <= parseFloat(other.value);
  }

  gte(other: BigDecimal): boolean {
    return parseFloat(this.value) >= parseFloat(other.value);
  }
}
