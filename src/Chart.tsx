import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { YearlyRow } from "./calc";

const fmt = (v: number) =>
  `${(v / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}万円`;

export default function Chart({
  yearly,
  showInvestment,
}: {
  yearly: YearlyRow[];
  showInvestment: boolean;
}) {
  const data = yearly.map((r) => ({
    year: `${r.year}年`,
    賃貸累計: Math.round(r.rentCumulative),
    購入累計: Math.round(r.buyCumulative),
    "賃貸(運用込み)": Math.round(r.rentCumulative - r.rentInvestGain),
    "購入(運用込み)": Math.round(r.buyCumulative - r.buyInvestGain),
  }));

  const lines = [
    <Line
      key="rent"
      type="monotone"
      dataKey="賃貸累計"
      stroke="#3b82f6"
      strokeWidth={2}
      dot={false}
    />,
    <Line
      key="buy"
      type="monotone"
      dataKey="購入累計"
      stroke="#ef4444"
      strokeWidth={2}
      dot={false}
    />,
  ];

  if (showInvestment) {
    const last = yearly[yearly.length - 1];
    if (last?.rentInvestGain > 0) {
      lines.push(
        <Line
          key="rent-invest"
          type="monotone"
          dataKey="賃貸(運用込み)"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />,
      );
    }
    if (last?.buyInvestGain > 0) {
      lines.push(
        <Line
          key="buy-invest"
          type="monotone"
          dataKey="購入(運用込み)"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />,
      );
    }
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" fontSize={12} />
        <YAxis tickFormatter={fmt} fontSize={12} width={80} />
        <Tooltip
          formatter={(value: number) => fmt(value)}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend />
        {lines}
      </LineChart>
    </ResponsiveContainer>
  );
}
