
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
            createdAt: Date.now()
          }
        }
      });
      if (response.id) {
        setQuizId(response.id);
      }
   