/**
 * encyclopedia.js - 食材百科
 * 内置 data/food-nutrition.json 优先；未收录时通过 JSONP 拉取百度百科词条卡片（境内可访问，无需 CORS）。
 */

let foodDatabase = {};
/** @type {Promise<void>|null} 页面打开后 fetch 离线库完成前不要搜索，否则会误判「无数据」 */
let foodDatabaseReadyPromise = null;
let searchDebounceTimer = null;
let baikeLookupAbort = null;

/** 任意依赖 foodDatabase 的逻辑前先等待离线库拉取完成 */
async function awaitFoodDatabase() {
  if (foodDatabaseReadyPromise) await foodDatabaseReadyPromise;
}

function escapeHtmlFood(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function escapeAttrSingle(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

document.addEventListener('DOMContentLoaded', function () {
  foodDatabaseReadyPromise = loadFoodDatabase().then(function () {
    initNutrientChecks();
    syncSearchAfterDbReady();
  });
});

async function loadFoodDatabase() {
  try {
    const response = await fetch('data/food-nutrition.json');
    foodDatabase = await response.json();
  } catch (e) {
    console.error('加载食材数据失败:', e);
    showToast('加载食材数据失败', 'error');
    foodDatabase = {};
  }
}

/** 离线库就绪后，若输入框已有内容则自动再搜一次（避免用户抢先输入只看到空结果） */
function syncSearchAfterDbReady() {
  const input = document.getElementById('searchInput');
  if (!input || !String(input.value || '').trim()) return;
  void executeSearchFood();
}

function searchFood() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(function () {
    void executeSearchFood();
  }, 400);
}

function localFoodMatches(keyword) {
  if (!keyword) return [];
  return Object.values(foodDatabase).filter((food) => foodMatchesSearchKeyword(food, keyword));
}

function canonicalFoodKeyFromEntry(entry) {
  if (!entry) return '';
  const keys = Object.keys(foodDatabase);
  for (let i = 0; i < keys.length; i++) {
    if (foodDatabase[keys[i]] === entry) return keys[i];
  }
  return entry.name ? String(entry.name) : '';
}

function normalizeHttps(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('http://')) return 'https://' + u.slice(7);
  return u;
}

function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = String(html);
  return (d.textContent || d.innerText || '').trim();
}

function fetchBaikeLemmaJsonp(keyword, signal) {
  return new Promise(function (resolve, reject) {
    const trimmed = String(keyword || '').trim();
    if (!trimmed) {
      reject(new Error('empty keyword'));
      return;
    }

    let settled = false;
    const cbName =
      'baikeJsonpCB' +
      Date.now().toString(36) +
      Math.random()
        .toString(36)
        .slice(2, 10)
        .replace(/[^a-zA-Z0-9_]/g, 'x');

    const script = document.createElement('script');
    const timer = setTimeout(function () {
      done(new Error('百度百科请求超时'));
    }, 16000);

    function cleanup() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete window[cbName];
      } catch (_) {
        window[cbName] = undefined;
      }
      if (signal) signal.removeEventListener('abort', onAbort);
    }

    function done(err, data) {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else resolve(data || {});
    }

    function onAbort() {
      done(new DOMException('Aborted', 'AbortError'));
    }

    window[cbName] = function (data) {
      done(null, data || {});
    };

    script.onerror = function () {
      done(new Error('百度百科脚本加载失败'));
    };

    if (signal) {
      if (signal.aborted) {
        done(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', onAbort);
    }

    const bkKey = encodeURIComponent(trimmed);
    script.src =
      'https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?scope=103&format=json&appid=379020&bk_length=1400&bk_key=' +
      bkKey +
      '&callback=' +
      cbName;

    document.head.appendChild(script);
  });
}

function isUsableBaikePayload(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.errno === 'number' && data.errno !== 0) return false;
  const has =
    (data.title && String(data.title).trim()) ||
    (data.key && String(data.key).trim()) ||
    (data.desc && String(data.desc).trim()) ||
    (data.abstract && String(data.abstract).trim()) ||
    (Array.isArray(data.card) && data.card.length > 0);
  return Boolean(has);
}

