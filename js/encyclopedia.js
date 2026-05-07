/**
 * encyclopedia.js - 食材百科
 */

function escapeHtmlFood(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

// 食材数据库
let foodDatabase = {};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async function() {
  await loadFoodDatabase();
});

// 加载食材数据库
async function loadFoodDatabase() {
  try {
    const response = await fetch('data/food-nutrition.json');
    foodDatabase = await response.json();
  } catch (e) {
    console.error('加载食材数据失败:', e);
    showToast('加载食材数据失败', 'error');
  }
}

// 搜索食材
function searchFood() {
  const keyword = document.getElementById('searchInput').value.trim();
  
  if (!keyword) {
    document.getElementById('foodDetail').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('emptyState').style.display = 'block';
    return;
  }
  
  // 搜索匹配的食材
  const matches = Object.values(foodDatabase).filter(food => 
    food.name.includes(keyword)
  );
  
  if (matches.length === 0) {
    document.getElementById('foodDetail').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '<div class="empty-state"><div class="icon">😔</div><div>未找到相关食材</div></div>';
    document.getElementById('emptyState').style.display = 'none';
    return;
  }
  
  // 显示第一个匹配结果
  showFoodDetail(matches[0].name);
  
  // 显示其他匹配结果
  if (matches.length > 1) {
    let html = '<div style="font-weight: bold; margin: 16px 0 8px 0; font-size: 14px; color: var(--text-light);">其他匹配结果：</div>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    matches.slice(1).forEach(food => {
      html += `<div class="tag" style="cursor: pointer;" onclick="showFoodDetail('${food.name}')">${food.name}</div>`;
    });
    html += '</div>';
    document.getElementById('searchResults').innerHTML = html;
  } else {
    document.getElementById('searchResults').innerHTML = '';
  }
  
  document.getElementById('emptyState').style.display = 'none';
}

// 显示食材详情
function showFoodDetail(foodName) {
  const food = foodDatabase[foodName];
  if (!food) return;
  
  document.getElementById('foodDetail').style.display = 'block';
  document.getElementById('foodName').textContent = foodName;
  document.getElementById('foodCategory').textContent = food.category || '未分类';
  
  // 营养价值
  const nutritionContainer = document.getElementById('foodNutrition');
  let nutritionHtml = '';
  for (const [key, value] of Object.entries(food.nutrition || {})) {
    nutritionHtml += `<span class="badge badge-green">${key}: ${value}</span>`;
  }
  nutritionContainer.innerHTML = nutritionHtml;
  
  // 建议添加月龄
  document.getElementById('recommendedAge').textContent = food.recommendedAge || '未知';
  
  // 当前年龄推荐提示
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
        ageLabel +
        `），适合尝试「${escapeHtmlFood(foodName)}」。</div>`;
    } else {
      const waitMonths = recommendedMonths - tm;
      recommendationDiv.innerHTML =
        `<div class="alert alert-warning">⚠️ 暂不建议：` +
        `建议满 ${recommendedMonths} 个月后再尝试（粗略还需约 ${waitMonths} 个月；当前「` +
        ageLabel +
        `」）。</div>`;
    }
  } else {
    recommendationDiv.innerHTML = '';
  }
  
  // 风险提示
  document.getElementById('foodRisk').textContent = food.risk || '暂无风险信息';
  
  // 相生相克关系
  loadFoodRelations(foodName);
}

// 加载食材关系
async function loadFoodRelations(foodName) {
  // 内置 + 用户在百科保存的关系（用户对同一配对覆盖内置）
  let relations = [];
  try {
    const response = await fetch('data/food-relations.json');
    relations = await response.json();
  } catch (e) {
    console.error('加载关系数据失败:', e);
  }

  relations = mergeFoodRelations(relations, Storage.getUserModifiedRelations());
  
  // 筛选与当前食材相关的关系
  const relatedRelations = relations.filter(r => 
    r.food1 === foodName || r.food2 === foodName
  );
  
  const container = document.getElementById('foodRelations');
  
  if (relatedRelations.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><div>暂无相生相克记录</div></div>';
    return;
  }
  
  let html = '';
  const boostRelations = relatedRelations.filter(r => r.type === 'boost');
  const conflictRelations = relatedRelations.filter(r => r.type === 'conflict');
  
  if (boostRelations.length > 0) {
    html += '<div style="font-size: 14px; color: var(--green); margin-bottom: 8px;">✅ 相生组合：</div>';
    boostRelations.forEach(r => {
      const otherFood = r.food1 === foodName ? r.food2 : r.food1;
      html += `<div class="tip-card tip-card-green" style="margin-bottom: 8px;">
        <div style="font-weight: bold;">${otherFood}</div>
        <div style="font-size: 14px;">${r.effect}</div>
        <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
          <button class="btn btn-small btn-gray" onclick="editRelation('${foodName}', '${otherFood}', 'boost', '${r.effect}')">编辑</button>
        </div>
      </div>`;
    });
  }
  
  if (conflictRelations.length > 0) {
    html += '<div style="font-size: 14px; color: var(--red); margin: 12px 0 8px 0;">⚠️ 相克组合：</div>';
    conflictRelations.forEach(r => {
      const otherFood = r.food1 === foodName ? r.food2 : r.food1;
      html += `<div class="tip-card tip-card-red" style="margin-bottom: 8px;">
        <div style="font-weight: bold;">${otherFood}</div>
        <div style="font-size: 14px;">${r.effect}</div>
        <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
          <button class="btn btn-small btn-gray" onclick="editRelation('${foodName}', '${otherFood}', 'conflict', '${r.effect}')">编辑</button>
        </div>
      </div>`;
    });
  }
  
  container.innerHTML = html;
}

// 显示添加关系模态框
function showAddRelationModal() {
  document.getElementById('addRelationModal').classList.add('show');
}

// 关闭添加关系模态框
function closeAddRelationModal() {
  document.getElementById('addRelationModal').classList.remove('show');
  document.getElementById('relatedFoodName').value = '';
  document.getElementById('relationEffect').value = '';
}

// 编辑关系
function editRelation(food1, food2, type, effect) {
  document.getElementById('relatedFoodName').value = food2;
  document.getElementById('relationType').value = type;
  document.getElementById('relationEffect').value = effect;
  document.getElementById('addRelationModal').classList.add('show');
}

// 保存关系
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
  
  // 保存到用户修改的关系
  const userModified = Storage.getUserModifiedRelations();
  
  // 检查是否已存在
  const existingIndex = userModified.findIndex(r => 
    (r.food1 === foodName && r.food2 === relatedFood) ||
    (r.food1 === relatedFood && r.food2 === foodName)
  );
  
  if (existingIndex >= 0) {
    // 更新现有关系
    userModified[existingIndex] = {
      food1: foodName,
      food2: relatedFood,
      type: type,
      effect: effect,
      modifiedAt: getTodayStr()
    };
  } else {
    // 添加新关系
    userModified.push({
      food1: foodName,
      food2: relatedFood,
      type: type,
      effect: effect,
      modifiedAt: getTodayStr()
    });
  }
  
  Storage.saveUserModifiedRelations(userModified);
  
  // 重新加载关系
  loadFoodRelations(foodName);
  
  // 关闭模态框
  closeAddRelationModal();
  
  showToast('关系已保存', 'success');
}
