/**
 * growth.js - 成长记录页逻辑
 * 处理身高体重记录、历史展示等功能
 */

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  // 设置默认日期为今天
  document.getElementById('recordDate').value = getTodayStr();
  
  // 显示当前年龄
  const age = getCurrentAge();
  if (age) {
    const ageStr = formatAge(age);
    document.getElementById('ageInfo').innerHTML = `当前宝宝年龄：<strong>${ageStr}</strong>（${age.totalMonths}个月）`;
  } else {
    document.getElementById('ageInfo').innerHTML = '<div class="alert alert-warning">请先从首页进入</div>';
  }
  
  // 加载历史记录
  loadRecords();
});

// 添加记录
function addRecord() {
  const date = document.getElementById('recordDate').value;
  const height = document.getElementById('height').value;
  const weight = document.getElementById('weight').value;
  const headCircumference = document.getElementById('headCircumference').value;
  
  if (!date) {
    showToast('请选择日期', 'warning');
    return;
  }
  
  if (!height && !weight) {
    showToast('请至少输入身高或体重', 'warning');
    return;
  }
  
  const record = {
    date: date,
    height: height ? parseFloat(height) : null,
    weight: weight ? parseFloat(weight) : null,
    headCircumference: headCircumference ? parseFloat(headCircumference) : null
  };
  
  const records = Storage.getGrowthRecords();
  
  // 检查是否已存在该日期的记录
  const existingIndex = records.findIndex(r => r.date === date);
  if (existingIndex >= 0) {
    // 更新现有记录
    records[existingIndex] = record;
    showToast('记录已更新', 'info');
  } else {
    // 添加新记录
    records.push(record);
    showToast('记录已保存', 'success');
  }
  
  // 按日期排序
  records.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // 保存
  Storage.saveGrowthRecords(records);
  
  // 重新加载
  loadRecords();
  
  // 清空表单（保留日期）
  document.getElementById('height').value = '';
  document.getElementById('weight').value = '';
  document.getElementById('headCircumference').value = '';
}

// 加载历史记录
function loadRecords() {
  const records = Storage.getGrowthRecords();
  const container = document.getElementById('recordList');
  
  if (records.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📊</div><div>暂无记录</div></div>';
    return;
  }
  
  let html = '';
  records.forEach((record, index) => {
    html += `
      <div class="history-item">
        <div class="history-date">${formatDate(record.date)}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
          ${record.height ? `<div><strong>身高：</strong>${record.height} cm</div>` : ''}
          ${record.weight ? `<div><strong>体重：</strong>${record.weight} kg</div>` : ''}
          ${record.headCircumference ? `<div><strong>头围：</strong>${record.headCircumference} cm</div>` : ''}
        </div>
        <div style="text-align: right;">
          <button class="btn btn-small btn-gray" onclick="deleteRecord(${index})">删除</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// 删除记录
function deleteRecord(index) {
  if (!confirm('确定要删除这条记录吗？')) {
    return;
  }
  
  const records = Storage.getGrowthRecords();
  records.splice(index, 1);
  Storage.saveGrowthRecords(records);
  
  loadRecords();
  showToast('记录已删除', 'info');
}