function buildBaikePlainTextFallback(data) {
  const parts = [];
  const cards = Array.isArray(data.card) ? data.card : [];
  for (let i = 0; i < cards.length && i < 14; i++) {
    const c = cards[i];
    if (!c || !c.name) continue;
    const raw = Array.isArray(c.format) ? c.format[0] : Array.isArray(c.value) ? c.value[0] : '';
    const txt = stripHtml(raw);
    if (txt && !/^http/i.test(txt)) parts.push(c.name + '：' + txt);
  }
  return parts.filter(Boolean).join('\n').trim();
}

function buildBaiduPrimaryLink(data, searchKeyword) {
  const sk = String(searchKeyword || '').trim();
  const title = String(data.title || data.key || sk).trim();

  if (data.newLemmaId && title)
    return 'https://baike.baidu.com/item/' + encodeURIComponent(title) + '/' + data.newLemmaId;

  const total = normalizeHttps(data.totalUrl);
  if (total) return total;

  if (title) return 'https://baike.baidu.com/item/' + encodeURIComponent(title);

  return 'https://baike.baidu.com/search?word=' + encodeURIComponent(sk || title);
}

async function executeSearchFood() {
  await awaitFoodDatabase();

  const keyword = document.getElementById('searchInput').value.trim();

  if (baikeLookupAbort) {
    baikeLookupAbort.abort();
    baikeLookupAbort = null;
  }

  if (!keyword) {
    document.getElementById('foodDetail').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('emptyState').style.display = 'block';
    clearBaikeExtras();
    return;
  }

  const matches = localFoodMatches(keyword);

  if (matches.length > 0) {
    document.getElementById('foodDetail').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';

    showFoodDetail(canonicalFoodKeyFromEntry(matches[0]));

    if (matches.length > 1) {
      let html =
        '<div style="font-weight: bold; margin: 16px 0 8px 0; font-size: 14px; color: var(--text-light);">其他匹配结果（内置）：</div>';
      html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
      matches.slice(1).forEach(function (food) {
        const key = canonicalFoodKeyFromEntry(food);
        const n = escapeAttrSingle(key);
        const label = escapeHtmlFood(food.name || key);
        html +=
          `<div class="tag" style="cursor: pointer;" onclick="showFoodDetail('${n}')">${label}</div>`;
      });
      html += '</div>';
      document.getElementById('searchResults').innerHTML = html;
    } else {
      document.getElementById('searchResults').innerHTML = '';
    }
    return;
  }

  document.getElementById('foodDetail').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('searchResults').innerHTML =
    '<div class="empty-state"><div class="icon">🌐</div><div>正在加载百度百科摘要…</div></div>';

  baikeLookupAbort = new AbortController();
  const signal = baikeLookupAbort.signal;

  try {
    const payload = await fetchBaikeLemmaJsonp(keyword, signal);

    if (signal.aborted) return;

    if (!isUsableBaikePayload(payload)) {
      document.getElementById('searchResults').innerHTML =
        '<div class="empty-state"><div class="icon">😔</div><div>百度百科未命中该词条。可尝试更常用名称或在网页中检索。</div></div>' +
        '<div style="margin-top:12px;"><a href="' +
        escapeHtmlFood('https://baike.baidu.com/search?word=' + encodeURIComponent(keyword)) +
        '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-block">在百度百科中搜索「' +
        escapeHtmlFood(keyword) +
        '」</a></div>';
      return;
    }

    document.getElementById('foodDetail').style.display = 'block';
    showBaiduLemmaDetail(payload, keyword);

    const more = normalizeHttps(buildBaiduPrimaryLink(payload, keyword));

    document.getElementById('searchResults').innerHTML =
      '<div style="margin-top:14px;font-size:13px;color:var(--text-light);">' +
      '本词条摘要从<strong>百度百科</strong>载入；添加辅食月龄请以儿科建议与本应用<strong>内置</strong>辅食库为准。同名多义项时请以网页正文为准。' +
      '</div>' +
      '<div style="margin-top:10px;"><a href="' +
      escapeHtmlFood(more) +
      '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-block">在百度百科网页中查看全文</a></div>';
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error(e);
    document.getElementById('searchResults').innerHTML =
      '<div class="empty-state"><div class="icon">⚠️</div><div>加载失败：' +
      escapeHtmlFood(e.message || '请检查网络后重试') +
      '</div></div>' +
      '<div style="margin-top:12px;"><a href="' +
      escapeHtmlFood('https://baike.baidu.com/search?word=' + encodeURIComponent(keyword)) +
      '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-block">在百度百科中搜索</a></div>';
  }
}

