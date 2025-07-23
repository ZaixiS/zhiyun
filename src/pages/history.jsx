// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
// @ts-ignore;
import { Clock, Trophy, RotateCcw, ArrowLeft, Calendar, TrendingUp, Award } from 'lucide-react';

export default function HistoryPage(props) {
  const {
    $w
  } = props;
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const username = $w.page.dataset.params?.username || '用户';
  useEffect(() => {
    loadUser();
    loadQuizHistory();
  }, []);
  const loadUser = () => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  };
  const loadQuizHistory = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        setLoading(false);
        return;
      }
      const userData = JSON.parse(user);
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'quiz',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              userId: {
                $eq: userData.id
              }
            }
          },
          select: {
            $master: true
          },
          orderBy: [{
            createdAt: 'desc'
          }]
        }
      });
      if (response.records) {
        setQuizHistory(response.records);
      }
    } catch (error) {
      console.error('加载答题历史失败:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = timestamp => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const getScoreColor = score => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  const getScoreBadge = score => {
    if (score >= 80) return 'bg-green-500/20 text-green-400';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };
  const retryQuiz = () => {
    $w.utils.navigateTo({
      pageId: 'quiz',
      params: {
        username: username
      }
    });
  };
  const goBack = () => {
    $w.utils.navigateBack();
  };
  const calculateStats = () => {
    if (quizHistory.length === 0) return {
      total: 0,
      average: 0,
      best: 0,
      worst: 100
    };
    const scores = quizHistory.map(q => q.score);
    return {
      total: quizHistory.length,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
      worst: Math.min(...scores)
    };
  };
  const stats = calculateStats();
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={goBack} variant="ghost" className="text-slate-300 hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回
          </Button>
          <h1 className="text-3xl font-bold text-white">答题历史</h1>
          <Button onClick={retryQuiz} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
            <RotateCcw className="w-4 h-4 mr-2" />
            再试一次
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">总答题数</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">平均分</p>
                  <p className={`text-2xl font-bold ${getScoreColor(stats.average)}`}>{stats.average}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">最高分</p>
                  <p className={`text-2xl font-bold ${getScoreColor(stats.best)}`}>{stats.best}</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">最低分</p>
                  <p className={`text-2xl font-bold ${getScoreColor(stats.worst)}`}>{stats.worst}</p>
                </div>
                <Award className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 历史记录 */}
        {loading ? <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">加载中...</p>
            </div>
          </div> : quizHistory.length === 0 ? <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400 mb-4">暂无答题记录</p>
            <Button onClick={retryQuiz} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              <RotateCcw className="w-4 h-4 mr-2" />
              开始第一次答题
            </Button>
          </div> : <div className="grid gap-4">
            {quizHistory.map((quiz, index) => <Card key={quiz._id} className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">第 {quizHistory.length - index} 次答题</CardTitle>
                    <Badge className={getScoreBadge(quiz.score)}>
                      {quiz.score}分
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{formatDate(quiz.createdAt)}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">正确题数</p>
                      <p className="text-white font-semibold">{quiz.correctAnswers}/{quiz.totalQuestions}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">用时</p>
                      <p className="text-white font-semibold">{quiz.duration}秒</p>
                    </div>
                    <div>
                      <p className="text-slate-400">难度</p>
                      <p className="text-white font-semibold">{quiz.difficulty}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">类型</p>
                      <p className="text-white font-semibold">{quiz.type}</p>
                    </div>
                  </div>
                  {quiz.wrongAnswers && quiz.wrongAnswers.length > 0 && <div className="mt-4">
                      <p className="text-sm text-slate-400 mb-2">错题回顾：</p>
                      <div className="space-y-1">
                        {quiz.wrongAnswers.map((wrong, idx) => <div key={idx} className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
                            {wrong.question} - 正确答案: {wrong.correctAnswer}
                          </div>)}
                      </div>
                    </div>}
                </CardContent>
              </Card>)}
          </div>}
      </div>
    </div>;
}