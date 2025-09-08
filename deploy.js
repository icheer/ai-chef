#!/usr/bin/env node

// 快速部署脚本：构建并部署到 Cloudflare Workers
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 智能食谱生成器 - 快速部署');
console.log('================================\n');

try {
  // 1. 构建项目
  console.log('📦 步骤 1/3: 构建项目...');
  execSync('node build.js', { stdio: 'inherit' });
  
  // 2. 检查构建结果
  if (!fs.existsSync('worker.built.js')) {
    throw new Error('构建文件未生成');
  }
  
  console.log('\n🚀 步骤 2/3: 部署到 Cloudflare Workers...');
  
  // 3. 部署到 Cloudflare Workers
  execSync('npx wrangler deploy', { stdio: 'inherit' });
  
  console.log('\n✅ 步骤 3/3: 部署完成！');
  console.log('\n🎉 应用已成功部署到 Cloudflare Workers!');
  console.log('🔗 访问: https://smart-recipe-generator.icheer.workers.dev');
  console.log('\n📝 提醒: 请确保在 Cloudflare Dashboard 中设置了环境变量:');
  console.log('   - GEMINI_API_KEYS (你的 Gemini API 密钥)');
  console.log('   - GEMINI_BASE_URL (https://generativelanguage.googleapis.com)');
  
} catch (error) {
  console.error('\n❌ 部署失败:', error.message);
  console.log('\n🔧 请检查:');
  console.log('   1. 确保已安装 wrangler: npm install -g wrangler');
  console.log('   2. 确保已登录 Cloudflare: wrangler login');
  console.log('   3. 检查网络连接');
  process.exit(1);
}
