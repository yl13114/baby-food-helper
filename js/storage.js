/**
 * storage.js - 数据存储管理
 * 封装 localStorage 操作，提供统一的数据读写接口
 */

const Storage = {
  // 键名常量
  KEYS: {
    BABY_INFO: 'babyInfo',
    CURRENT_AGE: 'currentAge',
    MEAL_PLANS: 'mealPlans',
    FOOD_RELATIONS: 'foodRelations',
    FOOD_NUTRITION: 'foodNutrition',
    ALLERGY_TRACKING: 'allergyTracking',
    USER_MODIFIED_RELATIONS: 'userModifiedRelations',
    GROWTH_RECORDS: 'growthRecords'
  },
  
  // 读取数据
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('读取数据失败:', e);
      return null;
    }
  },
  
  // 保存数据
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('保存数据失败:', e);
      return false;
    }
  },
  
  // 删除数据
  remove(key) {
    localStorage.removeItem(key);
  },
  
  // 获取宝宝信息
  getBabyInfo() {
    return this.get(this.KEYS.BABY_INFO) || { birthDate: '2025-05-08', fixed: true };
  },
  
  // 保存宝宝信息
  saveBabyInfo(info) {
    return this.set(this.KEYS.BABY_INFO, info);
  },
  
  // 获取辅食计划
  getMealPlans() {
    return this.get(this.KEYS.MEAL_PLANS) || {};
  },
  
  // 保存辅食计划
  saveMealPlans(plans) {
    return this.set(this.KEYS.MEAL_PLANS, plans);
  },
  
  // 获取某天的辅食计划
  getMealPlan(date) {
    const plans = this.getMealPlans();
    return plans[date] || null;
  },
  
  // 保存某天的辅食计划
  saveMealPlan(date, plan) {
    const plans = this.getMealPlans();
    plans[date] = plan;
    return this.set(this.KEYS.MEAL_PLANS, plans);
  },
  
  // 获取排敏进度
  getAllergyTracking() {
    const defaultData = {
      vegetables: [
        {name: "西兰花", status: "none", date: null, category: "蔬菜类"},
        {name: "胡萝卜", status: "none", date: null, category: "蔬菜类"},
        {name: "南瓜", status: "none", date: null, category: "蔬菜类"},
        {name: "菠菜", status: "none", date: null, category: "蔬菜类"},
        {name: "土豆", status: "none", date: null, category: "蔬菜类"},
        {name: "红薯", status: "none", date: null, category: "蔬菜类"},
        {name: "紫薯", status: "none", date: null, category: "蔬菜类"},
        {name: "冬瓜", status: "none", date: null, category: "蔬菜类"},
        {name: "丝瓜", status: "none", date: null, category: "蔬菜类"},
        {name: "茄子", status: "none", date: null, category: "蔬菜类"},
        {name: "生菜", status: "none", date: null, category: "蔬菜类"},
        {name: "番茄", status: "none", date: null, category: "蔬菜类"}
      ],
      fruits: [
        {name: "苹果", status: "none", date: null, category: "水果类"},
        {name: "香蕉", status: "none", date: null, category: "水果类"},
        {name: "梨", status: "none", date: null, category: "水果类"},
        {name: "橙子", status: "none", date: null, category: "水果类"},
        {name: "猕猴桃", status: "none", date: null, category: "水果类"},
        {name: "草莓", status: "none", date: null, category: "水果类"},
        {name: "蓝莓", status: "none", date: null, category: "水果类"},
        {name: "西瓜", status: "none", date: null, category: "水果类"},
        {name: "芒果", status: "none", date: null, category: "水果类"},
        {name: "桃子", status: "none", date: null, category: "水果类"},
        {name: "牛油果", status: "none", date: null, category: "水果类"},
        {name: "火龙果", status: "none", date: null, category: "水果类"}
      ],
      meats: [
        {name: "鸡肉", status: "none", date: null, category: "肉类"},
        {name: "猪肉", status: "none", date: null, category: "肉类"},
        {name: "牛肉", status: "none", date: null, category: "肉类"},
        {name: "羊肉", status: "none", date: null, category: "肉类"},
        {name: "三文鱼", status: "none", date: null, category: "肉类"},
        {name: "鳕鱼", status: "none", date: null, category: "肉类"},
        {name: "虾", status: "none", date: null, category: "肉类"},
        {name: "猪肝", status: "none", date: null, category: "肉类"},
        {name: "鸭肉", status: "none", date: null, category: "肉类"},
        {name: "银鳕鱼", status: "none", date: null, category: "肉类"}
      ],
      grains: [
        {name: "大米", status: "none", date: null, category: "谷物类"},
        {name: "小米", status: "none", date: null, category: "谷物类"},
        {name: "燕麦", status: "none", date: null, category: "谷物类"},
        {name: "面条", status: "none", date: null, category: "谷物类"},
        {name: "藜麦", status: "none", date: null, category: "谷物类"},
        {name: "玉米", status: "none", date: null, category: "谷物类"}
      ],
      dairy: [
        {name: "鸡蛋黄", status: "none", date: null, category: "蛋奶类"},
        {name: "鸡蛋清", status: "none", date: null, category: "蛋奶类"},
        {name: "牛奶", status: "none", date: null, category: "蛋奶类"},
        {name: "酸奶", status: "none", date: null, category: "蛋奶类"},
        {name: "奶酪", status: "none", date: null, category: "蛋奶类"}
      ],
      beans: [
        {name: "豆腐", status: "none", date: null, category: "豆类"},
        {name: "豆浆", status: "none", date: null, category: "豆类"},
        {name: "红豆", status: "none", date: null, category: "豆类"},
        {name: "绿豆", status: "none", date: null, category: "豆类"},
        {name: "鹰嘴豆", status: "none", date: null, category: "豆类"},
        {name: "花生", status: "none", date: null, category: "豆类"}
      ],
      nuts: [
        {name: "核桃", status: "none", date: null, category: "坚果类"},
        {name: "杏仁", status: "none", date: null, category: "坚果类"},
        {name: "腰果", status: "none", date: null, category: "坚果类"}
      ],
      customFoods: []
    };
    
    const saved = this.get(this.KEYS.ALLERGY_TRACKING);
    return saved || defaultData;
  },
  
  // 保存排敏进度
  saveAllergyTracking(data) {
    return this.set(this.KEYS.ALLERGY_TRACKING, data);
  },
  
  // 获取用户修改的关系
  getUserModifiedRelations() {
    return this.get(this.KEYS.USER_MODIFIED_RELATIONS) || [];
  },
  
  // 保存用户修改的关系
  saveUserModifiedRelations(relations) {
    return this.set(this.KEYS.USER_MODIFIED_RELATIONS, relations);
  },
  
  // 获取成长记录
  getGrowthRecords() {
    return this.get(this.KEYS.GROWTH_RECORDS) || [];
  },
  
  // 保存成长记录
  saveGrowthRecords(records) {
    return this.set(this.KEYS.GROWTH_RECORDS, records);
  }
};
