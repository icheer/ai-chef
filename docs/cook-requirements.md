# 智能食谱生成器应用 - 需求文档

## 项目概述

基于AI技术的智能食谱生成器，用户只需输入家中现有食材，AI即可生成个性化、创意且实用的食谱。应用采用Cloudflare Workers部署，前后端一体化设计，移动优先，兼容PC端。

### 核心价值
- **零浪费厨房**：充分利用现有食材，减少食品浪费
- **创意启发**：提供意想不到的食材搭配灵感
- **个性化定制**：根据用户技能、偏好、时间等个性化生成食谱
- **专业指导**：提供详细的烹饪步骤和厨师级技巧

## 技术架构

### 部署平台
- **Cloudflare Workers**：单一Worker处理前端资源服务和API请求

### 前端技术栈
- **Vue 3.js**：使用Options API风格开发，通过UNPKG CDN引入
- **SweetAlert2**：美观的弹窗和提示组件，通过UNPKG CDN引入  
- **Showdown.js**：Markdown渲染库，用于可能的文档展示需求，通过UNPKG CDN引入
- **html2canvas**：用于食谱分享功能，将页面内容转换为图片，通过UNPKG CDN引入
- **localStorage**：用于数据持久化，保存用户表单数据和食谱结果

### 项目结构
```
smart-recipe-generator/
├── worker.js              # 主Worker服务
├── static/               # 静态资源目录
│   ├── index.html        # 主页面
│   ├── styles.css        # 样式文件
│   └── app.js            # 前端逻辑
├── prompts/
│   └── cook-prompt.md    # AI提示词模板
├── wrangler.toml         # Cloudflare配置
└── README.md
```

### 环境配置
需要在Cloudflare Workers中配置以下环境变量：
- `GEMINI_API_KEYS`: 逗号分隔的Gemini API密钥列表，用于负载均衡
- `GEMINI_BASE_URL`: Gemini API的基础URL

## 功能需求

### 1. 前端用户界面

#### 1.1 页面布局和技术架构
- **Vue 3 Options API**：使用Vue 3框架的Options API风格开发前端应用
- **CDN资源引入**：通过UNPKG CDN引入所有前端依赖库
- **移动优先设计**：主要适配手机屏幕，兼容PC端
- **简洁美观**：避免AI感过强的蓝紫渐变，采用白色/浅色背景
- **响应式设计**：自适应不同屏幕尺寸

#### 1.1.1 HTML页面结构要求
页面必须引入以下CDN资源：
```html
<!DOCTYPE html>
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
  
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="app">
    <!-- Vue应用容器 -->
  </div>
  <script src="/app.js"></script>
</body>
</html>
```

#### 1.2 用户档案输入区域
```html
<!-- 基础信息 -->
用餐人数: <input type="number" min="1" max="10" value="2">
烹饪技能: <select>
  <option value="初级">初级</option>
  <option value="中级">中级</option>
  <option value="高级">高级</option>
</select>

可用时间: <input type="number" min="5" max="180" value="30"> 分钟

菜系偏好: <select multiple>
  <option value="中式">中式</option>
  <option value="西式">西式</option>
  <option value="日式">日式</option>
  <option value="韩式">韩式</option>
  <option value="东南亚">东南亚</option>
</select>

辣度承受: <select>
  <option value="不辣">不辣</option>
  <option value="微辣">微辣</option>
  <option value="中辣">中辣</option>
  <option value="重辣">重辣</option>
</select>
```

#### 1.3 过敏和限制输入
```html
<!-- 饮食限制 -->
过敏食材: <input type="text" placeholder="如：花生、海鲜（逗号分隔）">
不耐受: <input type="text" placeholder="如：乳糖、麸质（逗号分隔）">
不喜欢的食材: <input type="text" placeholder="如：香菜、苦瓜（逗号分隔）">

饮食类型: <select>
  <option value="无特殊要求">无特殊要求</option>
  <option value="素食">素食</option>
  <option value="低碳水">低碳水</option>
  <option value="生酮">生酮</option>
  <option value="高蛋白">高蛋白</option>
</select>
```

#### 1.4 现有食材输入区域
这是应用的核心交互区域，需要特别优化用户体验：

