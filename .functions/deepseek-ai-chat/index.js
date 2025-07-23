
    'use strict';

    const cloudbase = require('@cloudbase/node-sdk');
    const fetch = require('node-fetch');

    exports.main = async (event, context) => {
      try {
        // 1. 解析用户输入的消息
        let userMessage;
        if (typeof event === 'string') {
          userMessage = event;
        } else if (typeof event === 'object' && event !== null) {
          userMessage = event.message || event.content || JSON.stringify(event);
        } else {
          return {
            success: false,
            error: '无效的输入格式，请提供字符串或包含消息的对象'
          };
        }

        if (!userMessage) {
          return {
            success: false,
            error: '消息内容不能为空'
          };
        }

        // 2. 构造 DeepSeek API 请求参数
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY || ''; // 建议通过环境变量配置 API Key
        const apiUrl = 'https://api.deepseek.com/v1/chat/completions';

        const requestBody = {
          model: 'deepseek-chat', // 根据实际 API 文档调整模型名称
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };

        // 3. 调用 DeepSeek API
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': deepseekApiKey ? `Bearer ${deepseekApiKey}` : '',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorDetail = await response.text();
          throw new Error(`DeepSeek API 请求失败: ${response.status} ${response.statusText}, ${errorDetail}`);
        }

        const data = await response.json();

        // 4. 提取 AI 回复内容
        let aiReply;
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
          aiReply = data.choices[0].message.content;
        } else {
          aiReply = '抱歉，AI 没有返回有效的回复内容。';
        }

        // 5. 返回 AI 回复
        return {
          success: true,
          reply: aiReply,
          rawData: data // 可选：返回原始数据用于调试
        };

      } catch (error) {
        console.error('DeepSeek AI 聊天云函数错误:', error);
        return {
          success: false,
          error: error.message || '调用 AI 服务时发生未知错误'
        };
      }
    };
  