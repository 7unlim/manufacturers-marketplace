import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/revenue', (req, res) => {
  const { period = '1Y', companyId } = req.query;
  
  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  let groupBy: 'hour' | 'day' | 'month' | 'year' = 'month';
  
  // Build WHERE clause for company filter
  const companyFilter = companyId ? `AND companyId = ${Number(companyId)}` : '';
  
  // For ALL period, find the earliest accepted bid date
  if (period === 'ALL') {
    const earliestBidQuery = `
      SELECT MIN(createdAt) as earliestDate
      FROM bids
      WHERE status = 'accepted' ${companyFilter}
    `;
    const earliestResult = db.prepare(earliestBidQuery).get() as { earliestDate: string | null } | undefined;
    
    if (earliestResult?.earliestDate) {
      startDate = new Date(earliestResult.earliestDate);
    } else {
      // If no accepted bids exist, default to current year
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    groupBy = 'year';
  } else {
    switch (period) {
      case '1D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st
        groupBy = 'month';
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
    }
  }
  
  const startDateStr = startDate.toISOString();
  
  // Query accepted bids within the date range
  const groupByExpr = groupBy === 'hour' 
    ? `strftime('%Y-%m-%d %H:00:00', datetime(createdAt))`
    : groupBy === 'day'
    ? `strftime('%Y-%m-%d', datetime(createdAt))`
    : groupBy === 'year'
    ? `strftime('%Y', datetime(createdAt))`
    : `strftime('%Y-%m', datetime(createdAt))`;
  
  const query = `
    SELECT 
      ${groupByExpr} as periodKey,
      strftime('%Y-%m-%d', datetime(createdAt)) as date,
      strftime('%Y-%m', datetime(createdAt)) as month,
      strftime('%Y-%m-%d %H:00:00', datetime(createdAt)) as hour,
      SUM(totalAmount) as revenue,
      COUNT(*) as count
    FROM bids
    WHERE status = 'accepted' 
      AND datetime(createdAt) >= datetime(?)
      ${companyFilter}
    GROUP BY periodKey
    ORDER BY periodKey ASC
  `;
  
  const results = db.prepare(query).all(startDateStr) as Array<{
    periodKey: string;
    date: string;
    month: string;
    hour: string;
    revenue: number;
    count: number;
  }>;
  
  // Format data for the chart
  const formattedData = results.map(row => {
    let label: string;
    if (groupBy === 'hour') {
      // Parse hour from format "YYYY-MM-DD HH:00:00"
      const hourMatch = row.hour?.match(/(\d{2}):00:00$/);
      const hour = hourMatch ? parseInt(hourMatch[1], 10) : 0;
      // Include date to make it unique
      const datePart = row.date;
      const date = new Date(datePart + 'T00:00:00');
      label = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hour.toString().padStart(2, '0')}:00`;
    } else if (groupBy === 'day') {
      const date = new Date(row.date + 'T00:00:00');
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (groupBy === 'year') {
      // For year grouping, periodKey is just the year (YYYY)
      label = row.periodKey || '';
    } else {
      const date = new Date(row.month + '-01');
      label = date.toLocaleDateString('en-US', { month: 'short' });
    }
    
    return {
      periodKey: row.periodKey,
      label,
      revenue: Math.round(Number(row.revenue) || 0),
      count: Number(row.count) || 0
    };
  });
  
  // Fill in missing dates/hours if needed for smoother visualization
  const filledData = fillMissingPeriods(formattedData, groupBy, startDate, now);
  
  // Calculate total revenue for the period (sum of all periods in selected timeframe)
  const periodTotalRevenue = filledData.reduce((sum, point) => sum + point.revenue, 0);
  
  // Calculate rolling window percentage change
  // Compare current window [now - L, now) to previous window [now - 2L, now - L)
  let revenueChange = 0;
  let previousWindowRevenue = 0;
  
  // YTD has special handling - it compares current year to previous full year
  let isYTD = false;
  
  if (period !== 'ALL') {
    // Define window length L in milliseconds
    let windowLengthMs: number = 0;
    switch (period) {
      case '1D':
        windowLengthMs = 24 * 60 * 60 * 1000;
        break;
      case '1W':
        windowLengthMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case '1M':
        windowLengthMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case '3M':
        windowLengthMs = 90 * 24 * 60 * 60 * 1000;
        break;
      case 'YTD':
        // For YTD, compare current year to previous year (full year)
        isYTD = true;
        const currentYearStart = new Date(now.getFullYear(), 0, 1);
        const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const previousYearEnd = new Date(now.getFullYear(), 0, 1);
        
        // Query revenue for current year (YTD)
        const currentYearQuery = `
          SELECT SUM(totalAmount) as revenue
          FROM bids
          WHERE status = 'accepted' 
            AND datetime(createdAt) >= datetime(?)
            ${companyFilter}
        `;
        const currentYearResult = db.prepare(currentYearQuery).get(currentYearStart.toISOString()) as { revenue: number } | undefined;
        const R_curr = Number(currentYearResult?.revenue || 0);
        
        // Query revenue for previous year
        const previousYearQuery = `
          SELECT SUM(totalAmount) as revenue
          FROM bids
          WHERE status = 'accepted' 
            AND datetime(createdAt) >= datetime(?)
            AND datetime(createdAt) < datetime(?)
            ${companyFilter}
        `;
        const previousYearResult = db.prepare(previousYearQuery).get(
          previousYearStart.toISOString(),
          previousYearEnd.toISOString()
        ) as { revenue: number } | undefined;
        previousWindowRevenue = Number(previousYearResult?.revenue || 0);
        
        // Calculate percentage change
        if (previousWindowRevenue === 0 && R_curr === 0) {
          revenueChange = 0;
        } else if (previousWindowRevenue === 0 && R_curr > 0) {
          // Edge case: if R_prev = 0, compare to the earliest data point in the chart's time period
          const earliestDataPoint = filledData.find(p => p.revenue > 0);
          if (earliestDataPoint && earliestDataPoint.revenue > 0) {
            revenueChange = ((R_curr - earliestDataPoint.revenue) / earliestDataPoint.revenue) * 100;
          } else {
            // If no data points in chart, can't calculate
            revenueChange = 0;
          }
        } else if (previousWindowRevenue > 0) {
          revenueChange = ((R_curr - previousWindowRevenue) / previousWindowRevenue) * 100;
        }
        break; // Prevent fall-through to 1Y case
      case '1Y':
        windowLengthMs = 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        windowLengthMs = 365 * 24 * 60 * 60 * 1000;
    }
    
    // Skip window calculation for YTD since it was already calculated above
    if (!isYTD) {
      // Define windows
      // current_window = [now - L, now)
      const currentWindowStart = new Date(now.getTime() - windowLengthMs);
    // previous_window = [now - 2L, now - L)
    const previousWindowStart = new Date(now.getTime() - 2 * windowLengthMs);
    const previousWindowEnd = currentWindowStart;
    
    // Query revenue for current window [now - L, now)
    const currentWindowQuery = `
      SELECT SUM(totalAmount) as revenue
      FROM bids
      WHERE status = 'accepted' 
        AND datetime(createdAt) >= datetime(?)
        AND datetime(createdAt) < datetime(?)
        ${companyFilter}
    `;
    const currentWindowResult = db.prepare(currentWindowQuery).get(
      currentWindowStart.toISOString(),
      now.toISOString()
    ) as { revenue: number } | undefined;
    const R_curr = Number(currentWindowResult?.revenue || 0);
    
    // Query revenue for previous window [now - 2L, now - L)
    const previousWindowQuery = `
      SELECT SUM(totalAmount) as revenue
      FROM bids
      WHERE status = 'accepted' 
        AND datetime(createdAt) >= datetime(?)
        AND datetime(createdAt) < datetime(?)
        ${companyFilter}
    `;
    const previousWindowResult = db.prepare(previousWindowQuery).get(
      previousWindowStart.toISOString(),
      previousWindowEnd.toISOString()
    ) as { revenue: number } | undefined;
    previousWindowRevenue = Number(previousWindowResult?.revenue || 0);
    
    // Calculate percentage change according to edge case rules
    if (previousWindowRevenue === 0 && R_curr === 0) {
      revenueChange = 0;
    } else if (previousWindowRevenue === 0 && R_curr > 0) {
      // Edge case: if R_prev = 0, compare to the earliest data point in the chart's time period
      const earliestDataPoint = filledData.find(p => p.revenue > 0);
      if (earliestDataPoint && earliestDataPoint.revenue > 0) {
        revenueChange = ((R_curr - earliestDataPoint.revenue) / earliestDataPoint.revenue) * 100;
      } else {
        // If no data points in chart, can't calculate
        revenueChange = 0;
      }
    } else if (previousWindowRevenue > 0) {
      revenueChange = ((R_curr - previousWindowRevenue) / previousWindowRevenue) * 100;
    }
    } // End of !isYTD block
  } else {
    // ALL period: no percentage change
    revenueChange = 0;
  }
  
  res.json({
    period,
    data: filledData, // Per-period revenue, not cumulative
    totalRevenue: periodTotalRevenue, // Total revenue for the selected period (not all-time)
    periodTotalRevenue, // Same as totalRevenue (for compatibility)
    revenueChange: Math.round(revenueChange), // Round to 0 decimals per spec
    totalBids: results.reduce((sum, r) => sum + (r.count || 0), 0),
    previousWindowRevenue: period !== 'ALL' ? previousWindowRevenue : undefined // For edge case handling in frontend
  });
});

function fillMissingPeriods(
  data: Array<{ periodKey?: string; label: string; revenue: number; count: number }>,
  groupBy: 'hour' | 'day' | 'month' | 'year',
  startDate: Date,
  endDate: Date
): Array<{ label: string; revenue: number; count: number }> {
  // Use periodKey for matching if available, otherwise use label
  const dataMap = new Map(data.map(d => [d.periodKey || d.label, d]));
  const filled: Array<{ label: string; revenue: number; count: number }> = [];
  
  const current = new Date(startDate);
  
  if (groupBy === 'month') {
    // For monthly grouping, fill all months from start to current month (inclusive)
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();
    
    let month = startMonth;
    let year = startYear;
    
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const monthDate = new Date(year, month, 1);
      const monthStr = monthDate.toISOString().substring(0, 7); // YYYY-MM
      const label = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      const existing = dataMap.get(monthStr);
      filled.push(existing || { label, revenue: 0, count: 0 });
      
      // Move to next month
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  } else if (groupBy === 'year') {
    // For yearly grouping, fill all years from start to current year (inclusive)
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      const yearStr = year.toString();
      const label = yearStr;
      
      const existing = dataMap.get(yearStr);
      filled.push(existing || { label, revenue: 0, count: 0 });
    }
  } else {
    // For hour/day grouping, use the original logic
    while (current <= endDate) {
      let label: string;
      let periodKey: string;
      
      if (groupBy === 'hour') {
        const hour = current.getHours();
        const dateStr = current.toISOString().split('T')[0];
        periodKey = `${dateStr} ${hour.toString().padStart(2, '0')}:00:00`;
        label = `${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hour.toString().padStart(2, '0')}:00`;
        current.setHours(current.getHours() + 1);
      } else {
        const dateStr = current.toISOString().split('T')[0];
        periodKey = dateStr;
        label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        current.setDate(current.getDate() + 1);
      }
      
      const existing = dataMap.get(periodKey);
      filled.push(existing || { label, revenue: 0, count: 0 });
      
      if (current > endDate) break;
    }
  }
  
  return filled;
}

export default router;