##### 预置食材快捷按钮
```html
<!-- 常见食材分类按钮 -->
<div class="ingredient-categories">
  <div class="category" data-category="蛋白质">
    <h4>蛋白质</h4>
    <button class="ingredient-btn" data-name="鸡蛋">鸡蛋</button>
    <button class="ingredient-btn" data-name="鸡胸肉">鸡胸肉</button>
    <button class="ingredient-btn" data-name="猪肉">猪肉</button>
    <button class="ingredient-btn" data-name="牛肉">牛肉</button>
    <button class="ingredient-btn" data-name="豆腐">豆腐</button>
    <button class="ingredient-btn" data-name="鱼肉">鱼肉</button>
  </div>
  
  <div class="category" data-category="蔬菜">
    <h4>蔬菜</h4>
    <button class="ingredient-btn" data-name="番茄">番茄</button>
    <button class="ingredient-btn" data-name="洋葱">洋葱</button>
    <button class="ingredient-btn" data-name="土豆">土豆</button>
    <button class="ingredient-btn" data-name="胡萝卜">胡萝卜</button>
    <button class="ingredient-btn" data-name="白菜">白菜</button>
    <button class="ingredient-btn" data-name="青菜">青菜</button>
  </div>
  
  <div class="category" data-category="主食">
    <h4>主食</h4>
    <button class="ingredient-btn" data-name="大米">大米</button>
    <button class="ingredient-btn" data-name="面条">面条</button>
    <button class="ingredient-btn" data-name="面粉">面粉</button>
    <button class="ingredient-btn" data-name="馒头">馒头</button>
  </div>
</div>
```

##### 已选食材管理
```html
<!-- 已选择的食材列表 -->
<div class="selected-ingredients">
  <h3>已选择的食材</h3>
  <div id="ingredients-list">
    <!-- 动态生成的食材项 -->
    <div class="ingredient-item">
      <span class="name">鸡蛋</span>
      <div class="quantity-control">
        <button class="minus">-</button>
        <input type="number" value="3" min="0" step="0.1">
        <button class="plus">+</button>
      </div>
      <select class="unit">
        <option value="个">个</option>
        <option value="g">g</option>
        <option value="kg">kg</option>
        <option value="ml">ml</option>
        <option value="L">L</option>
        <option value="茶匙">茶匙</option>
        <option value="汤匙">汤匙</option>
      </select>
      <select class="freshness">
        <option value="新鲜">新鲜</option>
        <option value="一般">一般</option>
        <option value="需尽快使用">需尽快使用</option>
      </select>
      <button class="remove">删除</button>
    </div>
  </div>
  
  <!-- 手动添加食材 -->
  <div class="add-custom-ingredient">
    <input type="text" placeholder="输入食材名称" id="custom-ingredient-name">
    <button id="add-custom">添加</button>
  </div>
</div>
```

#### 1.5 模型选择和生成控制
```html
<div class="generation-controls">
  <label>AI模型选择:</label>
  <select id="model-select">
    <option value="gemini-2.5-flash">Gemini 2.5 Flash (推荐，更快)</option>
    <option value="gemini-2.5-pro" selected>Gemini 2.5 Pro (更强，可能不稳定)</option>
  </select>
  
  <button id="generate-recipe" class="primary-button">
    <span class="button-text">生成食谱</span>
    <span class="loading-spinner" style="display: none;">生成中...</span>
  </button>
</div>
```

