"use client";
import { Fragment, useId, useState, type ReactElement } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
export type ChartDatum = {
  label: string;
  value: number;
  secondary?: number;
  tertiary?: number;
};
export type ChartKind =
  | "area"
  | "line"
  | "bar"
  | "pie"
  | "radar"
  | "radial"
  | "horizontal-bar"
  | "stacked-bar"
  | "stacked-area"
  | "diverging-bar"
  | "gauge"
  | "rings"
  | "heatmap";
export type ChartSeries = "value" | "secondary" | "tertiary";
export type ChartAppearance = "flat" | "gradient" | "glow";
export type ChartProps = {
  data: ChartDatum[];
  kind?: ChartKind;
  label: string;
  valueLabel?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  visibleSeries?: ChartSeries[];
  legend?: boolean;
  appearance?: ChartAppearance;
  maxValue?: number;
  locale?: "en" | "es";
  height?: number;
  className?: string;
  valueFormatter?: (n: number) => string;
  axisValueFormatter?: (n: number) => string;
};
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
export function Chart({
  data,
  kind = "area",
  label,
  valueLabel = "Value",
  secondaryLabel = "Previous",
  tertiaryLabel = "Forecast",
  visibleSeries,
  legend = false,
  appearance = "flat",
  maxValue,
  locale = "en",
  height = 230,
  className,
  valueFormatter,
  axisValueFormatter,
}: ChartProps) {
  const id = useId().replaceAll(":", "");
  const [hidden, setHidden] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [point, setPoint] = useState<{
    key: string;
    label: string;
    name: string;
    value: number;
  } | null>(null);
  const hasSecondary = data.some((d) => d.secondary !== undefined);
  const hasTertiary = data.some((d) => d.tertiary !== undefined);
  const names = {
    value: valueLabel,
    secondary: secondaryLabel,
    tertiary: tertiaryLabel,
  };
  const allSeries: ChartSeries[] = [
    "value",
    ...(hasSecondary ? ["secondary" as const] : []),
    ...(hasTertiary ? ["tertiary" as const] : []),
  ];
  const series = allSeries.filter(
    (key) =>
      (!visibleSeries || visibleSeries.includes(key)) && !hidden.includes(key),
  );
  const radarSeries =
    !legend && !visibleSeries && !hasTertiary
      ? series.filter((key) => key === "value")
      : series;
  const categoryPlot = ["pie", "radial", "rings"].includes(kind);
  const categories = data.filter(
    (item) => !hidden.includes(`category:${item.label}`),
  );
  const seriesColor = (key: ChartSeries) =>
    colors[{ value: 0, secondary: 1, tertiary: 2 }[key]];
  const number = (n: number) =>
    valueFormatter?.(n) ??
    new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
      maximumFractionDigits: 2,
    }).format(n);
  const compact = (n: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  const total = categories.reduce((sum, item) => sum + item.value, 0);
  const goal = Math.max(1, maxValue ?? 100);
  const clamped = (value: number) => Math.max(0, Math.min(1, value / goal));
  const defs = (
    <defs>
      {allSeries.map((key) => (
        <Fragment key={key}>
          <linearGradient id={`${id}-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={seriesColor(key)}
              stopOpacity={appearance === "gradient" ? 0.85 : 0.24}
            />
            <stop
              offset="100%"
              stopColor={seriesColor(key)}
              stopOpacity={appearance === "gradient" ? 0.2 : 0.02}
            />
          </linearGradient>
          <linearGradient id={`${id}-bar-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={seriesColor(key)} />
            <stop
              offset="100%"
              stopColor={seriesColor(key)}
              stopOpacity={0.55}
            />
          </linearGradient>
          <linearGradient id={`${id}-line-${key}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={seriesColor(key)} />
            <stop offset="100%" stopColor="var(--foreground)" />
          </linearGradient>
        </Fragment>
      ))}
      {colors.map((color, index) => (
        <linearGradient
          key={color}
          id={`${id}-category-${index}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor={color} />
          <stop
            offset="100%"
            stopColor="var(--foreground)"
            stopOpacity={0.65}
          />
        </linearGradient>
      ))}
      <filter id={`${id}-glow`} x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
  const glow = appearance === "glow" ? `url(#${id}-glow)` : undefined;
  const axis = {
    tickLine: false,
    axisLine: false,
    tick: { fill: "var(--muted-foreground)", fontSize: 10 },
  };
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        fontSize: 11,
        color: "var(--foreground)",
        boxShadow: "var(--af-shadow-soft)",
      }}
      labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
      itemStyle={{ color: "var(--foreground)" }}
      cursor={{
        stroke: "var(--border)",
        fill: "var(--surface-subtle)",
        fillOpacity: 0.25,
      }}
      isAnimationActive={false}
      labelFormatter={(fallback, payload) =>
        payload?.[0]?.payload?.label ?? fallback
      }
      formatter={(value, name) => [number(Number(value)), name]}
    />
  );
  const cartesian = (
    <>
      <CartesianGrid
        vertical={false}
        stroke="var(--border)"
        strokeDasharray="3 5"
      />
      <XAxis dataKey="label" {...axis} dy={8} minTickGap={22} />
      <YAxis
        {...axis}
        width={42}
        tickFormatter={(n) =>
          axisValueFormatter?.(n) ??
          valueFormatter?.(n) ??
          (Math.abs(n) >= 1000 ? `${n / 1000}k` : String(n))
        }
      />
      {tooltip}
    </>
  );
  let plot: ReactElement;
  if (kind === "pie")
    plot = (
      <PieChart>
        {defs}
        {tooltip}
        <Pie
          data={categories}
          isAnimationActive={false}
          dataKey="value"
          nameKey="label"
          innerRadius="60%"
          outerRadius="90%"
          paddingAngle={4}
          stroke="none"
          filter={glow}
        >
          {categories.map((item) => {
            const index = data.indexOf(item) % colors.length;
            return (
              <Cell
                key={item.label}
                fill={
                  appearance === "gradient"
                    ? `url(#${id}-category-${index})`
                    : colors[index]
                }
                stroke={
                  highlight === `category:${item.label}`
                    ? "var(--foreground)"
                    : colors[index]
                }
                strokeWidth={highlight === `category:${item.label}` ? 2 : 1}
              />
            );
          })}
        </Pie>
      </PieChart>
    );
  else if (kind === "radar")
    plot = (
      <RadarChart data={data}>
        {defs}
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
        />
        <PolarRadiusAxis tick={false} axisLine={false} />
        {radarSeries.map((key) => (
          <Radar
            key={key}
            dataKey={key}
            isAnimationActive={false}
            name={names[key]}
            fill={seriesColor(key)}
            fillOpacity={0.12}
            stroke={seriesColor(key)}
            strokeWidth={highlight === key ? 3 : 2}
            filter={glow}
          />
        ))}
        {tooltip}
      </RadarChart>
    );
  else if (kind === "radial")
    plot = (
      <RadialBarChart
        data={categories.map((d) => ({
          ...d,
          fill: colors[data.indexOf(d) % colors.length],
        }))}
        innerRadius="30%"
        outerRadius="95%"
        startAngle={180}
        endAngle={-180}
      >
        {defs}
        {maxValue !== undefined && (
          <PolarAngleAxis type="number" domain={[0, goal]} tick={false} />
        )}
        <RadialBar
          dataKey="value"
          name={valueLabel}
          isAnimationActive={false}
          background={{ fill: "var(--surface-subtle)" }}
          cornerRadius={6}
          filter={glow}
        >
          {categories.map((item) => {
            const index = data.indexOf(item) % colors.length;
            return (
              <Cell
                key={item.label}
                fill={
                  appearance === "gradient"
                    ? `url(#${id}-category-${index})`
                    : colors[index]
                }
                stroke={
                  highlight === `category:${item.label}`
                    ? "var(--foreground)"
                    : colors[index]
                }
                strokeWidth={highlight === `category:${item.label}` ? 2 : 1}
              />
            );
          })}
        </RadialBar>
        {tooltip}
      </RadialBarChart>
    );
  else if (kind === "gauge")
    plot = (
      <RadialBarChart
        data={[
          {
            ...data[0],
            value: Math.max(0, data[0]?.value ?? 0),
            fill: colors[0],
          },
        ]}
        cx="50%"
        cy="80%"
        innerRadius="70%"
        outerRadius="95%"
        startAngle={180}
        endAngle={0}
      >
        {defs}
        <PolarAngleAxis type="number" domain={[0, goal]} tick={false} />
        <RadialBar
          dataKey="value"
          name={valueLabel}
          isAnimationActive={false}
          background={{ fill: "var(--surface-subtle)" }}
          cornerRadius={12}
          filter={glow}
        >
          <Cell
            fill={
              appearance === "gradient" ? `url(#${id}-category-0)` : colors[0]
            }
            stroke={colors[0]}
            strokeWidth={1}
          />
        </RadialBar>
        {tooltip}
      </RadialBarChart>
    );
  else if (
    ["bar", "horizontal-bar", "stacked-bar", "diverging-bar"].includes(kind)
  )
    plot = (
      <BarChart
        data={data}
        barGap={3}
        layout={kind === "horizontal-bar" ? "vertical" : "horizontal"}
        stackOffset={kind === "diverging-bar" ? "sign" : "none"}
        margin={{ top: 10, right: 6, left: 0, bottom: 8 }}
      >
        {defs}
        {kind === "horizontal-bar" ? (
          <>
            <CartesianGrid
              horizontal={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              type="number"
              {...axis}
              tickFormatter={(n) =>
                axisValueFormatter?.(n) ??
                (Math.abs(n) >= 1000 ? `${n / 1000}k` : String(n))
              }
            />
            <YAxis
              type="category"
              dataKey="label"
              {...axis}
              width={64}
              interval={0}
            />
            {tooltip}
          </>
        ) : (
          cartesian
        )}
        {kind === "diverging-bar" && (
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        )}
        {series.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            isAnimationActive={false}
            name={names[key]}
            fill={
              appearance === "gradient"
                ? `url(#${id}-bar-${key})`
                : seriesColor(key)
            }
            stroke={seriesColor(key)}
            strokeWidth={1}
            stackId={
              kind === "stacked-bar" || kind === "diverging-bar"
                ? "values"
                : undefined
            }
            radius={kind === "horizontal-bar" ? [0, 5, 5, 0] : [4, 4, 4, 4]}
            maxBarSize={kind === "horizontal-bar" ? 16 : 26}
            filter={glow}
          />
        ))}
      </BarChart>
    );
  else if (kind === "line")
    plot = (
      <LineChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 8 }}>
        {cartesian}
        {defs}
        {series.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            isAnimationActive={false}
            name={names[key]}
            stroke={
              appearance === "gradient"
                ? `url(#${id}-line-${key})`
                : seriesColor(key)
            }
            strokeWidth={highlight === key ? 3 : 2}
            strokeDasharray={key === "secondary" ? "4 4" : undefined}
            dot={false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            filter={glow}
          />
        ))}
      </LineChart>
    );
  else if (kind === "area" || kind === "stacked-area")
    plot = (
      <AreaChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 8 }}>
        {defs}
        {cartesian}
        {[...series].reverse().map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            isAnimationActive={false}
            name={names[key]}
            stackId={kind === "stacked-area" ? "values" : undefined}
            stroke={seriesColor(key)}
            strokeWidth={highlight === key ? 3 : 2}
            strokeDasharray={
              kind === "area" && key === "secondary" ? "4 4" : undefined
            }
            fill={
              kind === "stacked-area" || key === "value"
                ? `url(#${id}-${key})`
                : "transparent"
            }
            filter={glow}
          />
        ))}
      </AreaChart>
    );
  else if (kind === "rings") {
    const shown = categories;
    const spacing = Math.min(13, 76 / Math.max(1, shown.length));
    const ringWidth = Math.min(8, spacing * 0.66);
    plot = (
      <svg viewBox="0 0 260 230" width="100%" height="100%" aria-label={label}>
        {defs}
        {shown.map((item, index) => {
          const radius = 96 - index * spacing;
          const circumference = 2 * Math.PI * radius;
          const key = `category:${item.label}`;
          const inspect = () =>
            setPoint({
              key,
              label: item.label,
              name: valueLabel,
              value: item.value,
            });
          return (
            <g
              key={item.label}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${item.label}: ${number(item.value)}`}
              className="outline-none focus-visible:stroke-foreground"
              onPointerEnter={inspect}
              onPointerLeave={() => setPoint(null)}
              onFocus={inspect}
              onBlur={() => setPoint(null)}
              onClick={inspect}
            >
              <circle
                cx="130"
                cy="110"
                r={radius}
                fill="none"
                stroke="var(--surface-subtle)"
                strokeWidth={ringWidth}
              />
              <circle
                cx="130"
                cy="110"
                r={radius}
                fill="none"
                stroke={colors[data.indexOf(item) % colors.length]}
                strokeWidth={
                  highlight === key || point?.key === key
                    ? ringWidth + 1.5
                    : ringWidth
                }
                strokeLinecap="round"
                filter={glow}
                strokeDasharray={`${circumference * clamped(item.value)} ${circumference}`}
                transform="rotate(-90 130 110)"
              />
              {appearance === "gradient" && (
                <circle
                  cx="130"
                  cy="110"
                  r={radius}
                  fill="none"
                  stroke={`url(#${id}-category-${data.indexOf(item) % colors.length})`}
                  strokeWidth={ringWidth * 0.7}
                  strokeLinecap="round"
                  strokeDasharray={`${circumference * clamped(item.value)} ${circumference}`}
                  transform="rotate(-90 130 110)"
                />
              )}
              <title>{`${item.label}: ${number(item.value)}`}</title>
            </g>
          );
        })}
        <text
          x="130"
          y="108"
          textAnchor="middle"
          fill="var(--foreground)"
          fontSize={shown.length > 6 ? 16 : 24}
          fontWeight="600"
        >
          {Math.round(
            (shown.reduce((sum, item) => sum + clamped(item.value), 0) /
              Math.max(1, shown.length)) *
              100,
          )}
          %
        </text>
        <text
          x="130"
          y="127"
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize="10"
        >
          {locale === "es" ? "Promedio" : "Average"}
        </text>
      </svg>
    );
  } else {
    const svgHeight = Math.max(210, data.length * 24 + 40);
    const columnWidth = 246 / Math.max(1, series.length);
    const peak = Math.max(
      1,
      ...data.flatMap((item) => series.map((key) => Math.abs(item[key] ?? 0))),
    );
    plot = (
      <svg
        viewBox={`0 0 320 ${svgHeight}`}
        width="100%"
        height="100%"
        aria-label={label}
      >
        {defs}
        {series.map((key, column) => (
          <text
            key={key}
            x={66 + columnWidth * (column + 0.5)}
            y="16"
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="10"
          >
            {names[key]}
          </text>
        ))}
        {data.map((item, row) => (
          <g key={`${item.label}-${row}`}>
            <text
              x="56"
              y={42 + row * 24}
              textAnchor="end"
              fill="var(--muted-foreground)"
              fontSize="10"
            >
              {item.label.length > 10
                ? `${item.label.slice(0, 9)}…`
                : item.label}
            </text>
            {series.map((key, column) => {
              const value = item[key] ?? 0;
              const cellKey = `${row}:${key}`;
              const inspect = () =>
                setPoint({
                  key: cellKey,
                  label: item.label,
                  name: names[key],
                  value,
                });
              return (
                <g
                  key={key}
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`${item.label}, ${names[key]}: ${number(value)}`}
                  className="outline-none focus-visible:stroke-foreground"
                  onPointerEnter={inspect}
                  onPointerLeave={() => setPoint(null)}
                  onFocus={inspect}
                  onBlur={() => setPoint(null)}
                  onClick={inspect}
                >
                  <rect
                    x={66 + column * columnWidth}
                    y={28 + row * 24}
                    width={columnWidth - 6}
                    height="19"
                    rx="4"
                    fill={
                      appearance === "gradient"
                        ? `url(#${id}-bar-${key})`
                        : seriesColor(key)
                    }
                    fillOpacity={0.18 + (Math.abs(value) / peak) * 0.82}
                    stroke={
                      point?.key === cellKey
                        ? "var(--foreground)"
                        : seriesColor(key)
                    }
                    strokeWidth="1"
                    filter={glow}
                  />
                  <title>{`${item.label}, ${names[key]}: ${number(value)}`}</title>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    );
  }
  const legendItems = categoryPlot
    ? data.map((item, index) => ({
        key: `category:${item.label}`,
        name: item.label,
        color: colors[index % colors.length],
      }))
    : allSeries
        .filter((key) => !visibleSeries || visibleSeries.includes(key))
        .map((key) => ({ key, name: names[key], color: seriesColor(key) }));
  const activeCount = legendItems.filter(
    (item) => !hidden.includes(item.key),
  ).length;
  return (
    <div
      className={cn("chart-shell min-w-0", className)}
      style={{ width: "100%" }}
    >
      <div
        role="group"
        aria-label={label}
        className="relative min-w-0 rounded-xl bg-surface"
        style={{ height }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setPoint(null);
        }}
      >
        {kind === "rings" || kind === "heatmap" ? (
          plot
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 500, height }}
          >
            {plot}
          </ResponsiveContainer>
        )}
        {kind === "pie" && categories.length > 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {compact(total)}
            </span>
            <span className="mt-1 text-[10px] text-muted-foreground">
              Total
            </span>
          </div>
        )}
        {kind === "gauge" && data.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {number(data[0].value)}
            </span>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {locale === "es" ? "de" : "of"} {number(goal)}
            </p>
          </div>
        )}
        {point && (
          <div
            role="status"
            className="pointer-events-none absolute inset-x-2 bottom-1 rounded-lg border border-border bg-surface/95 px-3 py-2 text-[11px] shadow-lg"
          >
            <span className="font-semibold">{point.label}</span>
            <span className="ml-2 text-muted-foreground">{point.name}: </span>
            <span className="font-medium tabular-nums">
              {number(point.value)}
            </span>
          </div>
        )}
      </div>
      {legend && (
        <div
          className="mt-3 flex flex-wrap justify-center gap-1.5"
          aria-label={locale === "es" ? "Leyenda del gráfico" : "Chart legend"}
        >
          {legendItems.map((item) => {
            const selected = !hidden.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={selected}
                disabled={selected && activeCount === 1}
                aria-label={`${item.name}: ${locale === "es" ? (selected ? "ocultar" : "mostrar") : selected ? "hide" : "show"}`}
                onClick={() =>
                  setHidden((current) =>
                    selected
                      ? [...current, item.key]
                      : current.filter((key) => key !== item.key),
                  )
                }
                onPointerEnter={() => setHighlight(item.key)}
                onPointerLeave={() => setHighlight(null)}
                onFocus={() => setHighlight(item.key)}
                onBlur={() => setHighlight(null)}
                className={cn(
                  "flex min-h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-[10px] outline-none hover:border-border focus-visible:ring-2 focus-visible:ring-ring",
                  !selected && "text-muted-foreground line-through",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: item.color }}
                />
                {item.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{label}</th>
              <th scope="col">{valueLabel}</th>
              {hasSecondary && <th scope="col">{secondaryLabel}</th>}
              {hasTertiary && <th scope="col">{tertiaryLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((d, index) => (
              <tr key={`${d.label}-${index}`}>
                <th scope="row">{d.label}</th>
                <td>{d.value}</td>
                {hasSecondary && <td>{d.secondary}</td>}
                {hasTertiary && <td>{d.tertiary}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
