/**
 * schedule.js - 辅食时间表：按宝宝总月龄（localStorage）高亮当前阶段
 */

var scheduleData = [
  {
    title: '0-6个月',
    minM: 0,
    maxM: 5,
    description: '纯母乳或配方奶喂养',
    foods: ['母乳', '配方奶'],
    note: '不建议添加任何辅食'
  },
  {
    title: '6-8个月',
    minM: 6,
    maxM: 7,
    description: '初期辅食，单一食材尝试',
    foods: ['高铁米粉', '南瓜泥', '胡萝卜泥', '苹果泥', '香蕉泥', '西兰花泥'],
    note: '每次只添加一种新食材，观察3-5天'
  },
  {
    title: '8-10个月',
    minM: 8,
    maxM: 9,
    description: '软烂食物，增加蛋白质',
    foods: ['肉泥', '蛋黄', '豆腐', '软面条', '蔬菜碎', '水果粒', '三文鱼泥'],
    note: '可以尝试手指食物，锻炼抓握能力'
  },
  {
    title: '10-12个月',
    minM: 10,
    maxM: 11,
    description: '小块状食物，自主进食',
    foods: ['碎状食物', '小块水果', '肉丸', '蒸蛋', '软饭', '小饺子'],
    note: '鼓励自主进食，准备适合抓握的食物'
  },
  {
    title: '12个月+',
    minM: 12,
    maxM: 999,
    description: '接近成人食物，注意调味',
    foods: ['接近成人食物', '少油少盐', '多样化饮食', '牛奶', '酸奶', '奶酪'],
    note: '1岁后可以减少奶量，增加辅食比例'
  }
];

function matchesStage(tm, stage) {
  return tm >= stage.minM && tm <= stage.maxM;
}

document.addEventListener('DOMContentLoaded', function () {
  var age = getCurrentAge();
  if (!age && typeof refreshBabyAgeCache === 'function') refreshBabyAgeCache();
  age = getCurrentAge();
  if (!age) {
    document.getElementById('ageInfo').innerHTML =
      '<div class="alert alert-warning">无法读取宝宝年龄缓存，请先打开首页。</div>';
    return;
  }
  var tm = typeof age.totalMonths === 'number' ? age.totalMonths : age.years * 12 + age.months;
  document.getElementById('ageInfo').innerHTML =
    '当前宝宝年龄：<strong>' + formatAge(age) + '</strong>（约 ' + tm + ' 个月）';
  renderSchedule(tm);
});

function renderSchedule(totalMonths) {
  var container = document.getElementById('scheduleContent');
  var html = '';
  scheduleData.forEach(function (item) {
    var cur = matchesStage(totalMonths, item);
    html +=
      '<div class="list-item" style="flex-direction:column;align-items:flex-start;margin-bottom:12px;' +
      (cur ? 'border-left:4px solid var(--primary);' : '') +
      '">';
    html +=
      '<div style="font-size:16px;font-weight:bold;margin-bottom:8px;">' +
      item.title +
      (cur ? ' ← 当前' : '') +
      '</div>';
    html +=
      '<div style="color:var(--text-light);font-size:14px;margin-bottom:8px;">' +
      item.description +
      '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
    item.foods.forEach(function (food) {
      html += '<span class="tag">' + food + '</span>';
    });
    html += '</div>';
    html += '<div style="font-size:13px;color:var(--primary);">' + item.note + '</div>';
    html += '</div>';
  });
  container.innerHTML = html;
}
