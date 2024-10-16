let currentQuestionIndex = 0;
let score = 0;
let quizQuestions = [];
let category = '';
let count = 0;
let reviewMode = false;
let userAnswers = [];

async function fetchQuestions(category, count) {
  try {
    const response = await window.electronAPI.generateQuestions(category, count);
    if (!response) {
      throw new Error("No response from API");
    }
    const questions = parseQuestions(response);
    if (questions.length === 0) {
      throw new Error("No questions generated");
    }
    return questions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    alert(`Failed to fetch questions: ${error.message}`);
    return null;
  }
}

function parseQuestions(text) {
  const questions = [];
  const lines = text.split("\n").filter(line => line.trim() !== "");

  let currentQuestion = null;
  let answers = [];

  lines.forEach(line => {
    const cleanedLine = line.replace(/[*#]/g, "").trim();
    const questionMatch = cleanedLine.match(/^\d+\.\s*(.*)/);
    
    if (questionMatch) {
      if (currentQuestion && answers.length > 0) {
        questions.push({
          question: currentQuestion,
          answers: answers.map(answer => ({ text: answer.trim(), correct: false }))
        });
      }
      currentQuestion = questionMatch[1].trim();
      answers = [];
    } else {
      const answerMatch = cleanedLine.match(/^[a-d]\)\s*(.*)/);
      if (answerMatch) {
        answers.push(answerMatch[1].trim());
      }
    }
  });

  if (currentQuestion && answers.length > 0) {
    questions.push({
      question: currentQuestion,
      answers: answers.map(answer => ({ text: answer.trim(), correct: false }))
    });
  }

  questions.forEach(q => {
    if (q.answers.length > 0) {
      const correctIndex = Math.floor(Math.random() * q.answers.length);
      q.answers[correctIndex].correct = true;
    }
  });

  return questions;
}

async function startQuiz() {
  category = document.getElementById('category-input').value;
  count = document.getElementById('question-count').value;

  if (!category || !count) {
    alert("Please enter a category and select the number of questions.");
    return;
  }

  const questions = await fetchQuestions(category, count);
  if (questions) {
    quizQuestions = questions;
    resetQuizState();
    showQuestion();
  } else {
    showSetup();
  }
}

function resetQuizState() {
  currentQuestionIndex = 0;
  score = 0;
  reviewMode = false;
  userAnswers = [];
  hideAllSections();
  document.getElementById('question-container').classList.remove('hidden');
  document.getElementById('answer-buttons').classList.remove('hidden');
  document.getElementById('next-btn').classList.remove('hidden');
  document.getElementById('reattempt-btn').classList.remove('hidden');
}

function hideAllSections() {
  const sections = ['setup-container', 'question-container', 'answer-buttons', 'next-btn', 'restart-btn', 'reattempt-btn', 'result-container', 'view-answers-btn'];
  sections.forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showSetup() {
  hideAllSections();
  document.getElementById('setup-container').classList.remove('hidden');
  // Ensure the category input is editable
  document.getElementById('category-input').disabled = false;
}

function showQuestion() {
  if (currentQuestionIndex >= quizQuestions.length) {
    showResults();
    return;
  }

  const questionContainer = document.getElementById('question-container');
  const answerButtons = document.getElementById('answer-buttons');
  questionContainer.innerHTML = '';
  answerButtons.innerHTML = '';

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const questionText = document.createElement('h3');
  questionText.innerText = `Q${currentQuestionIndex + 1}: ${currentQuestion.question}`;
  questionContainer.appendChild(questionText);

  currentQuestion.answers.forEach((answer, index) => {
    const answerLabel = document.createElement('label');
    const answerInput = document.createElement('input');
    answerInput.type = 'radio';
    answerInput.name = 'answer';
    answerInput.value = answer.text;
    
    answerInput.disabled = reviewMode && userAnswers[currentQuestionIndex] !== answer.text;
    
    if (reviewMode && userAnswers[currentQuestionIndex] === answer.text) {
      answerInput.checked = true;
    }

    answerLabel.appendChild(answerInput);
    answerLabel.appendChild(document.createTextNode(answer.text));
    
    if (reviewMode) {
      if (answer.correct) {
        answerLabel.classList.add('correct-answer');
      }
      if (userAnswers[currentQuestionIndex] === answer.text) {
        if (answer.correct) {
          answerLabel.classList.add('user-correct');
        } else {
          answerLabel.classList.add('user-incorrect');
        }
      }
    }
    
    answerButtons.appendChild(answerLabel);

    if (!reviewMode) {
      answerInput.addEventListener('change', () => {
        document.getElementById('next-btn').disabled = false;
        userAnswers[currentQuestionIndex] = answer.text;
        if (answer.correct) score++;
      });
    }
  });

  if (reviewMode) {
    document.getElementById('next-btn').disabled = false;
  } else {
    document.getElementById('next-btn').disabled = !userAnswers[currentQuestionIndex];
  }
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < quizQuestions.length) {
    showQuestion();
  } else {
    if (reviewMode) {
      showResults();
    } else {
      showResults();
    }
  }
}

function showResults() {
  hideAllSections();
  document.getElementById('restart-btn').classList.remove('hidden');
  document.getElementById('result-container').classList.remove('hidden');
  document.getElementById('view-answers-btn').classList.remove('hidden');

  const resultContainer = document.getElementById('result-container');
  resultContainer.innerHTML = `Quiz completed! Your score: ${score} / ${quizQuestions.length}`;
}

function restartQuiz() {
  showSetup();
  // Clear the previous category
  document.getElementById('category-input').value = '';
  // Set focus to the category input field
  document.getElementById('category-input').focus();
}

async function reattemptQuiz() {
  const questions = await fetchQuestions(category, count);
  if (questions) {
    quizQuestions = questions;
    resetQuizState();
    showQuestion();
  }
}

function viewCorrectAnswers() {
  reviewMode = true;
  currentQuestionIndex = 0;
  hideAllSections();
  document.getElementById('question-container').classList.remove('hidden');
  document.getElementById('answer-buttons').classList.remove('hidden');
  document.getElementById('next-btn').classList.remove('hidden');
  document.getElementById('next-btn').textContent = currentQuestionIndex === quizQuestions.length - 1 ? 'Finish Review' : 'Next Question';
  showQuestion();
}

document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('next-btn').addEventListener('click', nextQuestion);
document.getElementById('restart-btn').addEventListener('click', restartQuiz);
document.getElementById('reattempt-btn').addEventListener('click', reattemptQuiz);
document.getElementById('view-answers-btn').addEventListener('click', viewCorrectAnswers);