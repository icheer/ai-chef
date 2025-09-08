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
          '豆腐',
          '鱼肉',
          '虾',
          '鸡腿',
          '培根'
        ],
        蔬菜: [
          '番茄',
          '洋葱',
          '土豆',
          '胡萝卜',
          '白菜',
          '青菜',
          '西兰花',
          '茄子',
          '青椒',
          '黄瓜'
        ],
        主食: [
          '大米',
          '面条',
          '面粉',
          '馒头',
          '面包',
          '意大利面',
          '年糕',
          '粉丝'
        ],
        调料: [
          '盐',
          '生抽',
          '老抽',
          '料酒',
          '香油',
          '胡椒粉',
          '八角',
          '桂皮',
          '花椒',
          '辣椒粉'
        ],
        其他: [
          '食用油',
          '白糖',
          '醋',
          '蒜',
          '姜',
          '葱',
          '香菜',
          '柠檬',
          '奶酪',
          '黄油'
        ]
      },

      // 应用状态
      isLoading: false,
      selectedModel: 'gemini-2.5-flash',
      recipeResult: null,
      showResult: false,
      isCapturing: false,

      // localStorage相关
      storageKey: 'smart-recipe-generator',
      lastSaveTime: null
    };
  },

  methods: {
    // ============ 图片压缩相关配置 ============
    getShareImageConfig() {
      return {
        // 独立控制宽高，避免超长页面因高度被强行缩到 maxLongSide 而把宽度一起压缩
        maxWidth: 1080,     // 期望最大导出宽度（分享清晰度）
        maxHeight: 6000,    // 允许较长的长图
        minWidth: 600,      // 不希望最终低于的可读宽度（<600 时放弃按高度缩放）
        maxBytes: 8 * 1024 * 1024, // 最终目标最大体积（8MB，远低于 25MB 安全阈值）
        minQuality: 0.5, // JPEG 最低质量兜底
        initialQuality: 0.9, // 起始 JPEG 质量
        qualityStep: 0.1 // 每次降低步长
      };
    },

    // 根据独立宽高限制缩放（避免 169x1600 这种被高度牵连的过窄宽度）
    downscaleCanvasIfNeeded(canvas, cfg) {
      const { maxWidth, maxHeight, minWidth } = cfg;
      const { width, height } = canvas;

      // 计算各自的缩放系数（仅在超出限制时 <1）
      const scaleW = width > maxWidth ? maxWidth / width : 1;
      const scaleH = height > maxHeight ? maxHeight / height : 1;
      let scale = Math.min(scaleW, scaleH);

      // 如果仅因高度过长导致 scale 过小并使得宽度会掉到 minWidth 以下，则放弃按高度缩放
      if (scale < 1 && width * scale < minWidth) {
        // 保留宽度可读性：只按宽度（若宽度本身超出 maxWidth）或不缩放
        scale = scaleW; // 可能是 1 或 <1
        if (width * scale < minWidth) {
          // 宽度本身就很窄，不扩大（放大会失真且无更多信息）
          return canvas;
        }
      }

      if (scale >= 1) return canvas; // 不需要缩放

      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);
      const tmp = document.createElement('canvas');
      tmp.width = targetW;
      tmp.height = targetH;
      const ctx = tmp.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, targetW, targetH);
      return tmp;
    },

    // 以不同 JPEG 质量尝试导出，直到满足大小或降到最小质量
    async exportCanvasAsJpegUnderLimit(
      canvas,
      { maxBytes, initialQuality, minQuality, qualityStep }
    ) {
      let q = initialQuality;
      while (q >= minQuality) {
        const blob = await this.canvasToBlob(canvas, 'image/jpeg', q);
        if (blob && blob.size <= maxBytes) {
          return blob;
        }
        q = parseFloat((q - qualityStep).toFixed(2));
      }
      // 最终兜底：返回最低质量版本（不再校验大小）
      return await this.canvasToBlob(
        canvas,
        'image/jpeg',
        Math.max(minQuality, 0.4)
      );
    },

    // Canvas 转 Blob Promise 包装
    canvasToBlob(canvas, mime = 'image/jpeg', quality = 0.85) {
      return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), mime, quality);
      });
    },

    // 统一导出：先按最长边缩放，再尝试 JPEG 质量压缩；若仍然过大，继续二次尺寸降采样
    async exportOptimizedImage(originalCanvas) {
  const cfg = this.getShareImageConfig();
  let working = this.downscaleCanvasIfNeeded(originalCanvas, cfg);

  let blob = await this.exportCanvasAsJpegUnderLimit(working, cfg);
      // 如果依旧超过限制，继续按 0.75 / 0.6 缩放梯度再试（极端超长页面）
      const fallbackScales = [0.75, 0.6, 0.5];
      for (const s of fallbackScales) {
        if (blob.size <= cfg.maxBytes) break;
        const scaled = document.createElement('canvas');
        scaled.width = Math.round(working.width * s);
        scaled.height = Math.round(working.height * s);
        const ctx = scaled.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(working, 0, 0, scaled.width, scaled.height);
        working = scaled;
        blob = await this.exportCanvasAsJpegUnderLimit(working, cfg);
      }

      return { blob, finalWidth: working.width, finalHeight: working.height };
    },

    // 食材管理方法
    addIngredient(name, category = '其他') {
      const existing = this.selectedIngredients.find(
        item => item.name === name
      );
      if (existing) {
        // 移除食材
        this.removeIngredient(this.selectedIngredients.indexOf(existing));
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
        主食: 'g',
        调料: '茶匙',
        其他: 'ml'
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
              `${result.error || '已达调用上限'} (模型: ${result.model} 已用 ${
                result.used
              }/${result.limit})，${retryMsg}`
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
          this.selectedModel = data.selectedModel || 'gemini-2.5-flash';

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

        // 等待额外的时间确保渲染完成
        this.isCapturing = true;
        await new Promise(resolve => setTimeout(resolve, 500));

        const deviceScale = window.devicePixelRatio || 1;
        // 为了避免原始容器宽度过窄（如移动端极窄列），在克隆中可强制最小宽度
        const minLogicalWidth = 600; // 与 cfg.minWidth 对应
        const canvas = await html2canvas(recipeElement, {
          backgroundColor: '#ffffff',
          scale: Math.min(2, deviceScale * 1.2), // 略微提升清晰度但不夸张
          useCORS: true,
          allowTaint: false,
          height: recipeElement.scrollHeight,
          windowHeight: recipeElement.scrollHeight,
          logging: false, // 关闭日志避免控制台输出
          imageTimeout: 15000, // 增加图片加载超时时间
          removeContainer: true, // 移除容器避免影响
          foreignObjectRendering: false, // 禁用外部对象渲染
          onclone: clonedDoc => {
            const el = clonedDoc.querySelector('.recipe-result');
            if (el) {
              const w = el.getBoundingClientRect().width;
              if (w < minLogicalWidth) {
                el.style.width = minLogicalWidth + 'px';
                el.style.maxWidth = minLogicalWidth + 'px';
                el.style.margin = '0 auto';
              }
            }
          }
        });
        this.isCapturing = false;
        // 压缩 & 导出优化图片（JPEG 优化体积）
        const { blob, finalWidth, finalHeight } =
          await this.exportOptimizedImage(canvas);
        console.log(
          '[ShareImage] 导出尺寸:',
          `${finalWidth}x${finalHeight}`,
          '大小:',
          (blob.size / 1024).toFixed(1) + 'KB',
          '类型:',
          blob.type
        );
        await this.handleShareBlob(blob, {
          width: finalWidth,
          height: finalHeight
        });
      } catch (error) {
        console.error('分享失败:', error);
        this.showErrorMessage('分享失败，请稍后重试');
      }
    },

    async handleShareBlob(blob, meta = {}) {
      try {
        // 创建图片URL用于在弹窗中显示
        const imageUrl = URL.createObjectURL(blob);
        const sizeKB = (blob.size / 1024).toFixed(1);
        const { width, height } = meta;
        const dimensionText = width && height ? `${width}x${height}` : '未知';

        // 关闭Loading提示，显示截图预览弹窗
        await Swal.fire({
          title: '📱 食谱分享图片',
          html: `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${imageUrl}" 
                   class="share-preview-img"
                   style="max-width: 100%; max-height: 400px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); -webkit-touch-callout: default; user-select: auto;" 
                   alt="食谱截图">
              <p style="margin-top: 15px; color: #666; font-size: 13px; line-height:1.5;">
                格式: JPEG | 尺寸: ${dimensionText} | 体积: ${sizeKB}KB<br>
                📱 <strong>移动端：</strong>长按图片保存/转发<br>
                💻 <strong>电脑：</strong>右键保存或点击“下载”按钮
              </p>
            </div>
          `,
          width: 600,
          padding: '20px',
          showCancelButton: true,
          confirmButtonText: '💾 直接下载',
          cancelButtonText: navigator.share ? '📤 系统分享' : '❌ 关闭',
          showCloseButton: true,
          allowOutsideClick: false,
          allowEscapeKey: true,
          allowEnterKey: false,
          customClass: {
            popup: 'share-popup',
            image: 'share-image'
          },
          didOpen: () => {
            // 解除 SweetAlert2 / 全局样式对图片长按的影响
            const img = document.querySelector(
              '.swal2-popup.share-popup .share-preview-img'
            );
            if (img) {
              img.style.webkitTouchCallout = 'default';
              img.style.webkitUserSelect = 'auto';
              img.style.userSelect = 'auto';
              img.style.pointerEvents = 'auto';
              // 防止点击图片触发关闭（某些 UA 会把点击冒泡到按钮）
              img.addEventListener('click', e => e.stopPropagation());
              // 避免 contextmenu 被阻止（桌面调试）
              img.addEventListener('contextmenu', e => e.stopPropagation());
              // 触摸长按时不要触发默认的拖拽阻断
              img.setAttribute('draggable', 'false');
            }
          },
          willClose: () => {
            // 清理图片URL
            URL.revokeObjectURL(imageUrl);
          }
        }).then(async result => {
          if (result.isConfirmed) {
            // 用户选择直接下载
            await this.downloadImage(blob);
          } else if (
            result.dismiss === Swal.DismissReason.cancel &&
            navigator.share
          ) {
            // 用户选择系统分享（仅在支持时显示此按钮）
            await this.systemShare(blob);
          }
        });
      } catch (error) {
        console.error('分享处理失败:', error);
        this.showErrorMessage('分享失败，请稍后重试');
      }
    },

    async downloadImage(blob) {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
        link.download = `${
          this.recipeResult.recipe_name || '食谱'
        }_${new Date().getTime()}.${ext}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        this.showSuccessMessage('📥 食谱图片已下载到本地！');
      } catch (error) {
        console.error('下载失败:', error);
        this.showErrorMessage('下载失败，请稍后重试');
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
        await this.downloadImage(blob);
      } catch (error) {
        if (error.name !== 'AbortError') {
          // 用户取消分享不算错误
          console.error('系统分享失败:', error);
          this.showErrorMessage('系统分享失败，已改为下载到本地');
          await this.downloadImage(blob);
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
