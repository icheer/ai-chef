// 静态文件内容 - 在部署前会被替换为实际内容
const staticFiles = {
  '/': '{{PLACEHOLDER_INDEX_HTML}}',
  '/styles.css': '{{PLACEHOLDER_STYLES_CSS}}',
  '/app.js': '{{PLACEHOLDER_APP_JS}}'
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
  const promptTemplate = '{{PLACEHOLDER_COOK_PROMPT}}';

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