#### 1.6 食谱展示区域
```html
<div id="recipe-result" class="recipe-container" style="display: none;">
  <!-- 概要信息 -->
  <div class="recipe-summary">
    <h2 class="recipe-title"></h2>
    <div class="recipe-meta">
      <span class="cooking-time"></span>
      <span class="difficulty"></span>
      <span class="serving-size"></span>
    </div>
    <p class="recipe-description"></p>
  </div>
  
  <!-- 营养信息 -->
  <div class="nutrition-info">
    <h3>营养信息</h3>
    <div class="nutrition-grid">
      <!-- 动态填充营养数据 -->
    </div>
  </div>
  
  <!-- 所需食材 -->
  <div class="recipe-ingredients">
    <h3>所需食材</h3>
    <ul class="ingredients-list">
      <!-- 动态填充食材列表 -->
    </ul>
  </div>
  
  <!-- 烹饪步骤 -->
  <div class="cooking-steps">
    <h3>烹饪步骤</h3>
    <div class="steps-container">
      <!-- 动态填充步骤 -->
    </div>
  </div>
  
  <!-- 厨师小贴士 -->
  <div class="chef-tips">
    <h3>厨师小贴士</h3>
    <ul class="tips-list">
      <!-- 动态填充贴士 -->
    </ul>
  </div>
  
  <!-- 变化建议 -->
  <div class="variations">
    <h3>变化建议</h3>
    <ul class="variations-list">
      <!-- 动态填充变化建议 -->
    </ul>
  </div>
  
  <!-- 食谱分享区域 -->
  <div class="recipe-actions">
    <button @click="shareRecipe" class="btn-secondary">
      📤 分享食谱
    </button>
  </div>
</div>
```

#### 1.7 Vue 3 应用架构 (`static/app.js`)
应用使用Vue 3的Options API风格开发：

```javascript
// app.js - Vue应用主文件
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
      ingredientCategories: {
        '蛋白质': ['鸡蛋', '鸡胸肉', '猪肉', '牛肉', '豆腐', '鱼肉'],
        '蔬菜': ['番茄', '洋葱', '土豆', '胡萝卜', '白菜', '青菜'],
        '主食': ['大米', '面条', '面粉', '馒头']
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
    addIngredient(name, category) {
      // 实现添加食材逻辑
    },
    
    removeIngredient(name) {
      // 实现移除食材逻辑
    },
    
    updateIngredientQuantity(index, quantity) {
      // 实现更新数量逻辑
    },
    
    // API调用方法
    async generateRecipe() {
      this.isLoading = true;
      try {
        const response = await this.callRecipeAPI();
        this.recipeResult = response;
        this.showResult = true;
        this.showSuccessMessage('食谱生成成功！');
      } catch (error) {
        this.showErrorMessage('食谱生成失败，请稍后重试');
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
        timer: 2000
      });
    },
    
    showErrorMessage(message) {
      Swal.fire({
        icon: 'error',
        title: '错误',
        text: message
      });
    },
    
    // 表单验证
    validateForm() {
      if (this.selectedIngredients.length === 0) {
        this.showErrorMessage('请至少选择一种食材');
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
      localStorage.removeItem(this.storageKey);
      this.lastSaveTime = null;
      this.showSuccessMessage('已清除保存的数据');
    },
    
    // 食谱分享功能
    async shareRecipe() {
      if (!this.recipeResult) {
        this.showErrorMessage('请先生成食谱再分享');
        return;
      }
      
      try {
        this.showSuccessMessage('正在生成分享图片...');
        
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
          allowTaint: false
        });
        
        // 转换为图片数据
        canvas.toBlob(async (blob) => {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [blob] })) {
            // 使用Web Share API（移动端优先）
            const file = new File([blob], 'recipe.png', { type: 'image/png' });
            await navigator.share({
              title: '我的智能食谱',
              text: '用AI生成的美味食谱，快来看看！',
              files: [file]
            });
          } else {
            // 降级方案：下载图片
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `食谱_${new Date().getTime()}.png`;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
        
      } catch (error) {
        console.error('分享失败:', error);
        this.showErrorMessage('分享失败，请稍后重试');
      }
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
      return this.lastSaveTime ? `上次保存: ${new Date(this.lastSaveTime).toLocaleString()}` : '暂无保存记录';
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
  }
};

// 启动Vue应用
createApp(RecipeGeneratorApp).mount('#app');
```

#### 1.8 Showdown.js 集成（可选）
如需要渲染Markdown内容（如食谱说明、帮助文档等）：

```javascript
// 在Vue方法中添加Markdown渲染能力
methods: {
  renderMarkdown(markdownText) {
    const converter = new showdown.Converter();
    return converter.makeHtml(markdownText);
  },
  
  // 用于展示食谱中可能的Markdown格式内容
  displayRecipeNotes(notes) {
    if (typeof notes === 'string' && notes.includes('#')) {
      return this.renderMarkdown(notes);
    }
    return notes;
  }
}
```

