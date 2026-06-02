// 静态文件内容 - 在部署前会被替换为实际内容
const staticFiles = {
  '/': `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>智能食谱生成器</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/sweetalert2@11"></script>
    <script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <link rel="stylesheet" href="./styles.css?v=12" />
  </head>
  <body>
    <div id="app">

      <header class="app-header">
        <h1>智能食谱生成器</h1>
        <p class="subtitle">告诉我冰箱里有什么，我来决定今天吃什么</p>
        <div class="save-status" v-if="lastSaveTime">
          <small>{{ lastSaveText }}</small>
        </div>
      </header>

      <section class="user-profile">
        <h2>基本设置</h2>
        <div class="profile-form">
          <div class="form-row">
            <label>用餐人数</label>
            <div class="quantity-control">
              <button @click="userProfile.serving_size = Math.max(1, userProfile.serving_size - 1)">−</button>
              <input type="number" v-model.number="userProfile.serving_size" min="1" max="10" style="flex:1 1 0" />
              <button @click="userProfile.serving_size = Math.min(10, userProfile.serving_size + 1)">+</button>
            </div>
          </div>

          <div class="form-row">
            <label>烹饪技能</label>
            <select v-model="userProfile.cooking_skill">
              <option value="初级">初级</option>
              <option value="中级">中级</option>
              <option value="高级">高级</option>
            </select>
          </div>

          <div class="form-row">
            <label>可用时间</label>
            <div style="display:flex;align-items:center;gap:.5rem;flex:1">
              <div class="quantity-control" style="flex:1">
                <button @click="userProfile.time_available = Math.max(5, userProfile.time_available - 5)">−</button>
                <input type="number" v-model.number="userProfile.time_available" min="5" max="180" style="flex:1 1 0" />
                <button @click="userProfile.time_available = Math.min(180, userProfile.time_available + 5)">+</button>
              </div>
              <span class="unit">分钟</span>
            </div>
          </div>

          <div class="form-row">
            <label>菜系偏好</label>
            <div class="cuisine-options">
              <button
                v-for="c in cuisineOptions"
                :key="c"
                type="button"
                class="ingredient-btn"
                :class="{ selected: userProfile.cuisine_preferences.includes(c) }"
                @click="userProfile.cuisine_preferences.includes(c)
                  ? userProfile.cuisine_preferences.splice(userProfile.cuisine_preferences.indexOf(c), 1)
                  : userProfile.cuisine_preferences.push(c)"
              >{{ c }}</button>
            </div>
          </div>

          <div class="form-row">
            <label>辣度</label>
            <select v-model="userProfile.spice_tolerance">
              <option value="不辣">不辣</option>
              <option value="微辣">微辣</option>
              <option value="中辣">中辣</option>
              <option value="重辣">重辣</option>
            </select>
          </div>
        </div>
      </section>

      <section class="dietary-restrictions">
        <h2>饮食限制</h2>
        <div class="restrictions-form">
          <div class="form-row">
            <label>过敏食材</label>
            <input type="text" v-model="dietaryRestrictions.allergies" placeholder="花生、海鲜（逗号分隔）" />
          </div>
          <div class="form-row">
            <label>不耐受</label>
            <input type="text" v-model="dietaryRestrictions.intolerances" placeholder="乳糖、麸质（逗号分隔）" />
          </div>
          <div class="form-row">
            <label>不喜欢</label>
            <input type="text" v-model="dietaryRestrictions.dislikes" placeholder="香菜、苦瓜（逗号分隔）" />
          </div>
          <div class="form-row">
            <label>饮食类型</label>
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

      <section class="ingredient-selection">
        <h2>选择食材</h2>
        <div class="ingredient-categories">
          <div v-for="(ingredients, category) in ingredientCategories" :key="category" class="category">
            <h4>{{ category }}</h4>
            <div class="ingredient-buttons">
              <button
                v-for="ingredient in ingredients"
                :key="ingredient"
                @click="addIngredient(ingredient, category)"
                class="ingredient-btn"
                :class="{ selected: isIngredientSelected(ingredient) }"
              >{{ ingredient }}</button>
            </div>
          </div>
        </div>
        <div class="add-custom">
          <input type="text" v-model="customIngredientName" placeholder="其他食材" @keyup.enter="addCustomIngredient" />
          <button @click="addCustomIngredient" class="btn-secondary">添加</button>
        </div>
      </section>

      <section class="selected-ingredients">
        <h2>已选食材（{{ ingredientCount }} 种）</h2>
        <div v-if="ingredientCount === 0" class="empty-state">
          从上方选择食材，或手动输入
        </div>
        <div v-else class="ingredients-list">
          <div v-for="(ingredient, index) in selectedIngredients" :key="index" class="ingredient-item">
            <span class="name">{{ ingredient.name }}</span>
            <div class="quantity-unit-wrapper">
              <div class="quantity-control">
                <button @click="updateIngredientQuantity(index, ingredient.quantity - 0.5)">−</button>
                <input
                  type="number"
                  v-model.number="ingredient.quantity"
                  @input="updateIngredientQuantity(index, \$event.target.value)"
                  min="0"
                  step="0.1"
                />
                <button @click="updateIngredientQuantity(index, ingredient.quantity + 0.5)">+</button>
              </div>
              <select v-model="ingredient.unit">
                <option value="个">个</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
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

      <section class="generation-controls">
        <h2>生成设置</h2>
        <div class="model-selection">
          <label>模型</label>
          <select v-model="selectedModel">
            <option value="google/gemini-3.1-flash-lite">Gemini 3.1 Flash Lite（最快）</option>
            <option value="google/gemini-3.5-flash">Gemini 3.5 Flash（推荐）</option>
            <option value="google/gemini-3.1-pro-preview" disabled>Gemini 3.1 Pro（暂不可用）</option>
          </select>
        </div>
        <button @click="generateRecipe" :disabled="!formIsValid || isLoading" class="generate-btn">
          <span v-if="isLoading">生成中...</span>
          <span v-else>生成食谱</span>
        </button>
        <div class="data-controls">
          <button @click="clearLocalStorage" class="btn-danger" :disabled="isLoading">清除保存数据</button>
        </div>
      </section>

      <section v-if="showResult || isLoading" class="recipe-result">
        <div v-if="isLoading" class="recipe-loading">
          <h3>正在生成食谱</h3>
          <p>根据您的食材与偏好规划菜谱，请稍候</p>
          <div class="loading-bars">
            <span v-for="n in 5" :key="n" class="bar" :style="{ animationDelay: (n * 0.12) + 's' }"></span>
          </div>
        </div>

        <template v-else>
          <header class="recipe-header">
            <h1 class="recipe-title">{{ recipeResult.recipe_name || '美味食谱' }}</h1>
            <div class="recipe-meta">
              <span>{{ recipeResult.cooking_time || 30 }} 分钟</span>
              <span>{{ recipeResult.difficulty || '简单' }}</span>
              <span>{{ recipeResult.serving_size || userProfile.serving_size }} 人份</span>
              <span v-if="recipeResult.cuisine_style">{{ recipeResult.cuisine_style }}</span>
            </div>
            <p class="recipe-description">{{ recipeResult.description || '一道美味的家常菜' }}</p>
            <div v-show="!isCapturing" class="recipe-actions">
              <button @click="shareRecipe" class="btn-secondary">分享</button>
              <button @click="generateNewRecipe" class="btn-secondary">重新生成</button>
            </div>
          </header>

          <div v-if="recipeResult.nutrition_info" class="nutrition-section">
            <h3>营养信息</h3>
            <div class="nutrition-grid">
              <div class="nutrition-item">
                <span class="label">热量</span>
                <span class="value">{{ recipeResult.nutrition_info.calories_per_serving || '—' }}</span>
              </div>
              <div class="nutrition-item">
                <span class="label">蛋白质</span>
                <span class="value">{{ recipeResult.nutrition_info.protein || '—' }}</span>
              </div>
              <div class="nutrition-item">
                <span class="label">碳水</span>
                <span class="value">{{ recipeResult.nutrition_info.carbs || '—' }}</span>
              </div>
              <div class="nutrition-item">
                <span class="label">脂肪</span>
                <span class="value">{{ recipeResult.nutrition_info.fats || '—' }}</span>
              </div>
            </div>
          </div>

          <div v-if="recipeResult.ingredients" class="ingredients-section">
            <h3>所需食材</h3>
            <ul class="ingredients-list">
              <li v-for="ingredient in recipeResult.ingredients" :key="ingredient.name" class="ingredient-row">
                <span class="ingredient-amount">{{ ingredient.quantity || ingredient.amount }} {{ ingredient.unit }}</span>
                <span class="ingredient-name">{{ ingredient.name }}</span>
                <span v-if="ingredient.notes || ingredient.role" class="ingredient-notes">{{ ingredient.notes || ingredient.role }}</span>
              </li>
            </ul>
          </div>

          <div v-if="recipeResult.cooking_steps" class="cooking-steps-section">
            <h3>烹饪步骤</h3>
            <div class="steps-container">
              <div v-for="(step, index) in recipeResult.cooking_steps" :key="index" class="cooking-step">
                <div class="step-number">{{ step.step || (index + 1) }}</div>
                <div class="step-content">
                  <h4 v-if="step.action" class="step-title">{{ step.action }}</h4>
                  <p class="step-instruction">{{ step.description || step.instruction }}</p>
                  <p v-if="step.time" class="step-time">{{ step.time }}</p>
                  <p v-if="step.tips" class="step-tip">{{ step.tips }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="recipeResult.chef_tips && recipeResult.chef_tips.length > 0" class="tips-section">
            <h3>厨师建议</h3>
            <ul class="tips-list">
              <li v-for="tip in recipeResult.chef_tips" :key="tip">{{ tip }}</li>
            </ul>
          </div>

          <div v-if="recipeResult.variations && recipeResult.variations.length > 0" class="variations-section">
            <h3>变化建议</h3>
            <ul class="variations-list">
              <li v-for="variation in recipeResult.variations" :key="variation">{{ variation }}</li>
            </ul>
          </div>
        </template>
      </section>

    </div>
    <script src="./app.js?v=21"></script>
  </body>
</html>
`,
  '/styles.css': `/* ========== 1. 字体 ========== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ========== 2. CSS 变量 ========== */
:root {
  --color-bg:             #f2f6f2;
  --color-surface:        #fcfcfc;
  --color-surface-2:      #eaeeea;
  --color-border:         #d0d9d0;
  --color-border-strong:  #adbdad;
  --color-text-primary:   #1e2b1e;
  --color-text-secondary: #4a5e4a;
  --color-text-muted:     #7a917a;
  --color-accent:         #3d8c5e;
  --color-accent-dark:    #2f7050;
  --color-accent-subtle:  #e4f0e8;
  --color-accent-text:    #2a6644;
  --color-danger:         #c0392b;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --transition: 0.12s ease-out;

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ========== 3. Reset & 全局 ========== */
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

body {
  font-family: var(--font);
  background: var(--color-bg);
  color: var(--color-text-primary);
  line-height: 1.5;
  font-size: 0.9375rem;
  -webkit-font-smoothing: antialiased;
}

img { max-width: 100%; display: block; }
a { color: var(--color-accent); text-decoration: none; }
button { font-family: var(--font); }
*:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* ========== 4. 布局 ========== */
#app { max-width: 720px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }

section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}

section h2, section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

/* ========== 5. 页头 ========== */
.app-header {
  padding: 1.5rem 0 1.25rem;
  margin-bottom: 0.25rem;
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.save-status {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* ========== 6. 表单 ========== */
.profile-form, .restrictions-form { display: flex; flex-direction: column; gap: 0.75rem; }

.form-row { display: flex; align-items: center; gap: 0.75rem; }

.form-row label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-family: var(--font);
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: border-color var(--transition), box-shadow var(--transition);
  min-height: 36px;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-subtle);
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;
  padding-right: 2rem;
  cursor: pointer;
}

input[type=number] { text-align: center; }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }

.unit {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* ========== 7. 按钮 ========== */
button {
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: background var(--transition), border-color var(--transition), color var(--transition);
  white-space: nowrap;
}

button:hover { background: var(--color-surface-2); border-color: var(--color-border-strong); }
button:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-secondary { color: var(--color-text-secondary); }
.btn-secondary:hover { color: var(--color-text-primary); }

.btn-danger {
  background: transparent;
  border-color: transparent;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  padding: 0.375rem 0.625rem;
}
.btn-danger:hover { color: var(--color-danger); border-color: #ddc8c5; background: #fdf0ee; }

.generate-btn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 0.625rem 2rem;
  border-radius: var(--radius-md);
}
.generate-btn:hover:not(:disabled) { background: var(--color-accent-dark); }

/* ========== 8. 食材选择 ========== */
.ingredient-categories { display: grid; gap: 0.875rem; margin-bottom: 1rem; }

.category {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
}

.category h4 {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.625rem;
}

.ingredient-buttons { display: flex; flex-wrap: wrap; gap: 0.375rem; }

.ingredient-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.3125rem 0.75rem;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--color-text-primary);
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}

.ingredient-btn:hover {
  background: var(--color-accent-subtle);
  color: var(--color-accent-text);
  border-color: #b0cfb5;
}

.ingredient-btn.selected {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
  font-weight: 500;
}

.cuisine-options { display: flex; flex-wrap: wrap; gap: 0.375rem; }

.add-custom {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--color-border);
}
.add-custom input { flex: 1; }

/* ========== 9. 已选食材 ========== */
.empty-state {
  text-align: center;
  padding: 1.5rem 1rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.ingredients-list { display: flex; flex-direction: column; gap: 0.5rem; }

.ingredient-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 2.25rem 0.625rem 0.875rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition);
}

.ingredient-item:hover { border-color: var(--color-border-strong); }
.ingredient-item:hover .remove-btn { opacity: 1; }

.ingredient-item .name {
  font-weight: 500;
  font-size: 0.875rem;
  flex: 1;
  min-width: 60px;
}

.quantity-unit-wrapper { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

.quantity-control {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  flex-shrink: 0;
}

.quantity-control button {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
  font-weight: 400;
}
.quantity-control button:hover { background: var(--color-surface-2); color: var(--color-text-primary); }

.quantity-control input {
  width: 48px;
  min-width: 48px;
  background: transparent;
  border: none;
  font-weight: 500;
  font-size: 0.875rem;
  min-height: unset;
  padding: 0.25rem 0;
}
.quantity-control input:focus { box-shadow: none; }

.remove-btn {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  line-height: 1;
  opacity: 0;
  transition: opacity var(--transition), color var(--transition);
  border-radius: 3px;
}
.remove-btn:hover { color: var(--color-danger); background: transparent; }
.remove-btn::before { content: '×'; }

/* ========== 10. 生成控制 ========== */
.generation-controls { text-align: center; }

.model-selection { margin-bottom: 1rem; text-align: left; }
.model-selection label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.375rem;
}

.data-controls { margin-top: 0.875rem; }

/* ========== 11. 食谱展示 ========== */
.recipe-result {
  margin-top: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.recipe-header {
  background: var(--color-accent-subtle);
  border-bottom: 1px solid #cddece;
  padding: 1.5rem;
}

.recipe-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  margin-bottom: 0.625rem;
  line-height: 1.3;
}

.recipe-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 1rem;
  margin-bottom: 0.75rem;
}

.recipe-meta span {
  font-size: 0.8125rem;
  color: var(--color-accent-text);
  font-weight: 500;
}

.recipe-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 60ch;
}

.recipe-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* ========== 12. 食谱内容分区 ========== */
.nutrition-section,
.ingredients-section,
.cooking-steps-section,
.tips-section,
.variations-section {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.nutrition-section:last-child,
.ingredients-section:last-child,
.cooking-steps-section:last-child,
.tips-section:last-child,
.variations-section:last-child { border-bottom: none; }

.nutrition-section h3,
.ingredients-section h3,
.cooking-steps-section h3,
.tips-section h3,
.variations-section h3 {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.875rem;
  padding-bottom: 0;
  border-bottom: none;
}

/* 营养信息 */
.nutrition-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }

.nutrition-item {
  background: var(--color-bg);
  padding: 0.75rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
}

.nutrition-item .label {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
}

.nutrition-item .value {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent-text);
}

/* 食材列表 */
.ingredients-section .ingredients-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ingredient-row {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}
.ingredient-row:last-child { border-bottom: none; }

.ingredient-amount {
  font-size: 0.8125rem;
  color: var(--color-accent);
  font-weight: 600;
  min-width: 56px;
}

.ingredient-name { font-weight: 500; flex: 1; }

.ingredient-notes {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* 烹饪步骤 */
.steps-container { display: flex; flex-direction: column; gap: 0; }

.cooking-step {
  display: flex;
  gap: 1rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid var(--color-border);
}
.cooking-step:last-child { border-bottom: none; }
.cooking-step:first-child { padding-top: 0; }

.step-number {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.step-content { flex: 1; font-size: 0.875rem; line-height: 1.6; }

.step-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.step-instruction { color: var(--color-text-secondary); margin-bottom: 0.25rem; }

.step-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.375rem;
}

.step-tip {
  background: var(--color-accent-subtle);
  padding: 0.375rem 0.625rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-accent-text);
  margin-top: 0.375rem;
}

/* 小贴士 & 变化建议 */
.tips-list, .variations-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tips-list li, .variations-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
}
.tips-list li:last-child, .variations-list li:last-child { border-bottom: none; }

/* ========== 13. Loading ========== */
.recipe-loading { text-align: center; padding: 2.5rem 1rem; }

.recipe-loading h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.375rem;
}

.recipe-loading p {
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.loading-bars { display: flex; justify-content: center; gap: 0.3rem; margin-top: 1.5rem; }

.loading-bars .bar {
  width: 3px;
  height: 20px;
  background: var(--color-accent);
  border-radius: 2px;
  opacity: 0.25;
  animation: barPulse 0.9s ease-in-out infinite;
}

@keyframes barPulse {
  0%, 100% { transform: scaleY(0.3); opacity: 0.2; }
  50%       { transform: scaleY(1);   opacity: 0.75; }
}

/* ========== 14. 分享弹窗 ========== */
.swal2-popup.share-popup { border-radius: 10px !important; }
.swal2-popup.share-popup img { display: inline-block; border-radius: 6px; }
.swal2-popup.share-popup .share-preview-img {
  -webkit-user-select: auto !important;
  user-select: auto !important;
  -webkit-touch-callout: default !important;
  pointer-events: auto !important;
}
.swal2-popup.share-popup { -webkit-user-select: none; user-select: none; }
.swal2-popup.share-popup .swal2-close { position: relative !important; }

/* ========== 15. 响应式 ========== */
@media (max-width: 767px) {
  #app { padding: 1rem 0.875rem 2.5rem; }
  .app-header { padding: 1.25rem 0 1rem; }
  .app-header h1 { font-size: 1.25rem; }
  section { padding: 1rem 1.125rem; }
  .ingredient-categories { grid-template-columns: 1fr; gap: 0.625rem; }
  .form-row { flex-wrap: wrap; }
  .form-row label { min-width: unset; width: 100%; }
  .nutrition-grid { grid-template-columns: repeat(2, 1fr); }
  .recipe-header { padding: 1.25rem; }
  .recipe-title { font-size: 1.125rem; }
  .nutrition-section, .ingredients-section, .cooking-steps-section, .tips-section, .variations-section { padding: 1rem 1.125rem; }
  .recipe-actions { flex-direction: column; }
  .recipe-actions button { width: 100%; }
  .remove-btn { opacity: 1; }
}

@media (min-width: 768px) {
  .ingredient-categories { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
}

/* ========== 16. 打印 ========== */
@media print {
  body { background: #fff; }
  .app-header, .generation-controls, .ingredient-selection, .selected-ingredients, button { display: none !important; }
  .recipe-result { box-shadow: none; border: none; margin: 0; }
  .cooking-step, .ingredient-row, .tips-list li, .variations-list li { page-break-inside: avoid; }
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
        蛋白质: [
          '鸡蛋',
          '鸡胸肉',
          '猪肉',
          '牛肉',
          '羊肉',
          '豆腐',
          '鱼肉',
          '虾',
          '鸡腿',
          '火腿肠'
        ],
        蔬菜: [
          '番茄',
          '土豆',
          '胡萝卜',
          '白菜',
          '青菜',
          '西兰花',
          '茄子',
          '洋葱',
          '青椒',
          '黄瓜'
        ],
        主食: [
          '大米',
          '面条',
          '面粉',
          '馒头',
          '小米',
          '玉米',
          '面包',
          '意大利面',
          '年糕',
          '粉丝'
        ],
        干货: [
          '木耳',
          '银耳',
          '紫菜',
          '干香菇',
          '海带',
          '红枣',
          '枸杞',
          '花生'
        ],
        其他: [
          '大葱',
          '姜',
          '蒜',
          '香菜',
          '柠檬',
          '奶酪',
          '黄油',
          '果酱',
          '蜂蜜',
          '酸黄瓜'
        ]
      },

      // 菜系偏好选项
      cuisineOptions: ['中式', '西式', '日式', '韩式', '东南亚'],

      // 应用状态
      isLoading: false,
      selectedModel: 'google/gemini-3.5-flash',
      recipeResult: null,
      showResult: false,
      isCapturing: false,

      // localStorage相关
      storageKey: 'smart-recipe-generator',
      lastSaveTime: null,
      _saveTimer: null
    };
  },

  methods: {
    // ======= 简化截图实现（参考 guide 页面写法，提升稳定性） =======
    async captureRecipeCanvas(element) {
      await this.\$nextTick();
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
      await new Promise(r => setTimeout(r, 50));
      const width = Math.ceil(element.scrollWidth);
      const height = Math.ceil(element.scrollHeight);
      const scale = Math.min(2, window.devicePixelRatio || 1);
      return await html2canvas(element, {
        backgroundColor: '#fcfcfc',
        scale,
        useCORS: true,
        allowTaint: false,
        width,
        height,
        logging: false
      });
    },

    // 食材管理方法
    addIngredient(name, category = '其他', isForceAdd = false) {
      const existing = this.selectedIngredients.find(
        item => item.name === name
      );
      if (existing) {
        if (!isForceAdd) {
          // 移除食材
          this.removeIngredient(this.selectedIngredients.indexOf(existing));
        }
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
        蛋白质: '个',
        蔬菜: '个',
        主食: 'kg',
        干货: 'kg',
        其他: '个'
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
      return this.selectedIngredients.some(
        item => item.name === ingredientName
      );
    },

    addCustomIngredient() {
      const name = this.customIngredientName.trim();
      if (name) {
        this.addIngredient(name, '其他', true);
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
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 150);

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
          // 特殊处理限流
          if (response.status === 429) {
            const retryMsg = result.reset_in_seconds
              ? \`请在 \${Math.ceil(result.reset_in_seconds / 60)} 分钟后重试\`
              : '请稍后重试';
            throw new Error(
              \`\${result.error || '本小时已达模型调用上限'} (模型: \${
                result.model
              } 已用 \${result.used}/\${result.limit})，\${retryMsg}\`
            );
          }
          throw new Error(result.error || '请求失败');
        }

        this.recipeResult = result; // result 里现在包含 _usage
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
        this.showErrorMessage(
          \`生成失败: \${error.message}<br><br><small>模型针对免费层级用户劣化体验，偶尔会调用失败。请稍后（保持克制的）重试</small>\`
        );
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
        html: message,
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

      if (
        this.userProfile.serving_size < 1 ||
        this.userProfile.serving_size > 10
      ) {
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
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this._doSave(), 300);
    },

    _doSave() {
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
          this.dietaryRestrictions = {
            ...this.dietaryRestrictions,
            ...data.dietaryRestrictions
          };
          this.selectedIngredients = data.selectedIngredients || [];
          this.selectedModel = data.selectedModel || 'google/gemini-3.5-flash';

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
        reverseButtons: true,
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        confirmButtonColor: '#E74C3C'
      }).then(result => {
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

        this.isCapturing = true;
        const canvas = await this.captureRecipeCanvas(recipeElement);
        this.isCapturing = false;
        await this.handleShare(canvas);
      } catch (error) {
        console.error('分享失败:', error);
        this.showErrorMessage('分享失败，请稍后重试');
      }
    },

    // dataURL + Blob 双轨：img 用 dataURL，分享/下载可复用 blob
    async handleShare(canvas) {
      try {
        const quality = 0.9;
        const dataURL = canvas.toDataURL('image/jpeg', quality);
        const blob = this.dataURLToBlob(dataURL);
        const sizeKB = blob ? (blob.size / 1024).toFixed(1) : '未知';
        const dimText = \`\${canvas.width}x\${canvas.height}\`;

        await Swal.fire({
          title: '📱 食谱分享图片',
          html: \`
            <div style="text-align: center; margin: 16px 0;">
              <img src="\${dataURL}" 
                   class="share-preview-img"
                   style="max-width: 100%; max-height: 440px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); -webkit-touch-callout: default; user-select: auto;" 
                   alt="食谱截图">
              <p style="margin-top:12px;font-size:12px;color:#666;line-height:1.4;">JPEG | 尺寸: \${dimText} | 体积: \${sizeKB}KB</p>
            </div>
          \`,
          width: 620,
          padding: '18px',
          showCancelButton: true,
          confirmButtonText: '💾 下载',
          cancelButtonText: navigator.share ? '📤 系统分享' : '❌ 关闭',
          showCloseButton: true,
          allowOutsideClick: false,
          customClass: { popup: 'share-popup', image: 'share-image' },
          didOpen: () => {
            const img = document.querySelector(
              '.swal2-popup.share-popup .share-preview-img'
            );
            if (img) {
              img.style.webkitTouchCallout = 'default';
              img.style.webkitUserSelect = 'auto';
              img.style.userSelect = 'auto';
              img.style.pointerEvents = 'auto';
              img.addEventListener('click', e => e.stopPropagation());
              img.addEventListener('contextmenu', e => e.stopPropagation());
              img.setAttribute('draggable', 'false');
            }
          }
        }).then(async result => {
          if (result.isConfirmed) {
            await this.downloadImage(dataURL);
          } else if (
            result.dismiss === Swal.DismissReason.cancel &&
            navigator.share &&
            blob
          ) {
            await this.systemShare(blob);
          }
        });
      } catch (e) {
        console.error('分享处理失败:', e);
        this.showErrorMessage('分享失败，请稍后重试');
      }
    },

    dataURLToBlob(dataURL) {
      try {
        const arr = dataURL.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8 = new Uint8Array(n);
        while (n--) u8[n] = bstr.charCodeAt(n);
        return new Blob([u8], { type: mime });
      } catch (err) {
        console.warn('dataURL 转 Blob 失败:', err);
        return null;
      }
    },

    async downloadImage(dataURL) {
      try {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = \`\${
          this.recipeResult?.recipe_name || '食谱'
        }_\${Date.now()}.jpg\`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showSuccessMessage('📥 食谱图片已下载！');
      } catch (e) {
        console.error('下载失败:', e);
        this.showErrorMessage('下载失败');
      }
    },

    async systemShare(blob) {
      try {
        if (navigator.share && navigator.canShare) {
          const file = new File(
            [blob],
            \`食谱_\${Date.now()}.\${blob.type === 'image/jpeg' ? 'jpg' : 'png'}\`,
            {
              type: blob.type || 'image/jpeg'
            }
          );
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: '🍳 我的智能食谱',
              text: \`\${
                this.recipeResult.recipe_name || '美味食谱'
              } - 用AI生成的美味食谱！\`,
              files: [file]
            });
            this.showSuccessMessage('📤 分享成功！');
            return;
          }
        }

        // 如果系统分享不可用，降级到下载
        await this.downloadImage(URL.createObjectURL(blob));
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('系统分享失败:', error);
          this.showErrorMessage('系统分享失败，已改为下载到本地');
          await this.downloadImage(URL.createObjectURL(blob));
        }
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
        reverseButtons: true,
        showCancelButton: true,
        confirmButtonText: '确认清除',
        cancelButtonText: '取消'
      }).then(result => {
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
      return this.lastSaveTime
        ? \`上次保存: \${new Date(this.lastSaveTime).toLocaleString()}\`
        : '暂无保存记录';
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
    this.loadFromLocalStorage();
  }
};

// 启动Vue应用
const app = createApp(RecipeGeneratorApp).mount('#app');
`
};

