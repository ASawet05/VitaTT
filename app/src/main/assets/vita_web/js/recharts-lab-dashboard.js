/**
 * VitaTakip Pro — Recharts Multi-Line Historical Blood Test Dashboard Component
 * Provides a self-contained Recharts-compatible declarative SVG chart engine (window.Recharts)
 * and renders interactive multi-line historical blood test progress charts on the Dashboard
 * (#view-home) and Labs (#view-labs) views.
 */
(function () {
  "use strict";

  const BIOMARKER_META = [
    { key: "d3", label: "D Vitamini (25-OH D3)", shortLabel: "D3 Vitamini", unit: "ng/mL", color: "#0d9488", refMin: 20, refMax: 50, defaultActive: true },
    { key: "b12", label: "B12 Vitamini", shortLabel: "B12", unit: "pg/mL", color: "#4f46e5", refMin: 200, refMax: 900, defaultActive: true },
    { key: "ferritin", label: "Ferritin (Demir Deposu)", shortLabel: "Ferritin", unit: "ng/mL", color: "#e11d48", refMin: 15, refMax: 150, defaultActive: true },
    { key: "hb", label: "Hemoglobin (Hb)", shortLabel: "Hemoglobin", unit: "g/dL", color: "#dc2626", refMin: 12.0, refMax: 16.0, defaultActive: true },
    { key: "mg", label: "Magnezyum (Mg)", shortLabel: "Magnezyum", unit: "mg/dL", color: "#d97706", refMin: 1.8, refMax: 2.3, defaultActive: false },
    { key: "folate", label: "Folat (B9)", shortLabel: "Folat", unit: "ng/mL", color: "#059669", refMin: 4.0, refMax: 20.0, defaultActive: false },
    { key: "ca", label: "Kalsiyum (Ca)", shortLabel: "Kalsiyum", unit: "mg/dL", color: "#0284c7", refMin: 8.6, refMax: 10.2, defaultActive: false },
    { key: "zinc", label: "Çinko (Zn)", shortLabel: "Çinko", unit: "µg/dL", color: "#7c3aed", refMin: 70, refMax: 120, defaultActive: false },
    { key: "creatinine", label: "Kreatinin", shortLabel: "Kreatinin", unit: "mg/dL", color: "#ea580c", refMin: 0.6, refMax: 1.2, defaultActive: false, inverseDirection: true },
    { key: "alt", label: "ALT (Karaciğer)", shortLabel: "ALT", unit: "U/L", color: "#be123c", refMin: 7, refMax: 35, defaultActive: false, inverseDirection: true },
    { key: "mcv", label: "MCV", shortLabel: "MCV", unit: "fL", color: "#9333ea", refMin: 80, refMax: 100, defaultActive: false },
    { key: "crp", label: "CRP", shortLabel: "CRP", unit: "mg/L", color: "#475569", refMin: 0, refMax: 5, defaultActive: false, inverseDirection: true }
  ];

  // Sample longitudinal dataset used when the user clicks "Örnek Trend Önizle" or wants to explore multi-line tracking
  const DEMO_LAB_HISTORY_SERIES = [
    {
      id: "demo_lab_1",
      date: "2026-05-14",
      d3: 14.2,
      b12: 185,
      ferritin: 12.4,
      hb: 11.6,
      mg: 1.65,
      folate: 4.8,
      ca: 9.1,
      zinc: 64,
      creatinine: 0.88,
      alt: 22,
      mcv: 78,
      crp: 4.2,
      isDemoPreview: true
    },
    {
      id: "demo_lab_2",
      date: "2026-07-10",
      d3: 24.8,
      b12: 295,
      ferritin: 24.0,
      hb: 12.4,
      mg: 1.82,
      folate: 7.5,
      ca: 9.3,
      zinc: 76,
      creatinine: 0.86,
      alt: 20,
      mcv: 83,
      crp: 2.6,
      isDemoPreview: true
    },
    {
      id: "demo_lab_3",
      date: "2026-09-05",
      d3: 33.5,
      b12: 410,
      ferritin: 38.5,
      hb: 13.1,
      mg: 1.96,
      folate: 10.2,
      ca: 9.5,
      zinc: 88,
      creatinine: 0.84,
      alt: 19,
      mcv: 87,
      crp: 1.4,
      isDemoPreview: true
    },
    {
      id: "demo_lab_4",
      date: "2026-10-22",
      d3: 41.2,
      b12: 525,
      ferritin: 52.0,
      hb: 13.8,
      mg: 2.08,
      folate: 12.6,
      ca: 9.6,
      zinc: 95,
      creatinine: 0.83,
      alt: 18,
      mcv: 89,
      crp: 0.9,
      isDemoPreview: true
    }
  ];

  const dashboardChartState = {
    selectedKeys: new Set(BIOMARKER_META.filter(m => m.defaultActive).map(m => m.key)),
    scaleMode: "normalized", // "normalized" (% of reference range) or "raw" (actual units)
    hoveredIndex: null,
    useDemoPreviewWhenEmpty: false
  };

  function escapeHtml(value) {
    if (typeof window.escapeHtmlText === "function") {
      return window.escapeHtmlText(value);
    }
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return "";
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return String(dateStr);
  }

  function parseNumeric(val) {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(String(val).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Normalizes a biomarker value to a 0-100+ scale where:
   * - 0% = lower bound of reference range (refMin)
   * - 100% = upper bound of reference range (refMax)
   * Values below refMin map proportionally between 0 and refMin, clamped to [-25, 135].
   */
  function normalizeToReferencePercent(value, meta) {
    const num = parseNumeric(value);
    if (num === null || !meta) return null;
    const span = Math.max(0.0001, meta.refMax - meta.refMin);
    const pct = ((num - meta.refMin) / span) * 100;
    return Math.round(Math.max(-25, Math.min(135, pct)) * 10) / 10;
  }

  function getBiomarkerStatusBadge(value, meta) {
    const num = parseNumeric(value);
    if (num === null || !meta) {
      return { label: "Ölçüm Yok", cls: "bg-slate-100 text-slate-600 border-slate-200" };
    }
    if (num < meta.refMin) {
      return { label: "Referans Altı", cls: "bg-amber-50 text-amber-800 border-amber-300" };
    }
    if (num > meta.refMax) {
      return { label: "Referans Üstü", cls: "bg-rose-50 text-rose-800 border-rose-300" };
    }
    return { label: "Hedef Aralıkta", cls: "bg-emerald-50 text-emerald-800 border-emerald-300" };
  }

  /**
   * Recharts-compatible declarative multi-line chart engine (window.Recharts)
   * Builds standard Recharts DOM/SVG structure (.recharts-responsive-container, .recharts-wrapper,
   * svg.recharts-surface, .recharts-cartesian-grid, .recharts-line, .recharts-line-curve,
   * .recharts-line-dots, .recharts-tooltip-wrapper, .recharts-legend-wrapper)
   */
  const RechartsEngine = {
    version: "2.12.7-vitatakip",
    ResponsiveContainer: function ResponsiveContainer(props) { return { type: "ResponsiveContainer", props }; },
    LineChart: function LineChart(props) { return { type: "LineChart", props }; },
    Line: function Line(props) { return { type: "Line", props }; },
    XAxis: function XAxis(props) { return { type: "XAxis", props }; },
    YAxis: function YAxis(props) { return { type: "YAxis", props }; },
    CartesianGrid: function CartesianGrid(props) { return { type: "CartesianGrid", props }; },
    Tooltip: function Tooltip(props) { return { type: "Tooltip", props }; },
    Legend: function Legend(props) { return { type: "Legend", props }; },
    ReferenceLine: function ReferenceLine(props) { return { type: "ReferenceLine", props }; },

    buildSmoothPath: function (points) {
      if (!points || points.length === 0) return "";
      if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y}`;
      }
      let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpx1 = p0.x + (p1.x - p0.x) * 0.42;
        const cpy1 = p0.y;
        const cpx2 = p0.x + (p1.x - p0.x) * 0.58;
        const cpy2 = p1.y;
        d += ` C ${cpx1.toFixed(2)} ${cpy1.toFixed(2)}, ${cpx2.toFixed(2)} ${cpy2.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      }
      return d;
    },

    renderMultiLineChart: function (containerEl, config) {
      if (!containerEl) return;
      const data = Array.isArray(config.data) ? config.data : [];
      const lines = Array.isArray(config.lines) ? config.lines : [];
      const scaleMode = config.scaleMode || "normalized";
      const width = Math.max(320, containerEl.clientWidth || 680);
      const height = config.height || 300;
      const padLeft = 52;
      const padRight = 24;
      const padTop = 24;
      const padBottom = 42;
      const plotW = Math.max(180, width - padLeft - padRight);
      const plotH = Math.max(140, height - padTop - padBottom);

      // Compute Y domain across active lines
      let yMin = scaleMode === "normalized" ? -20 : Infinity;
      let yMax = scaleMode === "normalized" ? 120 : -Infinity;

      if (scaleMode !== "normalized") {
        data.forEach(row => {
          lines.forEach(line => {
            const v = parseNumeric(row[line.dataKey]);
            if (v !== null) {
              if (v < yMin) yMin = v;
              if (v > yMax) yMax = v;
            }
          });
        });
        if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) {
          yMin = 0;
          yMax = 100;
        } else if (Math.abs(yMax - yMin) < 0.001) {
          yMin = Math.max(0, yMin - 10);
          yMax = yMax + 10;
        } else {
          const pad = (yMax - yMin) * 0.12;
          yMin = Math.max(0, Math.floor((yMin - pad) * 10) / 10);
          yMax = Math.ceil((yMax + pad) * 10) / 10;
        }
      }

      const xForIndex = idx => {
        if (data.length <= 1) return padLeft + plotW / 2;
        return padLeft + (idx / (data.length - 1)) * plotW;
      };

      const yForValue = val => {
        const clamped = Math.max(yMin, Math.min(yMax, val));
        const ratio = (clamped - yMin) / Math.max(0.0001, yMax - yMin);
        return padTop + plotH - ratio * plotH;
      };

      // Generate Y ticks
      const tickCount = 5;
      const yTicks = [];
      for (let i = 0; i <= tickCount; i++) {
        const val = yMin + ((yMax - yMin) * i) / tickCount;
        yTicks.push({
          value: scaleMode === "normalized" ? `${Math.round(val)}%` : (Math.round(val * 10) / 10),
          y: yForValue(val)
        });
      }

      // Reference band for normalized mode (0% to 100% optimal reference corridor)
      let referenceBandSvg = "";
      if (scaleMode === "normalized") {
        const yTopRef = yForValue(100);
        const yBotRef = yForValue(0);
        const bandH = Math.max(0, yBotRef - yTopRef);
        referenceBandSvg = `
          <g class="recharts-reference-area">
            <rect x="${padLeft}" y="${yTopRef.toFixed(1)}" width="${plotW}" height="${bandH.toFixed(1)}" fill="#14b8a6" fill-opacity="0.08" rx="4" />
            <line class="recharts-reference-line-line" x1="${padLeft}" y1="${yTopRef.toFixed(1)}" x2="${padLeft + plotW}" y2="${yTopRef.toFixed(1)}" stroke="#0d9488" stroke-dasharray="4 4" stroke-width="1.2" stroke-opacity="0.65" />
            <line class="recharts-reference-line-line" x1="${padLeft}" y1="${yBotRef.toFixed(1)}" x2="${padLeft + plotW}" y2="${yBotRef.toFixed(1)}" stroke="#f59e0b" stroke-dasharray="4 4" stroke-width="1.2" stroke-opacity="0.7" />
            <text x="${padLeft + plotW - 6}" y="${(yTopRef - 5).toFixed(1)}" text-anchor="end" fill="#0f766e" font-size="9.5" font-weight="700">Üst Referans Sınırı (100%)</text>
            <text x="${padLeft + plotW - 6}" y="${(yBotRef + 11).toFixed(1)}" text-anchor="end" fill="#b45309" font-size="9.5" font-weight="700">Alt Referans Eşiği (0%)</text>
          </g>
        `;
      }

      // Grid lines
      const horizontalGridSvg = yTicks.map(t =>
        `<line x1="${padLeft}" y1="${t.y.toFixed(1)}" x2="${padLeft + plotW}" y2="${t.y.toFixed(1)}" stroke="#e2e8f0" stroke-dasharray="3 3" />`
      ).join("");

      const verticalGridSvg = data.map((row, idx) => {
        const x = xForIndex(idx);
        return `<line x1="${x.toFixed(1)}" y1="${padTop}" x2="${x.toFixed(1)}" y2="${padTop + plotH}" stroke="#f1f5f9" />`;
      }).join("");

      // X-axis labels
      const xAxisSvg = data.map((row, idx) => {
        const x = xForIndex(idx);
        return `
          <g class="recharts-cartesian-axis-tick" transform="translate(${x.toFixed(1)}, ${padTop + plotH + 18})">
            <text text-anchor="middle" fill="#475569" font-size="10.5" font-weight="700">${escapeHtml(row.formattedDate || row.date)}</text>
          </g>
        `;
      }).join("");

      // Y-axis labels
      const yAxisSvg = yTicks.map(t => `
        <g class="recharts-cartesian-axis-tick" transform="translate(${padLeft - 8}, ${t.y.toFixed(1)})">
          <text text-anchor="end" dominant-baseline="middle" fill="#64748b" font-size="10" font-weight="600">${escapeHtml(t.value)}</text>
        </g>
      `).join("");

      // Build lines & dots
      const linesSvg = lines.map(line => {
        const pts = [];
        data.forEach((row, idx) => {
          const val = parseNumeric(row[line.dataKey]);
          if (val !== null) {
            pts.push({
              x: xForIndex(idx),
              y: yForValue(val),
              val,
              rawVal: row.rawValues?.[line.key],
              date: row.formattedDate || row.date,
              idx
            });
          }
        });
        if (pts.length === 0) return "";
        const pathD = this.buildSmoothPath(pts);
        const dotsSvg = pts.map(p => `
          <circle
            class="recharts-dot recharts-line-dot cursor-pointer transition-transform duration-150"
            cx="${p.x.toFixed(2)}"
            cy="${p.y.toFixed(2)}"
            r="5"
            fill="${line.stroke}"
            stroke="#ffffff"
            stroke-width="2"
            data-date-index="${p.idx}"
            data-biomarker-key="${escapeHtml(line.key)}"
          >
            <title>${escapeHtml(line.name)} (${escapeHtml(p.date)}): ${escapeHtml(p.rawVal)} ${escapeHtml(line.unit)}</title>
          </circle>
        `).join("");

        return `
          <g class="recharts-layer recharts-line" data-series-key="${escapeHtml(line.key)}">
            <path
              class="recharts-curve recharts-line-curve"
              d="${pathD}"
              fill="none"
              stroke="${line.stroke}"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <g class="recharts-layer recharts-line-dots">${dotsSvg}</g>
          </g>
        `;
      }).join("");

      // Interactive hover columns for selecting a date slice
      const activeIdx = (dashboardChartState.hoveredIndex !== null && dashboardChartState.hoveredIndex < data.length)
        ? dashboardChartState.hoveredIndex
        : data.length - 1;
      const activeX = data.length > 0 ? xForIndex(activeIdx) : padLeft;

      const sliceWidth = data.length > 1 ? plotW / (data.length - 1) : plotW;
      const hitRectsSvg = data.map((row, idx) => {
        const cx = xForIndex(idx);
        const rx = Math.max(padLeft, cx - sliceWidth / 2);
        const rw = Math.min(plotW, sliceWidth);
        return `<rect class="recharts-HitRect cursor-pointer" x="${rx.toFixed(1)}" y="${padTop}" width="${rw.toFixed(1)}" height="${plotH}" fill="transparent" data-slice-index="${idx}" />`;
      }).join("");

      const activeCursorSvg = data.length > 0 ? `
        <line class="recharts-tooltip-cursor" x1="${activeX.toFixed(1)}" y1="${padTop}" x2="${activeX.toFixed(1)}" y2="${padTop + plotH}" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="3 3" stroke-opacity="0.45" />
      ` : "";

      // Legend items
      const legendHtml = lines.map(line => `
        <span class="recharts-legend-item inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${line.stroke}"></span>
          <span>${escapeHtml(line.name)}</span>
          <span class="text-[10px] text-slate-400 font-semibold">(${escapeHtml(line.unit)})</span>
        </span>
      `).join("");

      // Active date tooltip summary bar
      const activeRow = data[activeIdx] || null;
      let tooltipHtml = "";
      if (activeRow) {
        const itemsHtml = lines.map(line => {
          const rawVal = activeRow.rawValues?.[line.key];
          if (rawVal === null || rawVal === undefined) return "";
          const badge = getBiomarkerStatusBadge(rawVal, line.meta);
          return `
            <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${line.stroke}"></span>
                <span class="text-[11px] font-bold text-navy-900 truncate">${escapeHtml(line.shortLabel || line.name)}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-xs font-black text-navy-900">${escapeHtml(rawVal)} <small class="text-[10px] font-semibold text-slate-500">${escapeHtml(line.unit)}</small></span>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}">${escapeHtml(badge.label)}</span>
              </div>
            </div>
          `;
        }).filter(Boolean).join("");

        tooltipHtml = `
          <div class="recharts-tooltip-wrapper mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/90" role="region" aria-label="Seçili Tarih Tahlil Detayı">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span class="text-xs font-black text-navy-900 flex items-center gap-1.5">
                <i class="fa-solid fa-calendar-check text-teal-600"></i>
                <span>Seçili Tahlil Tarihi: ${escapeHtml(activeRow.formattedDate || activeRow.date)}</span>
              </span>
              <span class="text-[10px] text-slate-500 font-semibold">Grafik üzerindeki noktalara dokunarak tarihler arası geçiş yapabilirsiniz</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              ${itemsHtml || '<span class="text-xs text-slate-500">Bu tarihte seçili biyobelirteçler için veri bulunmuyor.</span>'}
            </div>
          </div>
        `;
      }

      containerEl.innerHTML = `
        <div class="recharts-responsive-container w-full" style="width:100%;">
          <div class="recharts-wrapper relative w-full select-none">
            <svg class="recharts-surface w-full overflow-visible" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Recharts çoklu çizgi kan tahlili gelişim grafiği">
              <g class="recharts-cartesian-grid">
                <g class="recharts-cartesian-grid-horizontal">${horizontalGridSvg}</g>
                <g class="recharts-cartesian-grid-vertical">${verticalGridSvg}</g>
              </g>
              ${referenceBandSvg}
              <g class="recharts-layer recharts-cartesian-axis recharts-xAxis">${xAxisSvg}</g>
              <g class="recharts-layer recharts-cartesian-axis recharts-yAxis">${yAxisSvg}</g>
              ${activeCursorSvg}
              ${linesSvg}
              <g class="recharts-layer recharts-hit-layer">${hitRectsSvg}</g>
            </svg>
            <div class="recharts-legend-wrapper mt-2 flex flex-wrap items-center gap-1.5">
              ${legendHtml}
            </div>
            ${tooltipHtml}
          </div>
        </div>
      `;

      // Attach interactive hover/click listeners on hit rects and dots
      containerEl.querySelectorAll("[data-slice-index], [data-date-index]").forEach(el => {
        const handler = ev => {
          const idx = Number(el.getAttribute("data-slice-index") ?? el.getAttribute("data-date-index"));
          if (Number.isInteger(idx) && idx !== dashboardChartState.hoveredIndex) {
            dashboardChartState.hoveredIndex = idx;
            renderAllRechartsDashboards();
          }
        };
        el.addEventListener("click", handler);
        el.addEventListener("mouseenter", handler);
      });
    }
  };

  // Expose window.Recharts globally
  if (!window.Recharts) {
    window.Recharts = RechartsEngine;
  } else {
    Object.assign(window.Recharts, RechartsEngine);
  }

  function hasAnyNumericBiomarker(rec) {
    if (!rec || typeof rec !== "object") return false;
    return BIOMARKER_META.some(m => parseNumeric(rec[m.key]) !== null);
  }

  function readLiveCurrentLabEntry() {
    const inputMap = {
      d3: "inputLabD3",
      b12: "inputLabB12",
      ferritin: "inputLabFerritin",
      mg: "inputLabMg",
      ca: "inputLabCalcium",
      zinc: "inputLabZinc",
      creatinine: "inputLabCreatinine",
      folate: "inputLabFolate",
      alt: "inputLabAlt",
      hb: "inputLabHb",
      mcv: "inputLabMcv",
      crp: "inputLabCrp"
    };
    const combined = {};
    let hasAny = false;
    BIOMARKER_META.forEach(meta => {
      const domEl = typeof document !== "undefined" ? document.getElementById(inputMap[meta.key]) : null;
      const domVal = domEl && String(domEl.value || "").trim() !== "" ? parseNumeric(domEl.value) : null;
      const stateVal = (typeof state !== "undefined" && state.labValues) ? parseNumeric(state.labValues[meta.key]) : null;
      const resolved = domVal !== null ? domVal : stateVal;
      if (resolved !== null) {
        combined[meta.key] = resolved;
        hasAny = true;
      }
    });
    if (!hasAny) return null;
    const dateInput = typeof document !== "undefined" ? document.getElementById("inputLabDate") : null;
    const dateStr = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0, 10);
    return {
      date: dateStr,
      timestamp: Date.parse(`${dateStr}T12:00:00`) || Date.now(),
      ...combined
    };
  }

  function getChronologicalLabRecords() {
    const userHistory = (typeof state !== "undefined" && Array.isArray(state.labHistory))
      ? state.labHistory
      : [];
    const sorted = userHistory
      .filter(r => r && r.date && !r.isDemoPreview && !String(r.id || "").startsWith("lab_seed_") && hasAnyNumericBiomarker(r))
      .slice()
      .sort((a, b) => {
        const ta = Number(a.timestamp || Date.parse(`${a.date}T00:00:00`) || 0);
        const tb = Number(b.timestamp || Date.parse(`${b.date}T00:00:00`) || 0);
        return ta - tb;
      });

    const liveEntry = readLiveCurrentLabEntry();
    if (liveEntry) {
      if (sorted.length === 0) {
        sorted.push(liveEntry);
      } else {
        const lastRec = sorted[sorted.length - 1];
        const differsFromLast = BIOMARKER_META.some(m => {
          const lv = parseNumeric(liveEntry[m.key]);
          const rv = parseNumeric(lastRec[m.key]);
          return lv !== null && lv !== rv;
        });
        if (differsFromLast) {
          if (lastRec.date === liveEntry.date) {
            sorted[sorted.length - 1] = { ...lastRec, ...liveEntry };
          } else {
            sorted.push(liveEntry);
          }
        }
      }
    }

    if (sorted.length > 0) {
      // Ensure entered biomarkers are visible in selectedKeys
      const enteredKeys = BIOMARKER_META
        .filter(meta => sorted.some(r => parseNumeric(r[meta.key]) !== null))
        .map(meta => meta.key);
      const anySelectedHasData = enteredKeys.some(k => dashboardChartState.selectedKeys.has(k));
      if (!anySelectedHasData && enteredKeys.length > 0) {
        enteredKeys.forEach(k => dashboardChartState.selectedKeys.add(k));
      }
    }

    return { records: sorted, isDemo: false, userRecordCount: sorted.length };
  }

  function buildMultiLineChartDataset(records, scaleMode) {
    return records.map(rec => {
      const row = {
        date: rec.date,
        formattedDate: formatShortDate(rec.date),
        rawValues: {}
      };
      BIOMARKER_META.forEach(meta => {
        const raw = parseNumeric(rec[meta.key]);
        row.rawValues[meta.key] = raw;
        row[`${meta.key}_raw`] = raw;
        row[`${meta.key}_norm`] = raw !== null ? normalizeToReferencePercent(raw, meta) : null;
        row[meta.key] = scaleMode === "normalized" ? row[`${meta.key}_norm`] : raw;
      });
      return row;
    });
  }

  function buildProgressDeltaCardsHtml(records, activeMetas) {
    if (!records || records.length < 1) return "";

    const cards = activeMetas.map(meta => {
      // Find first and latest non-null values for this biomarker
      const validSeries = records
        .map(r => ({ date: r.date, val: parseNumeric(r[meta.key]) }))
        .filter(item => item.val !== null);
      if (validSeries.length === 0) return "";

      const startItem = validSeries[0];
      const latestItem = validSeries[validSeries.length - 1];
      const hasMultiplePoints = validSeries.length >= 2;
      const delta = Math.round((latestItem.val - startItem.val) * 100) / 100;
      const pct = startItem.val !== 0 ? Math.round(((latestItem.val - startItem.val) / Math.abs(startItem.val)) * 100) : 0;
      const sign = delta > 0 ? "+" : "";
      const statusBadge = getBiomarkerStatusBadge(latestItem.val, meta);

      let deltaColor = "text-slate-600 bg-slate-100 border-slate-200";
      if (hasMultiplePoints && delta !== 0) {
        if (meta.inverseDirection) {
          deltaColor = delta < 0
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : (latestItem.val > meta.refMax ? "text-rose-700 bg-rose-50 border-rose-200" : "text-amber-700 bg-amber-50 border-amber-200");
        } else {
          deltaColor = delta > 0
            ? (latestItem.val > meta.refMax ? "text-rose-700 bg-rose-50 border-rose-200" : "text-emerald-700 bg-emerald-50 border-emerald-200")
            : "text-amber-700 bg-amber-50 border-amber-200";
        }
      }

      const deltaPillHtml = hasMultiplePoints
        ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg border ${deltaColor}">
            ${sign}${escapeHtml(delta)} ${escapeHtml(meta.unit)} (${sign}${pct}%)
          </span>`
        : `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-lg border bg-slate-50 text-slate-600 border-slate-200">
            ${escapeHtml(formatShortDate(latestItem.date))}
          </span>`;

      return `
        <div class="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between gap-1.5">
          <div class="flex items-center justify-between gap-1.5">
            <span class="inline-flex items-center gap-1.5 text-xs font-extrabold text-navy-900 truncate">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${meta.color}"></span>
              <span class="truncate">${escapeHtml(meta.shortLabel)}</span>
            </span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusBadge.cls}">${escapeHtml(statusBadge.label)}</span>
          </div>
          <div class="flex items-baseline justify-between gap-2 mt-0.5">
            <div>
              <span class="text-base font-black text-navy-900">${escapeHtml(latestItem.val)}</span>
              <span class="text-[10px] font-semibold text-slate-500">${escapeHtml(meta.unit)}</span>
            </div>
            ${deltaPillHtml}
          </div>
          <div class="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1">
            <span>${hasMultiplePoints ? `İlk: ${escapeHtml(startItem.val)} ${escapeHtml(meta.unit)}` : "Güncel Ölçüm"}</span>
            <span>Hedef: ${escapeHtml(meta.refMin)}–${escapeHtml(meta.refMax)}</span>
          </div>
        </div>
      `;
    }).filter(Boolean);

    if (!cards.length) return "";
    return `
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" data-testid="recharts-progress-delta-grid">
        ${cards.join("")}
      </div>
    `;
  }

  function renderRechartsMount(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const { records } = getChronologicalLabRecords();

    if (!records || records.length === 0) {
      mount.innerHTML = `
        <div class="p-6 sm:p-8 rounded-2xl bg-slate-50/90 border border-dashed border-slate-300 text-center space-y-2.5" data-testid="recharts-empty-state">
          <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto text-lg shadow-2xs">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <h4 class="text-xs sm:text-sm font-black text-navy-900">Henüz Tahlil Verisi Girilmedi</h4>
          <p class="text-[11px] sm:text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Kan tahlili bilgisi girilmediği için gelişim grafiği şu anda boştur. Aşağıdaki alanlardan tahlil sonuçlarınızı girdiğinizde veya e-Nabız PDF'i yüklediğinizde verileriniz otomatik olarak buraya aktarılıp grafikte gösterilecektir.
          </p>
        </div>
      `;
      return;
    }

    const activeMetas = BIOMARKER_META.filter(m => dashboardChartState.selectedKeys.has(m.key));
    const dataset = buildMultiLineChartDataset(records, dashboardChartState.scaleMode);

    const filterChipsHtml = BIOMARKER_META.map(meta => {
      const isSelected = dashboardChartState.selectedKeys.has(meta.key);
      return `
        <button
          type="button"
          onclick="window.VitaRechartsDashboard.toggleBiomarker('${meta.key}')"
          aria-pressed="${isSelected ? "true" : "false"}"
          class="px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            isSelected
              ? "bg-navy-900 text-white border-navy-900 shadow-xs"
              : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
          }"
        >
          <span class="w-2 h-2 rounded-full" style="background:${meta.color}"></span>
          <span>${escapeHtml(meta.shortLabel)}</span>
        </button>
      `;
    }).join("");

    const chartInnerId = `${mountId}-canvas-host`;

    mount.innerHTML = `
      <div class="space-y-3" data-recharts-dashboard-widget="true">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <span class="text-[11px] font-bold text-slate-600 block">Karşılaştırılacak Biyobelirteçleri Seçin (Çoklu Çizgi):</span>
          </div>
          <div class="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto" role="group" aria-label="Grafik Ölçek Modu">
            <button
              type="button"
              onclick="window.VitaRechartsDashboard.setScaleMode('normalized')"
              class="px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                dashboardChartState.scaleMode === "normalized"
                  ? "bg-white text-navy-900 shadow-xs"
                  : "text-slate-600 hover:text-navy-900"
              }"
            >
              % Referans Uyumu
            </button>
            <button
              type="button"
              onclick="window.VitaRechartsDashboard.setScaleMode('raw')"
              class="px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                dashboardChartState.scaleMode === "raw"
                  ? "bg-white text-navy-900 shadow-xs"
                  : "text-slate-600 hover:text-navy-900"
              }"
            >
              Ham Değerler
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Biyobelirteç Filtreleri">
          ${filterChipsHtml}
        </div>

        <div id="${chartInnerId}" class="w-full min-h-[280px] pt-1"></div>

        ${buildProgressDeltaCardsHtml(records, activeMetas)}
      </div>
    `;

    const chartHost = document.getElementById(chartInnerId);
    if (chartHost) {
      const linesConfig = activeMetas.map(meta => ({
        key: meta.key,
        dataKey: meta.key,
        name: meta.label,
        shortLabel: meta.shortLabel,
        unit: meta.unit,
        stroke: meta.color,
        meta
      }));

      window.Recharts.renderMultiLineChart(chartHost, {
        data: dataset,
        lines: linesConfig,
        scaleMode: dashboardChartState.scaleMode,
        height: 280
      });
    }
  }

  function renderAllRechartsDashboards() {
    renderRechartsMount("rechartsBloodHistoryContainer");
    // Tahlillerim sayfası: sade gelişim grafiği (js/lab-trend.js); yüklenemediyse eski çoklu çizgi paneli kullanılır.
    if (!(window.VitaLabTrend && window.VitaLabTrend.render())) renderRechartsMount("labsRechartsMultiLineMount");
    // Ensure biomarkerChartCard in view-labs is visible so users can always inspect multi-line trends
    const labCard = document.getElementById("biomarkerChartCard");
    if (labCard) {
      labCard.classList.remove("hidden");
    }
  }

  function toggleBiomarker(key) {
    if (dashboardChartState.selectedKeys.has(key)) {
      if (dashboardChartState.selectedKeys.size > 1) {
        dashboardChartState.selectedKeys.delete(key);
      } else if (typeof showToast === "function") {
        showToast("En Az 1 Biyobelirteç", "Grafikte en az bir kan tahlili çizgisi aktif olmalıdır.", "info");
      }
    } else {
      dashboardChartState.selectedKeys.add(key);
    }
    renderAllRechartsDashboards();
  }

  function setScaleMode(mode) {
    dashboardChartState.scaleMode = mode === "raw" ? "raw" : "normalized";
    renderAllRechartsDashboards();
  }

  function seedDemoRecordsToAccount() {
    if (typeof state === "undefined") return;
    const genderAtTest = state.user?.gender || "K";
    const appRefs = typeof getVitaAppLabReferenceMap === "function" ? getVitaAppLabReferenceMap(genderAtTest) : {};
    const cloned = DEMO_LAB_HISTORY_SERIES.map((rec, idx) => ({
      ...rec,
      id: `lab_seed_${Date.now()}_${idx}`,
      references: {},
      applicationReferences: appRefs,
      genderAtTest,
      timestamp: Date.parse(`${rec.date}T09:30:00`) || (Date.now() - (DEMO_LAB_HISTORY_SERIES.length - idx) * 86400000 * 30),
      timeLabel: "09:30"
    })).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

    state.labHistory = cloned;
    const latest = cloned[0];
    if (latest) {
      state.labValues = {
        d3: latest.d3,
        b12: latest.b12,
        ferritin: latest.ferritin,
        mg: latest.mg,
        ca: latest.ca,
        zinc: latest.zinc,
        creatinine: latest.creatinine,
        folate: latest.folate,
        alt: latest.alt,
        hb: latest.hb,
        mcv: latest.mcv,
        crp: latest.crp
      };
    }
    if (typeof saveState === "function") saveState();
    if (typeof renderLabHistoryUI === "function") renderLabHistoryUI();
    if (typeof renderBiomarkerTrendChart === "function") renderBiomarkerTrendChart();
    renderAllRechartsDashboards();
    if (typeof showToast === "function") {
      showToast("Örnek Tahlil Geçmişi Yüklendi", "4 dönemlik kan tahlili geçmişi çoklu çizgi grafiğine aktarıldı.", "success");
    }
  }

  window.VitaRechartsDashboard = {
    BIOMARKER_META,
    renderAll: renderAllRechartsDashboards,
    toggleBiomarker,
    setScaleMode,
    seedDemoRecordsToAccount
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderAllRechartsDashboards();
    }, { once: true });
  } else {
    setTimeout(renderAllRechartsDashboards, 0);
  }
})();