function clearBaikeExtras() {
  const aliasesRow = document.getElementById('foodAliasesRow');
  if (aliasesRow) {
    aliasesRow.style.display = 'none';
    aliasesRow.innerHTML = '';
  }
  const badge = document.getElementById('baikeSourceBadge');
  const thumb = document.getElementById('baikeThumbWrap');
  if (badge) {
    badge.style.display = 'none';
    badge.innerHTML = '';
  }
  if (thumb) {
    thumb.style.display = 'none';
    thumb.innerHTML = '';
  }
}

function showBaiduLemmaDetail(data, searchKeyword) {
  clearBaikeExtras();

  const title = String(data.title || data.key || searchKeyword).trim();
  const badge = document.getElementById('baikeSourceBadge');
  badge.style.display = 'block';
  badge.innerHTML =
    '<div class="alert alert-warning" style="margin-bottom:12px;width:100%;box-sizing:border-box;">' +
    '本条内容由<strong>百度百科</strong>提供，不构成医疗建议；宝宝<strong>添加辅食月龄与过敏风险</strong>请以医生建议与本应用<strong>内置辅食库</strong>为准。' +
    '</div>';

  document.getElementById('foodName').textContent = title;
  document.getElementById('foodCategory').textContent = data.desc || '百度百科词条';

  const nst = document.getElementById('nutritionSectionTitle');
  if (nst) nst.textContent = '词条摘要';

  let body = '';
  if (data.abstract && String(data.abstract).trim()) body = String(data.abstract).trim();
  else body = buildBaikePlainTextFallback(data);
  if (!body) body = '暂无正文摘要（可在百度百科网页查看全文）。';

  document.getElementById('foodNutrition').innerHTML =
    '<div style="font-size:15px;line-height:1.55;color:var(--text);white-space:pre-wrap;">' +
    escapeHtmlFood(body) +
    '</div>';

  document.getElementById('recommendedAge').textContent = '—';

  document.getElementById('ageRecommendation').innerHTML =
    '<div class="alert alert-warning">百度百科<strong>不含</strong>本站辅食月龄建议；内置库有更完整的食材营养与风险提示。</div>';

  const href = normalizeHttps(buildBaiduPrimaryLink(data, searchKeyword));

  const riskEl = document.getElementById('foodRisk');
  riskEl.classList.remove('tip-card-red');
  riskEl.style.fontSize = '14px';
  riskEl.innerHTML =
    '内容可能不完整或过时；个体差异请咨询医生。' +
    ' <a href="' +
    escapeHtmlFood(href) +
    '" target="_blank" rel="noopener noreferrer">打开百度百科该词条</a>';

  const img = normalizeHttps(data.image);
  const tw = document.getElementById('baikeThumbWrap');
  if (img && tw) {
    tw.style.display = 'block';
    tw.innerHTML =
      '<img src="' +
      escapeHtmlFood(img) +
      '" alt="" style="max-width:100%;border-radius:8px;max-height:220px;object-fit:cover;" loading="lazy" referrerpolicy="no-referrer">';
  } else if (tw) {
    tw.style.display = 'none';
    tw.innerHTML = '';
  }

  loadFoodRelations(title);
}

