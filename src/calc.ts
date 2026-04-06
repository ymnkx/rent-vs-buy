export interface Inputs {
  years: number;
  monthlyRent: number;
  moveCount: number;
  moveCost: number;
  propertyPrice: number;
  interestRate: number;
  loanYears: number;
  monthlyManagementFee: number;
  monthlyRepairFund: number;
  fireInsurance5y: number;
  propertyTaxYear: number;
  deductionRate: number;
  deductionPeriod: number;
  maxTaxDeduction: number;
  investmentReturn: number;
  resaleRatio: number;
}

export interface YearlyRow {
  year: number;
  rentCumulative: number;
  buyCumulative: number;
  diff: number;
  loanBalance: number;
  deductionCumulative: number;
  propertyTaxCumulative: number;
  managementCumulative: number;
  loanPaymentCumulative: number;
  salePrice: number;
  saleFee: number;
  buyCashflowCumulative: number;
  rentAnnual: number;
  buyAnnual: number;
  monthlyDiff: number;
  rentInvestBase: number;
  buyInvestBase: number;
  rentInvestPrincipal: number;
  buyInvestPrincipal: number;
  rentInvestGain: number;
  buyInvestGain: number;
}

export interface Summary {
  rentTotal: number;
  buyTotal: number;
  deductionTotal: number;
  diff: number;
  rentInvestPrincipal: number;
  rentInvestGain: number;
  buyInvestPrincipal: number;
  buyInvestGain: number;
  diffWithInvestment: number;
  rentBreakdown: {
    rentSum: number;
    renewalSum: number;
    moveSum: number;
  };
  buyBreakdown: {
    initialCost: number;
    loanBalance: number;
    managementSum: number;
    fireInsuranceSum: number;
    propertyTaxSum: number;
    loanPaymentSum: number;
    salePrice: number;
    saleFee: number;
    deductionSum: number;
  };
}

export interface Result {
  summary: Summary;
  yearly: YearlyRow[];
}

// 月々のローン返済額（元利均等）
function monthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// 年末ローン残高
function loanBalanceAtMonth(
  principal: number,
  annualRate: number,
  loanYears: number,
  months: number,
): number {
  const r = annualRate / 12;
  const n = loanYears * 12;
  if (months >= n) return 0;
  if (r === 0) return principal - (principal / n) * months;
  const mp = monthlyPayment(principal, annualRate, loanYears);
  return principal * Math.pow(1 + r, months) - mp * ((Math.pow(1 + r, months) - 1) / r);
}

