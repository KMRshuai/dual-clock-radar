const CONFIG = {
  tcs: [
    { key: 'release_frequency', label: '有效版本迭代频率', weight: 0.25 },
    { key: 'core_capability_delta', label: '核心功能变化强度', weight: 0.25 },
    { key: 'api_breaking_rate', label: '接口非兼容变化率', weight: 0.20 },
    { key: 'model_dependency_change', label: '模型及依赖变化率', weight: 0.15 },
    { key: 'parallel_version_load', label: '并行版本负荷', weight: 0.15 },
  ],
  mcs: [
    { key: 'poc_cycle', label: 'PoC验证速度', weight: 0.20 },
    { key: 'procurement_cycle', label: '采购决策速度', weight: 0.20 },
    { key: 'compliance_cycle', label: '合规审查速度', weight: 0.20 },
    { key: 'delivery_cycle', label: '交付验收速度', weight: 0.20 },
    { key: 'monetization_cycle', label: '商业兑现速度', weight: 0.20 },
  ],
  exp: [
    { key: 'customer_concentration', label: '客户集中暴露', weight: 0.25 },
    { key: 'version_fragmentation', label: '版本兼容暴露', weight: 0.25 },
    { key: 'cash_runway_pressure', label: '财务暴露', weight: 0.20 },
    { key: 'compliance_sensitivity', label: '合规暴露', weight: 0.20 },
    { key: 'tech_dependency', label: '技术依赖暴露', weight: 0.10 },
  ]
};

const PRESETS = {
  paper_a: {
    tcs: { release_frequency:85, core_capability_delta:80, api_breaking_rate:75, model_dependency_change:70, parallel_version_load:65 },
    mcs: { poc_cycle:42, procurement_cycle:42, compliance_cycle:42, delivery_cycle:42, monetization_cycle:42 },
    exp: { customer_concentration:60, version_fragmentation:70, cash_runway_pressure:55, compliance_sensitivity:45, tech_dependency:40 },
  },
  paper_after: {
    tcs: { release_frequency:68, core_capability_delta:72, api_breaking_rate:65, model_dependency_change:70, parallel_version_load:72 },
    mcs: { poc_cycle:58, procurement_cycle:58, compliance_cycle:58, delivery_cycle:58, monetization_cycle:58 },
    exp: { customer_concentration:40, version_fragmentation:40, cash_runway_pressure:40, compliance_sensitivity:40, tech_dependency:40 },
  },
  stability: {
    tcs: { release_frequency:92, core_capability_delta:88, api_breaking_rate:85, model_dependency_change:80, parallel_version_load:78 },
    mcs: { poc_cycle:12, procurement_cycle:10, compliance_cycle:15, delivery_cycle:18, monetization_cycle:8 },
    exp: { customer_concentration:30, version_fragmentation:85, cash_runway_pressure:88, compliance_sensitivity:75, tech_dependency:35 },
  },
  healthy: {
    tcs: { release_frequency:55, core_capability_delta:50, api_breaking_rate:35, model_dependency_change:40, parallel_version_load:45 },
    mcs: { poc_cycle:52, procurement_cycle:50, compliance_cycle:48, delivery_cycle:55, monetization_cycle:50 },
    exp: { customer_concentration:35, version_fragmentation:30, cash_runway_pressure:35, compliance_sensitivity:30, tech_dependency:25 },
  },
  clear: {
    tcs: { release_frequency:50, core_capability_delta:50, api_breaking_rate:50, model_dependency_change:50, parallel_version_load:50 },
    mcs: { poc_cycle:50, procurement_cycle:50, compliance_cycle:50, delivery_cycle:50, monetization_cycle:50 },
    exp: { customer_concentration:50, version_fragmentation:50, cash_runway_pressure:50, compliance_sensitivity:50, tech_dependency:50 },
  }
};

let lastResult = null;
let currentGovernance = 'before';
let currentTab = 'mgmt';

// ========== Core Functions ==========

