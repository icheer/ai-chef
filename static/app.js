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
      await this.$nextTick();
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
        this.showSuccessMessage(`已添加 ${name}`);
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
              ? `请在 ${Math.ceil(result.reset_in_seconds / 60)} 分钟后重试`
              : '请稍后重试';
            throw new Error(
              `${result.error || '本小时已达模型调用上限'} (模型: ${
                result.model
              } 已用 ${result.used}/${result.limit})，${retryMsg}`
            );
          }
          throw new Error(result.error || '请求失败');
        }

        this.recipeResult = result; // result 里现在包含 _usage
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
        this.showErrorMessage(
          `生成失败: ${error.message}<br><br><small>模型针对免费层级用户劣化体验，偶尔会调用失败。请稍后（保持克制的）重试</small>`
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
        const dimText = `${canvas.width}x${canvas.height}`;

        await Swal.fire({
          title: '📱 食谱分享图片',
          html: `
            <div style="text-align: center; margin: 16px 0;">
              <img src="${dataURL}" 
                   class="share-preview-img"
                   style="max-width: 100%; max-height: 440px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); -webkit-touch-callout: default; user-select: auto;" 
                   alt="食谱截图">
              <p style="margin-top:12px;font-size:12px;color:#666;line-height:1.4;">JPEG | 尺寸: ${dimText} | 体积: ${sizeKB}KB</p>
            </div>
          `,
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
        link.download = `${
          this.recipeResult?.recipe_name || '食谱'
        }_${Date.now()}.jpg`;
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
            `食谱_${Date.now()}.${blob.type === 'image/jpeg' ? 'jpg' : 'png'}`,
            {
              type: blob.type || 'image/jpeg'
            }
          );
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: '🍳 我的智能食谱',
              text: `${
                this.recipeResult.recipe_name || '美味食谱'
              } - 用AI生成的美味食谱！`,
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
        ? `上次保存: ${new Date(this.lastSaveTime).toLocaleString()}`
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