function showFoodDetail(foodName) {
  clearBaikeExtras();

  const food = foodDatabase[foodName];
  if (!food) return;

  const nst = document.getElementById('nutritionSectionTitle');
  if (nst) nst.textContent = '营养价值';

  document.getElementById('foodDetail').style.display = 'block';
  document.getElementById('foodName').textContent = foodName;
  document.getElementById('foodCategory').textContent = food.category || '未分类';

  const aliasesRow = document.getElementById('foodAliasesRow');
  if (aliasesRow) {
    const als = Array.isArray(food.aliases) ? food.aliases.filter((a) => a && a !== foodName) : [];
    if (als.length > 0) {
      aliasesRow.style.display = 'block';
      aliasesRow.innerHTML =
        '<div style="font-size:13px;color:var(--text-light);">' +
        '<strong>别名</strong>：' +
        als.map((a) => '<span class="badge badge-green">' + escapeHtmlFood(String(a)) + '</span>').join(' ') +
        '</div>';
    } else {
      aliasesRow.style.display = 'none';
      aliasesRow.innerHTML = '';
    }
  }

  const nutritionContainer = document.getElementById('foodNutrition');
  let nutritionHtml = '';
  for (const [key, value] of Object.entries(food.nutrition || {})) {
    nutritionHtml += `<span class="badge badge-green">${escapeHtmlFood(key)}: ${escapeHtmlFood(value)}</span>`;
  }
  nutritionContainer.innerHTML = nutritionHtml;

  document.getElementById('recommendedAge').textContent = food.recommendedAge || '未知';

  const riskElReset = document.getElementById('foodRisk');
  riskElReset.classList.add('tip-card-red');
  riskElReset.style.fontSize = '';

  document.getElementById('recommendedAge').classList.add('badge', 'badge-blue');

  const age = getCurrentAge();
  const recommendationDiv = document.getElementById('ageRecommendation');
  if (age && food.recommendedAge) {
    const recommendedMonths = parseRecommendedAge(food.recommendedAge);
    const tm = typeof age.totalMonths === 'number' ? age.totalMonths : age.years * 12 + age.months;
    const ageLabel = formatAge(age);
    if (tm >= recommendedMonths) {
      recommendationDiv.innerHTML =
        `<div class="alert alert-success">✅ 推荐食用：当前约 ` +
        tm +
        ` 个月（` +
        escapeHtmlFood(ageLabel) +
        `），适合尝试「${escapeHtmlFood(foodName)}」。</div>`;
    } else {
      const waitMonths = recommendedMonths - tm;
      recommendationDiv.innerHTML =
        `<div class="alert alert-warning">⚠️ 暂不建议：` +
        `建议满 ${recommendedMonths} 个月后再尝试（粗略还需约 ${waitMonths} 个月；当前「` +
        escapeHtmlFood(ageLabel) +
        `」）。</div>`;
    }
  } else {
    recommendationDiv.innerHTML = '';
  }

  document.getElementById('foodRisk').textContent = food.risk || '暂无风险信息';

  loadFoodRelations(foodName);
}

async function loadFoodRelations(foodName) {
  let relations = [];
  try {
    const response = await fetch('data/food-relations.json');
    relations = await response.json();
  } catch (e) {
    console.error('加载关系数据失败:', e);
  }

  relations = mergeFoodRelations(relations, Storage.getUserModifiedRelations());

  const relatedRelations = relations.filter((r) => r.food1 === foodName || r.food2 === foodName);

  const container = document.getElementById('foodRelations');

  if (relatedRelations.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><div>暂无相生相克记录</div></div>';
    return;
  }

  let html = '';
  const boostRelations = relatedRelations.filter((r) => r.type === 'boost');
  const conflictRelations = relatedRelations.filter((r) => r.type === 'conflict');

  const f1 = escapeAttrSingle(foodName);

  if (boostRelations.length > 0) {
    html += '<div style="font-size: 14px; color: var(--green); margin-bottom: 8px;">✅ 相生组合：</div>';
    boostRelations.forEach((r) => {
      const otherFood = r.food1 === foodName ? r.food2 : r.food1;
      const f2 = escapeAttrSingle(otherFood);
      html += `<div class="tip-card tip-card-green" style="margin-bottom: 8px;">
        <div style="font-weight: bold;">${escapeHtmlFood(otherFood)}</div>
        <div style="font-size: 14px;">${escapeHtmlFood(r.effect)}</div>
        <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
          <button class="btn btn-small btn-gray" onclick="editRelation('${f1}', '${f2}', 'boost', '${escapeAttrSingle(
        r.effect
      )}')">编辑</button>
        </div>
      </div>`;
    });
  }

  if (conflictRelations.length > 0) {
    html += '<div style="font-size: 14px; color: var(--red); margin: 12px 0 8px 0;">⚠️ 相克组合：</div>';
    conflictRelations.forEach((r) => {
      const otherFood = r.food1 === foodName ? r.food2 : r.food1;
      const f2 = escapeAttrSingle(otherFood);
      html += `<div class="tip-card tip-card-red" style="margin-bottom: 8px;">
        <div style="font-weight: bold;">${escapeHtmlFood(otherFood)}</div>
        <div style="font-size: 14px;">${escapeHtmlFood(r.effect)}</div>
        <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
          <button class="btn btn-small btn-gray" onclick="editRelation('${f1}', '${f2}', 'conflict', '${escapeAttrSingle(
        r.effect
      )}')">编辑</button>
        </div>
      </div>`;
    });
  }

  container.innerHTML = html;
}