function buildFields(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label>${item.label}<span class="weight">w=${item.weight}</span></label>
      <div class="val-row">
        <input type="range" id="range-${item.key}" min="0" max="100" value="50" oninput="syncNum('${item.key}',this.value)">
        <input type="number" id="num-${item.key}" min="0" max="100" value="50" oninput="syncRange('${item.key}',this.value)">
      </div>
      <div class="range-labels"><span>0</span><span>100</span></div>`;
    container.appendChild(div);
  });
}

function syncNum(key, val) { document.getElementById('num-' + key).value = val; }
function syncRange(key, val) { document.getElementById('range-' + key).value = val; }

function getValues(items) {
  const vals = {};
  items.forEach(item => { vals[item.key] = parseFloat(document.getElementById('num-' + item.key).value) || 0; });
  return vals;
}

function setValues(preset) {
  for (const [group, values] of Object.entries(preset)) {
    for (const [key, val] of Object.entries(values)) {
      const r = document.getElementById('range-' + key);
      const n = document.getElementById('num-' + key);
      if (r) r.value = val;
      if (n) n.value = val;
    }
  }
}

function calcWeighted(vals, items) {
  return items.reduce((sum, item) => sum + (vals[item.key] || 0) * item.weight, 0);
}

function drawGauge(svgId, value, color) {
  const svg = document.getElementById(svgId);
  const cx = 100, cy = 110, r = 80;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const valueAngle = startAngle + (value / 100) * Math.PI;
  function arcPath(startA, endA, radius) {
    const x1 = cx + radius * Math.cos(startA);
    const y1 = cy + radius * Math.sin(startA);
    const x2 = cx + radius * Math.cos(endA);
    const y2 = cy + radius * Math.sin(endA);
    const largeArc = endA - startA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }
  const bgPath = arcPath(startAngle, endAngle, r);
  const valPath = value > 0 ? arcPath(startAngle, valueAngle, r) : '';
  const needleX = cx + (r - 10) * Math.cos(valueAngle);
  const needleY = cy + (r - 10) * Math.sin(valueAngle);
  svg.innerHTML = `
    <path d="${bgPath}" fill="none" stroke="var(--border)" stroke-width="12" stroke-linecap="round"/>
    ${valPath ? `<path d="${valPath}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>` : ''}
    ${value > 0 ? `<line x1="${cx}" y1="${cy}" x2="${needleX}" y2="${needleY}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>`;
}

function getBarColor(score) {
  if (score >= 75) return 'var(--red)';
  if (score >= 50) return 'var(--orange)';
  if (score >= 30) return 'var(--yellow)';
  return 'var(--green)';
}

function getExposureColor(score) {
  if (score >= 60) return 'var(--red)';
  if (score >= 40) return 'var(--orange)';
  if (score >= 20) return 'var(--yellow)';
  return 'var(--green)';
}

function renderBars(containerId, vals, items, isExposure) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  items.forEach(item => {
    const score = vals[item.key] || 0;
    const color = isExposure ? getExposureColor(score) : getBarColor(score);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<div class="bar-label">${item.label}</div><div class="bar-track"><div class="bar-fill" style="width:${score}%;background:${color}"></div></div><div class="bar-value">${score.toFixed(1)}</div>`;
    container.appendChild(row);
  });
}

function renderCustomBars(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<div class="bar-label">${item.label}</div><div class="bar-track"><div class="bar-fill" style="width:${item.value}%;background:${item.color}"></div></div><div class="bar-value">${item.value.toFixed(1)}</div>`;
    container.appendChild(row);
  });
}

// ========== Main Calculate ==========

function calculate() {
  const tcsVals = getValues(CONFIG.tcs);
  const mcsVals = getValues(CONFIG.mcs);
  const expVals = getValues(CONFIG.exp);

  const tcs = Math.round(calcWeighted(tcsVals, CONFIG.tcs) * 100) / 100;
  const mcs = Math.round(calcWeighted(mcsVals, CONFIG.mcs) * 100) / 100;
  const eRaw = calcWeighted(expVals, CONFIG.exp);
  const e = Math.round(eRaw / 100 * 10000) / 10000;
  const dmi = Math.round((tcs - mcs) * 100) / 100;
  const rmi = Math.round(Math.min(100, Math.abs(dmi) * (1 + e)) * 100) / 100;

  let level, levelCode, action;
  if (rmi < 20) { level = '绿色'; levelCode = 'GREEN'; action = '正常监测'; }
  else if (rmi < 40) { level = '黄色'; levelCode = 'YELLOW'; action = '检查重点客户和版本变化'; }
  else if (rmi < 60) { level = '橙色'; levelCode = 'ORANGE'; action = '启动跨部门干预'; }
  else { level = '红色'; levelCode = 'RED'; action = '纳入经营层专项管理'; }

  lastResult = { tcs, mcs, e, dmi, rmi, level, levelCode, action, tcsVals, mcsVals, expVals };

  renderMgmtDashboard();
  renderSalesDashboard();
  renderRDDashboard();
  renderFinanceDashboard();
}

// ========== Management Dashboard ==========