export function calculate(inputs: Inputs): Result {
  const {
    years,
    monthlyRent,
    moveCount,
    moveCost,
    propertyPrice,
    interestRate,
    loanYears,
    monthlyManagementFee,
    monthlyRepairFund,
    fireInsurance5y,
    propertyTaxYear,
    deductionRate,
    deductionPeriod,
    maxTaxDeduction,
    investmentReturn,
    resaleRatio,
  } = inputs;

  const mp = monthlyPayment(propertyPrice, interestRate, loanYears);
  const initialCost = propertyPrice * 0.08;
  const salePrice = propertyPrice * resaleRatio;

  const yearly: YearlyRow[] = [];
  let deductionCum = 0;
  let rentInvestPrincipalCum = 0;
  let rentInvestGainCum = 0;
  let buyInvestPrincipalCum = 0;
  let buyInvestGainCum = 0;
  let buyCashflowCum = 0;

  for (let y = 1; y <= years; y++) {
    // 賃貸
    // 引っ越し: 経過年数を(回数+1)で割った間隔で発生
    const moveInterval = moveCount > 0 ? Math.floor(years / (moveCount + 1)) : 0;
    const isMovingYear = moveInterval > 0 && y % moveInterval === 0 && y < years;
    const movesSoFar = moveInterval > 0 ? Math.floor(y / moveInterval) : 0;
    const isMove = isMovingYear && movesSoFar <= moveCount;
    const rentAnnual =
      monthlyRent * 12 +
      (y % 2 === 0 ? monthlyRent : 0) + // 更新費（2年ごと=家賃1ヶ月）
      (isMove ? moveCost : 0); // 引っ越し費用
    const rentCum = y === 1 ? rentAnnual : yearly[y - 2].rentCumulative + rentAnnual;

    // 購入
    const loanBal = loanBalanceAtMonth(propertyPrice, interestRate, loanYears, y * 12);
    const loanPaymentCum =
      y * 12 <= loanYears * 12 ? mp * Math.min(y * 12, loanYears * 12) : mp * loanYears * 12;

    // 住宅ローン控除
    const yearEndBalance = loanBalanceAtMonth(
      propertyPrice,
      interestRate,
      loanYears,
      y * 12,
    );
    let deductionThisYear = 0;
    if (y <= deductionPeriod) {
      deductionThisYear = Math.min(yearEndBalance * deductionRate, maxTaxDeduction);
    }
    deductionCum += deductionThisYear;

    const managementCum = (monthlyManagementFee + monthlyRepairFund) * 12 * y;
    const propertyTaxCum = propertyTaxYear * y;

    const saleFee = (salePrice * 0.03 + 60000) * 1.1; // 仲介手数料

    // キャッシュフローベースの年間支出（売却・ローン残高を除く）
    const rentCashflow = rentAnnual;
    const loanPaymentThisYear = y * 12 <= loanYears * 12 ? mp * 12 : 0;
    const buyAnnual =
      (y === 1 ? initialCost : 0) +
      loanPaymentThisYear +
      (monthlyManagementFee + monthlyRepairFund) * 12 +
      (y % 5 === 0 ? fireInsurance5y : 0) +
      propertyTaxYear;
    const buyCashflow = buyAnnual - deductionThisYear;
    buyCashflowCum += buyCashflow;

    // 最終年のみ売却を反映した実質コスト
    const buyCum =
      y === years
        ? buyCashflowCum + saleFee + loanBal - salePrice
        : buyCashflowCum;

    const diff = rentCum - buyCum;
    const cashflowDiff = rentCashflow - buyCashflow;

    // 差額運用: 安い方が差額を積立
    const rentInvestBase = cashflowDiff < 0 ? -cashflowDiff : 0; // 賃貸が安い年
    const buyInvestBase = cashflowDiff > 0 ? cashflowDiff : 0;   // 購入が安い年

    // 年複利で積立運用（各側独立）
    rentInvestPrincipalCum += rentInvestBase;
    rentInvestGainCum = rentInvestGainCum * (1 + investmentReturn) + rentInvestBase;
    buyInvestPrincipalCum += buyInvestBase;
    buyInvestGainCum = buyInvestGainCum * (1 + investmentReturn) + buyInvestBase;

    yearly.push({
      year: y,
      rentCumulative: rentCum,
      buyCumulative: buyCum,
      diff,
      loanBalance: loanBal,
      deductionCumulative: deductionCum,
      propertyTaxCumulative: propertyTaxCum,
      managementCumulative: managementCum,
      loanPaymentCumulative: loanPaymentCum,
      salePrice,
      saleFee,
      buyCashflowCumulative: buyCashflowCum,
      rentAnnual,
      buyAnnual,
      monthlyDiff: cashflowDiff / 12,
      rentInvestBase,
      buyInvestBase,
      rentInvestPrincipal: rentInvestPrincipalCum,
      buyInvestPrincipal: buyInvestPrincipalCum,
      rentInvestGain: rentInvestGainCum,
      buyInvestGain: buyInvestGainCum,
    });
  }

  const last = yearly[years - 1];
  const rentSum = monthlyRent * 12 * years;
  const renewalSum = Math.floor(years / 2) * monthlyRent;
  const moveSum = moveCount * moveCost;

  return {
    summary: {
      rentTotal: last.rentCumulative,
      buyTotal: last.buyCumulative,
      deductionTotal: deductionCum,
      diff: last.diff,
      rentInvestPrincipal: rentInvestPrincipalCum,
      rentInvestGain: rentInvestGainCum,
      buyInvestPrincipal: buyInvestPrincipalCum,
      buyInvestGain: buyInvestGainCum,
      diffWithInvestment:
        (last.rentCumulative - rentInvestGainCum) -
        (last.buyCumulative - buyInvestGainCum),
      rentBreakdown: { rentSum, renewalSum, moveSum },
      buyBreakdown: {
        initialCost,
        loanBalance: last.loanBalance,
        managementSum: last.managementCumulative,
        fireInsuranceSum: Math.floor(years / 5) * fireInsurance5y,
        propertyTaxSum: last.propertyTaxCumulative,
        loanPaymentSum: last.loanPaymentCumulative,
        salePrice,
        saleFee: (salePrice * 0.03 + 60000) * 1.1,
        deductionSum: deductionCum,
      },
    },
    yearly,
  };
}

export const defaultInputs: Inputs = {
  years: 20,
  monthlyRent: 100000,
  moveCount: 3,
  moveCost: 500000,
  propertyPrice: 40000000,
  interestRate: 0.01,
  loanYears: 35,
  monthlyManagementFee: 15000,
  monthlyRepairFund: 15000,
  fireInsurance5y: 200000,
  propertyTaxYear: 150000,
  deductionRate: 0.007,
  deductionPeriod: 13,
  maxTaxDeduction: 210000,
  investmentReturn: 0.05,
  resaleRatio: 0.70,
};
