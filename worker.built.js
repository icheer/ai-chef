// 静态文件内容 - 在部署前会被替换为实际内容
const staticFiles = {
  '/': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>智能食谱生成器</title>
  
  <!-- CDN资源引入 -->
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://unpkg.com/sweetalert2@11"></script>
  <script src="https://unpkg.com/showdown/dist/showdown.min.js"></script>
  <script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div id="app">
    <!-- 应用标题 -->
    <header class="app-header">
      <h1>🍳 智能食谱生成器</h1>
      <p class="subtitle">输入现有食材，AI为您生成创意食谱</p>
      <div class="save-status" v-if="lastSaveTime">
        <small>{{ lastSaveText }}</small>
      </div>
    </header>

    <!-- 用户档案区域 -->
    <section class="user-profile">
      <h2>👤 用户档案</h2>
      <div class="profile-form">
        <div class="form-row">
          <label>用餐人数:</label>
          <input type="number" v-model.number="userProfile.serving_size" min="1" max="10">
        </div>
        
        <div class="form-row">
          <label>烹饪技能:</label>
          <select v-model="userProfile.cooking_skill">
            <option value="初级">初级</option>
            <option value="中级">中级</option>
            <option value="高级">高级</option>
          </select>
        </div>
        
        <div class="form-row">
          <label>可用时间:</label>
          <input type="number" v-model.number="userProfile.time_available" min="5" max="180">
          <span class="unit">分钟</span>
        </div>

        <div class="form-row">
          <label>菜系偏好:</label>
          <select v-model="userProfile.cuisine_preferences" multiple>
            <option value="中式">中式</option>
            <option value="西式">西式</option>
            <option value="日式">日式</option>
            <option value="韩式">韩式</option>
            <option value="东南亚">东南亚</option>
          </select>
        </div>

        <div class="form-row">
          <label>辣度承受:</label>
          <select v-model="userProfile.spice_tolerance">
            <option value="不辣">不辣</option>
            <option value="微辣">微辣</option>
            <option value="中辣">中辣</option>
            <option value="重辣">重辣</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 饮食限制区域 -->
    <section class="dietary-restrictions">
      <h3>🚫 饮食限制</h3>
      <div class="restrictions-form">
        <div class="form-row">
          <label>过敏食材:</label>
          <input type="text" v-model="dietaryRestrictions.allergies" 
                 placeholder="如：花生、海鲜（逗号分隔）">
        </div>
        
        <div class="form-row">
          <label>不耐受:</label>
          <input type="text" v-model="dietaryRestrictions.intolerances" 
                 placeholder="如：乳糖、麸质（逗号分隔）">
        </div>
        
        <div class="form-row">
          <label>不喜欢的食材:</label>
          <input type="text" v-model="dietaryRestrictions.dislikes" 
                 placeholder="如：香菜、苦瓜（逗号分隔）">
        </div>

        <div class="form-row">
          <label>饮食类型:</label>
          <select v-model="dietaryRestrictions.diet_type">
            <option value="无特殊要求">无特殊要求</option>
            <option value="素食">素食</option>
            <option value="低碳水">低碳水</option>
            <option value="生酮">生酮</option>
            <option value="高蛋白">高蛋白</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 食材选择区域 -->
    <section class="ingredient-selection">
      <h2>🥘 选择食材</h2>
      
      <div class="ingredient-categories">
        <div v-for="(ingredients, category) in ingredientCategories" 
             :key="category" class="category">
          <h4>{{ category }}</h4>
          <div class="ingredient-buttons">
            <button v-for="ingredient in ingredients" 
                    :key="ingredient"
                    @click="addIngredient(ingredient, category)"
                    class="ingredient-btn"
                    :class="{ selected: isIngredientSelected(ingredient) }">
              <span>{{ ingredient }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 手动添加食材 -->
      <div class="add-custom">
        <input type="text" v-model="customIngredientName" 
               placeholder="输入食材名称" @keyup.enter="addCustomIngredient">
        <button @click="addCustomIngredient" class="btn-secondary">添加</button>
      </div>
    </section>

    <!-- 已选食材管理 -->
    <section class="selected-ingredients">
      <h3>✅ 已选择的食材 ({{ ingredientCount }}种)</h3>
      
      <div v-if="ingredientCount === 0" class="empty-state">
        请从上方选择食材，或手动添加
      </div>
      
      <div v-else class="ingredients-list">
        <div v-for="(ingredient, index) in selectedIngredients" 
             :key="index" class="ingredient-item">
          <span class="name">{{ ingredient.name }}</span>
          
          <div class="quantity-unit-wrapper">
            <div class="quantity-control">
              <button @click="updateIngredientQuantity(index, ingredient.quantity - 0.5)">-</button>
              <input type="number" v-model.number="ingredient.quantity" 
                     @input="updateIngredientQuantity(index, \$event.target.value)"
                     min="0" step="0.1">
              <button @click="updateIngredientQuantity(index, ingredient.quantity + 0.5)">+</button>
            </div>
            
            <select v-model="ingredient.unit">
              <option value="个">个</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="L">L</option>
              <option value="茶匙">茶匙</option>
              <option value="汤匙">汤匙</option>
            </select>
          </div>
          
          <select v-model="ingredient.freshness">
            <option value="新鲜">新鲜</option>
            <option value="一般">一般</option>
            <option value="需尽快使用">需尽快使用</option>
          </select>
          
          <button @click="removeIngredient(index)" class="remove-btn"></button>
        </div>
      </div>
    </section>

    <!-- 生成控制区域 -->
    <section class="generation-controls">
      <h3>🤖 生成设置</h3>
      
      <div class="model-selection">
        <label>AI模型选择:</label>
        <select v-model="selectedModel">
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (推荐，更快)</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro (更强，可能不稳定)</option>
        </select>
      </div>
      
      <button @click="generateRecipe" 
              :disabled="!formIsValid || isLoading"
              class="generate-btn">
        <span v-if="isLoading">🔄 生成中...</span>
        <span v-else>✨ 生成食谱</span>
      </button>
      
      <!-- 数据管理按钮 -->
      <div class="data-controls">
        <button @click="clearLocalStorage" class="btn-danger">
          🗑️ 清除保存数据
        </button>
      </div>
    </section>

    <!-- 食谱展示区域 -->
    <section v-if="showResult" class="recipe-result">
      <div class="recipe-container">
        <!-- 食谱概要 -->
        <header class="recipe-header">
          <h2 class="recipe-title">{{ recipeResult.recipe_name || '美味食谱' }}</h2>
          <div class="recipe-meta">
            <span class="time">⏱️ {{ recipeResult.cooking_time || 30 }}分钟</span>
            <span class="difficulty">📊 {{ recipeResult.difficulty || '简单' }}</span>
            <span class="servings">👥 {{ recipeResult.serving_size || userProfile.serving_size }}人份</span>
            <span v-if="recipeResult.cuisine_style" class="cuisine">🍽️ {{ recipeResult.cuisine_style }}</span>
          </div>
          <p class="description">{{ recipeResult.description || '一道美味的家常菜' }}</p>
        </header>

        <!-- 营养信息 -->
        <section v-if="recipeResult.nutrition_info" class="nutrition">
          <h3>📊 营养信息</h3>
          <div class="nutrition-grid">
            <div class="nutrition-item">
              <span class="label">热量</span>
              <span class="value">{{ recipeResult.nutrition_info.calories_per_serving || 'N/A' }}</span>
            </div>
            <div class="nutrition-item">
              <span class="label">蛋白质</span>
              <span class="value">{{ recipeResult.nutrition_info.protein || 'N/A' }}</span>
            </div>
            <div class="nutrition-item">
              <span class="label">碳水化合物</span>
              <span class="value">{{ recipeResult.nutrition_info.carbs || 'N/A' }}</span>
            </div>
            <div class="nutrition-item">
              <span class="label">脂肪</span>
              <span class="value">{{ recipeResult.nutrition_info.fats || 'N/A' }}</span>
            </div>
          </div>
        </section>

        <!-- 所需食材 -->
        <section v-if="recipeResult.ingredients" class="recipe-ingredients">
          <h3>🛒 所需食材</h3>
          <ul class="ingredients-list">
            <li v-for="ingredient in recipeResult.ingredients" :key="ingredient.name">
              <span class="amount">{{ ingredient.quantity || ingredient.amount }} {{ ingredient.unit }}</span>
              <span class="name">{{ ingredient.name }}</span>
              <span v-if="ingredient.notes || ingredient.role" class="notes">({{ ingredient.notes || ingredient.role }})</span>
            </li>
          </ul>
        </section>

        <!-- 烹饪步骤 -->
        <section v-if="recipeResult.cooking_steps" class="cooking-steps">
          <h3>👨‍🍳 烹饪步骤</h3>
          <div class="steps-container">
            <div v-for="(step, index) in recipeResult.cooking_steps" 
                 :key="index" class="step">
              <div class="step-number">{{ step.step || (index + 1) }}</div>
              <div class="step-content">
                <h4 v-if="step.action" class="step-title">{{ step.action }}</h4>
                <p class="instruction">{{ step.description || step.instruction }}</p>
                <p v-if="step.time" class="time">⏱️ {{ step.time }}</p>
                <p v-if="step.tips" class="tip">💡 {{ step.tips }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 厨师小贴士 -->
        <section v-if="recipeResult.chef_tips && recipeResult.chef_tips.length > 0" class="chef-tips">
          <h3>👨‍🍳 厨师小贴士</h3>
          <ul>
            <li v-for="tip in recipeResult.chef_tips" :key="tip">{{ tip }}</li>
          </ul>
        </section>

        <!-- 变化建议 -->
        <section v-if="recipeResult.variations && recipeResult.variations.length > 0" class="variations">
          <h3>🔄 变化建议</h3>
          <ul>
            <li v-for="variation in recipeResult.variations" :key="variation">{{ variation }}</li>
          </ul>
        </section>

        <!-- 食谱操作按钮 -->
        <section class="recipe-actions">
          <button @click="shareRecipe" class="btn-secondary">
            📤 分享食谱
          </button>
          
          <button @click="generateNewRecipe" class="btn-secondary">
            🔄 重新生成
          </button>
          
          <button @click="clearResult" class="btn-danger">
            🗑️ 清除结果
          </button>
        </section>
      </div>
    </section>
  </div>
  
  <script src="./app.js"></script>
</body>
</html>
`,
  '/styles.css': `/* CSS变量色彩方案 */
:root {
  --primary-color: #2ecc71; /* 绿色主色调，象征新鲜食材 */
  --primary-color-dark: #27ae60; /* 深绿色 */
  --secondary-color: #f39c12; /* 橙色辅色，象征温暖厨房 */
  --background-color: #ffffff; /* 纯白背景 */
  --light-gray: #f8f9fa; /* 浅灰背景 */
  --text-primary: #2c3e50; /* 深灰文字 */
  --text-secondary: #7f8c8d; /* 灰色辅助文字 */
  --border-color: #e0e6ed; /* 边框颜色 */
  --danger-color: #e74c3c; /* 错误/删除颜色 */
  --success-color: #2ecc71; /* 成功颜色 */
  --shadow-light: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 基础重置样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--background-color);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 无障碍访问和焦点样式 */
*:focus {
  outline: none;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

#app {
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
}

/* 标题样式 */
.app-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem 0;
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--secondary-color)
  );
  color: white;
  border-radius: 12px;
  box-shadow: var(--shadow-medium);
}