function renderMgmtDashboard() {
  if (!lastResult) return;
  const { tcs, mcs, e, dmi, rmi, level, levelCode, action, tcsVals, mcsVals, expVals } = lastResult;

  document.getElementById('rmi-value').innerHTML = rmi.toFixed(1) + '<span class="unit">/100</span>';
  const badgeColors = { GREEN: 'var(--green-bg)', YELLOW: 'var(--yellow-bg)', ORANGE: 'var(--orange-bg)', RED: 'var(--red-bg)' };
  const badgeTextColors = { GREEN: 'var(--green)', YELLOW: 'var(--yellow)', ORANGE: 'var(--orange)', RED: 'var(--red)' };
  const badge = document.getElementById('rmi-badge');
  badge.style.background = badgeColors[levelCode];
  badge.style.color = badgeTextColors[levelCode];
  badge.querySelector('.dot').style.background = badgeTextColors[levelCode];
  document.getElementById('rmi-badge-text').textContent = level + ' · ' + action;

  const descEl = document.getElementById('rmi-desc');
  if (currentGovernance === 'after') {
    descEl.textContent = `治理后，破坏性变化得到控制（TCS ${Math.round(tcs)}），市场验证效率提高（MCS ${Math.round(mcs)}），双时钟差收窄至 ${Math.abs(Math.round(dmi))} 分，风险回落到${level}区间。`;
  } else {
    descEl.textContent = `技术时钟(${Math.round(tcs)})领先市场时钟(${Math.round(mcs)}) ${Math.abs(Math.round(dmi))} 分，风险暴露系数 ${e.toFixed(2)}，综合风险指数 ${rmi.toFixed(1)}。`;
  }

  document.getElementById('risk-marker').style.left = Math.min(100, rmi) + '%';
  drawGauge('gauge-tcs', tcs, 'var(--blue)');
  drawGauge('gauge-mcs', mcs, 'var(--orange-accent)');
  document.getElementById('tcs-value').innerHTML = Math.round(tcs) + '<span class="unit">/100</span>';
  document.getElementById('mcs-value').innerHTML = Math.round(mcs) + '<span class="unit">/100</span>';

  document.getElementById('dmi-label').textContent = 'DMI = ' + Math.abs(Math.round(dmi));
  document.getElementById('dmi-point-tcs').style.left = tcs + '%';
  document.getElementById('dmi-point-mcs').style.left = mcs + '%';
  document.getElementById('dmi-label-tcs').style.left = tcs + '%';
  document.getElementById('dmi-label-tcs').textContent = '技术时钟 ' + Math.round(tcs);
  document.getElementById('dmi-label-mcs').style.left = mcs + '%';
  document.getElementById('dmi-label-mcs').textContent = '市场时钟 ' + Math.round(mcs);
  const fill = document.getElementById('dmi-fill');
  fill.style.left = Math.min(tcs, mcs) + '%';
  fill.style.width = Math.abs(tcs - mcs) + '%';
  fill.style.background = 'var(--accent)';
  fill.style.opacity = '0.3';

  document.getElementById('bm-dmi').textContent = Math.abs(Math.round(dmi));
  document.getElementById('bm-e').textContent = e.toFixed(2);
  document.getElementById('bm-tcs').textContent = Math.round(tcs);
  document.getElementById('bm-mcs').textContent = Math.round(mcs);

  renderBars('tcs-bars', tcsVals, CONFIG.tcs, false);
  renderBars('mcs-bars', mcsVals, CONFIG.mcs, false);
  renderBars('exp-bars', expVals, CONFIG.exp, true);

  // Diagnosis
  const items = [];
  const tcsItems = CONFIG.tcs.map(c => ({ ...c, val: tcsVals[c.key] })).sort((a, b) => b.val - a.val);
  items.push({ icon: '&#9888;', text: `<b>技术时钟最高项:</b> ${tcsItems[0].label} = ${tcsItems[0].val}。${tcsItems[0].val > 75 ? '技术迭代速度极高，需评估市场是否能跟上。' : '技术迭代速度处于中等水平。'}` });
  const mcsItems = CONFIG.mcs.map(c => ({ ...c, val: mcsVals[c.key] })).sort((a, b) => a.val - b.val);
  items.push({ icon: '&#9201;', text: `<b>市场时钟最慢项:</b> ${mcsItems[0].label} = ${mcsItems[0].val}。${mcsItems[0].val < 30 ? '这是市场验证的最大瓶颈，建议优先优化此环节。' : '各环节相对均衡。'}` });
  const expItems = CONFIG.exp.map(c => ({ ...c, val: expVals[c.key] })).sort((a, b) => b.val - a.val);
  items.push({ icon: '&#9888;', text: `<b>最大暴露源:</b> ${expItems[0].label} = ${expItems[0].val}。${expItems[0].val > 60 ? '该项暴露度较高，会显著放大错配风险。' : '各项暴露度可控。'}` });
  if (rmi >= 60) items.push({ icon: '&#9632;', text: '<b>建议:</b> 立即建立双轨版本机制(Innovation Track + Stable Track)，冻结面向客户的核心API，启动跨部门Release Gate。' });
  else if (rmi >= 40) items.push({ icon: '&#9654;', text: '<b>建议:</b> 建立标准化PoC环境缩短验证周期，将合规审查前置到产品立项阶段，监控客户版本分布。' });
  else if (rmi >= 20) items.push({ icon: '&#9654;', text: '<b>建议:</b> 持续监测DMI趋势变化，关注市场时钟最慢环节是否有恶化趋势。' });
  else items.push({ icon: '&#10003;', text: '<b>状态良好:</b> 双时钟基本同步，保持当前节奏，定期复核即可。' });
  if (dmi > 30) items.push({ icon: '&#8594;', text: '<b>传导风险:</b> 技术大幅领先市场，注意研发沉没、版本碎片化、客户观望等风险传导路径。' });

  document.getElementById('diagnosis').innerHTML = items.map(i =>
    `<div class="diag-item"><span class="dicon">${i.icon}</span><span>${i.text}</span></div>`
  ).join('');
}

