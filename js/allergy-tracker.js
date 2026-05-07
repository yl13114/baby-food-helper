/**
 * allergy-tracker.js - 排敏进度页逻辑
 * 处理四态切换、统计、添加新食材等功能
 */

// 食材状态枚举
const FoodStatus = {
  NONE: 'none',        // 未吃过（灰色）
  ORGANIC: 'organic',  // 有机已吃（绿色）
  NORMAL: 'normal',    // 普通已吃（蓝色）
  PLANNED: 'planned'   // 计划添加（橙色）
};

// 状态循环顺序
const statusOrder = [FoodStatus.NONE, FoodStatus.ORGANIC, FoodStatus.NORMAL, FoodStatus.PLANNED];

// 状态显示配置
const statusConfig = {
  [FoodStatus.NONE]: { label: '', color: 'gray', className: 'none' },
  [FoodStatus.ORGANIC]: { label: '✓有机', color: 'green', className: 'organic' },
  [FoodStatus.NORMAL]: { label: '✓普通', color: 'blue', className: 'normal' },
  [FoodStatus.PLANNED]: { label: '+计划', color: 'orange', className: 'planned' }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  loadAndRenderFoods();
  updateStatistics();
});

// 加载并渲染所有食材
function loadAndRenderFoods() {
  const data = Storage.getAllergyTracking();
  const container = document.getElementById('foodCategories');
  
  const categoryNames = {
    vegetables: '🥦 蔬菜类',
    fruits: '🍎 水果类',
    meats: '🍗 肉类',
    grains: '🌾 谷物类',
    dairy: '🥚 蛋奶类',
    beans: '🫘 豆类',
    nuts: '🥜 坚果类',
    customFoods: '✨ 自定义食材'
  };
  
  let html = '';
  
  // 渲染预设分类
  for (const [key, name] of Object.entries(categoryNames)) {
    if (key === 'customFoods') continue; // 自定义放最后
    if (!data[key] || data[key].length === 0) continue;
    
    html += `<div class="category-title">${name}</div>`;
    html += '<div class="food-grid">';
    
    data[key].forEach((food, index) => {
      html += renderFoodButton(food, key, index);
    });
    
    html += '</div>';
  }
  
  // 渲染自定义食材
  if (data.customFoods && data.customFoods.length > 0) {
    html += `<div class="category-title">${categoryNames.customFoods}</div>`;
    html += '<div class="food-grid">';
    
    data.customFoods.forEach((food, index) => {
      html += renderFoodButton(food, 'customFoods', index);
    });
    
    html += '</div>';
  }
  
  container.innerHTML = html;
}

// 渲染单个食材按钮
function renderFoodButton(food, category, index) {
  const config = statusConfig[food.status] || statusConfig[FoodStatus.NONE];
  return `
    <button class="food-btn ${config.className}" onclick="toggleFoodStatus('${category}', ${index}, '${food.name}')">
      <div>${food.name}</div>
      <div style="font-size: 12px; margin-top: 4px;">${config.label}</div>
    </button>
  `;
}

// 切换食材状态
function toggleFoodStatus(category, index, foodName) {
  const data = Storage.getAllergyTracking();
  const food = data[category][index];
  
  // 找到当前状态在循环中的位置
  const currentIndex = statusOrder.indexOf(food.status || FoodStatus.NONE);
  const nextIndex = (currentIndex + 1) % statusOrder.length;
  const newStatus = statusOrder[nextIndex];
  
  // 更新状态
  food.status = newStatus;
  food.date = (newStatus === FoodStatus.ORGANIC || newStatus === FoodStatus.NORMAL) ? getTodayStr() : null;
  
  // 保存
  Storage.saveAllergyTracking(data);
  
  // 重新渲染
  loadAndRenderFoods();
  updateStatistics();
  
  // 提示
  const statusLabels = {
    [FoodStatus.NONE]: '未吃过',
    [FoodStatus.ORGANIC]: '有机已吃',
    [FoodStatus.NORMAL]: '普通已吃',
    [FoodStatus.PLANNED]: '计划添加'
  };
  showToast(`${foodName} 标记为：${statusLabels[newStatus]}`, 'info');
}

// 更新统计信息
function updateStatistics() {
  const data = Storage.getAllergyTracking();
  let organicCount = 0, normalCount = 0, noneCount = 0, plannedCount = 0;
  let totalCount = 0;
  
  // 统计所有分类
  for (const key of Object.keys(data)) {
    if (key === 'customFoods') continue;
    data[key].forEach(food => {
      totalCount++;
      switch(food.status) {
        case FoodStatus.ORGANIC: organicCount++; break;
        case FoodStatus.NORMAL: normalCount++; break;
        case FoodStatus.PLANNED: plannedCount++; break;
        default: noneCount++;
      }
    });
  }
  
  // 统计自定义食材
  if (data.customFoods) {
    data.customFoods.forEach(food => {
      totalCount++;
      switch(food.status) {
        case FoodStatus.ORGANIC: organicCount++; break;
        case FoodStatus.NORMAL: normalCount++; break;
        case FoodStatus.PLANNED: plannedCount++; break;
        default: noneCount++;
      }
    });
  }
  
  // 更新显示
  document.getElementById('organicCount').textContent = organicCount;
  document.getElementById('normalCount').textContent = normalCount;
  document.getElementById('noneCount').textContent = noneCount;
  document.getElementById('plannedCount').textContent = plannedCount;
  
  // 更新进度条
  const triedCount = organicCount + normalCount;
  const progress = totalCount > 0 ? Math.round((triedCount / totalCount) * 100) : 0;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent = `${triedCount} / ${totalCount} 种食材`;
}

// 显示添加食材模态框
function showAddFoodModal() {
  document.getElementById('addFoodModal').classList.add('show');
}

// 关闭添加食材模态框
function closeAddFoodModal() {
  document.getElementById('addFoodModal').classList.remove('show');
  document.getElementById('newFoodName').value = '';
}

// 添加新食材
function addNewFood() {
  const name = document.getElementById('newFoodName').value.trim();
  const category = document.getElementById('newFoodCategory').value;
  
  if (!name) {
    showToast('请输入食材名称', 'warning');
    return;
  }
  
  const data = Storage.getAllergyTracking();
  
  // 检查是否已存在
  const allFoods = getAllFoods(data);
  if (allFoods.includes(name)) {
    showToast('该食材已存在', 'warning');
    return;
  }
  
  // 添加到自定义列表
  if (!data.customFoods) {
    data.customFoods = [];
  }
  
  data.customFoods.push({
    name: name,
    status: FoodStatus.NONE,
    date: null,
    category: document.getElementById('newFoodCategory').options[document.getElementById('newFoodCategory').selectedIndex].text,
    isCustom: true
  });
  
  // 保存
  Storage.saveAllergyTracking(data);
  
  // 重新渲染
  loadAndRenderFoods();
  updateStatistics();
  
  // 关闭模态框
  closeAddFoodModal();
  
  showToast(`已添加食材：${name}`, 'success');
}

// 获取所有食材名称
function getAllFoods(data) {
  const foods = [];
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      data[key].forEach(food => foods.push(food.name));
    }
  }
  return foods;
}

// 切换提示框显示
function toggleTooltip() {
  const tooltip = document.getElementById('tooltip');
  tooltip.classList.toggle('show');
}