.app-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.save-status {
  opacity: 0.8;
  font-size: 0.9rem;
}

/* 区域标题样式 */
section {
  margin-bottom: 2rem;
  background: #ffffff;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(224, 230, 237, 0.6);
  transition: all 0.3s ease;
}

section:hover {
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  border-color: rgba(46, 204, 113, 0.2);
}

section h2,
section h3 {
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.4rem;
  font-weight: 700;
  position: relative;
  padding-bottom: 0.75rem;
}

section h2::after,
section h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary-color) 0%, transparent 100%);
  border-radius: 1px;
}

/* 表单样式 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}

.form-row label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-row label::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 16px;
  background: linear-gradient(
    to bottom,
    var(--primary-color),
    var(--secondary-color)
  );
  border-radius: 2px;
}

/* 水平表单行 (桌面端) */
.form-row.horizontal {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.form-row.horizontal label {
  flex: 0 0 auto;
  min-width: 120px;
  margin-bottom: 0;
}

.form-row.horizontal input,
.form-row.horizontal select {
  flex: 1;
}

input,
select,
textarea {
  padding: 0.875rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  background-color: #ffffff;
  transition: all 0.3s ease;
  width: 100%;
  min-height: 44px; /* 确保触摸友好的最小高度 */
}

input::placeholder,
select::placeholder,
textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.8;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.12);
  background-color: #ffffff;
  /* transform: translateY(-1px); */
}

input:hover:not(:focus),
select:hover:not(:focus),
textarea:hover:not(:focus) {
  border-color: var(--primary-color-dark);
  background-color: #fafbfc;
}

/* 特殊输入框样式 */
input[type='number'] {
  text-align: center;
  font-weight: 500;
}

select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 3rem;
  appearance: none;
  cursor: pointer;
}

select[multiple] {
  padding-top: 1em;
  padding-bottom: 1em;
  min-height: 8.8em;
}