// =============================================
// 模型调用计数（仅当前 Worker 进程内记忆，可能因实例回收而重置）
// 需求：按“整点”统计 gemini-3.1-pro-preview / gemini-3.5-flash 调用次数
// 限额：pro 15 次 / hour, flash 50 次 / hour
// =============================================
const MODEL_LIMITS = {
  'gemini-3.1-pro-preview': 15,
  'gemini-3.5-flash': 50
};

// 保存当前整点 key 及各模型计数
const modelUsageState = {
  hourKey: 0,
  counts: {
    'gemini-3.1-pro-preview': 0,
    'gemini-3.5-flash': 0
  }
};

function checkAndIncreaseModelUsage(model) {
  const now = Date.now();
  const currentHourKey = Math.floor(now / 3600000); // 取整点

  // 跨整点重置
  if (modelUsageState.hourKey !== currentHourKey) {
    modelUsageState.hourKey = currentHourKey;
    modelUsageState.counts['gemini-3.1-pro-preview'] = 0;
    modelUsageState.counts['gemini-3.5-flash'] = 0;
  }

  const limit = MODEL_LIMITS[model] ?? 50; // 未知模型给默认上限 50
  const current = modelUsageState.counts[model] ?? 0;

  if (current >= limit) {
    const resetInSeconds = Math.ceil(
      ((modelUsageState.hourKey + 1) * 3600000 - now) / 1000
    );
    return {
      allowed: false,
      current,
      limit,
      resetInSeconds
    };
  }

  modelUsageState.counts[model] = current + 1; // 记录一次“尝试调用”即计数
  const remaining = limit - (current + 1);
  return {
    allowed: true,
    current: current + 1,
    limit,
    remaining
  };
}

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
  const cacheControl =
    pathname === '/app.js' ? 'no-cache' : 'public, max-age=3600';
  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
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
  const keys = env.GEMINI_API_KEYS;
  if (!keys) return null;
  const apiKeys = keys
    .split(',')
    .map(key => key.trim())
    .filter(key => key);
  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  return apiKeys[randomIndex];
}

