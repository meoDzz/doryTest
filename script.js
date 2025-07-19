// Cấu hình EmailJS - THAY THẾ CÁC GIÁ TRỊ NÀY
const EMAILJS_SERVICE_ID = 'service_9h1ejxa';
const EMAILJS_TEMPLATE_ID = 'template_rrfzyjl';
const EMAILJS_PUBLIC_KEY = 'V8_GRui5iRp1N95Sx';
const RECIPIENT_EMAIL = 'fo.dorycenter@gmail.com'; // Email nhận kết quả

document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        testSelection: document.getElementById('test-selection-screen'),
        infoForm: document.getElementById('info-form-screen'),
        sectionSelection: document.getElementById('section-selection-screen'),
        test: document.getElementById('test-screen'),
        result: document.getElementById('result-screen')
    };
    // const testSetList = document.getElementById('test-set-list');
        const testSetSelect = document.getElementById('test-set-select'); // THÊM DÒNG NÀY
    const startTestBtn = document.getElementById('start-test-btn'); // THÊM DÒNG NÀY
    const studentInfoForm = document.getElementById('student-info-form');
    const selectedTestName = document.getElementById('selected-test-name');
    const sectionTitle = document.getElementById('section-title');
    const questionNav = document.getElementById('question-navigation-bar');
    const questionArea = document.getElementById('question-area');
    const timerDisplay = document.getElementById('timer');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const restartBtn = document.getElementById('restart-btn');
    const audioPlayerContainer = document.getElementById('audio-player-container');

    let testData = null, selectedTestSet = null, studentInfo = {}, currentSection = '', currentQuestionIndex = 0, userAnswers = {}, timerInterval, totalQuestions = 0;
    // Sử dụng một đối tượng để lưu trạng thái đã phát cho từng part
    let audioPlayedState = {}; 
    let previousPartAudio = null; // Biến để theo dõi audio của part trước đó

    emailjs.init(EMAILJS_PUBLIC_KEY);
    // fetch('data/testcopy.json','data/test.json')
    //     .then(response => response.json())
    //     .then(data => {
    //         testData = data;
    //         loadTestSets();
    //     }).catch(error => console.error('Error loading test data:', error));
    
    Promise.all([
        fetch('data/test.json').then(response => response.json()),
        fetch('data/test2.json').then(response => response.json())
    ])
    .then(results => {
        const testCopyData = results[0];
        const testOriginalData = results[1];

        // Kết hợp dữ liệu testSets từ cả hai file
        testData = {
            testSets: [
                ...(testCopyData.testSets || []),
                ...(testOriginalData.testSets || [])
            ]
        };
        loadTestSets();
    })
    .catch(error => {
        console.error('Error loading one or more test data files:', error);
    });


    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        if (screens[screenName]) screens[screenName].classList.remove('hidden');
    }

    // function loadTestSets() {
    //     testSetList.innerHTML = '';
    //     testData.testSets.forEach((testSet, index) => {
    //         const button = document.createElement('button');
    //         button.className = 'test-set-btn';
    //         button.textContent = testSet.setName;
    //         button.addEventListener('click', () => {
    //             selectedTestSet = testData.testSets[index];
    //             showScreen('infoForm');
    //         });
    //         testSetList.appendChild(button);
    //     });
    //     showScreen('testSelection');
    // }
    function loadTestSets() {
        testSetSelect.innerHTML = '<option value="">-- Select a Test Set --</option>'; // Thêm option mặc định
        testData.testSets.forEach((testSet, index) => {
            const option = document.createElement('option');
            option.value = index; // Lưu index của test set vào value
            option.textContent = testSet.setName;
            testSetSelect.appendChild(option);
        });
        showScreen('testSelection');
    }
    testSetSelect.addEventListener('change', (e) => {
        const selectedIndex = parseInt(e.target.value);
        if (!isNaN(selectedIndex) && selectedIndex >= 0) {
            selectedTestSet = testData.testSets[selectedIndex];
            startTestBtn.classList.remove('hidden'); // Hiển thị nút Start Test
        } else {
            selectedTestSet = null;
            startTestBtn.classList.add('hidden'); // Ẩn nút Start Test nếu không có lựa chọn hợp lệ
        }
    });

    startTestBtn.addEventListener('click', () => {
        if (selectedTestSet) {
            selectedTestName.textContent = selectedTestSet.setName;
            showScreen('infoForm');
        } else {
            alert('Please select a test set to begin.');
        }
    });


    studentInfoForm.addEventListener('submit', e => {
        e.preventDefault();
        studentInfo = {
            fullName: document.getElementById('fullName').value,
            className: document.getElementById('className').value, // <-- THÊM DÒNG NÀY
            dob: document.getElementById('dob').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value
        };
        selectedTestName.textContent = selectedTestSet.setName;
        showScreen('sectionSelection');
    });

    document.querySelectorAll('.section-btn').forEach(button => {
        button.addEventListener('click', e => {
            currentSection = e.target.getAttribute('data-section');
            startTest(currentSection);
        });
    });

    function startTest(section) {
        currentQuestionIndex = 0;
        userAnswers = {};
        const sectionData = selectedTestSet[section];
        let allQuestions = [];

        audioPlayerContainer.innerHTML = '';
        audioPlayedState = {}; // Đặt lại trạng thái audio đã phát khi bắt đầu section mới
        previousPartAudio = null; // Đặt lại biến theo dõi part audio trước đó

        if (section !== 'writing') {
            sectionData.parts.forEach(part => {
                if(part.questions) allQuestions.push(...part.questions);
                else if (part.matching) allQuestions.push(...part.matching.people);
            });
        } else {
            allQuestions = sectionData.questions;
        }
        totalQuestions = allQuestions.length;

        showScreen('test');
        sectionTitle.textContent = sectionData.title;
        renderQuestion();
        startTimer(sectionData.timeLimit);
    }

    function renderQuestionNav() {
        questionNav.innerHTML = '';
        
        // 1. Chỉ áp dụng logic màu sắc cho phần 'listening'
        if (currentSection === 'listening') {
            // 2. Mảng chứa các màu sắc cho từng part
            const partColors = ['#E57373', '#64B5F6', '#81C784', '#FFD54F', '#BA68C8']; // Đỏ, Xanh, Lá, Vàng, Tím

            let globalQuestionIndex = 0;
            const parts = selectedTestSet[currentSection].parts;

            // 3. Lặp qua từng part để lấy màu
            parts.forEach((part, partIndex) => {
                const color = partColors[partIndex % partColors.length]; // Lấy màu, lặp lại nếu hết màu

                if (part.questions) {
                    // 4. Lặp qua từng câu hỏi trong part để tạo nút
                    part.questions.forEach(() => {
                        const btn = document.createElement('button');
                        btn.textContent = globalQuestionIndex + 1;
                        btn.className = 'nav-q-btn';

                        // 5. Gán sự kiện click
                        const questionIdxForListener = globalQuestionIndex;
                        btn.addEventListener('click', () => {
                            currentQuestionIndex = questionIdxForListener;
                            renderQuestion();
                        });

                        // 6. Logic tô màu chính
                        if (globalQuestionIndex === currentQuestionIndex) {
                            btn.classList.add('current'); // Ưu tiên màu cho câu hiện tại
                        } else if (userAnswers[globalQuestionIndex]) {
                            btn.classList.add('answered'); // Ưu tiên màu cho câu đã trả lời
                        } else {
                            // Chỉ tô màu nền cho các câu chưa làm và không phải câu hiện tại
                            btn.style.backgroundColor = color;
                            btn.style.color = 'white'; // Đảm bảo chữ màu trắng dễ đọc
                        }
                        
                        questionNav.appendChild(btn);
                        globalQuestionIndex++; // Tăng chỉ số câu hỏi toàn cục
                    });
                }
            });
        } else {
            // ---- PHẦN SỬA LỖI CHO READING VÀ WRITING ----
        // Đoạn mã kiểm tra "isMatching" bị lỗi đã được gỡ bỏ.
        // Vòng lặp for đơn giản dưới đây sẽ tạo danh sách đầy đủ cho tất cả câu hỏi.
        for (let i = 0; i < totalQuestions; i++) {
            const btn = document.createElement('button');
            btn.textContent = i + 1;
            btn.className = 'nav-q-btn';
            
            // Kiểm tra trạng thái của nút
            if (i === currentQuestionIndex) {
                btn.classList.add('current');
            } else if (userAnswers[i] || userAnswers[i+1]) { // Giữ lại logic kiểm tra câu trả lời
                btn.classList.add('answered');
            }

            // Gán sự kiện click
            const questionIdxForListener = i;
            btn.addEventListener('click', () => {
                currentQuestionIndex = questionIdxForListener;
                renderQuestion();
            });
            
            questionNav.appendChild(btn);
        }
        }
    }

    function renderQuestion() {
        questionArea.innerHTML = '';
        const sectionData = selectedTestSet[currentSection];
        let allQuestions = [];
        let currentPartData = null;
        let questionData = null;
        let questionCounter = 0;
        
        for (const part of sectionData.parts || [sectionData]) {
             const questionsInPart = part.questions || (part.matching ? part.matching.people : []);
             if (currentQuestionIndex >= questionCounter && currentQuestionIndex < questionCounter + questionsInPart.length) {
                questionData = questionsInPart[currentQuestionIndex - questionCounter];
                currentPartData = part;
                break;
             }
             if (part.matching) { 
                 questionData = part.matching;
                 currentPartData = part;
                 break;
             }
             questionCounter += questionsInPart.length;
        }
        if(!questionData) questionData = sectionData.questions[currentQuestionIndex];

        // LOGIC MỚI: Xử lý hiển thị audio player theo từng part
        if (currentSection === 'listening' && currentPartData && currentPartData.audio) {
            const newAudioSrc = currentPartData.audio;

            // Nếu audio của part hiện tại khác với audio của part trước đó
            if (previousPartAudio !== newAudioSrc) {
                // Tái tạo lại thẻ audio để đảm bảo controls hiển thị lại
                audioPlayerContainer.innerHTML = `<audio controls src="${newAudioSrc}" style="width:100%"></audio>`;
                previousPartAudio = newAudioSrc; // Cập nhật audio của part trước đó
                
                // Đặt lại trạng thái đã phát cho part này
                if (!audioPlayedState[newAudioSrc]) { // Chỉ thêm listener nếu audio chưa từng được phát cho part này
                    const audioEl = audioPlayerContainer.querySelector('audio');
                    audioEl.addEventListener('play', () => {
                        audioEl.removeAttribute('controls'); // Vô hiệu hóa controls sau khi phát
                        audioPlayedState[newAudioSrc] = true; // Đánh dấu audio này đã phát
                    }, { once: true }); // Listener chỉ chạy một lần cho mỗi lần "play"
                } else {
                    // Nếu audio đã được phát trước đó, vô hiệu hóa controls ngay lập tức
                    const audioEl = audioPlayerContainer.querySelector('audio');
                    if (audioPlayedState[newAudioSrc]) {
                        audioEl.removeAttribute('controls');
                    }
                }
            }
            audioPlayerContainer.style.display = 'block'; // Đảm bảo container hiển thị
        }  else {
            // Không phải phần nghe, hoặc không có audio cho part này
            // Dừng mọi audio đang phát khi rời khỏi phần listening
            const currentAudioEl = audioPlayerContainer.querySelector('audio');
            if (currentAudioEl) {
                currentAudioEl.pause();
            }
            audioPlayerContainer.innerHTML = ''; 
            audioPlayerContainer.style.display = 'none'; 
            previousPartAudio = null; // Đặt lại
        }

        const card = createQuestionCard(questionData, currentPartData || sectionData, currentQuestionIndex);
        questionArea.appendChild(card);
        updateNavButtons();
        renderQuestionNav();
    }

    function createQuestionCard(question, part, globalIndex) {
        const card = document.createElement('div');
        card.className = 'question-card';
        if (part.partTitle) card.innerHTML += `<h3>${part.partTitle}</h3>`;
        if (part.instructions) card.innerHTML += `<p><em>${part.instructions}</em></p>`;
        if (part.passage) card.innerHTML += `<div class="passage">${part.passage}</div>`;
        
        if(part.matching) {
            const container = document.createElement('div');
            container.className = 'matching-container';
            const peopleDiv = document.createElement('div'); peopleDiv.className = 'matching-people';
            const placesDiv = document.createElement('div'); placesDiv.className = 'matching-places';
            part.matching.people.forEach(p => {
                const item = document.createElement('div'); item.className = 'person-item';
                item.innerHTML = `<p><b>${p.id}.</b> ${p.description}</p>`;
                const select = document.createElement('select'); select.id = `q_${p.id}`;
                select.innerHTML = `<option value="">Select</option>`;
                part.matching.places.forEach(place => { select.innerHTML += `<option value="${place.id}">${place.id}</option>`; });
                select.value = userAnswers[p.id] || '';
                select.addEventListener('change', e => saveAnswer(p.id, e.target.value));
                item.appendChild(select); peopleDiv.appendChild(item);
            });
            part.matching.places.forEach(pl => {
                const item = document.createElement('div'); item.className = 'place-item';
                item.innerHTML = `<b>${pl.id}:</b> ${pl.description}`; placesDiv.appendChild(item);
            });
            container.appendChild(peopleDiv); container.appendChild(placesDiv); card.appendChild(container);
        } else if (currentSection === 'writing') {
             card.innerHTML += `<p><b>Question ${globalIndex + 1}:</b> ${question.questionText}</p>`;
             const textarea = document.createElement('textarea');
             textarea.className = 'writing-input'; textarea.id = `q_${globalIndex}`;
             textarea.value = userAnswers[globalIndex] || '';
             textarea.addEventListener('input', e => saveAnswer(globalIndex, e.target.value));
             card.appendChild(textarea);
        } else {
            card.innerHTML += `<p><b>Question ${globalIndex + 1}:</b> ${question.questionText}</p>`;
            const optionsList = document.createElement('ul'); optionsList.className = 'options-list';
            question.options.forEach((option, index) => {
                const li = document.createElement('li');
                const radioId = `q_${globalIndex}_option_${index}`;
                const optionLetter = String.fromCharCode(65 + index);
                const radio = document.createElement('input');
                radio.type = 'radio'; radio.name = `q_${globalIndex}`; radio.id = radioId; radio.value = optionLetter;
                radio.checked = userAnswers[globalIndex] === optionLetter;
                radio.addEventListener('change', e => saveAnswer(globalIndex, e.target.value));
                const label = document.createElement('label');
                label.htmlFor = radioId; label.textContent = `${optionLetter}. ${option}`;
                li.appendChild(radio); li.appendChild(label); optionsList.appendChild(li);
            });
            card.appendChild(optionsList);
        }
        return card;
    }

    function saveAnswer(index, value) {
        userAnswers[index] = value;
        renderQuestionNav();
    }

    function navigateQuestion(direction) {
        currentQuestionIndex += direction;
        renderQuestion();
    }

    function updateNavButtons() {
        // const isMatching = selectedTestSet[currentSection]?.parts?.some(p => p.matching);
        // if(isMatching) {
        //      prevBtn.disabled = false; nextBtn.disabled = false;
        //      submitBtn.style.display = 'inline-block';
        // } else {
        //     prevBtn.disabled = currentQuestionIndex === 0;
        //     nextBtn.disabled = currentQuestionIndex === totalQuestions - 1;
        //     submitBtn.style.display = currentQuestionIndex === totalQuestions - 1 ? 'inline-block' : 'none';
        // }
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === totalQuestions - 1;
        submitBtn.style.display = currentQuestionIndex === totalQuestions - 1 ? 'inline-block' : 'none';
    }

    function startTimer(duration) {
        clearInterval(timerInterval);
        let time = duration;
        timerInterval = setInterval(() => {
            const minutes = Math.floor(time / 60);
            let seconds = time % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerDisplay.textContent = `Time Left: ${minutes}:${seconds}`;
            time--;
            if (time < 0) {
                clearInterval(timerInterval);
                submitTest();
            }
        }, 1000);
    }
    
    function submitTest() {
        clearInterval(timerInterval);
        showScreen('result');
        let score = 0;
        let answerDetails = '';
        if (currentSection === 'writing') {
             document.getElementById('score-display').textContent = "Your writing has been submitted.";
             document.getElementById('result-message').textContent = 'An instructor will review your submission. Thank you!';
             answerDetails = selectedTestSet.writing.questions.map((q, i) => `Question ${q.id}:\n${userAnswers[i] || 'No answer'}`).join('\n\n');
        } else {
            let allQuestions = [];
            let questionCounter = 0;
            selectedTestSet[currentSection].parts.forEach(part => {
                if (part.matching) {
                    part.matching.people.forEach(p => {
                        const correctAnswer = part.matching.answers[p.id];
                        const userAnswer = userAnswers[p.id];
                        if (userAnswer === correctAnswer) score++;
                        answerDetails += `Matching Q${p.id}: Your answer: ${userAnswer || 'N/A'}, Correct: ${correctAnswer}\n`;
                    });
                    allQuestions.push(...part.matching.people);
                } else if(part.questions) {
                    part.questions.forEach((q, i) => {
                         const globalIdx = questionCounter + i;
                         const correctAnswer = q.answer;
                         const userAnswer = userAnswers[globalIdx];
                         if (userAnswer === correctAnswer) score++;
                         answerDetails += `Q${globalIdx + 1}: Your answer: ${userAnswer || 'N/A'}, Correct: ${correctAnswer}\n`;
                    });
                    allQuestions.push(...part.questions);
                    questionCounter += part.questions.length;
                }
            });
            document.getElementById('score-display').textContent = `Your Score: ${score} / ${allQuestions.length}`;
            document.getElementById('result-message').textContent = 'Thank you for completing the test.';
        }
        const templateParams = {
            ...studentInfo, test_set: selectedTestSet.setName, section: currentSection.toUpperCase(),
            score: (currentSection !== 'writing') ? score : 'N/A',
            total: (currentSection !== 'writing') ? totalQuestions : 'N/A', answers: answerDetails, recipient: RECIPIENT_EMAIL
        };
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
            .then(response => {
               document.getElementById('result-message').textContent += ' Results have been sent successfully.';
            }, error => {
               document.getElementById('result-message').textContent += ' Failed to send results via email.';
            });
    }

    restartBtn.addEventListener('click', () => {
        timerDisplay.textContent = "Time Left: 00:00";
        showScreen('sectionSelection');
        const currentAudioEl = audioPlayerContainer.querySelector('audio');
        if (currentAudioEl) {
            currentAudioEl.pause();
        }
    });

    // Thêm event listeners cho các nút điều hướng
    prevBtn.addEventListener('click', () => {
        navigateQuestion(-1);
    });

    nextBtn.addEventListener('click', () => {
        navigateQuestion(1);
    });

    submitBtn.addEventListener('click', () => {
        submitTest();
    });
});