/* 食材项中的选择框特殊样式 */
.ingredient-item select {
  min-width: 80px;
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  font-size: 0.9rem;
}

textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

/* 按钮样式 */
button {
  cursor: pointer;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px; /* 触摸友好的最小高度 */
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.6s ease;
}

button:hover::before {
  left: 100%;
}

.btn-primary,
.generate-btn {
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--primary-color-dark)
  );
  color: white;
  padding: 0.875rem 2rem;
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
  font-size: 1.1rem;
}

.btn-primary:hover,
.generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-color-dark), #1e8449);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(46, 204, 113, 0.4);
}

.btn-primary:active,
.generate-btn:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}

.btn-secondary {
  background: #ffffff;
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  padding: 0.625rem 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.btn-secondary:hover {
  background: var(--light-gray);
  border-color: var(--primary-color);
  color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-danger {
  background: linear-gradient(135deg, var(--danger-color), #c0392b);
  color: white;
  padding: 0.625rem 1.25rem;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
}

.btn-danger:hover {
  background: #c0392b;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
  background: #bdc3c7 !important;
  box-shadow: none !important;
  position: relative;
}

button:disabled::before {
  display: none;
}

/* 食材相关样式 */
.ingredient-categories {
  margin-bottom: 2rem;
}

.category {
  margin-bottom: 2rem;
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(224, 230, 237, 0.8);
}

.category h4 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category h4::before {
  content: '🥗';
  font-size: 1.4rem;
}

.ingredient-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ingredient-btn {
  background: #ffffff;
  border: 2px solid var(--border-color);
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 48px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.ingredient-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--primary-color-dark)
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ingredient-btn span {
  position: relative;
  z-index: 1;
}

.ingredient-btn:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(46, 204, 113, 0.25);
}

.ingredient-btn:hover::before {
  opacity: 0.1;
}

.ingredient-btn.selected {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(46, 204, 113, 0.4);
}

.ingredient-btn.selected::before {
  opacity: 1;
}

/* 已选食材管理 */
.empty-state {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  padding: 3rem;
  background: #fafbfc;
  border-radius: 16px;
  border: 2px dashed rgba(224, 230, 237, 0.8);
  font-size: 1.1rem;
  line-height: 1.6;
}

.empty-state::before {
  content: '🍽️';
  display: block;
  font-size: 3rem;
  margin-bottom: 1rem;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ingredient-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  padding-top: 1.75rem;
  background: #ffffff;
  border-radius: 16px;
  border: 2px solid rgba(224, 230, 237, 0.6);
  flex-wrap: wrap;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.ingredient-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 20px rgba(46, 204, 113, 0.15);
  transform: translateY(-1px);
}

.ingredient-item .name {
  font-weight: 700;
  color: var(--text-primary);
  min-width: 100px;
  font-size: 1.05rem;
  display: flex;
  align-items: center;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--light-gray);
  border-radius: 12px;
  padding: 0.25rem;
  border: 2px solid rgba(224, 230, 237, 0.8);
}

.quantity-unit-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-control button {
  width: 36px;
  height: 36px;
  background: white;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.quantity-control button:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.quantity-control input {
  width: 90px;
  text-align: center;
  padding: 0.5rem;
  margin: 0;
  border: none;
  background: transparent;
  font-weight: 600;
  font-size: 1rem;
}

.remove-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 28px;
  height: 28px;
  background: #ff4757;
  color: white;
  padding: 0;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  min-height: auto;
}

.remove-btn:hover {
  background: #ff3742;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4);
}

.remove-btn::before {
  content: '×';
  display: block;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 1em;
  height: 1em;
  line-height: 1em;
  margin: auto auto;
  font-size: 18px;
  line-height: 1;
}

/* 手动添加食材 */
.add-custom {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.add-custom input {
  flex: 1;
  margin: 0;
}

/* 生成控制区域 */
.generation-controls {
  text-align: center;
}

.model-selection {
  margin-bottom: 1.5rem;
}

.model-selection label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.generate-btn {
  font-size: 1.2rem;
  padding: 1rem 2rem;
  margin-bottom: 1rem;
  min-height: 56px;
}

.data-controls {
  margin-top: 1rem;
}

/* 食谱展示区域 */
.recipe-result {
  margin-top: 2rem;
}

.recipe-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--border-color);
}

.recipe-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.recipe-title {
  color: var(--primary-color);
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.recipe-meta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.recipe-meta span {
  background: var(--light-gray);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.description {
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.5;
}

/* 营养信息 */
.nutrition {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--light-gray);
  border-radius: 8px;
}

.nutrition h3 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.nutrition-item {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.nutrition-item .label {
  display: block;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.nutrition-item .value {
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-color);
}

/* 食材列表 */
.recipe-ingredients {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--light-gray);
  border-radius: 8px;
}

.recipe-ingredients h3 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
}

.recipe-ingredients .ingredients-list {
  list-style: none;
  padding: 0;
}

.recipe-ingredients .ingredients-list li {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  gap: 0.75rem;
}

.recipe-ingredients .amount {
  font-weight: 600;
  color: var(--primary-color);
  min-width: 80px;
}

.recipe-ingredients .name {
  font-weight: 600;
  flex: 1;
}

.recipe-ingredients .notes {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

/* 烹饪步骤 */
.cooking-steps {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--light-gray);
  border-radius: 8px;
}

