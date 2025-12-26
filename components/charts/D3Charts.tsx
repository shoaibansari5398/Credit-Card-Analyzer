import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Transaction } from '../../types';

interface CalendarHeatmapProps {
  data: Transaction[];
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const processedData = useMemo(() => {
    const dailyMap = new Map<string, number>();
    data.forEach(t => {
      const current = dailyMap.get(t.date) || 0;
      dailyMap.set(t.date, current + t.amount);
    });
    
    // Sort keys and fill gaps if necessary, but D3 handles sparse data well if we map correctly
    return Array.from(dailyMap.entries()).map(([date, value]) => ({ date: new Date(date), value }));
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || processedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const width = svgRef.current.clientWidth;
    const height = 180;
    const cellSize = 14;
    const cellGap = 3;
    const margin = { top: 20, right: 20, bottom: 20, left: 30 };

    // Group by week
    const timeWeek = d3.timeSunday;
    
    // Determine date range from data or fixed 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 60); // Show last 60 days

    const days = d3.timeDays(startDate, endDate);

    // Scales
    const colorScale = d3.scaleSequential(d3.interpolateGreens)
      .domain([0, d3.max(processedData, d => d.value) || 100]);

    // Grid construction
    const group = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Draw cells
    group.selectAll("rect")
      .data(days)
      .enter()
      .append("rect")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", d => {
        const weekDiff = timeWeek.count(d3.timeYear(d), d) - timeWeek.count(d3.timeYear(startDate), startDate);
        return weekDiff * (cellSize + cellGap);
      })
      .attr("y", d => d.getDay() * (cellSize + cellGap))
      .attr("rx", 2)
      .attr("fill", d => {
        const iso = d.toISOString().split('T')[0];
        const record = processedData.find(p => p.date.toISOString().split('T')[0] === iso);
        return record ? colorScale(record.value) : "#f3f4f6"; // Gray for no spend
      })
      .append("title")
      .text(d => {
        const iso = d.toISOString().split('T')[0];
        const record = processedData.find(p => p.date.toISOString().split('T')[0] === iso);
        return `${iso}: $${record?.value.toFixed(2) || 0}`;
      });

    // Day labels
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
    group.selectAll(".day-label")
      .data(daysOfWeek)
      .enter()
      .append("text")
      .text(d => d)
      .attr("x", -10)
      .attr("y", (d, i) => i * (cellSize + cellGap) + 11)
      .style("font-size", "10px")
      .attr("fill", "#9ca3af");

    // Month labels (Simplified)
    // In a full app, we'd calculate month boundaries
    group.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .text("Spending Intensity (Last 60 Days)")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .attr("fill", "#4b5563");

  }, [processedData]);

  return (
    <div className="w-full h-full overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: '180px' }}></svg>
    </div>
  );
};
