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
        this.showSuccessMessage(`${name} 数量已增加`);
      } else {
        this.selectedIngredients.push({
          name: name,
          quantity: 1,
          unit: this.getDefaultUnit(category),
          freshness: '新鲜',
          category: category
        });
        this.showSuccessMessage(`已添加 ${name}`);
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
      this.showSuccessMessage(`已移除 ${ingredient.name}`);
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
        this.$nextTick(() => {
          const resultElement = document.querySelector('.recipe-result');
          if (resultElement) {
            resultElement.scrollIntoView({ 
              behavior: 'smooth' 
            });
          }
        });
        
      } catch (error) {
        console.error('生成食谱失败:', error);
        this.showErrorMessage(`生成失败: ${error.message}`);
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
          const file = new File([blob], `食谱_${Date.now()}.png`, { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) {
            // 移动端：使用Web Share API
            await navigator.share({
              title: '我的智能食谱',
              text: `${this.recipeResult.recipe_name || '美味食谱'} - 用AI生成的美味食谱！`,
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
        link.download = `${this.recipeResult.recipe_name || '食谱'}_${new Date().getTime()}.png`;
        
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
        `上次保存: ${new Date(this.lastSaveTime).toLocaleString()}` : 
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
