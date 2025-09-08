#!/usr/bin/env node

// 构建脚本：将静态文件内容嵌入到 worker.js 中
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建部署版本...');

try {
  // 读取所有需要嵌入的文件
  console.log('📁 读取静态文件...');
  const indexHtml = fs.readFileSync('static/index.html', 'utf8');
  const stylesCss = fs.readFileSync('static/styles.css', 'utf8');
  const appJs = fs.readFileSync('static/app.js', 'utf8');
  
  console.log('📁 读取提示词模板...');
  const cookPrompt = fs.readFileSync('prompts/cook-prompt.md', 'utf8');
  
  // 读取原始 worker.js 文件
  console.log('📁 读取 worker.js 模板...');
  let workerContent = fs.readFileSync('worker.js', 'utf8');
  
  // 转义函数：处理特殊字符
  function escapeForJs(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
  }
  
  // 替换占位符
  console.log('🔄 替换占位符...');
  workerContent = workerContent
    .replace('\'{{PLACEHOLDER_INDEX_HTML}}\'', `\`${escapeForJs(indexHtml)}\``)
    .replace('\'{{PLACEHOLDER_STYLES_CSS}}\'', `\`${escapeForJs(stylesCss)}\``)
    .replace('\'{{PLACEHOLDER_APP_JS}}\'', `\`${escapeForJs(appJs)}\``)
    .replace('\'{{PLACEHOLDER_COOK_PROMPT}}\'', `\`${escapeForJs(cookPrompt)}\``);
  
  // 写入构建后的文件
  console.log('💾 写入构建文件...');
  fs.writeFileSync('worker.built.js', workerContent);
  
  console.log('✅ 构建完成！');
  console.log('📝 生成的文件: worker.built.js');
  console.log('🚀 现在可以运行: npx wrangler deploy worker.built.js');
  
} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}
