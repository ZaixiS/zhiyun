// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Card, CardHeader, CardTitle, CardContent, Progress } from '@/components/ui';
// @ts-ignore;
import { Clock, CheckCircle, XCircle, RotateCcw, ArrowLeft, Trophy, Brain, Calculator } from 'lucide-react';

export default function QuizPage(props) {
  const {
    $w
  } = props;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [quizId, setQuizId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const username = $w.page.dataset.params?.username || '用户';
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('math');
  useEffect(() => {
    loadUser();
    generateQuestions();
  }, []);
  useEffect(() => {
    let timer;
    if (quizStarted && timeLeft > 0 && !showResult) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !showResult) {
      handleTimeout();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, quizStarted, showResult]);
  const loadUser = () => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  };
  const generateQuestions = () => {
    const mathQuestions = [{
      question: '5 + 7 = ?',
      options: ['10', '11', '12', '13'],
      correct: 2,
      type: 'math'
    }, {
      question: '8 × 6 = ?',
      options: ['42', '48', '54', '56'],
      correct: 1,
      type: 'math'
    }, {
      question: '15 - 9 = ?',
      options: ['4', '5', '6', '7'],
      correct: 2,
      type: 'math'
    }, {
      question: '36 ÷ 6 = ?',
      options: ['5', '6', '7', '8'],
      correct: 1,
      type: 'math'
    }, {
      question: '9 + 8 × 2 = ?',
      options: ['25', '26', '27', '28'],
      correct: 0,
      type: 'math'
    }];
    const logicQuestions = [{
      question: '如果所有的猫都会爬树，而Tom是一只猫，那么Tom会？',
      options: ['游泳', '爬树', '飞行', '跑步'],
      correct: 1,
      type: 'logic'
    }, {
      question: '一个篮子里有5个苹果，你拿走3个，你还有几个？',
      options: ['2', '3', '5', '0'],
      correct: 1,
      type: 'logic'
    }, {
      question: '如果今天是星期三，那么后天是星期几？',
      options: ['星期四', '星期五', '星期六', '星期日'],
      correct: 1,
      type: 'logic'
    }, {
      question: '一个数加上它自己等于10，这个数是？',
      options: ['3', '4', '5', '6'],
      correct: 2,
      type: 'logic'
    }, {
      question: '如果A>B且B>C，那么？',
      options: ['A>C', 'A<C', 'A=C', '无法确定'],
      correct: 0,
      type: 'logic'
    }];
    let selectedQuestions = [];
    if (questionType === 'math') {
      selectedQuestions = [...mathQuestions];
    } else {
      selectedQuestions = [...logicQuestions];
    }

    // 根据难度调整题目
    if (difficulty === 'easy') {
      selectedQuestions = selectedQuestions.slice(0, 3);
    } else if (difficulty === 'hard') {
      selectedQuestions = [...selectedQuestions, ...selectedQuestions.slice(0, 2).map(q => ({
        ...q,
        question: '高级: ' + q.question
      }))];
    }
    setQuestions(selectedQuestions);
    setLoading(false);
  };
  const startQuiz = async () => {
    setQuizStarted(true);
    setQuizId(Date.now().toString());
    await createQuizRecord();
  };
  const createQuizRecord = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) return;
      const userData = JSON.parse(user);
      const response = await $w.cloud.callDataSource({
        dataSourceName: 'quiz',
        methodName: 'wedaCreateV2',
        params: {
          data: {
            userId: userData.id,
            title: `${difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}${questionType === 'math' ? '数学' : '逻辑'}测验`,
            questions: questions,
            score: 0,
            totalQuestions: questions.length,
            correctCount: 0,
            quizType: questionType,
            difficulty: difficulty,
            duration: 0,
            answers: [],
            createdAt: Date.now()
          }
        }
      });
      if (response.id) {
        setQuizId(response.id);
      }
    } catch (error) {
      console.error('创建测验记录失败:', error);
    }
  };
  const handleAnswer = async answerIndex => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
    const isCorrect = answerIndex === questions[currentQuestion].correct;
    if (isCorrect) {
      setScore(score + 1);
    }

    // 更新测验记录
    if (quizId) {
      try {
        await $w.cloud.callDataSource({
          dataSourceName: 'quiz',
          methodName: 'wedaUpdateV2',
          params: {
            data: {
              score: score + (isCorrect ? 1 : 0),
              correctCount: score + (isCorrect ? 1 : 0),
              answers: newAnswers,
              duration: questions.length * 30 - timeLeft
            },
            filter: {
              where: {
                _id: {
                  $eq: quizId
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('更新测验记录失败:', error);
      }
    }
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setTimeLeft(30);
      } else {
        setShowResult(true);
        finalizeQuiz();
      }
    }, 1000);
  };
  const handleTimeout = () => {
    handleAnswer(-1); // -1 表示超时未作答
  };
  const finalizeQuiz = async () => {
    if (quizId) {
      try {
        await $w.cloud.callDataSource({
          dataSourceName: 'quiz',
          methodName: 'wedaUpdateV2',
          params: {
            data: {
              score: score,
              correctCount: score,
              duration: questions.length * 30 - timeLeft,
              completedAt: Date.now()
            },
            filter: {
              where: {
                _id: {
                  $eq: quizId
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('完成测验记录失败:', error);
      }
    }
  };
  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(30);
    setQuizStarted(false);
    setAnswers([]);
    setQuizId(null);
    generateQuestions();
  };
  const goBack = () => {
    $w.utils.navigateBack();
  };
  const getScoreColor = () => {
    const percentage = score / questions.length * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  const getScoreMessage = () => {
    const percentage = score / questions.length * 100;
    if (percentage >= 80) return '太棒了！你是真正的学霸！';
    if (percentage >= 60) return '不错！继续努力！';
    return '加油！多练习会更好！';
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">加载中...</div>
      </div>;
  }
  return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-xl border-slate-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={goBack} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6 text-indigo-400" />
              <CardTitle className="text-2xl font-bold text-white">
                智能答题挑战
              </CardTitle>
            </div>
            <div className="w-20" />
          </div>
        </CardHeader>

        <CardContent>
          {!quizStarted ? <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  欢迎来到智能答题！
                </h3>
                <p className="text-slate-400">
                  测试你的数学和逻辑思维能力，每题限时30秒
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    难度选择
                  </label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-slate-700/50 border-slate-600 text-white rounded-md px-3 py-2">
                    <option value="easy">简单 (3题)</option>
                    <option value="medium">中等 (5题)</option>
                    <option value="hard">困难 (7题)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    题目类型
                  </label>
                  <select value={questionType} onChange={e => setQuestionType(e.target.value)} className="w-full bg-slate-700/50 border-slate-600 text-white rounded-md px-3 py-2">
                    <option value="math">数学计算</option>
                    <option value="logic">逻辑推理</option>
                  </select>
                </div>
              </div>

              <Button onClick={startQuiz} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3">
                <Calculator className="w-5 h-5 mr-2" />
                开始答题
              </Button>
            </div> : !showResult ? <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-400">
                  题目 {currentQuestion + 1} / {questions.length}
                </div>
                <div className="flex items-center space-x-2 text-yellow-400">
                  <Clock className="w-4 h-4" />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              <Progress value={(currentQuestion + 1) / questions.length * 100} className="h-2 bg-slate-700" />

              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-6">
                  {questions[currentQuestion]?.question}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {questions[currentQuestion]?.options.map((option, index) => <Button key={index} onClick={() => handleAnswer(index)} disabled={selectedAnswer !== null} className={`w-full p-4 text-left transition-all ${selectedAnswer === index ? index === questions[currentQuestion].correct ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-red-600/20 border-red-500 text-red-400' : 'bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600/50'}`}>
                      {option}
                    </Button>)}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-slate-400">
                  当前得分: {score} / {questions.length}
                </div>
              </div>
            </div> : <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-12 h-12 text-white" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  答题完成！
                </h3>
                <p className={`text-4xl font-bold mb-2 ${getScoreColor()}`}>
                  {score} / {questions.length}
                </p>
                <p className="text-slate-400">
                  {getScoreMessage()}
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                <Button onClick={resetQuiz} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  再来一次
                </Button>
                <Button onClick={goBack} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                  返回首页
                </Button>
              </div>
            </div>}
        </CardContent>
      </Card>
    </div>;
}