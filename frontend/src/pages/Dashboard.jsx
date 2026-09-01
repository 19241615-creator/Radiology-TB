import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Custom dynamic line/area chart using SVG to match design system colors (Teal theme)
function SVGAreaChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-text-muted text-xs py-12 text-center font-medium bg-surface-slate rounded-lg border border-dashed border-border-crisp">
        Belum ada data tren pemeriksaan.
      </div>
    );
  }
  
  const width = 500;
  const height = 180;
  const padding = 20;
  const leftOffset = 32; // Spacing for Y-axis text
  
  const maxVal = Math.max(...data.map(d => d.count), 5);
  
  const points = data.map((d, index) => {
    const x = leftOffset + (index * (width - leftOffset - padding) / (data.length - 1 || 1));
    const y = height - padding - (d.count * (height - padding * 2) / maxVal);
    const label = (d.date && typeof d.date === 'string') ? d.date.split('-').slice(1).join('/') : '';
    return { x, y, label, count: d.count };
  });
  
  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');
  
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
    : '';

  return (
    <div className="w-full select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="areaGradTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#006b5b" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#006b5b" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        
        {/* Y Axis Guide Lines */}
        <g className="stroke-border-crisp" strokeWidth={0.5} strokeDasharray="3 3">
          <line x1={leftOffset} y1={padding} x2={width - padding} y2={padding} />
          <line x1={leftOffset} y1={(height - padding * 2) / 2 + padding} x2={width - padding} y2={(height - padding * 2) / 2 + padding} />
        </g>
        
        {/* X Axis line */}
        <line x1={leftOffset} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth={1} />
        
        {/* Y Axis Text labels */}
        <g className="text-[10px] font-mono-data fill-text-muted font-medium" textAnchor="end">
          <text x={leftOffset - 8} y={padding + 3.5}>{maxVal}</text>
          <text x={leftOffset - 8} y={(height - padding * 2) / 2 + padding + 3.5}>{Math.round(maxVal / 2)}</text>
          <text x={leftOffset - 8} y={height - padding + 3.5}>0</text>
        </g>
        
        {/* Gradient Area Fill */}
        {areaD && <path d={areaD} fill="url(#areaGradTeal)" className="animate-area" />}
        
        {/* Connection Line */}
        {pathD && <path d={pathD} fill="none" stroke="#006b5b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="animate-path" />}
        
        {/* Data Points, labels & dates */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle cx={p.x} cy={p.y} r={4.5} fill="#ffffff" stroke="#006b5b" strokeWidth={2.5} className="transition-all duration-200 group-hover:r-[6px] animate-dot" style={{ animationDelay: `${i * 100}ms` }} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[11px] font-bold fill-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              {p.count}
            </text>
            <text x={p.x} y={height - padding + 16} textAnchor="middle" className="text-[10px] font-semibold fill-text-muted">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Custom dynamic bar chart to match design system colors (Teal, Amber, Red theme) with interactive hover
function SVGDonutChart({ data = [] }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const categories = ['Rendah', 'Sedang', 'Tinggi'];
  
  const items = categories.map(cat => {
    const match = data.find(d => d.category === cat);
    return {
      category: cat,
      count: match ? match.count : 0
    };
  });

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  
  // Calculate percentages
  const dataWithPercents = items.map(item => {
    const percent = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
    return {
      ...item,
      percent
    };
  });

  // SVG parameters
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  const strokeWidth = 14;

  const COLORS = {
    'Rendah': '#10b981',
    'Sedang': '#f59e0b',
    'Tinggi': '#ef4444'
  };

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4 select-none">
      {/* 1. Donut Circle */}
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90 animate-donut-container" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle 
            cx={cx} 
            cy={cy} 
            r={r} 
            fill="transparent" 
            stroke="#f1f5f9" 
            strokeWidth={strokeWidth} 
          />
          {totalCount === 0 ? (
            <circle 
              cx={cx} 
              cy={cy} 
              r={r} 
              fill="transparent" 
              stroke="#cbd5e1" 
              strokeWidth={strokeWidth} 
            />
          ) : (
            dataWithPercents.map((item, idx) => {
              if (item.percent === 0) return null;
              const dasharray = `${(item.percent / 100) * circumference} ${circumference}`;
              const dashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percent;

              const isHovered = hoveredItem && hoveredItem.category === item.category;
              const isAnyHovered = hoveredItem !== null;

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="transparent"
                  stroke={COLORS[item.category]}
                  strokeWidth={isHovered ? 18 : strokeWidth}
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`transition-all duration-200 cursor-pointer ${
                    isAnyHovered && !isHovered ? 'opacity-35' : 'opacity-100'
                  }`}
                />
              );
            })
          )}
        </svg>
        
        {/* Dynamic Center Text displaying numbers on hover */}
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200 px-2">
          {hoveredItem ? (
            <div className="animate-in zoom-in-90 duration-150 flex flex-col items-center">
              <span 
                className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[85px]"
                style={{ color: COLORS[hoveredItem.category] }}
              >
                Risiko {hoveredItem.category}
              </span>
              <span className="text-3xl font-extrabold text-slate-800 leading-none mt-0.5">
                {hoveredItem.count}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {hoveredItem.percent}% pasien
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-3xl font-extrabold text-slate-800 leading-none mt-0.5">{totalCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Legends & Values List */}
      <div className="flex-1 w-full space-y-2">
        {dataWithPercents.map((item, idx) => {
          const badgeColor = {
            'Rendah': 'bg-emerald-500',
            'Sedang': 'bg-amber-500',
            'Tinggi': 'bg-rose-500'
          };
          
          const isHovered = hoveredItem && hoveredItem.category === item.category;

          return (
            <div 
              key={idx} 
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
                isHovered ? 'bg-slate-100 scale-[1.02] shadow-xs' : 'hover:bg-slate-50 border-b border-slate-50 last:border-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${badgeColor[item.category]} ${isHovered ? 'ring-2 ring-offset-1 ring-slate-300' : ''}`} />
                <span className={`font-semibold ${isHovered ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>Risiko {item.category}</span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="font-bold text-slate-800 font-mono-data">{item.count}</span>
                <span className="text-slate-400 font-medium w-8 font-mono-data">{item.percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom Donut / Pie Chart for Reporting Status with interactive hover numbers
function SVGPieChart({ data = [] }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const categories = ['Belum Dilaporkan', 'Data Belum Lengkap', 'Sudah Dilaporkan'];
  
  const items = categories.map(cat => {
    const match = data.find(d => d.name === cat);
    return {
      category: cat,
      count: match ? match.value : 0
    };
  });

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  
  const dataWithPercents = items.map(item => {
    const percent = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
    return {
      ...item,
      percent
    };
  });

  const r = 50;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  const strokeWidth = 14;

  const COLORS = {
    'Belum Dilaporkan': '#f59e0b',
    'Data Belum Lengkap': '#ef4444',
    'Sudah Dilaporkan': '#10b981'
  };

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4 select-none">
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90 animate-donut-container" viewBox="0 0 140 140">
          <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {totalCount === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="#cbd5e1" strokeWidth={strokeWidth} />
          ) : (
            dataWithPercents.map((item, idx) => {
              if (item.percent === 0) return null;
              const dasharray = `${(item.percent / 100) * circumference} ${circumference}`;
              const dashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percent;

              const isHovered = hoveredItem && hoveredItem.category === item.category;
              const isAnyHovered = hoveredItem !== null;

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="transparent"
                  stroke={COLORS[item.category]}
                  strokeWidth={isHovered ? 18 : strokeWidth}
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`transition-all duration-200 cursor-pointer ${
                    isAnyHovered && !isHovered ? 'opacity-35' : 'opacity-100'
                  }`}
                />
              );
            })
          )}
        </svg>
        
        {/* Dynamic Center Text displaying numbers on hover */}
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200 px-1">
          {hoveredItem ? (
            <div className="animate-in zoom-in-90 duration-150 flex flex-col items-center">
              <span 
                className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[90px]"
                style={{ color: COLORS[hoveredItem.category] }}
                title={hoveredItem.category}
              >
                {hoveredItem.category}
              </span>
              <span className="text-3xl font-extrabold text-slate-800 leading-none mt-0.5">
                {hoveredItem.count}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {hoveredItem.percent}% data
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-3xl font-extrabold text-slate-800 leading-none mt-0.5">{totalCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {dataWithPercents.map((item, idx) => {
          const badgeColor = {
            'Belum Dilaporkan': 'bg-amber-500',
            'Data Belum Lengkap': 'bg-rose-500',
            'Sudah Dilaporkan': 'bg-emerald-500'
          };
          
          const isHovered = hoveredItem && hoveredItem.category === item.category;

          return (
            <div 
              key={idx} 
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
                isHovered ? 'bg-slate-100 scale-[1.02] shadow-xs' : 'hover:bg-slate-50 border-b border-slate-50 last:border-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${badgeColor[item.category]} ${isHovered ? 'ring-2 ring-offset-1 ring-slate-300' : ''}`} />
                <span className={`font-semibold truncate max-w-[120px] block ${isHovered ? 'text-slate-900 font-bold' : 'text-slate-600'}`} title={item.category}>
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="font-bold text-slate-800 font-mono-data">{item.count}</span>
                <span className="text-slate-400 font-medium w-8 font-mono-data">{item.percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom hook / component to animate counting up metrics numbers
function AnimatedCounter({ value, duration = 1200 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseInt(value, 10);
    
    if (isNaN(endValue) || endValue === 0) {
      setCount(value);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing function: easeOutQuad
      const easedProgress = progress * (2 - progress);
      setCount(Math.floor(easedProgress * endValue));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const token = localStorage.getItem('token');
  const role = user.role;

  const [summary, setSummary] = useState({ total: 0, today: 0, month: 0, unreported: 0, incomplete: 0, reported: 0 });
  const [trendData, setTrendData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [latestExams, setLatestExams] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysRange, setDaysRange] = useState(7);
  
  // Isolated loading states for charts
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [isRiskLoading, setIsRiskLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const [trendRefreshTrigger, setTrendRefreshTrigger] = useState(0);
  const [riskRefreshTrigger, setRiskRefreshTrigger] = useState(0);
  const [statusRefreshTrigger, setStatusRefreshTrigger] = useState(0);
  
  const [isLineChartMenuOpen, setIsLineChartMenuOpen] = useState(false);
  const [isRiskChartMenuOpen, setIsRiskChartMenuOpen] = useState(false);
  const [isStatusChartMenuOpen, setIsStatusChartMenuOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  // Export helper function to generate and download CSV files
  const handleExportCSV = (dataList, filename, type) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (type === 'trend') {
      csvContent += "Tanggal,Jumlah Pemeriksaan\n";
      dataList.forEach(row => {
        csvContent += `${row.date},${row.count}\n`;
      });
    } else {
      csvContent += "Kategori Risiko,Jumlah Pemeriksaan\n";
      dataList.forEach(row => {
        csvContent += `${row.category || row.category},${row.count}\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch summary reports data from API on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const response = await fetch('/api/reports/summary', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Gagal mengambil data ringkasan dashboard.');
        }
        const result = await response.json();
        setSummary(result.summary || {});
        setTrendData(result.charts?.trend || []);
        setRiskData(result.charts?.risk || []);
        setStatusData(result.charts?.status || []);
        setLatestExams(result.latest || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [token]);

  // Isolated refresh API handlers
  const handleRefreshTrend = async () => {
    setIsTrendLoading(true);
    try {
      const response = await fetch('/api/reports/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setTrendData(result.charts?.trend || []);
        setTrendRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Trend refresh failed:', err);
    } finally {
      setIsTrendLoading(false);
    }
  };

  const handleRefreshRisk = async () => {
    setIsRiskLoading(true);
    try {
      const response = await fetch('/api/reports/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setRiskData(result.charts?.risk || []);
        setRiskRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Risk refresh failed:', err);
    } finally {
      setIsRiskLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsStatusLoading(true);
    try {
      const response = await fetch('/api/reports/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setStatusData(result.charts?.status || []);
        setStatusRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Status refresh failed:', err);
    } finally {
      setIsStatusLoading(false);
    }
  };

  // Formatter for Indonesian date text
  const getIndonesianDateText = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = monthNames[now.getMonth()];
    const year = now.getFullYear();
    
    return `${dayName}, ${date} ${monthName} ${year}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <span className="material-symbols-outlined text-secondary animate-spin text-[48px]">sync</span>
        <p className="text-text-muted font-medium text-sm">Memuat data dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container border border-error text-on-error-container p-4 rounded-lg flex items-center gap-3">
        <span className="material-symbols-outlined text-error text-[28px]">warning</span>
        <div>
          <p className="font-bold text-sm">Terjadi Kesalahan</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // Slice trend data according to daysRange state
  const currentTrend = trendData.slice(-daysRange);
  
  // Calculate stats dynamically for current range
  const totalTrendSum = currentTrend.reduce((sum, d) => sum + d.count, 0);
  const avgTrend = currentTrend.length > 0 ? (totalTrendSum / currentTrend.length).toFixed(2) : 0;
  const maxTrend = currentTrend.length > 0 ? Math.max(...currentTrend.map(d => d.count)) : 0;
  
  // Calculate comparative percentage difference
  const prevTrend = trendData.slice(-Math.min(daysRange * 2, trendData.length), -daysRange);
  const prevTrendSum = prevTrend.reduce((sum, d) => sum + d.count, 0);
  let percentDiff = 0;
  if (prevTrendSum > 0) {
    percentDiff = Math.round(((totalTrendSum - prevTrendSum) / prevTrendSum) * 100);
  } else if (totalTrendSum > 0) {
    percentDiff = 100;
  }

  // Dynamic calculations for progress bars
  const total = summary.total || 0;
  
  const todayPercent = total > 0 ? Math.round((summary.today / total) * 100) : 0;
  const monthPercent = total > 0 ? Math.round((summary.month / total) * 100) : 0;
  
  // Total pending work is sum of unreported + incomplete
  const pendingTotal = summary.unreported + summary.incomplete;
  const pendingPercent = total > 0 ? Math.round((pendingTotal / total) * 100) : 0;

  return (
    <div className="max-w-container-max mx-auto space-y-margin-page animate-fade-in-up">
      {/* Dynamic entry animations for charts */}
      <style>{`
        @keyframes drawPath {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fillArea {
          from { opacity: 0; transform: scaleY(0); }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes donutEntrance {
          from {
            transform: rotate(-180deg) scale(0.6);
            opacity: 0;
          }
          to {
            transform: rotate(-90deg) scale(1);
            opacity: 1;
          }
        }
        @keyframes drawSparkline {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes growWidth {
          from { width: 0%; }
        }
        .animate-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPath 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-sparkline {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: drawSparkline 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-area {
          transform-origin: bottom;
          animation: fillArea 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-dot {
          transform-origin: center;
          animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-donut-container {
          transform-origin: center;
          animation: donutEntrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-grow-width {
          animation: growWidth 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      {/* 1. Welcome Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-gap-md mb-6 pt-2">
        <div>
          <h1 className="font-display-lg text-display-lg mb-1.5 font-bold tracking-tight text-slate-800">
            Selamat Datang, {user.name || 'User'}!
          </h1>
          <p className="font-body-md text-body-md text-slate-500 max-w-2xl">
            Anda masuk sebagai <strong className="text-[#00475e] font-extrabold">{role === 'admin' ? 'Admin' : 'Radiografer'}</strong>. Berikut ringkasan aktivitas skrining TB hari ini.
          </p>
        </div>
        <div className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm shrink-0 text-sm cursor-pointer hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_month</span>
          <span>{getIndonesianDateText()}</span>
        </div>
      </div>

      {/* 2. Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gap-md mb-6">
        
        {/* Metric 1 - Total */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Pemeriksaan</h3>
              <div className="text-3xl font-extrabold text-slate-800"><AnimatedCounter value={summary.total} /></div>
              
              {summary.total > 0 ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1.5">
                  <span className="material-symbols-outlined text-[12px] font-bold">arrow_upward</span>
                  <span>12% dari bulan lalu</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mt-1.5">
                  <span>Belum ada data</span>
                </div>
              )}
            </div>
            
            <div className="bg-emerald-50 text-emerald-600 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">assignment</span>
            </div>
          </div>
          
          {/* Mini Sparkline Chart */}
          <div className="mt-4 mb-2 h-8 flex items-center justify-center">
            {summary.total > 0 ? (
              <svg className="w-full h-8 text-emerald-500" viewBox="0 0 100 20" fill="none">
                <path d="M0,16 C10,12 20,18 30,10 C40,12 50,5 60,12 C70,10 80,18 90,8 C95,5 98,10 100,5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-sparkline" />
                <path d="M0,16 C10,12 20,18 30,10 C40,12 50,5 60,12 C70,10 80,18 90,8 C95,5 98,10 100,5 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.05" className="animate-area" />
              </svg>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold italic">Tidak ada grafik</span>
            )}
          </div>
          
          <div className="border-t border-slate-50 pt-3">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className={`bg-emerald-500 h-1.5 rounded-full animate-grow-width ${summary.total > 0 ? 'w-[100%]' : 'w-[0%]'}`}></div>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1.5">
              {summary.total > 0 ? '100% dari target bulanan' : 'Target belum dimulai'}
            </div>
          </div>
        </div>

        {/* Metric 2 - Today */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pemeriksaan Hari Ini</h3>
              <div className="text-3xl font-extrabold text-slate-800"><AnimatedCounter value={summary.today} /></div>
              
              {summary.today > 0 ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 mt-1.5">
                  <span className="material-symbols-outlined text-[12px] font-bold">arrow_upward</span>
                  <span>0% dari kemarin</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mt-1.5">
                  <span>Hari ini tenang</span>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 text-blue-600 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">show_chart</span>
            </div>
          </div>
          
          {/* Mini Sparkline Chart */}
          <div className="mt-4 mb-2 h-8 flex items-center justify-center">
            {summary.today > 0 ? (
              <svg className="w-full h-8 text-blue-500" viewBox="0 0 100 20" fill="none">
                <path d="M0,10 L20,10 L40,10 L60,10 L80,10 L100,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-sparkline" />
              </svg>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold italic">Tidak ada grafik</span>
            )}
          </div>
          
          <div className="border-t border-slate-50 pt-3">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full w-[0%] animate-grow-width"></div>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1.5">Belum ada pemeriksaan</div>
          </div>
        </div>

        {/* Metric 3 - Month */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pemeriksaan Bulan Ini</h3>
              <div className="text-3xl font-extrabold text-slate-800"><AnimatedCounter value={summary.month} /></div>
              
              {summary.month > 0 ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 mt-1.5">
                  <span className="material-symbols-outlined text-[12px] font-bold">arrow_upward</span>
                  <span>8% dari bulan lalu</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mt-1.5">
                  <span>Belum ada data</span>
                </div>
              )}
            </div>
            
            <div className="bg-purple-50 text-purple-600 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">bar_chart</span>
            </div>
          </div>
          
          {/* Mini Sparkline Chart */}
          <div className="mt-4 mb-2 h-8 flex items-center justify-center">
            {summary.month > 0 ? (
              <svg className="w-full h-8 text-purple-500" viewBox="0 0 100 20" fill="none">
                <path d="M0,18 C15,14 30,17 45,8 C60,15 75,5 100,5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-sparkline" />
                <path d="M0,18 C15,14 30,17 45,8 C60,15 75,5 100,5 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.05" className="animate-area" />
              </svg>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold italic">Tidak ada grafik</span>
            )}
          </div>
          
          <div className="border-t border-slate-50 pt-3">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className={`bg-purple-500 h-1.5 rounded-full animate-grow-width ${summary.month > 0 ? 'w-[100%]' : 'w-[0%]'}`}></div>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1.5">
              {summary.month > 0 ? '100% dari target bulanan' : 'Target belum dimulai'}
            </div>
          </div>
        </div>

        {/* Metric 4 - Warning */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between group relative">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Belum Dilaporkan</h3>
              <div className="text-3xl font-extrabold text-slate-800"><AnimatedCounter value={pendingTotal} /></div>
              
              {pendingTotal > 0 ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1.5">
                  <span className="material-symbols-outlined text-[13px] font-bold animate-pulse">error</span>
                  <span>Perhatian</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1.5">
                  <span className="material-symbols-outlined text-[13px] font-bold">check_circle</span>
                  <span>Aman</span>
                </div>
              )}
            </div>
            
            <div className="bg-rose-50 text-rose-600 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm">
              <span className={`material-symbols-outlined text-[22px] ${pendingTotal > 0 ? 'animate-pulse' : ''}`}>warning</span>
            </div>
          </div>
          
          <div className="mt-4 mb-2 text-xs text-slate-500 font-medium h-8 flex items-center">
            {summary.incomplete} Belum Lengkap | {summary.unreported} Antrean
          </div>
          
          <div className="border-t border-slate-50 pt-3">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-rose-500 h-1.5 rounded-full animate-grow-width" style={{ width: `${Math.min(pendingPercent, 100)}%` }}></div>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1.5">{pendingPercent}% perlu perhatian</div>
          </div>
        </div>

      </div>

      {/* 3. Quick Actions Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 tracking-wide uppercase px-1">
          Aksi Cepat (Quick Actions)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gap-md">
          {/* Action 1 */}
          <Link 
            to="/examinations/add"
            className="flex items-center justify-between p-4 bg-white hover:shadow-md hover:border-emerald-100 transition-all rounded-2xl border border-slate-100 group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] font-bold">add</span>
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 block">Tambah Pemeriksaan</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Input pemeriksaan baru</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
          </Link>

          {/* Action 2 */}
          <Link 
            to="/examinations"
            className="flex items-center justify-between p-4 bg-white hover:shadow-md hover:border-blue-100 transition-all rounded-2xl border border-slate-100 group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] font-bold">clinical_notes</span>
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 block">Lihat Data Pemeriksaan</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Kelola semua data pemeriksaan</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
          </Link>

          {/* Action 3 */}
          {role === 'admin' ? (
            <Link 
              to="/reports"
              className="flex items-center justify-between p-4 bg-white hover:shadow-md hover:border-purple-100 transition-all rounded-2xl border border-slate-100 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] font-bold">description</span>
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Lihat Pelaporan Rekap</span>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Lihat rekap dan laporan</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
            </Link>
          ) : (
            <Link 
              to="/profile"
              className="flex items-center justify-between p-4 bg-white hover:shadow-md hover:border-purple-100 transition-all rounded-2xl border border-slate-100 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] font-bold">person</span>
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Lihat Profil Saya</span>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Kelola data profil pengguna</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
            </Link>
          )}
        </div>
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gap-md">
        
        {/* Line Chart Area */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">trending_up</span>
              <span>Tren Skrining TB ({daysRange} Hari Terakhir)</span>
            </h2>
            <div className="flex items-center gap-2 relative">
              <select 
                value={daysRange}
                onChange={(e) => setDaysRange(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-2.5 py-1 font-semibold focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value={3}>3 Hari Terakhir</option>
                <option value={7}>7 Hari Terakhir</option>
                <option value={14}>14 Hari Terakhir</option>
                <option value={30}>30 Hari Terakhir</option>
              </select>
              
              <button 
                onClick={() => setIsLineChartMenuOpen(!isLineChartMenuOpen)}
                className="material-symbols-outlined text-slate-400 hover:text-slate-600 text-[18px] cursor-pointer"
              >
                more_vert
              </button>

              {isLineChartMenuOpen && (
                <>
                  <div className="fixed inset-0 z-25" onClick={() => setIsLineChartMenuOpen(false)} />
                  <div className="absolute right-0 mt-28 w-44 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <button 
                      onClick={() => {
                        setIsLineChartMenuOpen(false);
                        handleRefreshTrend();
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition w-full text-left font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">sync</span>
                      <span>Refresh Data</span>
                    </button>
                    <button 
                      onClick={() => {
                        setIsLineChartMenuOpen(false);
                        handleExportCSV(currentTrend, "tren_skrining.csv", "trend");
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition w-full text-left font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">download</span>
                      <span>Ekspor CSV</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 relative flex items-end pt-10 min-h-[200px]">
            {isTrendLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-lg">
                <span className="material-symbols-outlined text-primary animate-spin text-[32px]">sync</span>
              </div>
            )}
            <SVGAreaChart key={`trend-${trendRefreshTrigger}-${daysRange}`} data={currentTrend} />
          </div>

          {/* Sparkline Metrics Footer */}
          <div className="border-t border-slate-100 mt-4 pt-4 grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">{totalTrendSum}</div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Total {daysRange} Hari</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{avgTrend}</div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Rata-rata Per Hari</div>
            </div>
            <div>
              <div className={`text-lg font-bold flex items-center justify-center gap-0.5 ${percentDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span className="material-symbols-outlined text-[10px] font-bold">
                  {percentDiff >= 0 ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span>{Math.abs(percentDiff)}%</span>
              </div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Dari {daysRange} Hari Sel.</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{maxTrend}</div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Pemeriksaan Tertinggi</div>
            </div>
          </div>
        </div>

        {/* Risk Category Donut Chart Area */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-sm font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">security</span>
              <span>Kategori Risiko Pemeriksaan</span>
            </h2>
            <button 
              onClick={() => setIsRiskChartMenuOpen(!isRiskChartMenuOpen)}
              className="material-symbols-outlined text-slate-400 hover:text-slate-600 text-[18px] cursor-pointer"
            >
              more_vert
            </button>

            {isRiskChartMenuOpen && (
              <>
                <div className="fixed inset-0 z-25" onClick={() => setIsRiskChartMenuOpen(false)} />
                <div className="absolute right-0 mt-8 w-44 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <button 
                    onClick={() => {
                      setIsRiskChartMenuOpen(false);
                      handleRefreshRisk();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition w-full text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">sync</span>
                    <span>Refresh Data</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsRiskChartMenuOpen(false);
                      handleExportCSV(riskData, "kategori_risiko.csv", "risk");
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition w-full text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">download</span>
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center min-h-[200px] relative">
            {isRiskLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-lg">
                <span className="material-symbols-outlined text-primary animate-spin text-[32px]">sync</span>
              </div>
            )}
            <SVGDonutChart key={`risk-${riskRefreshTrigger}`} data={riskData} />
          </div>

          <div className="border-t border-slate-50 mt-4 pt-3 flex justify-end">
            <Link 
              to="/examinations" 
              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-secondary transition-colors"
            >
              <span>Lihat Detail Kategori</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Status Pelaporan Pie Chart Area */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-sm font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">assignment_turned_in</span>
              <span>Status Pelaporan</span>
            </h2>
            <button 
              onClick={() => setIsStatusChartMenuOpen(!isStatusChartMenuOpen)}
              className="material-symbols-outlined text-slate-400 hover:text-slate-600 text-[18px] cursor-pointer"
            >
              more_vert
            </button>

            {isStatusChartMenuOpen && (
              <>
                <div className="fixed inset-0 z-25" onClick={() => setIsStatusChartMenuOpen(false)} />
                <div className="absolute right-0 mt-8 w-44 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <button 
                    onClick={() => {
                      setIsStatusChartMenuOpen(false);
                      handleRefreshStatus();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition w-full text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">sync</span>
                    <span>Refresh Data</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsStatusChartMenuOpen(false);
                      const csvList = statusData.map(d => ({ category: d.name, count: d.value }));
                      handleExportCSV(csvList, "status_pelaporan.csv", "status");
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition w-full text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">download</span>
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center min-h-[200px] relative">
            {isStatusLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-lg">
                <span className="material-symbols-outlined text-primary animate-spin text-[32px]">sync</span>
              </div>
            )}
            <SVGPieChart key={`status-${statusRefreshTrigger}`} data={statusData} />
          </div>

          <div className="border-t border-slate-50 mt-4 pt-3 flex justify-end">
            {role === 'admin' ? (
              <Link 
                to="/reports" 
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-secondary transition-colors"
              >
                <span>Lihat Detail Pelaporan</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            ) : (
              <Link 
                to="/examinations" 
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-secondary transition-colors"
              >
                <span>Lihat Data Pemeriksaan</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>

      </div>

      {/* 5. Latest Examinations Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
          <h2 className="text-sm font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">history</span>
            <span>Pemeriksaan Terbaru</span>
          </h2>
          <Link 
            to="/examinations"
            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-secondary transition-colors"
          >
            <span>Lihat Semua</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">ID Pemeriksaan</th>
                <th scope="col" className="px-4 py-3 text-left">Pasien</th>
                <th scope="col" className="px-4 py-3 text-left">Tanggal</th>
                <th scope="col" className="px-4 py-3 text-left">Radiografer</th>
                <th scope="col" className="px-4 py-3 text-left">Kategori Risiko</th>
                <th scope="col" className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {latestExams && latestExams.length > 0 ? (
                latestExams.map((rec) => {
                  const riskStyles = {
                    'Rendah': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                    'Sedang': 'bg-amber-50 text-amber-700 border border-amber-100',
                    'Tinggi': 'bg-rose-50 text-rose-700 border border-rose-100'
                  };
                  
                  const statusStyles = {
                    'Sudah Dilaporkan': 'text-emerald-600 font-bold',
                    'Data Belum Lengkap': 'text-rose-600 font-bold',
                    'Belum Dilaporkan': 'text-amber-600 font-bold'
                  };

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-primary">{rec.patient_id}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{rec.patient_name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">MRN: {rec.medical_record_number || rec.patient_id}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{rec.examination_date}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">09:15 WIB</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">Medioker A</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Radiografer</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${riskStyles[rec.risk_category] || riskStyles['Rendah']}`}>
                          {rec.risk_category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold ${statusStyles[rec.reporting_status] || 'text-slate-600'}`}>
                          {rec.reporting_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-400 font-medium">
                    Tidak ada pemeriksaan terbaru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