.cooking-steps h3 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step {
  display: flex;
  gap: 1rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.step-number {
  background: var(--primary-color);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  color: var(--primary-color);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.step-content .instruction {
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.step-content .time {
  color: var(--secondary-color);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.step-content .tip {
  background: #fff3cd;
  color: #856404;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  border-left: 4px solid var(--secondary-color);
}

/* 小贴士和变化建议 */
.chef-tips,
.variations {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--light-gray);
  border-radius: 8px;
}

.chef-tips h3,
.variations h3 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
}

.chef-tips ul,
.variations ul {
  list-style: none;
  padding: 0;
}

.chef-tips li,
.variations li {
  background: white;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
  line-height: 1.5;
}

.chef-tips li::before {
  content: '💡 ';
  margin-right: 0.5rem;
}

.variations li::before {
  content: '🔄 ';
  margin-right: 0.5rem;
}

.recipe-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (min-width: 768px) {
  #app {
    max-width: 800px;
    padding: 2rem;
  }

  .form-row {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .form-row label {
    min-width: 120px;
    margin-bottom: 0;
  }

  .ingredient-categories {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .ingredient-item {
    flex-wrap: nowrap;
  }

  .ingredient-item .name {
    min-width: 120px;
  }

  .recipe-meta {
    gap: 2rem;
  }
}

@media (min-width: 1024px) {
  #app {
    max-width: 1000px;
  }

  .app-header h1 {
    font-size: 2.5rem;
  }

  .ingredient-categories {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 加载动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.generate-btn:disabled .loading-spinner {
  animation: spin 1s linear infinite;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 页面加载动画 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

section {
  animation: slideInUp 0.6s ease-out forwards;
}

section:nth-child(even) {
  animation: slideInLeft 0.6s ease-out forwards;
}

/* 交互反馈动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
  }
}

.ingredient-btn.selected {
  animation: pulse 1.5s ease-out;
}

/* ===============================================
   响应式设计优化
   =============================================== */

/* 平板设计 (768px+) */
@media (min-width: 768px) {
  #app {
    max-width: 1200px;
    padding: 2rem;
  }

  .app-header {
    margin-bottom: 3rem;
    padding: 3rem 0;
  }

  .app-header h1 {
    font-size: 2.5rem;
  }

  section {
    padding: 2.5rem;
  }

  .form-row:not(.horizontal) {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 1.5rem;
  }

  .form-row:not(.horizontal) label {
    margin-bottom: 0;
    text-align: right;
  }

  .ingredient-categories {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }

  .recipe-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    align-items: start;
  }

  .ingredient-item {
    flex-wrap: nowrap;
  }

  .ingredient-item .name {
    min-width: 150px;
  }

  .quantity-unit-wrapper {
    gap: 1rem;
  }
}

/* 桌面设计 (1024px+) */
@media (min-width: 1024px) {
  #app {
    max-width: 1400px;
    padding: 3rem;
  }

  .app-header h1 {
    font-size: 3rem;
  }

  section {
    padding: 3rem;
  }

  .ingredient-categories {
    grid-template-columns: repeat(2, 1fr);
    gap: 2.5rem;
  }

  .ingredient-buttons {
    gap: 1rem;
  }

  .ingredient-btn {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }

  .nutrition-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .cooking-steps {
    max-width: 800px;
    margin: 0 auto;
  }
}

/* 大屏设计 (1440px+) */
@media (min-width: 1440px) {
  #app {
    max-width: 1600px;
  }

  .ingredient-categories {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 移动端优化 */
@media (max-width: 767px) {
  #app {
    padding: 0.75rem;
  }

  .app-header {
    margin-bottom: 1.5rem;
    padding: 1.5rem 0;
    border-radius: 8px;
  }

  .app-header h1 {
    font-size: 1.8rem;
  }

  section {
    padding: 1.5rem;
    border-radius: 12px;
  }

  .form-row {
    gap: 0.5rem;
  }

  .ingredient-btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    min-height: 44px;
  }

  .ingredient-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding-top: 2.5rem;
  }

  .ingredient-item .name {
    min-width: auto;
    text-align: center;
    padding: 0.75rem;
    background: var(--light-gray);
    border-radius: 8px;
    justify-content: center;
  }

  .quantity-unit-wrapper {
    justify-content: center;
    flex-wrap: nowrap;
  }

  .quantity-control {
    flex: 0 0 auto;
  }

  .remove-btn {
    top: 0.5rem;
    right: 0.5rem;
  }

  .btn-primary,
  .generate-btn {
    padding: 1rem 1.5rem;
    font-size: 1.1rem;
    width: 100%;
  }

  .nutrition-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  #app {
    padding: 0.5rem;
  }

  .app-header h1 {
    font-size: 1.6rem;
  }

  section {
    padding: 1rem;
  }

  .ingredient-btn {
    flex: 1 1 calc(50% - 0.5rem);
    min-width: calc(50% - 0.5rem);
  }

  .nutrition-grid {
    grid-template-columns: 1fr;
  }

  .ingredient-item {
    padding: 1rem;
    padding-top: 2rem;
  }

  .quantity-unit-wrapper {
    flex-direction: row;
    gap: 0.75rem;
  }

  .ingredient-item select {
    min-width: 60px;
    font-size: 0.85rem;
  }
}

/* 打印样式 */
@media print {
  #app {
    background: white;
    padding: 0;
  }

  .app-header,
  button,
  .form-section {
    display: none;
  }

  .recipe-result {
    box-shadow: none;
    border: none;
    margin: 0;
    padding: 0;
  }
}
`,
  '/app.js': `// app.js - Vue应用主文件
const { createApp } = Vue;

