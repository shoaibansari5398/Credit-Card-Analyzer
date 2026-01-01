import React, { useMemo } from 'react';
import {
  ResponsiveContainer, Treemap, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, XAxis, YAxis, CartesianGrid, Scatter, Cell,
  BarChart, Bar
} from 'recharts';
import { Transaction } from '../../types';

// --- CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 shadow-lg rounded text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-200">{label || payload[0].payload.name}</p>
        <p className="text-blue-600 dark:text-blue-400">
          {payload[0].value ? `$${Number(payload[0].value).toFixed(2)}` : ''}
        </p>
        {payload[0].payload.merchant && (
             <p className="text-gray-500 dark:text-gray-400">{payload[0].payload.merchant}</p>
        )}
      </div>
    );
  }
  return null;
};

// --- TREEMAP CONTENT CUSTOMIZATION ---
const TreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, colors, name, value } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: colors[index % colors.length],
            stroke: '#fff', // keeping white for contrast
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {width > 30 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 5}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight={500}
            style={{ pointerEvents: 'none' }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

// --- 1. SPEND TREEMAP ---
export const SpendTreemap: React.FC<{ data: Transaction[] }> = ({ data }) => {
  const treeData = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const COLORS = ['#60A5FA', '#34D399', '#A78BFA', '#F472B6', '#FBBF24', '#9CA3AF'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={treeData}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="#fff"
        content={<TreemapContent colors={COLORS} />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

// --- 2. WEEKLY RADAR ---
export const WeeklyRadar: React.FC<{ data: Transaction[] }> = ({ data }) => {
    const radarData = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayMap = new Array(7).fill(0);

        data.forEach(t => {
            const date = new Date(t.date);
            dayMap[date.getDay()] += t.amount;
        });

        return days.map((day, i) => ({
            day: day.substring(0, 3),
            spend: dayMap[i]
        }));
    }, [data]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid gridType="polygon" stroke="var(--chart-grid)" />
                <PolarAngleAxis dataKey="day" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar name="Spend" dataKey="spend" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip content={<CustomTooltip />} />
            </RadarChart>
        </ResponsiveContainer>
    );
};

// --- 3. ANOMALY SCATTER ---
export const AnomalyScatter: React.FC<{ data: Transaction[] }> = ({ data }) => {
    const scatterData = useMemo(() => {
        return data.map(t => ({
            x: new Date(t.date).getTime(),
            y: t.amount,
            z: 1, // bubble size
            merchant: t.merchant,
            category: t.category
        }));
    }, [data]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                    dataKey="x"
                    type="number"
                    domain={['auto', 'auto']}
                    name="Date"
                    tickFormatter={(unix) => new Date(unix).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    tick={{fontSize: 10, fill: 'var(--chart-axis)'}}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                    tickLine={false}
                />
                <YAxis
                    dataKey="y"
                    type="number"
                    name="Amount"
                    unit="$"
                    tick={{fontSize: 10, fill: 'var(--chart-axis)'}}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Scatter name="Transactions" data={scatterData} fill="#EF4444">
                    {scatterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.y > 500 ? '#EF4444' : '#93C5FD'} />
                    ))}
                </Scatter>
            </ScatterChart>
        </ResponsiveContainer>
    );
};
