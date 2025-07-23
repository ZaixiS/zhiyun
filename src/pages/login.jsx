// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
// @ts-ignore;
import { Bot, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage(props) {
  const {
    $w
  } = props;
  const [username, setUsername] = useState($w.page.dataset.params?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');

  // 检查数据模型是否存在
  const checkDataModel = async () => {
    try {
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          limit: 1
        }
      });
      return true;
    } catch (error) {
      console.error('数据模型检查失败:', error);
      return false;
    }
  };
  const handleLogin = async e => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      // 检查数据模型
      const modelExists = await checkDataModel();
      if (!modelExists) {
        setError('系统配置错误，请联系管理员');
        setIsLoading(false);
        return;
      }

      // 查询用户 - 使用正确的字段名
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              $and: [{
                username: {
                  $eq: username.trim()
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

        // 更新最后登录时间
        await $w.cloud.callDataSource({
          dataSourceName: 'user',
          methodName: 'wedaUpdateV2',
          params: {
            data: {
              lastLoginAt: new Date().toISOString(),
              loginCount: (user.loginCount || 0) + 1
            },
            filter: {
              where: {
                _id: {
                  $eq: user._id
                }
              }
            }
          }
        });

        // 保存用户信息到本地存储
        localStorage.setItem('user', JSON.stringify({
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=100&h=100&fit=crop&crop=face`,
          role: user.role || 'user',
          loginTime: new Date().toISOString()
        }));
        setSuccess('登录成功！正在跳转...');
        setTimeout(() => {
          $w.utils.redirectTo({
            pageId: 'chat',
            params: {
              username: user.username
            }
          });
        }, 1000);
      } else {
        setError('用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('登录失败：' + (error.message || '请稍后重试'));
    } finally {
      setIsLoading(false);
    }
  };
  const handleRegister = async e => {
    e.preventDefault();

    // 表单验证
    if (!username || !password || !confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }
    if (username.trim().length < 3) {
      setError('用户名至少3个字符');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      // 检查数据模型
      const modelExists = await checkDataModel();
      if (!modelExists) {
        setError('系统配置错误，请联系管理员');
        setIsLoading(false);
        return;
      }

      // 检查用户名是否已存在
      const checkResponse = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              username: {
                $eq: username.trim()
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
        setError('用户名已存在，请使用其他用户名');
        setIsLoading(false);
        return;
      }

      // 创建新用户 - 使用数据模型中定义的所有字段
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaCreateV2',
        params: {
          data: {
            username: username.trim(),
            password: password,
            role: 'user',
            email: `${username.trim()}@example.com`,
            avatar: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=100&h=100&fit=crop&crop=face`,
            status: 'active',
            loginCount: 0,
            isEmailVerified: false,
            isPhoneVerified: false,
            createdAt: new Date().toISOString(),
            lastLoginAt: null
          }
        }
      });
      if (response.id) {
        setSuccess('注册成功！正在登录...');

        // 注册成功后自动登录
        localStorage.setItem('user', JSON.stringify({
          id: response.id,
          username: username.trim(),
          email: `${username.trim()}@example.com`,
          avatar: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=100&h=100&fit=crop&crop=face`,
          role: 'user',
          loginTime: new Date().toISOString()
        }));
        setTimeout(() => {
          $w.utils.redirectTo({
            pageId: 'chat',
            params: {
              username: username.trim()
            }
          });
        }, 1500);
      } else {
        setError('注册失败：服务器响应异常');
      }
    } catch (error) {
      console.error('注册失败:', error);
      setError('注册失败：' + (error.message || '请检查网络连接后重试'));
    } finally {
      setIsLoading(false);
    }
  };
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };
  return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border-slate-700">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2">
            {isLoginMode ? '欢迎回来' : '创建账号'}
          </CardTitle>
          <p className="text-slate-400">
            {isLoginMode ? '登录您的AI智能助手' : '注册开始使用AI助手'}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>}
            
            {success && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400 text-sm">{success}</span>
              </div>}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">用户名</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input id="username" type="text" value={username} onChange={e => {
                setUsername(e.target.value);
                setError('');
                setSuccess('');
              }} placeholder="请输入用户名" className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" required maxLength={20} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => {
                setPassword(e.target.value);
                setError('');
                setSuccess('');
              }} placeholder="请输入密码" className="pl-10 pr-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLoginMode && <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => {
                setConfirmPassword(e.target.value);
                setError('');
                setSuccess('');
              }} placeholder="请再次输入密码" className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" required />
                </div>
              </div>}

            {isLoginMode && <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-indigo-600" />
                  <span className="text-sm text-slate-400">记住我</span>
                </label>
              </div>}

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3">
              {isLoading ? '处理中...' : isLoginMode ? '登录' : '注册'}
            </Button>

            <div className="text-center">
              <button type="button" onClick={toggleMode} className="text-indigo-400 hover:text-indigo-300 text-sm">
                {isLoginMode ? '还没有账号？立即注册' : '已有账号？立即登录'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>;
}