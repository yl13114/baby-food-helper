/**
 * meal-planner.js - 辅食计划页
 * - 推荐：按宝宝总月龄 + nutrition 数据过滤；排除排敏已吃过的
 * - 检测：本地 JSON + 用户在百科中保存的关系（后者覆盖前者）
 * - 可选：联网 API（受 CORS 限制，仅 https 部署时可能成功）
 */

let currentFoods = [];
/** @type {Record<string, unknown>|null} */
let nutritionDb = null;

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('planDate').value = getTodayStr();
  loadNutritionDb()
    .catch(function () {})
    .then(function () {
      loadPlan();
      loadHistory();
    });
});

function loadNutritionDb() {
  return fetch('data/food-nutrition.json')
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      nutritionDb = data;
    });
}

/** 是否在「已满建议月龄」下向宝宝推荐尝试该固体食材（总月龄过小则不出现） */
function isFoodEligibleForRecommendation(foodName, totalMonths) {
  if (totalMonths < 6) return false;
  if (!nutritionDb || !nutritionDb[foodName]) return totalMonths >= 6;
  var minMonths = parseRecommendedAge(nutritionDb[foodName].recommendedAge);
  return totalMonths >= minMonths;
}

function collectTriedFoodNames(allergyData) {
  var names = [];
  Object.keys(allergyData).forEach(function (cat) {
    if (!Array.isArray(allergyData[cat])) return;
    allergyData[cat].forEach(function (f) {
      if (f.status === 'organic' || f.status === 'normal') names.push(f.name);
    });
  });
  return names;
}

/** 可选：尽力拉取第三方搭配信息（浏览器 CORS 可能拦截，失败忽略） */
function tryFetchPairsFromApi(_foods) {
  return Promise.resolve(null);
}

// 添加食材 …
function addFood() {
  var input = document.getElementById('foodInput');
  var foodName = input.value.trim();
  if (!foodName) {
    showToast('请输入食材名称', 'warning');
    return;
  }
  if (currentFoods.includes(foodName)) {
    showToast('该食材已添加', 'warning');
    return;
  }
  currentFoods.push(foodName);
  input.value = '';
  renderAddedFoods();
}

function removeFood(index) {
  currentFoods.splice(index, 1);
  renderAddedFoods();
}