function showAddRelationModal() {
  document.getElementById('addRelationModal').classList.add('show');
}

function closeAddRelationModal() {
  document.getElementById('addRelationModal').classList.remove('show');
  document.getElementById('relatedFoodName').value = '';
  document.getElementById('relationEffect').value = '';
}

function editRelation(food1, food2, type, effect) {
  document.getElementById('relatedFoodName').value = food2;
  document.getElementById('relationType').value = type;
  document.getElementById('relationEffect').value = effect;
  document.getElementById('addRelationModal').classList.add('show');
}

function saveRelation() {
  const foodName = document.getElementById('foodName').textContent;
  const relatedFood = document.getElementById('relatedFoodName').value.trim();
  const type = document.getElementById('relationType').value;
  const effect = document.getElementById('relationEffect').value.trim();

  if (!relatedFood) {
    showToast('请输入关联食材名称', 'warning');
    return;
  }

  if (!effect) {
    showToast('请输入效果说明', 'warning');
    return;
  }

  const userModified = Storage.getUserModifiedRelations();

  const existingIndex = userModified.findIndex(
    (r) =>
      (r.food1 === foodName && r.food2 === relatedFood) ||
      (r.food1 === relatedFood && r.food2 === foodName)
  );

  if (existingIndex >= 0) {
    userModified[existingIndex] = {
      food1: foodName,
      food2: relatedFood,
      type: type,
      effect: effect,
      modifiedAt: getTodayStr()
    };
  } else {
    userModified.push({
      food1: foodName,
      food2: relatedFood,
      type: type,
      effect: effect,
      modifiedAt: getTodayStr()
    });
  }

  Storage.saveUserModifiedRelations(userModified);

  loadFoodRelations(foodName);

  closeAddRelationModal();

  showToast('关系已保存', 'success');
}


/* ========= 营养需求筛选 ========= */

const NUTRIENT_OPTIONS = [
  { key: '铁', label: '铁（补血）' },
  { key: '锌', label: '锌（免疫）' },
  { key: '钙', label: '钙（骨骼）' },
  { key: '维生素C', label: '维生素C' },
  { key: '维生素A', label: '维生素A' },
  { key: '维生素D', label: '维生素D' },
  { key: 'DHA', label: 'DHA' },
  { key: '蛋白质', label: '蛋白质' },
  { key: '膳食纤维', label: '膳食纤维' },
  { key: '叶酸', label: '叶酸' },
  { key: '钾', label: '钾' },
  { key: '镁', label: '镁' },
];

function initNutrientChecks() {
  const box = document.getElementById('nutrientChecks');
  if (!box) return;
  box.innerHTML = NUTRIENT_OPTIONS.map((n) =>
    `<label style="display:inline-flex;align-items:center;gap:4px;font-size:14px;background:#f5f5f5;padding:4px 10px;border-radius:16px;cursor:pointer;">
      <input type="checkbox" value="${n.key}" onchange="onNutrientCheck()" />
      ${escapeHtmlFood(n.label)}
    </label>`
  ).join('');
}

function onNutrientCheck() {
  const checked = getCheckedNutrients();
  const panel = document.getElementById('nutrientPanel');
  const btn =
    panel && panel.querySelector
      ? panel.querySelector('.panel-actions .btn-primary')
      : document.querySelector('#nutrientReqBox button.btn-primary');
  if (btn) {
    btn.textContent =
      checked.length > 0 ? `筛选食材（已选 ${checked.length} 项）` : '筛选食材';
  }
}

function getCheckedNutrients() {
  const box = document.getElementById('nutrientChecks');
  if (!box) return [];
  return Array.from(box.querySelectorAll('input[type=checkbox]:checked')).map((el) => el.value);
}