// ========== Sales Dashboard ==========

function renderSalesDashboard() {
  if (!lastResult) return;
  const { tcs, mcs, dmi, rmi, e, tcsVals, mcsVals, expVals } = lastResult;

  // Derived metrics for sales
  const pocConversionRisk = Math.min(100, Math.max(0, (tcs - mcsVals.poc_cycle) * 1.2));
  const deliveryDelayIndex = Math.min(100, Math.max(0, (tcsVals.release_frequency + tcsVals.api_breaking_rate) / 2 - mcsVals.delivery_cycle));
  const customerChurnRisk = Math.min(100, expVals.customer_concentration * 0.5 + Math.abs(dmi) * 0.5);
  const pipelineBlockRate = Math.min(100, Math.max(0, (tcs - mcs) * 0.8 + expVals.version_fragmentation * 0.3));

  // Metric cards
  const metricsHtml = [
    { icon: '&#128200;', val: pocConversionRisk.toFixed(0), label: 'PoC 转化风险', desc: `技术迭代(${Math.round(tcs)})远超PoC验证速度(${Math.round(mcsVals.poc_cycle)})，客户在验证阶段容易因版本过时而重新评估`, color: getBarColor(pocConversionRisk) },
    { icon: '&#128230;', val: deliveryDelayIndex.toFixed(0), label: '交付延期指数', desc: `高频迭代(${Math.round(tcsVals.release_frequency)})和接口变化(${Math.round(tcsVals.api_breaking_rate)})导致交付团队频繁适配`, color: getBarColor(deliveryDelayIndex) },
    { icon: '&#128101;', val: customerChurnRisk.toFixed(0), label: '客户流失预警', desc: `客户集中度${Math.round(expVals.customer_concentration)}，版本碎片化${Math.round(expVals.version_fragmentation)}，大客户因版本混乱流失风险`, color: getExposureColor(customerChurnRisk) },
  ].map(m => `
    <div class="dept-card">
      <div class="dc-icon">${m.icon}</div>
      <div class="dc-val" style="color:${m.color}">${m.val}</div>
      <div class="dc-label">${m.label}</div>
      <div class="dc-desc">${m.desc}</div>
      <div class="dc-bar"><div class="dc-bar-fill" style="width:${m.val}%;background:${m.color}"></div></div>
    </div>
  `).join('');
  document.getElementById('sales-metrics').innerHTML = metricsHtml;

  // Funnel risk bars
  const funnelData = [
    { label: '线索→PoC', value: Math.min(100, Math.max(0, tcs - mcsVals.procurement_cycle) * 0.9), color: getBarColor(Math.min(100, Math.max(0, tcs - mcsVals.procurement_cycle) * 0.9)) },
    { label: 'PoC→签约', value: pocConversionRisk, color: getBarColor(pocConversionRisk) },
    { label: '签约→交付', value: deliveryDelayIndex, color: getBarColor(deliveryDelayIndex) },
    { label: '交付→验收', value: Math.min(100, Math.max(0, tcsVals.api_breaking_rate - mcsVals.delivery_cycle * 0.5)), color: getBarColor(Math.min(100, Math.max(0, tcsVals.api_breaking_rate - mcsVals.delivery_cycle * 0.5))) },
    { label: '验收→回款', value: Math.min(100, Math.max(0, mcsVals.monetization_cycle < 30 ? 80 - mcsVals.monetization_cycle : 40)), color: getBarColor(Math.min(100, Math.max(0, mcsVals.monetization_cycle < 30 ? 80 - mcsVals.monetization_cycle : 40))) },
  ];
  renderCustomBars('sales-funnel-bars', funnelData);

  // Delivery health bars
  const deliveryData = CONFIG.mcs.map(item => {
    const mcsVal = mcsVals[item.key];
    const pressure = Math.min(100, Math.max(0, tcs - mcsVal));
    return { label: item.label, value: pressure, color: getBarColor(pressure) };
  });
  renderCustomBars('sales-delivery-bars', deliveryData);

  // Customer risk matrix
  const cc = expVals.customer_concentration;
  const vf = expVals.version_fragmentation;
  const matrixLevel = rmi >= 60 ? '极高' : rmi >= 40 ? '高' : rmi >= 20 ? '中' : '低';
  document.getElementById('sales-customer-matrix').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:13px;margin-bottom:8px;"><b>客户集中度:</b> <span style="color:${getExposureColor(cc)}">${cc.toFixed(0)}</span></div>
        <div style="font-size:13px;margin-bottom:8px;"><b>版本碎片化:</b> <span style="color:${getExposureColor(vf)}">${vf.toFixed(0)}</span></div>
        <div style="font-size:13px;margin-bottom:8px;"><b>商业兑现速度:</b> <span style="color:${getBarColor(100-mcsVals.monetization_cycle)}">${mcsVals.monetization_cycle.toFixed(0)}</span></div>
      </div>
      <div>
        <div style="font-size:13px;margin-bottom:8px;"><b>综合客户风险:</b> <span style="color:${rmi>=60?'var(--red)':rmi>=40?'var(--orange)':'var(--yellow)'};font-weight:700;">${matrixLevel}</span></div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;">
          ${cc > 60 ? '&#9888; 客户集中度过高，单一大客户的技术偏好变化将直接影响营收。<br>' : ''}
          ${vf > 60 ? '&#9888; 版本碎片化严重，销售需要同时维护多个版本方案，增加售前成本。<br>' : ''}
          ${mcsVals.monetization_cycle < 30 ? '&#9888; 商业兑现速度过慢，从签约到回款周期过长，影响现金流。<br>' : ''}
          ${cc <= 60 && vf <= 60 && mcsVals.monetization_cycle >= 30 ? '&#10003; 客户组合风险在可控范围内。' : ''}
        </div>
      </div>
    </div>
  `;

  // Sales diagnosis
  const items = [];
  if (pocConversionRisk > 60) items.push({ icon: '&#9888;', text: `<b>PoC 转化瓶颈:</b> 技术迭代速度(${Math.round(tcs)})远超客户验证能力(${Math.round(mcsVals.poc_cycle)})，建议提供标准化沙箱环境，锁定 6 个月内的 PoC 版本不变更。` });
  if (deliveryDelayIndex > 50) items.push({ icon: '&#128230;', text: `<b>交付延期风险:</b> 接口非兼容变化率(${Math.round(tcsVals.api_breaking_rate)})过高，交付团队频繁适配。建议建立 Stable API 承诺机制，重大变更提前 90 天通知。` });
  if (customerChurnRisk > 50) items.push({ icon: '&#128101;', text: `<b>客户流失预警:</b> 高集中度+高碎片化组合下，建议为 Top 3 客户指定专属技术对接人，提供长期支持版本(LTS)承诺。` });
  if (mcsVals.procurement_cycle < 30) items.push({ icon: '&#9201;', text: `<b>采购决策滞后:</b> 客户采购流程(${Math.round(mcsVals.procurement_cycle)})远慢于技术变化，建议将产品包装为"可采购"的标准方案，降低客户内部审批难度。` });
  if (rmi < 30) items.push({ icon: '&#10003;', text: '<b>销售交付健康:</b> 技术-市场节奏匹配良好，客户转化和交付流程正常，保持当前策略。' });
  document.getElementById('sales-diagnosis').innerHTML = items.map(i =>
    `<div class="diag-item"><span class="dicon">${i.icon}</span><span>${i.text}</span></div>`
  ).join('');
}

// ========== R&D Dashboard ==========

function renderRDDashboard() {
  if (!lastResult) return;
  const { tcs, mcs, dmi, rmi, e, tcsVals, mcsVals, expVals } = lastResult;

  // Derived R&D metrics
  const techDebtIndex = Math.min(100, (tcsVals.release_frequency * 0.3 + tcsVals.api_breaking_rate * 0.3 + tcsVals.parallel_version_load * 0.2 + tcsVals.model_dependency_change * 0.2));
  const fragmentIndex = Math.min(100, expVals.version_fragmentation * 0.5 + tcsVals.parallel_version_load * 0.3 + tcsVals.api_breaking_rate * 0.2);
  const apiStability = Math.max(0, 100 - tcsVals.api_breaking_rate);
  const contextSwitchLoad = Math.min(100, (tcsVals.parallel_version_load * 0.4 + tcsVals.model_dependency_change * 0.3 + tcsVals.core_capability_delta * 0.3));

  const metricsHtml = [
    { icon: '&#128736;', val: techDebtIndex.toFixed(0), label: '技术债务指数', desc: `版本高频迭代(${Math.round(tcsVals.release_frequency)})叠加接口破坏性变化(${Math.round(tcsVals.api_breaking_rate)})，技术债务快速累积`, color: getBarColor(techDebtIndex) },
    { icon: '&#128203;', val: fragmentIndex.toFixed(0), label: '版本碎片化指数', desc: `并行版本负荷${Math.round(tcsVals.parallel_version_load)}，客户侧版本碎片化${Math.round(expVals.version_fragmentation)}，维护成本倍增`, color: getBarColor(fragmentIndex) },
    { icon: '&#128268;', val: apiStability.toFixed(0), label: 'API 稳定性', desc: `接口非兼容变化率${Math.round(tcsVals.api_breaking_rate)}，${apiStability < 40 ? 'API 极不稳定，下游集成方频繁返工' : apiStability < 60 ? 'API 有一定变化，需要关注兼容性管理' : 'API 相对稳定'}`, color: apiStability >= 60 ? 'var(--green)' : apiStability >= 40 ? 'var(--yellow)' : 'var(--red)' },
  ].map(m => `
    <div class="dept-card">
      <div class="dc-icon">${m.icon}</div>
      <div class="dc-val" style="color:${m.color}">${m.val}</div>
      <div class="dc-label">${m.label}</div>
      <div class="dc-desc">${m.desc}</div>
      <div class="dc-bar"><div class="dc-bar-fill" style="width:${m.val}%;background:${m.color}"></div></div>
    </div>
  `).join('');
  document.getElementById('rd-metrics').innerHTML = metricsHtml;

  // Tech debt bars
  const debtData = CONFIG.tcs.map(item => ({
    label: item.label,
    value: tcsVals[item.key],
    color: getBarColor(tcsVals[item.key])
  }));
  renderCustomBars('rd-debt-bars', debtData);

  // Fragmentation bars
  const fragData = [
    { label: '并行版本负荷', value: tcsVals.parallel_version_load, color: getBarColor(tcsVals.parallel_version_load) },
    { label: '版本兼容暴露', value: expVals.version_fragmentation, color: getExposureColor(expVals.version_fragmentation) },
    { label: '接口变化率', value: tcsVals.api_breaking_rate, color: getBarColor(tcsVals.api_breaking_rate) },
    { label: '模型依赖变化', value: tcsVals.model_dependency_change, color: getBarColor(tcsVals.model_dependency_change) },
    { label: '技术依赖暴露', value: expVals.tech_dependency, color: getExposureColor(expVals.tech_dependency) },
  ];
  renderCustomBars('rd-fragment-bars', fragData);

  // Impact chain
  const chainItems = [
    { title: '需求频繁变更', desc: `核心功能变化强度 ${Math.round(tcsVals.core_capability_delta)}，研发方向不断调整`, cls: tcsVals.core_capability_delta > 70 ? 'danger' : tcsVals.core_capability_delta > 50 ? 'warn' : '' },
    { title: '代码返工率上升', desc: `接口非兼容变化 ${Math.round(tcsVals.api_breaking_rate)}，已完成的集成工作需要重做`, cls: tcsVals.api_breaking_rate > 60 ? 'danger' : tcsVals.api_breaking_rate > 40 ? 'warn' : '' },
    { title: '上下文切换成本', desc: `并行版本负荷 ${Math.round(tcsVals.parallel_version_load)}，工程师在多版本间频繁切换`, cls: contextSwitchLoad > 60 ? 'danger' : contextSwitchLoad > 40 ? 'warn' : '' },
    { title: '测试覆盖压力', desc: `版本组合数 × 接口变化率 = 测试矩阵指数级增长`, cls: fragmentIndex > 50 ? 'danger' : fragmentIndex > 30 ? 'warn' : '' },
    { title: '技术选型不确定', desc: `模型依赖变化率 ${Math.round(tcsVals.model_dependency_change)}，底层技术栈可能面临替换`, cls: tcsVals.model_dependency_change > 60 ? 'danger' : tcsVals.model_dependency_change > 40 ? 'warn' : '' },
  ];
  document.getElementById('rd-impact-chain').innerHTML = `<div class="timeline">${chainItems.map(item =>
    `<div class="timeline-item ${item.cls}"><div class="tl-title">${item.title}</div><div class="tl-desc">${item.desc}</div></div>`
  ).join('')}</div>`;

  // R&D diagnosis
  const items = [];
  if (techDebtIndex > 60) items.push({ icon: '&#9888;', text: `<b>技术债务告警:</b> 债务指数 ${Math.round(techDebtIndex)}，建议立即启动双轨制：Innovation Track(快速实验) + Stable Track(客户稳定)，冻结 Stable Track 的 API 变更。` });
  if (tcsVals.api_breaking_rate > 60) items.push({ icon: '&#128268;', text: `<b>API 稳定性危机:</b> 非兼容变化率 ${Math.round(tcsVals.api_breaking_rate)}，建议引入 API 版本管理 + 废弃通知机制(deprecation window ≥ 6个月)。` });
  if (tcsVals.parallel_version_load > 60) items.push({ icon: '&#128203;', text: `<b>版本碎片化:</b> 并行负荷 ${Math.round(tcsVals.parallel_version_load)}，建议收敛到 N-1 版本策略(只维护当前版+上一版)，淘汰更早版本。` });
  if (contextSwitchLoad > 50) items.push({ icon: '&#129504;', text: `<b>工程师效率损耗:</b> 上下文切换负荷 ${Math.round(contextSwitchLoad)}，建议按版本/模块划分小组，减少个人跨版本切换频率。` });
  if (rmi < 30) items.push({ icon: '&#10003;', text: '<b>研发状态健康:</b> 技术迭代节奏合理，版本管理有序，继续保持当前的开发节奏。' });
  document.getElementById('rd-diagnosis').innerHTML = items.map(i =>
    `<div class="diag-item"><span class="dicon">${i.icon}</span><span>${i.text}</span></div>`
  ).join('');
}

// ========== Finance Dashboard ==========

function renderFinanceDashboard() {
  if (!lastResult) return;
  const { tcs, mcs, dmi, rmi, e, tcsVals, mcsVals, expVals } = lastResult;

  // Derived finance metrics
  const cashPressure = Math.min(100, expVals.cash_runway_pressure * 0.4 + (100 - mcsVals.monetization_cycle) * 0.3 + rmi * 0.3);
  const complianceGap = Math.min(100, Math.max(0, tcs - mcsVals.compliance_cycle));
  const revenueRisk = Math.min(100, expVals.version_fragmentation * 0.3 + expVals.customer_concentration * 0.3 + (100 - mcsVals.monetization_cycle) * 0.4);
  const versionCostRatio = Math.min(100, tcsVals.parallel_version_load * 0.3 + expVals.version_fragmentation * 0.4 + tcsVals.api_breaking_rate * 0.3);

  const metricsHtml = [
    { icon: '&#128176;', val: cashPressure.toFixed(0), label: '现金流压力', desc: `财务暴露${Math.round(expVals.cash_runway_pressure)}，商业兑现速度${Math.round(mcsVals.monetization_cycle)}，RMI ${rmi.toFixed(0)} 共同作用`, color: getExposureColor(cashPressure) },
    { icon: '&#128220;', val: complianceGap.toFixed(0), label: '合规缺口', desc: `技术时钟(${Math.round(tcs)})远超合规审查速度(${Math.round(mcsVals.compliance_cycle)})，存在合规盲区`, color: getBarColor(complianceGap) },
    { icon: '&#128200;', val: revenueRisk.toFixed(0), label: '收入确认风险', desc: `版本碎片化${Math.round(expVals.version_fragmentation)}影响交付验收，进而影响收入确认时点`, color: getBarColor(revenueRisk) },
  ].map(m => `
    <div class="dept-card">
      <div class="dc-icon">${m.icon}</div>
      <div class="dc-val" style="color:${m.color}">${m.val}</div>
      <div class="dc-label">${m.label}</div>
      <div class="dc-desc">${m.desc}</div>
      <div class="dc-bar"><div class="dc-bar-fill" style="width:${m.val}%;background:${m.color}"></div></div>
    </div>
  `).join('');
  document.getElementById('finance-metrics').innerHTML = metricsHtml;

  // Financial risk decomposition
  const riskData = CONFIG.exp.map(item => ({
    label: item.label,
    value: expVals[item.key],
    color: getExposureColor(expVals[item.key])
  }));
  renderCustomBars('finance-risk-bars', riskData);

  // Compliance gap bars
  const complianceData = [
    { label: '技术创新速度', value: tcs, color: 'var(--blue)' },
    { label: '合规审查速度', value: mcsVals.compliance_cycle, color: 'var(--green)' },
    { label: '合规暴露度', value: expVals.compliance_sensitivity, color: 'var(--red)' },
    { label: '数据安全要求', value: Math.min(100, tcs * 0.6 + expVals.compliance_sensitivity * 0.4), color: 'var(--orange)' },
    { label: '审计准备度', value: Math.min(100, Math.max(0, 100 - complianceGap)), color: complianceGap > 50 ? 'var(--red)' : 'var(--yellow)' },
  ];
  renderCustomBars('finance-compliance-bars', complianceData);

  // Cash flow timeline
  const monthlyImpact = rmi * e * 0.5;
  const timelineItems = [
    { title: '第 1 个月', desc: `直接成本: 多版本维护人力消耗 ≈ ${Math.round(versionCostRatio * 0.3)}% 研发资源`, cls: versionCostRatio > 50 ? 'warn' : '' },
    { title: '第 2-3 个月', desc: `交付延期导致回款推迟，预计影响现金流 ${Math.round(monthlyImpact * 2)} 万元`, cls: cashPressure > 50 ? 'warn' : '' },
    { title: '第 4-5 个月', desc: `客户因版本混乱减少新订单，Pipeline 缩减 ${Math.round(rmi * 0.5)}%`, cls: revenueRisk > 50 ? 'danger' : '' },
    { title: '第 6 个月', desc: cashPressure > 60 ? `现金流压力达到临界点，Runway 不足 ${Math.max(1, Math.round(12 - cashPressure * 0.1))} 个月，需要紧急干预` : `累计财务影响可控，但需持续关注趋势变化`, cls: cashPressure > 60 ? 'danger' : 'warn' },
  ];
  document.getElementById('finance-timeline').innerHTML = `<div class="timeline">${timelineItems.map(item =>
    `<div class="timeline-item ${item.cls}"><div class="tl-title">${item.title}</div><div class="tl-desc">${item.desc}</div></div>`
  ).join('')}</div>`;

  // Finance diagnosis
  const items = [];
  if (cashPressure > 60) items.push({ icon: '&#9888;', text: `<b>现金流告急:</b> 压力指数 ${Math.round(cashPressure)}，建议立即压缩非必要研发投入，集中资源保障已签约客户的交付和验收。` });
  if (complianceGap > 50) items.push({ icon: '&#128220;', text: `<b>合规缺口:</b> 技术-合规速度差 ${Math.round(complianceGap)}，建议引入合规前置机制(Compliance Shift-Left)，在产品立项阶段即启动合规评估。` });
  if (revenueRisk > 50) items.push({ icon: '&#128200;', text: `<b>收入确认风险:</b> 指数 ${Math.round(revenueRisk)}，建议与财务团队协同，按客户版本分布重新评估收入确认时点，避免审计风险。` });
  if (expVals.cash_runway_pressure > 60) items.push({ icon: '&#128176;', text: `<b>Runway 预警:</b> 财务暴露 ${Math.round(expVals.cash_runway_pressure)}，建议启动成本优化专项，将固定成本降低 20% 以延长跑道。` });
  if (rmi < 30) items.push({ icon: '&#10003;', text: '<b>财务健康:</b> 错配风险对财务影响有限，保持当前财务节奏，定期复核关键指标。' });
  document.getElementById('finance-diagnosis').innerHTML = items.map(i =>
    `<div class="diag-item"><span class="dicon">${i.icon}</span><span>${i.text}</span></div>`
  ).join('');
}

// ========== Navigation & UI ==========

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  const tabNames = ['mgmt', 'sales', 'rd', 'finance'];
  const idx = tabNames.indexOf(tab);
  document.querySelectorAll('.nav-tab')[idx].classList.add('active');
  document.getElementById('page-' + tab).classList.add('active');
}

function switchView(view) {
  document.getElementById('vbtn-dashboard').classList.toggle('active', view === 'dashboard');
  document.getElementById('vbtn-input').classList.toggle('active', view === 'input');
  const dashboards = document.querySelectorAll('.tab-page');
  const inputPanel = document.getElementById('view-input');
  if (view === 'input') {
    dashboards.forEach(d => d.style.display = 'none');
    inputPanel.classList.add('active');
  } else {
    inputPanel.classList.remove('active');
    dashboards.forEach(d => d.style.display = '');
    document.getElementById('page-' + currentTab).classList.add('active');
  }
}

function switchGovernance(mode) {
  currentGovernance = mode;
  updateGovernanceUI();
  loadPreset(mode === 'before' ? 'paper_a' : 'paper_after');
  calculate();
}

function updateGovernanceUI() {
  document.getElementById('btn-before').classList.toggle('active', currentGovernance === 'before');
  document.getElementById('btn-after').classList.toggle('active', currentGovernance === 'after');
}

function loadPreset(name) {
  setValues(PRESETS[name]);
  if (name === 'paper_a') { currentGovernance = 'before'; updateGovernanceUI(); }
  else if (name === 'paper_after') { currentGovernance = 'after'; updateGovernanceUI(); }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
  document.querySelector('.theme-toggle').textContent = isDark ? '深色' : '浅色';
}

// Init
buildFields('tcs-fields', CONFIG.tcs);
buildFields('mcs-fields', CONFIG.mcs);
buildFields('exp-fields-left', CONFIG.exp.slice(0, 3));
buildFields('exp-fields-right', CONFIG.exp.slice(3));
drawGauge('gauge-tcs', 0, 'var(--blue)');
drawGauge('gauge-mcs', 0, 'var(--orange-accent)');
loadPreset('paper_a');
calculate();
