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
  const startQuiz = () => {
    setQuizStarted(true);
    setQuizId(Date.now().toString());
    createQuizRecord();
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
            score: 0,
            totalQuestions: questions.length,
            correctAnswers: 0,
            duration: 0,
            difficulty: difficulty,
            type: questionType,
            questions: questions,
            answers: [],
            wrongAnswers: [],
            createdAt: new Date().toISOString()
          }
        }
      });
      if (response.id) {
        setQuizId(response.id);
      }
    } catch (error) {
      console.error('创建答题记录失败:', error);
    }
  };
  const handleAnswer = answerIndex => {
    setSelectedAnswer(answerIndex);
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
    if (answerIndex === questions[currentQuestion].correct) {
      setScore(score + 1);
    }

    // 更新答题记录
    if (quizId) {
      updateQuizRecord(newAnswers);
    }
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setTimeLeft(30);
      } else {
        finishQuiz(newAnswers);
      }
    }, 1000);
  };
  const updateQuizRecord = async newAnswers => {
    try {
      const correctCount = newAnswers.filter((answer, index) => answer === questions[index].correct).length;
      await $w.cloud.callDataSource({
        dataSourceName: 'quiz',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            answers: newAnswers,
            correctAnswers: correctCount,
            score: Math.round(correctCount / questions.length * 100)
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
      console.error('更新答题记录失败:', error);
    }
  };
  const finishQuiz = async finalAnswers => {
    const correctCount = finalAnswers.filter((answer, index) => answer === questions[index].correct).length;
    const finalScore = Math.round(correctCount / questions.length * 100);
    const duration = questions.length * 30 - timeLeft;
    const wrongAnswers = [];
    finalAnswers.forEach((answer, index) => {
      if (answer !== questions[index].correct) {
        wrongAnswers.push({
          question: questions[index].question,
          userAnswer: questions[index].options[answer],
          correctAnswer: questions[index].options[questions[index].correct]
        });
      }
    });
    try {
      await $w.cloud.callDataSource({
        dataSourceName: 'quiz',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            score: finalScore,
            correctAnswers: correctCount,
            duration: duration,
            wrongAnswers: wrongAnswers,
            completed: true
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
      console.error('完成答题记录失败:', error);
    }
    setShowResult(true);
  };
  const handleTimeout = () => {
    finishQuiz(answers);
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
  const goToHistory = () => {
    $w.utils.navigateTo({
      pageId: 'history',
      params: {
        username: username
      }
    });
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">加载题目中...</p>
        </div>
      </div>;
  }
  if (!quizStarted) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button onClick={goBack} variant="ghost" className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回
            </Button>
            <h1 className="text-3xl font-bold text-white">智能答题</h1>
            <Button onClick={goToHistory} variant="ghost" className="text-slate-300 hover:text-white">
              <Trophy className="w-5 h-5 mr-2" />
              历史
            </Button>
          </div>

          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-center">选择答题模式</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-slate-300 mb-2 block">题目类型</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setQuestionType('math')} className={`${questionType === 'math' ? 'bg-indigo-600' : 'bg-slate-700'} text-white`}>
                    <Calculator className="w-4 h-4 mr-2" />
                    数学计算
                  </Button>
                  <Button onClick={() => setQuestionType('logic')} className={`${questionType === 'logic' ? 'bg-indigo-600' : 'bg-slate-700'} text-white`}>
                    <Brain className="w-4 h-4 mr-2" />
                    逻辑推理
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 mb-2 block">难度选择</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button onClick={() => setDifficulty('easy')} className={`${difficulty === 'easy' ? 'bg-green-600' : 'bg-slate-700'} text-white`}>
                    简单
                  </Button>
                  <Button onClick={() => setDifficulty('medium')} className={`${difficulty === 'medium' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}>
                    中等
                  </Button>
                  <Button onClick={() => setDifficulty('hard')} className={`${difficulty === 'hard' ? 'bg-red-600' : 'bg-slate-700'} text-white`}>
                    困难
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-400 mb-4">
                  共 {questions.length} 题，每题限时30秒
                </p>
                <Button onClick={startQuiz} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3">
                  开始答题
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (showResult) {
    const finalScore = Math.round(score / questions.length * 100);
    const getScoreMessage = () => {
      if (finalScore >= 90) return '太棒了！你是答题高手！';
      if (finalScore >= 80) return '很好！继续保持！';
      if (finalScore >= 60) return '不错！还有提升空间！';
      return '加油！多练习会更好！';
    };
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-2xl">答题完成！</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                {finalScore}分
              </div>
              <p className="text-xl text-slate-300">{getScoreMessage()}</p>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-slate-400">正确题数</p>
                  <p className="text-2xl font-bold text-green-400">{score}/{questions.length}</p>
                </div>
                <div>
                  <p className="text-slate-400">用时</p>
                  <p className="text-2xl font-bold text-blue-400">{questions.length * 30 - timeLeft}秒</p>
                </div>
              </div>

              <div className="flex space-x-4 justify-center">
                <Button onClick={resetQuiz} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  再试一次
                </Button>
                <Button onClick={goToHistory} variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
                  <Trophy className="w-4 h-4 mr-2" />
                  查看历史
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  const question = questions[currentQuestion];
  const progress = (currentQuestion + 1) / questions.length * 100;
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={goBack} variant="ghost" className="text-slate-300 hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-2" />
            退出
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">第 {currentQuestion + 1} / {questions.length} 题</h1>
            <p className="text-slate-400">剩余时间: {timeLeft}秒</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">得分</p>
            <p className="text-xl font-bold text-green-400">{score}</p>
          </div>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
          <CardHeader>
            <Progress value={progress} className="mb-4" />
            <CardTitle className="text-white text-xl">{question.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct;
              const buttonClass = isSelected ? isCorrect ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white';
              return <Button key={index} onClick={() => handleAnswer(index)} disabled={selectedAnswer !== null} className={`w-full py-4 text-lg ${buttonClass} ${selectedAnswer !== null && !isSelected ? 'opacity-50' : ''}`}>
                    {option}
                  </Button>;
            })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}