// Gemini API调用函数
async function callGeminiAPI(prompt, model, env) {
  const apiKey = getRandomApiKey(env);
  if (!apiKey) throw new Error('未配置有效的环境变量: GEMINI_API_KEYS');
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
    console.error(JSON.stringify(response));
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
        allergies: (requestData.dietaryRestrictions.allergies || '')
          .replace(/(，|、|；|;)/g, ',')
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        intolerances: (requestData.dietaryRestrictions.intolerances || '')
          .replace(/(，|、|；|;)/g, ',')
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        dislikes: (requestData.dietaryRestrictions.dislikes || '')
          .replace(/(，|、|；|;)/g, ',')
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

    // 确认模型并做限流检查
    const model = requestData.selectedModel || 'gemini-3.1-pro-preview';
    const usage = checkAndIncreaseModelUsage(model);
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({
          error: '当前整点该模型调用次数已达上限，请稍后再试',
          model,
          limit: usage.limit,
          used: usage.current,
          reset_in_seconds: usage.resetInSeconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 构建提示词
    const prompt = buildRecipePrompt(requestData);

    // 调用Gemini API
    const response = await callGeminiAPI(prompt, model, env);

    // 解析并返回结果
    const recipe = parseGeminiResponse(response);

    return new Response(
      JSON.stringify({
        ...recipe,
        _usage: {
          model,
          used: usage.current,
          limit: usage.limit,
          remaining: usage.remaining,
          hour_key: modelUsageState.hourKey
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
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
