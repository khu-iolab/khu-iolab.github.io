// ===== Single source of truth for lab news =====
// Add new items to the TOP of the array (newest first).
const NEWS_ITEMS = [
    {
        date: '2026.04.16',
        badge: { ko: '예정', en: 'Upcoming' },
        title: { ko: '한국물류과학기술학회 특별세션 연사 초청', en: 'Invited Speaker at KLST Special Session' },
        desc: {
            ko: '정호영 교수가 한국물류과학기술학회 특별세션에 연사로 초청되었습니다. 발표 주제: <strong>「외판원 문제에서 양자 어닐링 기반 샘플 해 집합의 머신러닝 기반 실행가능성 개선 기법」</strong>',
            en: 'Prof. Ho Young Jeong was invited as a speaker at a special session of the Korean Society of Logistics Science and Technology (KLST). Topic: <strong>"ML-Based Feasibility Improvement of Quantum Annealing-Based Sample Solution Sets for the Traveling Salesman Problem"</strong>'
        }
    },
    {
        date: '2026.02.10',
        badge: null,
        title: { ko: '연구실 홈페이지 오픈', en: 'Lab Website Launch' },
        desc: {
            ko: 'Intelligent Optimization LAB (IO-LAB)의 공식 홈페이지를 오픈했습니다. 연구실의 최신 연구 성과와 소식을 확인하실 수 있습니다.',
            en: 'The official website of Intelligent Optimization LAB (IO-LAB) is now live. Stay updated with the latest research and news from the lab.'
        }
    }
];
