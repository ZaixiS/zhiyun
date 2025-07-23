// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
// @ts-ignore;
import { Bot, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage(props) {
  const {
    $w
  } = props;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const handleLogin = async e => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // 查询用户数据模型验证登录
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              $and: [{
                username: {
                  $eq: username
                }
              }, {
                password: {
                  $eq: password
                }
              }]
            }
          },
          select: {
            $master: true
          },
          limit: 1
        }
      });
      if (response.records && response.records.length > 0) {
        const user = response.records[0];
        // 保存用户信息到本地存储
        localStorage.setItem('user', JSON.stringify({
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=100&h=100&fit=crop&crop=face`,
          role: user.role,
          loginTime: new Date().toISOString()
        }));
        $w.utils.redirectTo({
          pageId: 'chat',
          params: {
            username: user.username
          }
        });
      } else {
        setError('用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };
  const handleRegister = async () => {
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // 检查用户名是否已存在
      const checkResponse = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              username: {
                $eq: username
              }
            }
          },
          select: {
            $master: true
          },
          limit: 1
        }
      });
      if (checkResponse.records && checkResponse.records.length > 0) {
        setError('用户名已存在');
        setIsLoading(false);
        return;
      }
      // 创建新用户
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaCreateV2',
        params: {
          data: {
            username,
            password,
            role: 'user',
            email: `${username}@example.com`,
            avatar: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=100&h=100&fit=crop&crop=face`
          }
        }
      });
      if (response.id) {
        // 注册成功后自动登录
        localStorage.setItem('user', JSON.stringify({
          id: response.id,
          username,
          email: `${username}@example.com`,
          avatar: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=100&h=100&fit=crop&crop=face`,
          role: 'user',
          loginTime: new Date().toISOString()
        }));
        $w.utils.redirectTo({
          pageId: 'chat',
          params: {
            username
          }
        });
      }
    } catch (error) {
      console.error('注册失败:', error);
      setError('注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border-slate-700">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2">AI智能助手</CardTitle>
          <p className="text-slate-400">智能对话 · 数学计算 · 互动答题</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">用户名</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input id="username" type="text" value={username} onChange={e => {
                setUsername(e.target.value);
                setError('');
              }} placeholder="请输入用户名" className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => {
                setPassword(e.target.value);
                setError('');
              }} placeholder="请输入密码" className="pl-10 pr-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-indigo-600" />
                <span className="text-sm text-slate-400">记住我</span>
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3">
              {isLoading ? '登录中...' : '登录'}
            </Button>

            <Button type="button" onClick={handleRegister} disabled={isLoading} variant="outline" className="w-full border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold py-3">
              {isLoading ? '注册中...' : '注册新账号'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
}