function renderAddedFoods() {
  var container = document.getElementById('addedFoods');
  if (currentFoods.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🍽️</div><div>暂未添加食材</div></div>';
    return;
  }
  var html =
    '<div style="font-weight:bold;margin-bottom:8px;">已添加食材：</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
  currentFoods.forEach(function (food, index) {
    html +=
      '<div style="background:#E3F2FD;padding:6px 12px;border-radius:16px;display:flex;align-items:center;gap:6px;font-size:14px;">' +
      '<span>' +
      escapeHtml(food) +
      '</span>' +
      '<span style="cursor:pointer;color:#F44336;font-weight:bold;" onclick="removeFood(' +
      index +
      ')">×</span></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function showRecommendedFoods() {
  var age = getCurrentAge();
  if (!age) {
    showToast('请先从首页进入一次并保存年龄数据', 'warning');
    return;
  }
  var tm = typeof age.totalMonths === 'number' ? age.totalMonths : age.years * 12 + age.months;
  var allergyData = Storage.getAllergyTracking();
  var tried = collectTriedFoodNames(allergyData);

  var allFoods = {
    vegetables: [
      '西兰花',
      '胡萝卜',
      '南瓜',
      '菠菜',
      '土豆',
      '红薯',
      '紫薯',
      '冬瓜',
      '丝瓜',
      '茄子',
      '生菜',
      '番茄'
    ],
    fruits: [
      '苹果',
      '香蕉',
      '梨',
      '橙子',
      '猕猴桃',
      '草莓',
      '蓝莓',
      '西瓜',
      '芒果',
      '桃子',
      '牛油果',
      '火龙果'
    ],
    meats: ['鸡肉', '猪肉', '牛肉', '羊肉', '三文鱼', '鳕鱼', '虾', '猪肝', '鸭肉', '银鳕鱼']
  };

  function pick(cat, limit) {
    return allFoods[cat].filter(function (name) {
      if (tried.indexOf(name) >= 0) return false;
      return isFoodEligibleForRecommendation(name, tm);
    }).slice(0, limit);
  }

  var veg = pick('vegetables', 5);
  var fruit = pick('fruits', 5);
  var meat = pick('meats', 5);
  var total = veg.length + fruit.length + meat.length;

  var head =
    '<p style="font-size:13px;color:var(--text-light);margin-bottom:8px;">已按宝宝约 <strong>' +
    tm +
    '</strong> 个月、并排除已在排敏中标为「已吃」的食材；若月龄不足则列表会偏少。</p>';

  function tags(list) {
    if (!list.length) return '<span style="color:var(--text-light);font-size:13px;">暂无可选项</span>';
    return list
      .map(function (food) {
        return (
          '<div class="tag tag-green reco-pick" style="cursor:pointer;" data-food="' +
          encodeURIComponent(food) +
          '">' +
          escapeHtml(food) +
          ' +</div>'
        );
      })
      .join('');
  }

  var html =
    head +
    '<p style="font-size:13px;color:var(--text-light);margin:8px 0;">本轮共推荐 ' +
    total +
    ' / 15 项</p>';
  html +=
    '<div style="font-size:13px;color:var(--text-light);margin:8px 0;">🥦 蔬菜类</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
    tags(veg) +
    '</div>';
  html +=
    '<div style="font-size:13px;color:var(--text-light);margin:8px 0;">🍎 水果类</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
    tags(fruit) +
    '</div>';
  html +=
    '<div style="font-size:13px;color:var(--text-light);margin:8px 0;">🍗 肉类</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
    tags(meat) +
    '</div>';

  document.getElementById('recommendedFoods').innerHTML = html;
  document.getElementById('recommendedArea').style.display = 'block';
  document.getElementById('recommendedFoods').querySelectorAll('.reco-pick').forEach(function (el) {
    el.addEventListener('click', function () {
      addRecommendedFood(decodeURIComponent(el.getAttribute('data-food') || ''));
    });
  });
}

function addRecommendedFood(foodName) {
  if (currentFoods.includes(foodName)) {
    showToast('该食材已添加', 'warning');
    return;
  }
  currentFoods.push(foodName);
  renderAddedFoods();
  showToast('已添加：' + foodName, 'success');
}

async function checkFoods() {
  if (currentFoods.length < 2) {
    showToast('请至少添加2种食材', 'warning');
    return;
  }
  var resultContainer = document.getElementById('checkResult');
  resultContainer.innerHTML = '<div style="text-align:center;padding:20px;">检测中...</div>';

  await tryFetchPairsFromApi(currentFoods);

  var relations = [];
  try {
    var response = await fetch('data/food-relations.json');
    relations = await response.json();
  } catch (e) {
    console.error(e);
  }
  var merged = mergeFoodRelations(relations, Storage.getUserModifiedRelations());

  var conflicts = [];
  var boosts = [];
  for (var i = 0; i < currentFoods.length; i++) {
    for (var j = i + 1; j < currentFoods.length; j++) {
      var food1 = currentFoods[i];
      var food2 = currentFoods[j];
      var relation = merged.find(function (r) {
        return (
          (r.food1 === food1 && r.food2 === food2) || (r.food1 === food2 && r.food2 === food1)
        );
      });
      if (!relation) continue;
      if (relation.type === 'conflict') conflicts.push({ food1: food1, food2: food2, effect: relation.effect });
      else if (relation.type === 'boost') boosts.push({ food1: food1, food2: food2, effect: relation.effect });
    }
  }

  var html = '';
  if (conflicts.length > 0) {
    html +=
      '<div class="alert alert-error"><div style="font-weight:bold;margin-bottom:8px;">⚠️ 相克：</div>';
    conflicts.forEach(function (c) {
      html +=
        '<div style="margin-bottom:6px;">' +
        escapeHtml(c.food1) +
        ' + ' +
        escapeHtml(c.food2) +
        '：' +
        escapeHtml(c.effect) +
        '</div>';
    });
    html += '</div>';
  }
  if (boosts.length > 0) {
    html +=
      '<div class="alert alert-success"><div style="font-weight:bold;margin-bottom:8px;">✅ 相生 / 有助搭配：</div>';
    boosts.forEach(function (b) {
      html +=
        '<div style="margin-bottom:6px;">' +
        escapeHtml(b.food1) +
        ' + ' +
        escapeHtml(b.food2) +
        '：' +
        escapeHtml(b.effect) +
        '</div>';
    });
    html += '</div>';
  }
  if (conflicts.length === 0 && boosts.length === 0) {
    html =
      '<div class="alert alert-info">当前组合暂无本地/您已录入的相生相克记录。可在食材百科中添加对应关系后在「辅食计划」中再次检测。</div>';
  }
  resultContainer.innerHTML = html;
}

function savePlan() {
  if (currentFoods.length === 0) {
    showToast('请先添加食材', 'warning');
    return;
  }
  var date = document.getElementById('planDate').value;
  var resultHTML = document.getElementById('checkResult').innerHTML;
  Storage.saveMealPlan(date, {
    date: date,
    foods: currentFoods.slice(),
    checkResult: resultHTML
  });
  showToast('计划已保存', 'success');
  loadHistory();
}

function loadPlan() {
  var date = document.getElementById('planDate').value;
  var plan = Storage.getMealPlan(date);
  var resultEl = document.getElementById('checkResult');

  if (plan && plan.foods) {
    currentFoods = plan.foods.slice();
    renderAddedFoods();
    if (plan.checkResult) resultEl.innerHTML = plan.checkResult;
    else resultEl.innerHTML = '';
  } else {
    currentFoods = [];
    renderAddedFoods();
    resultEl.innerHTML = '';
  }
}

function loadHistory() {
  var plans = Storage.getMealPlans();
  var container = document.getElementById('historyList');
  var dates = Object.keys(plans)
    .sort()
    .reverse()
    .slice(0, 5);
  if (dates.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><div>暂无历史记录</div></div>';
    return;
  }
  container.innerHTML = dates
    .map(function (date) {
      var plan = plans[date];
      return (
        '<div class="history-item" onclick="loadHistoryPlan(\'' +
        date +
        '\')"><div class="history-date">' +
        formatDate(date) +
        '</div><div class="history-foods">' +
        plan.foods
          .map(function (f) {
            return '<span class="tag">' + escapeHtml(f) + '</span>';
          })
          .join('') +
        '</div></div>'
      );
    })
    .join('');
}

function loadHistoryPlan(date) {
  document.getElementById('planDate').value = date;
  loadPlan();
}