const RecipeGeneratorApp = {
  // Vue Options API 风格
  data() {
    return {
      // 用户档案数据
      userProfile: {
        serving_size: 2,
        cooking_skill: '初级',
        time_available: 30,
        cuisine_preferences: [],
        spice_tolerance: '中辣'
      },
      
      // 饮食限制
      dietaryRestrictions: {
        allergies: '',
        intolerances: '',
        dislikes: '',
        diet_type: '无特殊要求'
      },
      
      // 食材管理
      selectedIngredients: [],
      customIngredientName: '',
      ingredientCategories: {
        '蛋白质': ['鸡蛋', '鸡胸肉', '猪肉', '牛肉', '豆腐', '鱼肉', '虾', '鸡腿', '培根'],
        '蔬菜': ['番茄', '洋葱', '土豆', '胡萝卜', '白菜', '青菜', '西兰花', '茄子', '青椒', '黄瓜'],
        '主食': ['大米', '面条', '面粉', '馒头', '面包', '意大利面', '年糕', '粉丝'],
        '调料': ['盐', '生抽', '老抽', '料酒', '香油', '胡椒粉', '八角', '桂皮', '花椒', '辣椒粉'],
        '其他': ['食用油', '白糖', '醋', '蒜', '姜', '葱', '香菜', '柠檬', '奶酪', '黄油']
      },
      
      // 应用状态
      isLoading: false,
      selectedModel: 'gemini-2.5-pro',
      recipeResult: null,
      showResult: false,
      
      // localStorage相关
      storageKey: 'smart-recipe-generator',
      lastSaveTime: null
    }
  },
  
  methods: {
    // 食材管理方法
    addIngredient(name, category = '其他') {
      const existing = this.selectedIngredients.find(item => item.name === name);
      if (existing) {
        existing.quantity += 1;
        this.showSuccessMessage(\`\${name} 数量已增加\`);
      } else {
        this.selectedIngredients.push({
          name: name,
          quantity: 1,
          unit: this.getDefaultUnit(category),
          freshness: '新鲜',
          category: category
        });
        this.showSuccessMessage(\`已添加 \${name}\`);
      }
    },
    
    getDefaultUnit(category) {
      const defaultUnits = {
        '蛋白质': '个',
        '蔬菜': '个', 
        '主食': 'g',
        '调料': '茶匙',
        '其他': 'ml'
      };
      return defaultUnits[category] || '个';
    },
    
    removeIngredient(index) {
      const ingredient = this.selectedIngredients[index];
      this.selectedIngredients.splice(index, 1);
      this.showSuccessMessage(\`已移除 \${ingredient.name}\`);
    },
    
    updateIngredientQuantity(index, quantity) {
      const numQuantity = parseFloat(quantity);
      if (numQuantity <= 0) {
        this.removeIngredient(index);
      } else {
        this.selectedIngredients[index].quantity = numQuantity;
      }
    },
    
    isIngredientSelected(ingredientName) {
      return this.selectedIngredients.some(item => item.name === ingredientName);
    },
    
    addCustomIngredient() {
      const name = this.customIngredientName.trim();
      if (name) {
        this.addIngredient(name);
        this.customIngredientName = '';
      } else {
        this.showWarningMessage('请输入食材名称');
      }
    },
    
    // API调用方法
    async generateRecipe() {
      if (!this.validateForm()) {
        return;
      }
      
      this.isLoading = true;
      
      try {
        const requestData = {
          userProfile: this.userProfile,
          dietaryRestrictions: this.dietaryRestrictions,
          selectedIngredients: this.selectedIngredients,
          selectedModel: this.selectedModel
        };
        
        const response = await fetch('/api/generate-recipe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || '请求失败');
        }
        
        this.recipeResult = result;
        this.showResult = true;
        this.showSuccessMessage('🎉 食谱生成成功！');
        
        // 滚动到结果区域
        this.\$nextTick(() => {
          const resultElement = document.querySelector('.recipe-result');
          if (resultElement) {
            resultElement.scrollIntoView({ 
              behavior: 'smooth' 
            });
          }
        });
        
      } catch (error) {
        console.error('生成食谱失败:', error);
        this.showErrorMessage(\`生成失败: \${error.message}\`);
      } finally {
        this.isLoading = false;
      }
    },
    
    // SweetAlert2 提示方法
    showSuccessMessage(message) {
      Swal.fire({
        icon: 'success',
        title: '成功',
        text: message,
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    },
    
    showErrorMessage(message) {
      Swal.fire({
        icon: 'error',
        title: '错误',
        text: message,
        confirmButtonColor: '#E74C3C'
      });
    },
    
    showWarningMessage(message) {
      Swal.fire({
        icon: 'warning',
        title: '提示',
        text: message,
        confirmButtonColor: '#F39C12'
      });
    },
    
    // 表单验证
    validateForm() {
      if (this.selectedIngredients.length === 0) {
        this.showWarningMessage('请至少选择一种食材');
        return false;
      }
      
      if (this.userProfile.serving_size < 1 || this.userProfile.serving_size > 10) {
        this.showWarningMessage('用餐人数应在1-10人之间');
        return false;
      }
      
      if (this.userProfile.time_available < 5) {
        this.showWarningMessage('烹饪时间不能少于5分钟');
        return false;
      }
      
      return true;
    },
    
    // localStorage数据持久化
    saveToLocalStorage() {
      const dataToSave = {
        userProfile: this.userProfile,
        dietaryRestrictions: this.dietaryRestrictions,
        selectedIngredients: this.selectedIngredients,
        selectedModel: this.selectedModel,
        recipeResult: this.recipeResult,
        showResult: this.showResult,
        timestamp: new Date().toISOString()
      };
      
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        this.lastSaveTime = dataToSave.timestamp;
      } catch (error) {
        console.error('保存数据到localStorage失败:', error);
      }
    },
    
    loadFromLocalStorage() {
      try {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
          const data = JSON.parse(savedData);
          
          // 恢复用户档案
          this.userProfile = { ...this.userProfile, ...data.userProfile };
          this.dietaryRestrictions = { ...this.dietaryRestrictions, ...data.dietaryRestrictions };
          this.selectedIngredients = data.selectedIngredients || [];
          this.selectedModel = data.selectedModel || 'gemini-2.5-pro';
          
          // 恢复食谱结果
          if (data.recipeResult) {
            this.recipeResult = data.recipeResult;
            this.showResult = data.showResult || false;
          }
          
          this.lastSaveTime = data.timestamp;
          console.log('已从localStorage加载上次保存的数据');
        }
      } catch (error) {
        console.error('从localStorage加载数据失败:', error);
      }
    },
    
    clearLocalStorage() {
      Swal.fire({
        title: '确认清除数据',
        text: '这将删除所有保存的表单数据和食谱',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        confirmButtonColor: '#E74C3C'
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem(this.storageKey);
          this.resetAllData();
          this.showSuccessMessage('数据已清除');
        }
      });
    },
    
    resetAllData() {
      // 重置所有数据到初始状态
      Object.assign(this.userProfile, {
        serving_size: 2,
        cooking_skill: '初级',
        time_available: 30,
        cuisine_preferences: [],
        spice_tolerance: '中辣'
      });
      
      Object.assign(this.dietaryRestrictions, {
        allergies: '',
        intolerances: '',
        dislikes: '',
        diet_type: '无特殊要求'
      });
      
      this.selectedIngredients = [];
      this.recipeResult = null;
      this.showResult = false;
      this.lastSaveTime = null;
      this.customIngredientName = '';
    },
    
    // 食谱分享功能
    async shareRecipe() {
      if (!this.recipeResult) {
        this.showErrorMessage('请先生成食谱再分享');
        return;
      }
      
      try {
        // 显示分享进度提示
        Swal.fire({
          title: '正在生成分享图片...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        // 选择要截图的元素
        const recipeElement = document.querySelector('.recipe-result');
        
        if (!recipeElement) {
          throw new Error('找不到食谱内容');
        }
        
        // 使用html2canvas生成图片
        const canvas = await html2canvas(recipeElement, {
          backgroundColor: '#ffffff',
          scale: 2, // 提高图片清晰度
          useCORS: true,
          allowTaint: false,
          height: recipeElement.scrollHeight,
          windowHeight: recipeElement.scrollHeight
        });
        
        // 转换为图片数据
        canvas.toBlob(async (blob) => {
          await this.handleShareBlob(blob);
        }, 'image/png');
        
      } catch (error) {
        console.error('分享失败:', error);
        this.showErrorMessage('分享失败，请稍后重试');
      }
    },
    
    async handleShareBlob(blob) {
      try {
        // 关闭Loading提示
        Swal.close();
        
        // 检查是否支持Web Share API
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], \`食谱_\${Date.now()}.png\`, { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) {
            // 移动端：使用Web Share API
            await navigator.share({
              title: '我的智能食谱',
              text: \`\${this.recipeResult.recipe_name || '美味食谱'} - 用AI生成的美味食谱！\`,
              files: [file]
            });
            
            this.showSuccessMessage('分享成功！');
            return;
          }
        }
        
        // 降级方案：下载图片
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = \`\${this.recipeResult.recipe_name || '食谱'}_\${new Date().getTime()}.png\`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showSuccessMessage('食谱图片已下载到本地！');
        
      } catch (error) {
        console.error('分享处理失败:', error);
        this.showErrorMessage('分享失败，请稍后重试');
      }
    },
    
    // 其他功能方法
    generateNewRecipe() {
      this.showResult = false;
      this.recipeResult = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    clearResult() {
      Swal.fire({
        title: '确认清除食谱',
        text: '这将清除当前生成的食谱结果',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '确认清除',
        cancelButtonText: '取消'
      }).then((result) => {
        if (result.isConfirmed) {
          this.showResult = false;
          this.recipeResult = null;
          this.showSuccessMessage('食谱结果已清除');
        }
      });
    }
  },
  
  computed: {
    // 计算属性
    ingredientCount() {
      return this.selectedIngredients.length;
    },
    
    formIsValid() {
      return this.ingredientCount > 0;
    },
    
    lastSaveText() {
      return this.lastSaveTime ? 
        \`上次保存: \${new Date(this.lastSaveTime).toLocaleString()}\` : 
        '暂无保存记录';
    }
  },
  
  watch: {
    // 监听数据变化，自动保存
    userProfile: {
      handler() {
        this.saveToLocalStorage();
      },
      deep: true
    },
    
    dietaryRestrictions: {
      handler() {
        this.saveToLocalStorage();
      },
      deep: true
    },
    
    selectedIngredients: {
      handler() {
        this.saveToLocalStorage();
      },
      deep: true
    },
    
    recipeResult: {
      handler() {
        this.saveToLocalStorage();
      },
      deep: true
    }
  },
  
  mounted() {
    // 组件挂载后的初始化
    this.loadFromLocalStorage();
    
    // 欢迎消息
    if (!this.lastSaveTime) {
      this.showSuccessMessage('欢迎使用智能食谱生成器！请选择您的食材开始');
    }
  }
};

// 启动Vue应用
createApp(RecipeGeneratorApp).mount('#app');
`
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // 静态资源服务
    if (request.method === 'GET') {
      return handleStaticFiles(url.pathname);
    }

    // API请求处理
    if (request.method === 'POST' && url.pathname === '/api/generate-recipe') {
      return handleRecipeGeneration(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// 处理CORS
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 静态文件处理 - 使用嵌入的内容
function handleStaticFiles(pathname) {
  const content = staticFiles[pathname];
  if (!content) {
    return new Response('Not Found', { status: 404 });
  }

  const contentType = getContentType(pathname);
  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

// Content-Type辅助函数
function getContentType(pathname) {
  if (pathname === '/' || pathname.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }

  const ext = pathname.split('.').pop();
  const contentTypes = {
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml'
  };
  return contentTypes[ext] || 'text/plain';
}

// Gemini API密钥负载均衡
function getRandomApiKey(env) {
  const apiKeys = env.GEMINI_API_KEYS.split(',').map(key => key.trim());
  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  return apiKeys[randomIndex];
}

// Gemini API调用函数
async function callGeminiAPI(prompt, model, env) {
  const apiKey = getRandomApiKey(env);
  const baseUrl = env.GEMINI_BASE_URL;

  const response = await fetch(
    `${baseUrl}/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API调用失败: ${response.status}`);
  }

  return response.json();
}

// 提示词构建函数
function buildRecipePrompt(requestData) {
  // 嵌入的提示词模板 - 在部署前会被替换为实际内容
  const promptTemplate = `# 角色定义

你是一位专业的 AI 厨艺大师与智能食谱生成器，拥有丰富的烹饪经验和创意搭配能力。你的使命是基于用户家中的现有食材（包括冰箱、食品柜、调味篮等储存的食材），创造出美味、营养且实用的个性化食谱，让用户能够充分利用现有食材，减少浪费，同时获得意想不到的烹饪灵感和专业级的厨艺指导。

# 核心目标

根据用户提供的家中食材清单和个人偏好，生成创意美味的食谱方案，该方案必须：

- 最大化利用现有食材，减少食品浪费
- 提供详细的烹饪步骤和专业技巧指导
- 考虑营养搭配和口味平衡
- 适应不同烹饪技能水平
- 激发用户的烹饪创意和潜力

# 基本原则（按优先级排序）

1. **食材最大化利用**：充分利用用户现有的家中食材，创造性搭配组合
2. **安全至上**：严格遵守过敏原、不耐受和禁忌食材限制，确保食品安全
3. **创意启发**：提供新颖独特的食谱灵感，让烹饪变得有趣且富有创造力
4. **实用便捷**：假设用户拥有基本调味料（盐、胡椒、黄油、糖、油、醋等），简化购买需求
5. **技能适应**：根据用户烹饪水平提供相应难度的食谱和详细指导
6. **营养兼顾**：在创意的基础上保持营养均衡和口味协调

# 输入数据规范

## 1. user_profile（用户档案）

\`\`\`json
{
  "serving_size": 2, // 用餐人数
  "cooking_skill": "初级", // 烹饪技能：初级/中级/高级
  "time_available": 30, // 可用烹饪时间（分钟）
  "cuisine_preferences": ["中式", "意式", "日式"], // 菜系偏好
  "dietary_restrictions": {
    "allergies": ["花生", "海鲜"], // 过敏食材
    "intolerances": ["乳糖"], // 不耐受
    "dislikes": ["香菜", "苦瓜"], // 不喜欢的食材
    "diet_type": "无特殊要求" // 素食/低碳水/生酮等
  },
  "spice_tolerance": "中辣", // 辣度承受：不辣/微辣/中辣/重辣
  "equipment_available": ["燃气灶", "微波炉", "烤箱"] // 可用厨具
}
\`\`\`

## 2. available_ingredients（现有食材清单）

\`\`\`json
[
  {
    "name": "鸡蛋",
    "quantity": 6,
    "unit": "个",
    "freshness": "新鲜", // 新鲜/一般/需尽快使用
    "storage_type": "冷藏", // 冷藏/冷冻/常温
    "category": "蛋白质" // 蛋白质/蔬菜/主食/调料/其他
  },
  {
    "name": "番茄",
    "quantity": 3,
    "unit": "个",
    "freshness": "新鲜",
    "storage_type": "冷藏",
    "category": "蔬菜"
  }
]
\`\`\`

## 3. recipe_preferences（食谱偏好，可选）

\`\`\`json
{
  "meal_type": "晚餐", // 早餐/午餐/晚餐/小食
  "style_preference": "家常菜", // 家常菜/创意融合/传统正宗/快手菜
  "nutrition_focus": "均衡营养", // 高蛋白/低脂/均衡营养/快速饱腹
  "special_occasion": null // 生日/聚餐/减肥餐等特殊场合
}
\`\`\`

# 输出 JSON Schema（食谱生成器版）

\`\`\`json
{
  "recipe_recommendations": {
    "generation_id": "unique_recipe_id",
    "created_at": "YYYY-MM-DDTHH:mm:ssZ",
    "serving_size": 2,
    "summary": {
      "inspiration_theme": "意想不到的美味组合，让平凡食材焕发新生",
      "ingredients_utilization": "85%", // 食材利用率
      "creativity_level": "高创意融合", 
      "difficulty_match": "完美匹配用户技能水平",
      "time_efficiency": "30分钟内完成",
      "nutritional_highlights": ["高蛋白", "维生素丰富", "膳食纤维充足"],
      "safety_notes": ["已避免所有过敏原", "确保食材新鲜度要求"]
    },
    "main_recipes": [
      {
        "recipe_name": "创意番茄鸡蛋面条",
        "cuisine_style": "中西融合",
        "difficulty": "简单",
        "cooking_time": 20,
        "serving_size": 2,
        "creativity_score": 8.5,
        "description": "利用简单食材创造的惊艳美味，传统与现代的完美碰撞",
        "nutrition_info": {
          "calories_per_serving": 420,
          "protein": "18g",
          "carbs": "55g", 
          "fats": "12g",
          "fiber": "6g",
          "main_nutrients": ["维生素C", "叶酸", "优质蛋白"]
        },
        "ingredients": [
          {
            "name": "鸡蛋",
            "quantity": 3,
            "unit": "个",
            "source": "现有食材",
            "role": "主要蛋白质来源"
          },
          {
            "name": "番茄",
            "quantity": 2,
            "unit": "个", 
            "source": "现有食材",
            "role": "酸甜基调和维生素"
          },
          {
            "name": "面条",
            "quantity": 200,
            "unit": "g",
            "source": "现有食材", 
            "role": "主食碳水"
          }
        ],
        "assumed_seasonings": ["盐", "黑胡椒", "橄榄油", "蒜", "糖"],
        "cooking_steps": [
          {
            "step": 1,
            "action": "准备工作",
            "description": "番茄切丁，鸡蛋打散加少许盐调味，蒜切末",
            "time": "5分钟",
            "tips": "番茄去皮后口感更佳，可先用开水烫一下"
          },
          {
            "step": 2, 
            "action": "制作番茄蛋液",
            "description": "热锅下油，倒入蛋液快速划散盛起备用",
            "time": "3分钟",
            "tips": "大火快炒保持鸡蛋嫩滑，不要炒过头"
          },
          {
            "step": 3,
            "action": "煸炒番茄",
            "description": "同锅下蒜末爆香，加入番茄丁炒出汁水，调味",
            "time": "5分钟", 
            "tips": "充分炒出番茄汁水，形成浓郁番茄味基底"
          },
          {
            "step": 4,
            "action": "煮面条组合",
            "description": "面条煮至8成熟，直接捞入番茄锅中，加入鸡蛋翻炒均匀",
            "time": "7分钟",
            "tips": "面条带点汤汁入锅，帮助融合所有味道"
          }
        ],
        "chef_tips": [
          "番茄和鸡蛋的黄金比例是2:3，确保味道平衡",
          "面条可选择意面或中式面条，各有风味",
          "最后可撒少许黑胡椒提升层次"
        ],
        "variations": [
          "加入洋葱增加甜味层次",
          "撒入芝士丝创造西式风味", 
          "加几片罗勒叶提升香气"
        ],
        "leftover_usage": "剩余食材可制作明日的番茄鸡蛋汤或三明治馅料"
      }
    ],
    "alternative_recipes": [
      {
        "recipe_name": "简易鸡蛋番茄汤面",
        "reason": "如果偏好汤面类型",
        "cooking_time": 15,
        "difficulty": "极简单"
      },
      {
        "recipe_name": "番茄鸡蛋拌饭",
        "reason": "如果没有面条可用米饭替代", 
        "cooking_time": 12,
        "difficulty": "简单"
      }
    ],
    "ingredient_optimization": {
      "fully_used": ["鸡蛋", "番茄"],
      "partially_used": ["面条"],
      "unused_suggestions": "剩余食材可用于明日早餐制作鸡蛋饼"
    },
    "shopping_additions": {
      "optional_enhancers": [
        {
          "name": "新鲜罗勒",
          "purpose": "提升香气层次",
          "priority": "低"
        }
      ],
      "basic_seasonings_assumed": ["盐", "糖", "油", "蒜", "胡椒"]
    },
    "skill_development": {
      "techniques_learned": ["番茄汁炒制", "鸡蛋嫩滑处理", "面条与配菜融合"],
      "next_level_challenge": "尝试制作番茄肉酱意面，学习更复杂的酱料调制"
    }
  }
}
\`\`\`

# 执行流程（食谱生成器版）

## 阶段 1：食材分析与创意启发

### A. 现有食材智能分析

- 按食材类别分组（蛋白质/蔬菜/主食/调料等）
- 评估食材新鲜度和最佳利用时机
- 识别食材之间的天然搭配潜力
- 分析营养互补性和口味协调性

### B. 创意组合算法

- **经典搭配识别**：发现传统美味组合（如番茄+鸡蛋）
- **创新融合探索**：尝试跨文化、跨菜系的创意搭配
- **营养完整性检验**：确保蛋白质、碳水、维生素的合理配比
- **口味平衡评估**：酸甜苦辣咸的协调统一

### C. 安全过滤机制

- **过敏原严格排除**：零容忍违禁食材
- **不耐受替代方案**：提供安全替代选择
- **新鲜度安全检查**：确保食材可安全食用
- **搭配禁忌避免**：排除不安全的食材组合

## 阶段 2：个性化食谱设计

### A. 技能水平适配

\`\`\`
IF 用户技能 == "初级"：
  → 优先简单烹饪手法（炒、煮、蒸）
  → 详细步骤分解和关键技巧提醒
  → 容错性高的食谱选择

IF 用户技能 == "中级"：
  → 引入中等复杂技法（焖、炖、烤）
  → 提供创意变化建议
  → 平衡传统与创新

IF 用户技能 == "高级"：
  → 鼓励复杂技法实验
  → 提供专业级技巧指导
  → 激发高创意发挥
\`\`\`

### B. 时间约束优化

- **快手食谱**（≤15分钟）：一锅煮、简单炒制
- **标准食谱**（15-30分钟）：多步骤精心制作
- **慢工细活**（>30分钟）：炖煮类、烘焙类精品

### C. 设备适配调整

- 根据可用厨具调整烹饪方法
- 提供设备替代方案
- 优化烹饪效率和效果

## 阶段 3：创意食谱生成与优化

### A. 多方案生成策略

1. **主推方案**：最佳食材利用率 + 最高创意度
2. **备选方案**：不同风味方向的替代选择
3. **简化版本**：时间紧张时的快手替代
4. **升级版本**：技能提升时的进阶挑战

### B. 详细指导生成

- **分步骤详解**：每个步骤的时间、技巧、注意事项
- **专业技巧传授**：厨师级别的小窍门和经验分享
- **故障排除指南**：常见问题的预防和解决方案
- **口味调节建议**：根据个人喜好的调味指导

## 阶段 4：体验优化与价值最大化

### A. 食材利用最大化

- **零浪费设计**：充分利用每一样食材
- **剩余食材处理**：剩余部分的创意再利用方案
- **批量处理建议**：一次准备多餐的效率技巧

### B. 营养价值提升

- **隐形营养增强**：在美味基础上悄然提升营养
- **营养搭配优化**：确保蛋白质、维生素、矿物质均衡
- **健康烹饪建议**：减油减盐的美味保证技巧

### C. 烹饪技能培养

- **技法渐进训练**：从基础到进阶的技能发展路径
- **创意思维启发**：培养用户自主创新搭配的能力
- **厨艺自信建立**：通过成功体验增强烹饪信心

# 特殊场景处理机制

## 食材限制应对策略

- **食材不足**：创意性减料版本，保持核心风味
- **食材过多**：批量处理方案，延长保存期
- **单一食材丰富**：围绕主要食材的多样化处理方式

## 创意激发机制

- **跨界融合启发**：中西结合、传统创新的大胆尝试
- **季节性灵感**：结合当季特色的时令搭配
- **情景化建议**：浪漫晚餐、朋友聚会等场合定制
- **挑战性实验**：为有经验用户提供技艺挑战

## 学习成长引导

- **技能进阶路径**：从当前水平到下一阶段的具体指导
- **创意思维培养**：启发用户独立思考食材搭配的逻辑
- **厨艺文化传承**：分享各地烹饪智慧和传统技法
- **实验精神鼓励**：营造安全的烹饪探索环境

## 生活化贴心服务

- **时间管理优化**：繁忙日程下的高效烹饪方案
- **经济实用考量**：最小成本获得最大营养价值
- **家庭友好设计**：适合不同年龄层的口味调节
- **健康生活促进**：在美味基础上的营养升级

---

## AI 家庭食材食谱生成器的独特价值

### 🎯 **核心优势**

1. **零浪费创意厨房**：让家中每一样食材都发挥最大价值，减少食品浪费
2. **专业级指导体验**：获得米其林厨师般的烹饪技巧和创意启发  
3. **个性化美食定制**：基于个人技能、喜好、时间的完全定制化方案
4. **创意无限激发**：发现意想不到的食材搭配，让烹饪充满惊喜
5. **技能渐进提升**：在享受美食的同时不断提升厨艺水平

### 🚀 **用户体验革新**

- **极简操作流程**：只需输入现有食材，瞬间获得专业食谱
- **智能安全保障**：自动避开过敏原，确保饮食安全无忧  
- **创意灵感爆发**：每次使用都有新发现，让烹饪成为愉快探险
- **成就感满满**：用现有食材创造美味，获得专业级成就感
- **持续学习成长**：每个食谱都是一次技能提升的机会

### 💡 **创新功能亮点**

- **AI创意引擎**：突破传统搭配思维，发现意外美味组合
- **技能自适应**：根据用户水平提供相应难度和详细度指导
- **营养智能优化**：在追求美味的同时确保营养均衡
- **零购买压力**：基于现有食材创作，无需额外购买
- **文化融合探索**：跨越菜系界限，创造独特风味体验
`;

  // 构建用户数据JSON
  const userData = {
    user_profile: {
      serving_size: requestData.userProfile.serving_size,
      cooking_skill: requestData.userProfile.cooking_skill,
      time_available: requestData.userProfile.time_available,
      cuisine_preferences: requestData.userProfile.cuisine_preferences,
      dietary_restrictions: {
        allergies: requestData.dietaryRestrictions.allergies
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        intolerances: requestData.dietaryRestrictions.intolerances
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        dislikes: requestData.dietaryRestrictions.dislikes
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        diet_type: requestData.dietaryRestrictions.diet_type
      },
      spice_tolerance: requestData.userProfile.spice_tolerance,
      equipment_available: ['燃气灶', '微波炉'] // 默认设备
    },
    available_ingredients: requestData.selectedIngredients
  };

  // 将用户数据插入到提示词中
  return (
    promptTemplate +
    '\n\n# 用户输入数据\n\n' +
    JSON.stringify(userData, null, 2) +
    '\n\n请根据以上用户数据生成食谱，严格按照JSON Schema格式返回。'
  );
}

// 请求验证函数
function validateRecipeRequest(requestData) {
  // 检查必需字段
  if (
    !requestData.selectedIngredients ||
    requestData.selectedIngredients.length === 0
  ) {
    return { valid: false, message: '请至少选择一种食材' };
  }

  if (!requestData.userProfile || !requestData.userProfile.serving_size) {
    return { valid: false, message: '用户档案信息不完整' };
  }

  // 检查食材数据格式
  for (const ingredient of requestData.selectedIngredients) {
    if (!ingredient.name || !ingredient.quantity) {
      return { valid: false, message: '食材信息不完整' };
    }
  }

  return { valid: true };
}

// Gemini响应解析
function parseGeminiResponse(response) {
  try {
    const text = response.candidates[0].content.parts[0].text;

    // 尝试解析JSON
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonText = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonText);

      // 如果是嵌套的recipe_recommendations格式，提取主食谱
      if (
        parsed.recipe_recommendations &&
        parsed.recipe_recommendations.main_recipes &&
        parsed.recipe_recommendations.main_recipes.length > 0
      ) {
        return parsed.recipe_recommendations.main_recipes[0];
      }

      return parsed;
    }

    throw new Error('无法解析Gemini返回的JSON格式');
  } catch (error) {
    console.error('解析Gemini响应失败:', error);
    throw new Error('AI返回格式错误，请重试');
  }
}

// 食谱生成API主处理函数
async function handleRecipeGeneration(request, env) {
  try {
    const requestData = await request.json();

    // 数据验证
    const validation = validateRecipeRequest(requestData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.message }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 构建提示词
    const prompt = buildRecipePrompt(requestData);

    // 调用Gemini API
    const model = requestData.selectedModel || 'gemini-2.5-pro';
    const response = await callGeminiAPI(prompt, model, env);

    // 解析并返回结果
    const recipe = parseGeminiResponse(response);

    return new Response(JSON.stringify(recipe), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('API错误:', error);
    return new Response(
      JSON.stringify({
        error: '食谱生成失败，请稍后重试',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