async function applyNutrientFilter() {
  await awaitFoodDatabase();

  const need = getCheckedNutrients();
  const resultDiv = document.getElementById('nutrientResults');
  if (!resultDiv) return;

  if (need.length === 0) {
    resultDiv.innerHTML =
      '<div class="alert alert-warning">请至少选择一种营养素。</div>';
    return;
  }

  // 1) 找出满足所有选中营养素的食材
  const candidates = Object.values(foodDatabase).filter((food) => {
    const nutri = food.nutrition || {};
    return need.every((n) =>
      Object.keys(nutri).some((k) => k.indexOf(n) >= 0)
    );
  });

  if (candidates.length === 0) {
    resultDiv.innerHTML =
      `<div class="alert alert-error">未找到同时富含 ${need.map(escapeHtmlFood).join(' + ')} 的食材。</div>`;
    return;
  }

  // 2) 加载关系，用于排除相克
  fetch('data/food-relations.json')
    .then((r) => r.json())
    .catch(() => [])
    .then((rels) => {
      const userRels = Storage.getUserModifiedRelations();
      const merged = mergeFoodRelations(rels, userRels);

      const conflictMap = {};
      merged.forEach((r) => {
        if (r.type !== 'conflict') return;
        const pair = r.food1 < r.food2 ? r.food1 + '\0' + r.food2 : r.food2 + '\0' + r.food1;
        conflictMap[pair] = (conflictMap[pair] || []).concat(r);
      });

      // 给每个候选食材评分：优先没有相克关系的
      const scored = candidates.map((food) => {
        const others = candidates.filter((o) => o.name !== food.name);
        let conflictCount = 0;
        others.forEach((o) => {
          const pair = food.name < o.name ? food.name + '\0' + o.name : o.name + '\0' + food.name;
          if (conflictMap[pair]) conflictCount++;
        });
        return { food, conflictCount, othersCount: others.length };
      });

      // 按冲突数升序排列
      scored.sort((a, b) => a.conflictCount - b.conflictCount);

      let html = `<div style="margin-bottom:8px;font-weight:bold;">
        推荐食材（同时富含 ${need.map((n) => '<span class="badge badge-green">' + escapeHtmlFood(n) + '</span>').join(' + ')}）：
      </div>`;

      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
      scored.slice(0, 30).forEach((item) => {
        const f = item.food;
        const tip = item.conflictCount > 0
          ? `（与部分推荐食材相克×${item.conflictCount}）`
          : '（与推荐食材均无相克）';
        html += `<div class="tag" style="cursor:pointer;" onclick="showFoodDetail('${escapeAttrSingle(f.name)}')">
          ${escapeHtmlFood(f.name)}
          <span style="font-size:11px;color:var(--text-light);">${tip}</span>
        </div>`;
      });
      html += '</div>';

      if (scored.length > 30) {
        html += `<div style="margin-top:8px;font-size:13px;color:var(--text-light);">仅展示前 30 条，共 ${scored.length} 条。</div>`;
      }

      resultDiv.innerHTML = html;
    });
}

function clearNutrientFilter() {
  const box = document.getElementById('nutrientChecks');
  if (box) {
    box.querySelectorAll('input[type=checkbox]').forEach((el) => { el.checked = false; });
  }
  const resultDiv = document.getElementById('nutrientResults');
  if (resultDiv) resultDiv.innerHTML = '';
  onNutrientCheck();
}

function toggleNutrientPanel() {
  const panel = document.getElementById('nutrientPanel');
  if (!panel) return;
  const opening = !panel.classList.contains('is-open');
  if (opening) {
    panel.classList.add('is-open');
    setTimeout(function () {
      document.addEventListener('click', closePanelOnClickOutside, true);
    }, 0);
  } else {
    panel.classList.remove('is-open');
    document.removeEventListener('click', closePanelOnClickOutside, true);
  }
}

function closePanelOnClickOutside(e) {
  const panel = document.getElementById('nutrientPanel');
  if (!panel || !panel.classList.contains('is-open')) return;
  const btn = e.target.closest('.nutrient-filter-btn');
  if (!panel.contains(e.target) && !btn) {
    panel.classList.remove('is-open');
    document.removeEventListener('click', closePanelOnClickOutside, true);
  }
}