### 2. 后端API设计

#### 2.1 Worker.js 核心架构
```javascript
// worker.js 主要结构
import { readFileSync } from 'fs';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
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

// 静态文件处理 - 使用readFileSync读取文件
function handleStaticFiles(pathname) {
  const staticFiles = {
    '/': 'static/index.html',
    '/styles.css': 'static/styles.css',
    '/app.js': 'static/app.js'
  };
  
  const filePath = staticFiles[pathname];
  if (!filePath) {
    return new Response('Not Found', { status: 404 });
  }
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const contentType = getContentType(pathname);
    return new Response(content, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}
```

#### 2.2 API密钥负载均衡
```javascript
// Gemini API密钥负载均衡
function getRandomApiKey(env) {
  const apiKeys = env.GEMINI_API_KEYS.split(',').map(key => key.trim());
  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  return apiKeys[randomIndex];
}

// Gemini API调用
async function callGeminiAPI(prompt, model, env) {
  const apiKey = getRandomApiKey(env);
  const baseUrl = env.GEMINI_BASE_URL;
  
  const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })
  });
  
  return response.json();
}
```

#### 2.3 食谱生成API接口
```javascript
// POST /api/generate-recipe
async function handleRecipeGeneration(request, env) {
  try {
    const requestData = await request.json();
    
    // 数据验证
    const validation = validateRecipeRequest(requestData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 构建提示词
    const prompt = buildRecipePrompt(requestData);
    
    // 调用Gemini API
    const model = requestData.model || 'gemini-2.5-pro';
    const response = await callGeminiAPI(prompt, model, env);
    
    // 解析并返回结果
    const recipe = parseGeminiResponse(response);
    
    return new Response(JSON.stringify(recipe), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '食谱生成失败，请稍后重试',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 3. 数据流设计

#### 3.1 请求数据格式
```javascript
// 前端发送给后端的数据格式
const requestPayload = {
  user_profile: {
    serving_size: 2,
    cooking_skill: "初级",
    time_available: 30,
    cuisine_preferences: ["中式", "西式"],
    dietary_restrictions: {
      allergies: ["花生"],
      intolerances: ["乳糖"],
      dislikes: ["香菜"],
      diet_type: "无特殊要求"
    },
    spice_tolerance: "中辣",
    equipment_available: ["燃气灶", "微波炉"]
  },
  available_ingredients: [
    {
      name: "鸡蛋",
      quantity: 6,
      unit: "个",
      freshness: "新鲜",
      storage_type: "冷藏",
      category: "蛋白质"
    },
    {
      name: "番茄",
      quantity: 3,
      unit: "个",
      freshness: "新鲜",
      storage_type: "冷藏", 
      category: "蔬菜"
    }
  ],
  recipe_preferences: {
    meal_type: "晚餐",
    style_preference: "家常菜",
    nutrition_focus: "均衡营养",
    special_occasion: null
  },
  model: "gemini-2.5-pro"
};
```

#### 3.2 响应数据格式
按照cook-prompt.md中定义的JSON Schema返回结构化的食谱数据。

#### 3.3 数据持久化策略
应用需要实现完整的本地数据持久化：

- **自动保存**: 用户输入数据时自动保存到localStorage
- **自动恢复**: 页面加载时自动读取上次保存的数据
- **数据范围**: 包括表单数据、食材选择、食谱结果等所有状态
- **存储格式**: JSON格式存储，包含时间戳便于管理
- **错误处理**: localStorage操作失败时的降级处理

#### 3.4 食谱分享功能实现
- **html2canvas集成**: 将食谱内容转换为高清图片
- **多端适配**: 优先使用Web Share API（移动端），降级到下载（PC端）
- **图片质量**: 2倍缩放提高清晰度，白色背景优化视觉效果
- **用户体验**: 分享过程提供Loading提示和错误处理

### 4. UI/UX设计要求

#### 4.1 设计原则
- **Vue 3 响应式设计**：充分利用Vue的响应式数据绑定和组件化优势
- **移动优先**：主要适配手机端，按钮大小适合触摸操作
- **简洁清爽**：避免过度设计，白色/浅灰色背景
- **直观易用**：减少用户学习成本，操作流程清晰
- **快速响应**：提供Loading状态，用户操作有即时反馈
- **SweetAlert2集成**：所有提示和确认对话框使用SweetAlert2实现

#### 4.2 色彩搭配
```css
/* 推荐色彩方案 */
:root {
  --primary-color: #2ECC71;      /* 绿色主色调，象征新鲜食材 */
  --secondary-color: #F39C12;    /* 橙色辅色，象征温暖厨房 */
  --background-color: #FFFFFF;   /* 纯白背景 */
  --light-gray: #F8F9FA;         /* 浅灰背景 */
  --text-primary: #2C3E50;       /* 深灰文字 */
  --text-secondary: #7F8C8D;     /* 灰色辅助文字 */
  --border-color: #E0E6ED;       /* 边框颜色 */
  --danger-color: #E74C3C;       /* 错误/删除颜色 */
}
```

#### 4.3 交互设计
- **Vue数据绑定**：所有表单元素使用v-model进行双向数据绑定
- **食材选择**：点击按钮添加，已选择的按钮变色提示
- **数量调整**：支持点击+/-按钮和直接输入数字
- **实时验证**：必填项验证，提供友好错误提示
- **生成过程**：显示Loading动画，禁用生成按钮防止重复提交
- **SweetAlert2提示**：成功/错误/警告提示统一使用SweetAlert2
- **Vue过渡效果**：页面切换和内容显示使用Vue的transition组件
- **数据持久化提示**：显示最后保存时间，让用户了解数据同步状态
- **分享交互**：分享按钮提供视觉反馈，支持移动端和PC端不同的分享方式

### 5. 性能和安全要求

#### 5.1 性能优化
- **静态资源优化**：CSS/JS文件压缩
- **API响应缓存**：相同输入的结果可考虑短期缓存
- **错误处理**：网络异常时提供重试机制
- **localStorage优化**：数据压缩存储，定期清理过期数据
- **html2canvas优化**：合理的缩放比例和渲染选项，避免内存溢出

#### 5.2 安全考虑
- **API密钥保护**：密钥存储在环境变量中，不暴露给前端
- **输入验证**：后端验证所有用户输入，防止注入攻击
- **CORS设置**：适当的跨域设置

## 开发优先级

### Phase 1: 核心功能 (MVP)
1. 基础Worker架构和静态文件服务
2. Vue 3应用框架搭建和CDN资源集成（包括html2canvas）
3. 基本的食材选择界面（Vue Options API实现）
4. localStorage数据持久化（自动保存和恢复功能）
5. Gemini API集成和食谱生成
6. SweetAlert2集成和基础提示功能
7. 简单的食谱展示
8. 基础食谱分享功能（html2canvas实现）

### Phase 2: 用户体验优化
1. 预置食材按钮和快捷操作（Vue响应式实现）
2. 美观的UI设计和响应式布局
3. 完善的SweetAlert2错误处理和Loading状态
4. 模型选择功能
5. Vue过渡动画和交互优化
6. 数据保存状态显示和管理功能
7. 分享功能优化（移动端Web Share API支持）

### Phase 3: 高级功能
1. 高级数据管理（数据导出/导入、清理功能）
2. 用户偏好学习和智能推荐
3. 更丰富的食材数据库
4. Showdown.js集成（如需Markdown渲染）
5. 分享功能增强（自定义分享样式、水印等）
6. 性能优化和缓存机制
7. PWA功能（基于Vue 3 + localStorage离线支持）

## 部署配置

### Cloudflare Workers 配置
```toml
# wrangler.toml
name = "smart-recipe-generator"
compatibility_date = "2024-01-01"

[env.production.vars]
# 在 Cloudflare Dashboard 中配置敏感信息
# GEMINI_API_KEYS = "key1,key2,key3"
# GEMINI_BASE_URL = "https://generativelanguage.googleapis.com"
```

这个需求文档将为后续的分步骤开发实施提供详细的指导，确保项目能够高效、有序地推进。
