import { useState, useMemo } from "react";
import { calculate, defaultInputs, type Inputs } from "./calc";
import Chart from "./Chart";

const fmt = (n: number) =>
  Math.round(n).toLocaleString("ja-JP", { maximumFractionDigits: 0 });

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function NumberInput({
  label,
  value,
  onChange,
  step,
  suffix,
  percent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  percent?: boolean;
}) {
  const displayValue = percent ? +(value * 100).toPrecision(10) : value;
  const displayStep = step ?? (percent ? 0.1 : 1);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number"
          value={displayValue}
          step={displayStep}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(percent ? v / 100 : v);
          }}
        />
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
          {percent ? "%" : suffix ?? ""}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);
  const [showInvestment, setShowInvestment] = useState(false);

  const set = <K extends keyof Inputs>(key: K) => (v: Inputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: v }));

  const result = useMemo(() => calculate(inputs), [inputs]);
  const { summary, yearly } = result;

  const effectiveDiff = showInvestment
    ? summary.diffWithInvestment
    : summary.diff;
  const effectiveCheaper = effectiveDiff < 0 ? "賃貸" : "購入";
  const effectiveAbsDiff = Math.abs(effectiveDiff);

  return (
    <div className="app">
      <div className="title">
        <h1>賃貸 vs 購入</h1>
        <p>費用比較シミュレーター</p>
      </div>

      {/* 年数スライダー */}
      <div className="common-input">
        <label>経過年数</label>
        <input
          type="range"
          min={1}
          max={50}
          value={inputs.years}
          onChange={(e) => set("years")(Number(e.target.value))}
        />
        <span className="year-value">{inputs.years}年</span>
      </div>

      {/* 入力パネル */}
      <div className="panels">
        <div className="card">
          <h2 className="rent">賃貸の入力</h2>
          <NumberInput
            label="月額家賃"
            value={inputs.monthlyRent}
            onChange={set("monthlyRent")}
            step={10000}
            suffix="円"
          />
          <NumberInput
            label="引っ越し回数"
            value={inputs.moveCount}
            onChange={set("moveCount")}
            suffix="回"
          />
          <NumberInput
            label="引っ越し費用（1回あたり）"
            value={inputs.moveCost}
            onChange={set("moveCost")}
            step={10000}
            suffix="円"
          />
        </div>
        <div className="card">
          <h2 className="buy">購入の入力</h2>
          <NumberInput
            label="物件価格"
            value={inputs.propertyPrice}
            onChange={set("propertyPrice")}
            step={1000000}
            suffix="円"
          />
          <NumberInput
            label="年利率"
            value={inputs.interestRate}
            onChange={set("interestRate")}
            step={0.1}
            percent
          />
          <NumberInput
            label="ローン年数"
            value={inputs.loanYears}
            onChange={set("loanYears")}
            suffix="年"
          />
          <NumberInput
            label="月額管理費"
            value={inputs.monthlyManagementFee}
            onChange={set("monthlyManagementFee")}
            step={1000}
            suffix="円"
          />
          <NumberInput
            label="月額修繕積立費"
            value={inputs.monthlyRepairFund}
            onChange={set("monthlyRepairFund")}
            step={1000}
            suffix="円"
          />
          <NumberInput
            label="火災保険（5年ごと）"
            value={inputs.fireInsurance5y}
            onChange={set("fireInsurance5y")}
            step={10000}
            suffix="円"
          />
          <NumberInput
            label="固定資産税（年）"
            value={inputs.propertyTaxYear}
            onChange={set("propertyTaxYear")}
            step={10000}
            suffix="円"
          />
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <p
              className="section-title"
              style={{ fontWeight: 600, marginBottom: 4 }}
            >
              住宅ローン控除
            </p>
            <NumberInput
              label="控除率（年末残高×）"
              value={inputs.deductionRate}
              onChange={set("deductionRate")}
              step={0.1}
              percent
            />
            <NumberInput
              label="控除期間（最大13年）"
              value={inputs.deductionPeriod}
              onChange={set("deductionPeriod")}
              suffix="年"
            />
            <NumberInput
              label="所得税＋住民税（年間上限）"
              value={inputs.maxTaxDeduction}
              onChange={set("maxTaxDeduction")}
              step={10000}
              suffix="円"
            />
          </div>
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <NumberInput
              label="予想売却価格（物件価格×）"
              value={inputs.resaleRatio}
              onChange={set("resaleRatio")}
              step={1}
              percent
            />
            <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
              → {fmt(inputs.propertyPrice * inputs.resaleRatio)}円
            </div>
          </div>
        </div>
      </div>

      {/* サマリー */}
      <div className="summary">
        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">賃貸 総コスト</div>
            <div className="value rent-color">{fmt(summary.rentTotal)}円</div>
          </div>
          <div className="summary-card">
            <div className="label">購入 実質総コスト</div>
            <div className="value buy-color">{fmt(summary.buyTotal)}円</div>
          </div>
        </div>

        {/* 差額運用チェックボックス */}
        <div className="invest-toggle" style={{ flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="invest"
              checked={showInvestment}
              onChange={(e) => setShowInvestment(e.target.checked)}
            />
            <label htmlFor="invest">差額を運用する</label>
          </div>
          {showInvestment && (
            <NumberInput
              label="利率"
              value={inputs.investmentReturn}
              onChange={set("investmentReturn")}
              step={0.5}
              percent
            />
          )}
        </div>

        {showInvestment && (
          <div className="summary-grid" style={{ marginBottom: 16 }}>
            <div className="summary-card invest-section">
              <div className="label">積立原資 合計</div>
              <div className="value accent-color">
                {fmt(summary.investPrincipal)}円
              </div>
            </div>
            <div className="summary-card invest-section">
              <div className="label">運用総額</div>
              <div className="value accent-color">
                {fmt(summary.investmentGain)}円
              </div>
            </div>
          </div>
        )}

        <div className="result-banner">
          {effectiveCheaper === "賃貸" ? "🏠" : "🏢"}{" "}
          {effectiveCheaper}の方が安い（差額：{fmt(effectiveAbsDiff)}円）
          {showInvestment && " ※運用込み"}
        </div>
      </div>

      {/* コスト内訳 */}
      <div className="breakdown">
        <div className="breakdown-grid">
          <div className="card">
            <h2 className="rent">賃貸コスト内訳</h2>
            <div className="breakdown-item">
              <span className="bl">家賃合計</span>
              <span>{fmt(summary.rentBreakdown.rentSum)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">更新費用合計</span>
              <span>{fmt(summary.rentBreakdown.renewalSum)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">引っ越し費用合計</span>
              <span>{fmt(summary.rentBreakdown.moveSum)}円</span>
            </div>
            <div className="breakdown-item total">
              <span>賃貸 総コスト</span>
              <span>{fmt(summary.rentTotal)}円</span>
            </div>
          </div>
          <div className="card">
            <h2 className="buy">購入コスト内訳</h2>
            <div className="breakdown-item">
              <span className="bl">初期費用（物件価格×8%）</span>
              <span>{fmt(summary.buyBreakdown.initialCost)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">ローン返済額</span>
              <span>{fmt(summary.buyBreakdown.loanPaymentSum)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">ローン残高（売却時）</span>
              <span>{fmt(summary.buyBreakdown.loanBalance)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">管理費・修繕積立合計</span>
              <span>{fmt(summary.buyBreakdown.managementSum)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">火災保険合計</span>
              <span>{fmt(summary.buyBreakdown.fireInsuranceSum)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">固定資産税合計</span>
              <span>{fmt(summary.buyBreakdown.propertyTaxSum)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">売却手数料（売却価格×3%+6万）×1.1</span>
              <span>{fmt(summary.buyBreakdown.saleFee)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">予想売却価格（▲控除）</span>
              <span>-{fmt(summary.buyBreakdown.salePrice)}円</span>
            </div>
            <div className="breakdown-item">
              <span className="bl">住宅ローン控除 合計（▲）</span>
              <span>-{fmt(summary.buyBreakdown.deductionSum)}円</span>
            </div>
            <div className="breakdown-item total">
              <span>購入 実質総コスト</span>
              <span>{fmt(summary.buyTotal)}円</span>
            </div>
          </div>
        </div>
      </div>

      {/* グラフ */}
      <div className="chart-section">
        <h2>累計コスト推移</h2>
        <Chart yearly={yearly} showInvestment={showInvestment} />
      </div>

      {/* 年別テーブル */}
      <div className="table-section">
        <h2>年別コスト推移</h2>
        <table>
          <thead>
            <tr>
              <th>年</th>
              <th>賃貸累計</th>
              <th>購入累計</th>
              <th>差額</th>
              <th>ローン残高</th>
              <th>控除累計</th>
              <th>賃貸年間</th>
              <th>購入年間</th>
              {showInvestment && <th>年間積立額</th>}
              {showInvestment && <th>運用総額</th>}
              <th>判定</th>
            </tr>
          </thead>
          <tbody>
            {yearly.map((r) => {
              const effectiveRowDiff = showInvestment
                ? r.rentCumulative - r.investmentGain - r.buyCumulative
                : r.diff;
              return (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>{fmt(r.rentCumulative)}</td>
                  <td>{fmt(r.buyCumulative)}</td>
                  <td>{fmt(r.diff)}</td>
                  <td>{fmt(r.loanBalance)}</td>
                  <td>{fmt(r.deductionCumulative)}</td>
                  <td>{fmt(r.rentAnnual)}</td>
                  <td>{fmt(r.buyAnnual)}</td>
                  {showInvestment && <td>{fmt(r.monthlyInvestBase * 12)}</td>}
                  {showInvestment && <td>{fmt(r.investmentGain)}</td>}
                  <td>{effectiveRowDiff < 0 ? "🏠賃貸" : "🏢購入"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="note" style={{ marginTop: 16 }}>
        ※ 購入実質コスト ＝
        初期費用＋管理費等＋保険＋固定資産税＋ローン返済額＋売却手数料＋ローン残高
        − 売却収入 − ローン控除累計
        <br />※
        控除額は「年末ローン残高×控除率」と「所得税＋住民税の年間上限」の小さい方
        <br />※ 売却価格は物件価格×売却比率（概算）
        <br />※
        差額運用＝毎年「賃貸と購入の月額差額」を積立投資（年複利）。マイナスなら賃貸有利。
      </p>
    </div>
  );
}
