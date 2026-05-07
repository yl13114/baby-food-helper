/**
 * app.js - 公共工具函数
 *
 * calculateExactAge：按「历法」计算周岁，考虑每月天数与闰年；
 * （出生日若为 29 号而当前月不足 29 天，JS 会自动进位到翌日，与一般生日计算器一致）
 */
function calculateExactAge(birthDateStr, currentDateStr) {
  var birth = new Date(birthDateStr + 'T12:00:00');
  var current = new Date(currentDateStr + 'T12:00:00');

  var years = current.getFullYear() - birth.getFullYear();
  var months = current.getMonth() - birth.getMonth();
  var days = current.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    var prevMonthLast = new Date(current.getFullYear(), current.getMonth(), 0);
    days += prevMonthLast.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: years,
    months: months,
    days: days
  };
}

/**
 * 格式化「X岁X个月X天」；满周岁当天显示「1岁0个月0天」
 */
function formatAge(age) {
  var y = age.years || 0;
  var m = age.months || 0;
  var d = age.days || 0;
  return y + '岁' + m + '个月' + d + '天';
}

/**
 * 「今天」的本地日历日期字符串 YYYY-MM-DD（勿用 toISOString，否则会受 UTC 影响）
 */
function getTodayStr() {
  var t = new Date();
  var y = t.getFullYear();
  var mo = String(t.getMonth() + 1).padStart(2, '0');
  var da = String(t.getDate()).padStart(2, '0');
  return y + '-' + mo + '-' + da;
}

function formatDate(dateStr) {
  var d = new Date(dateStr + 'T12:00:00');
  return d.getMonth() + 1 + '月' + d.getDate() + '日';
}

/** 解析如「6个月+」「12个月+」→ 最小月龄整数 */
function parseRecommendedAge(ageStr) {
  var m = String(ageStr || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function showToast(message, type) {
  type = type || 'info';
  var el = document.createElement('div');
  el.className = 'alert alert-' + type;
  el.textContent = message;
  el.style.cssText =
    'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2000;min-width:200px;text-align:center;';
  document.body.appendChild(el);
  setTimeout(function () {
    el.remove();
  }, 3000);
}

/** 固定出生日期（需求：2025-05-08） */
var BABY_BIRTH_DATE = '2025-05-08';

/**
 * 写入 localStorage 的当前年龄快照；所有子页依赖此结果。
 */
function refreshBabyAgeCache() {
  var today = getTodayStr();
  var age = calculateExactAge(BABY_BIRTH_DATE, today);
  var blob = {
    years: age.years,
    months: age.months,
    days: age.days,
    totalMonths: age.years * 12 + age.months,
    birthDate: BABY_BIRTH_DATE
  };
  localStorage.setItem('currentAge', JSON.stringify(blob));
  return blob;
}

function getCurrentAge() {
  var s = localStorage.getItem('currentAge');
  return s ? JSON.parse(s) : null;
}

/**
 * DOM 就绪后刷新年龄缓存，并在首页回填展示（若存在 DOM 结点）
 */
function initBabyAgeOnPage() {
  var blob = refreshBabyAgeCache();
  var display = document.getElementById('ageDisplay');
  var dateDisplay = document.getElementById('dateDisplay');
  if (display) display.textContent = formatAge(blob);
  if (dateDisplay) {
    var t = getTodayStr();
    var wd = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    var d = new Date(t + 'T12:00:00');
    dateDisplay.textContent = d.getMonth() + 1 + '月' + d.getDate() + '日 ' + wd[d.getDay()];
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initBabyAgeOnPage);
}

/**
 * 合并相生相克条目：用户对同一食材对的修改覆盖内置数据。
 */
function mergeFoodRelations(baseList, userList) {
  var map = {};
  function key(r) {
    var a = r.food1;
    var b = r.food2;
    return a < b ? a + '\0' + b : b + '\0' + a;
  }
  (baseList || []).forEach(function (r) {
    map[key(r)] = { food1: r.food1, food2: r.food2, type: r.type, effect: r.effect };
  });
  (userList || []).forEach(function (r) {
    map[key(r)] = { food1: r.food1, food2: r.food2, type: r.type, effect: r.effect };
  });
  return Object.keys(map).map(function (k) {
    return map[k];
  });
}

/**
 * 食材条目是否命中搜索关键字（本名或别名；单字只匹配本名/别名相等或本名子串）。
 */
function foodMatchesSearchKeyword(entry, keyword) {
  keyword = String(keyword || '').trim();
  if (!keyword) return false;
  if (!entry || typeof entry !== 'object') return false;
  var nm = entry.name != null ? String(entry.name) : '';
  if (nm.indexOf(keyword) >= 0) return true;
  var als = Array.isArray(entry.aliases) ? entry.aliases : [];
  for (var i = 0; i < als.length; i++) {
    var a = String(als[i] || '');
    if (!a) continue;
    if (a === keyword) return true;
    if (keyword.length >= 2) {
      if (a.indexOf(keyword) >= 0) return true;
      if (keyword.indexOf(a) >= 0 && a.length >= 2) return true;
    }
  }
  return false;
}

/**
 * 将输入名归一为离线库里主词条名（搭配检测用）。多义项同时命中则退回原输入。
 */
function resolveFoodCanonicalName(inputName, nutritionDb) {
  var raw = String(inputName || '').trim();
  if (!raw || !nutritionDb || typeof nutritionDb !== 'object') return raw;

  if (nutritionDb[raw]) return raw;

  var exact = [];
  var k;
  for (k in nutritionDb) {
    if (!Object.prototype.hasOwnProperty.call(nutritionDb, k)) continue;
    var e = nutritionDb[k];
    if (!e) continue;
    if (String(e.name != null ? e.name : '') === raw) exact.push(k);
    var als = Array.isArray(e.aliases) ? e.aliases : [];
    for (var i = 0; i < als.length; i++) {
      if (als[i] === raw) exact.push(k);
    }
  }

  exact = exact.filter(function (v, ix, arr) {
    return arr.indexOf(v) === ix;
  });
  if (exact.length === 1) return exact[0];

  if (raw.length >= 2) {
    var nameHits = [];
    for (k in nutritionDb) {
      if (!Object.prototype.hasOwnProperty.call(nutritionDb, k)) continue;
      var en = nutritionDb[k];
      if (!en) continue;
      var n = String(en.name != null ? en.name : k);
      if (n.indexOf(raw) >= 0) nameHits.push(k);
    }
    nameHits = nameHits.filter(function (v, ix, arr) {
      return arr.indexOf(v) === ix;
    });
    if (nameHits.length === 1) return nameHits[0];

    var aliasHits = [];
    for (k in nutritionDb) {
      if (!Object.prototype.hasOwnProperty.call(nutritionDb, k)) continue;
      var e2 = nutritionDb[k];
      if (!e2) continue;
      var als2 = Array.isArray(e2.aliases) ? e2.aliases : [];
      for (var j = 0; j < als2.length; j++) {
        var ax = String(als2[j] || '');
        if (!ax || ax === raw) continue;
        if (ax.indexOf(raw) >= 0 || (raw.indexOf(ax) >= 0 && ax.length >= 2)) {
          aliasHits.push(k);
          break;
        }
      }
    }
    aliasHits = aliasHits.filter(function (v, ix, arr) {
      return arr.indexOf(v) === ix;
    });
    if (aliasHits.length === 1) return aliasHits[0];
  }

  return raw;
}
