const express = require("express");
const cors = require("cors");
const path = require("path");


const { createClient } = require("@supabase/supabase-js"); // 🟡 Supabase Admin용

const app = express();
app.use(cors());
app.use(express.json());

// 🟡 정적 파일 경로 설정
app.use(express.static(path.join(__dirname)));

// 🟡 gagl.html 요청 시 해당 파일 반환
app.get("/gagl.html", (req, res) => {
    res.sendFile(path.join(__dirname, "gagl.html"));
});

// ✅ Supabase Admin client 설정 (회원탈퇴용, 절대 클라이언트에 노출금지)
const supabaseAdmin = createClient(
    "https://piafesfywtvpachbfoxr.supabase.co", // 프로젝트 URL
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWZlc2Z5d3R2cGFjaGJmb3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDc4NDAxOCwiZXhwIjoyMDYwMzYwMDE4fQ.inGkUGNirltn3arVtb3rPvLpzoxK28OCDOx04rAH0EE"           // 서비스 롤 키
);

app.post("/attack", async (req, res) => {
    const 유저 = req.body.유저데이터;
    const 몬스터 = 현재악마불러오기(유저.현재층 || 1);
    // 조우 타입 누적
    const 타입 = 몬스터.타입 || "일반";  // "일반", "레어", "신화", ...
    유저.조우기록 = 유저.조우기록 || {
        일반: 0, 레어: 0, 신화: 0, 고대: 0, 태초: 0, 공허: 0
    };

    if (유저.조우기록[타입] !== undefined) {
        유저.조우기록[타입]++;
    }

    const 추가회복 = 아이언바디회복(유저);
    유저.남은체력 = Math.min(유저.최대체력, 유저.남은체력 + 추가회복);

    const 전투 = 전투시뮬레이션(유저, 몬스터);

    if (전투.결과 === "패배") {
        const 유저복구 = {
            ...유저,
            남은체력: 유저.최대체력,
        };

        // ✅ Supabase에 패배 상태 저장
        await supabaseAdmin
            .from("users")
            .update({
                남은체력: 유저복구.남은체력,
                조우기록: 유저.조우기록
            })
            .eq("유저UID", 유저복구.유저UID);

        return res.json({
            결과: "패배",
            몬스터,
            유저남은체력: 전투.유저남은체력,
            유저데이터: 유저복구
        });
    }

    const 기본보상 = 보상계산(유저.현재층);
    기본보상.숙련도 += 인사이트추가숙련도(유저);
    기본보상.경험치 += 인텔리전스추가경험치(유저);
    기본보상.골드 = Math.floor(기본보상.골드 * 획득금화발굴(유저));

    const 레벨업 = 레벨업판정(유저.경험치 + 기본보상.경험치, 유저.레벨);
    const 드레인 = 드레인회복(유저);

    const 새유저 = 전투보상반영(
        유저,
        기본보상,
        드레인,
        레벨업,
        전투.유저남은체력
    );

    const 드랍장비 = 장비드랍판정(몬스터);
    if (드랍장비) {
        새유저.장비목록 = 새유저.장비목록 || [];
        새유저.합성기록 = 새유저.합성기록 || {};

        const 키 = `${드랍장비.이름}|${드랍장비.등급}`;
        const 기존 = 새유저.장비목록.find(j => j.이름 === 드랍장비.이름 && j.등급 === 드랍장비.등급);

        if (기존) {
            기존.공격력 += 드랍장비.공격력;
            새유저.최대체력 += 1;
            새유저.합성기록[키] = (새유저.합성기록[키] || 0) + 1;
        } else {
            새유저.장비목록.push(드랍장비);
            새유저.합성기록[키] = 0;
        }

        // ✅ 공격력 합산
        새유저.공격력 += 드랍장비.공격력;
    }

    // ✅ Supabase에 승리 상태 저장
    await supabaseAdmin
        .from("users")
        .update({
            레벨: 새유저.레벨,
            공격력: 새유저.공격력,
            경험치: 새유저.경험치,
            골드: 새유저.골드,
            최대체력: 새유저.최대체력,
            남은체력: 새유저.남은체력,
            숙련도: 새유저.숙련도,
            현재층: 새유저.현재층,
            스킬: 새유저.스킬,
            조우기록: 새유저.조우기록,
            합성기록: 새유저.합성기록,
            장비목록: 새유저.장비목록,
            킬카운트: 새유저.킬카운트,
            버전업: 새유저.버전업
        })
        .eq("유저UID", 새유저.유저UID);

    return res.json({
        결과: "승리",
        몬스터,
        유저남은체력: 새유저.남은체력,
        보상: 기본보상,
        레벨업,
        회복: 드레인,
        유저데이터: 새유저,
        드랍장비
    });
});

app.post("/upgrade-item", async (req, res) => {
    const { 유저UID, 이름, 등급 } = req.body;

    if (!유저UID || !이름 || !등급) {
        return res.status(400).json({ 오류: "필수 값 누락됨" });
    }

    // 유저 정보 조회
    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 조회 실패" });
    }

    const 장비목록 = 유저.장비목록 || [];
    const 대상 = 장비목록.find(j => j.이름 === 이름 && j.등급 === 등급);

    if (!대상) {
        return res.status(404).json({ 오류: "장비를 찾을 수 없음" });
    }

    const 강화비용맵 = {
        "일반": 1000,
        "레어": 10000,
        "신화": 100000,
        "고대": 1000000,
        "태초": 10000000,
        "공허": 100000000
    };

    const 강화비용 = 강화비용맵[등급];
    if (typeof 강화비용 !== "number") {
        return res.status(400).json({ 오류: "알 수 없는 등급" });
    }

    if ((유저.골드 || 0) < 강화비용) {
        return res.status(400).json({ 오류: `골드 부족: ${강화비용} 필요` });
    }

    const 성공 = Math.random() < 0.51;

    let 메시지 = "강화 실패..";
    let 증가량 = 0;
    유저.골드 -= 강화비용;

    const 강화증가량맵 = {
        "레어": 3,
        "신화": 9,
        "고대": 27,
        "태초": 67,
        "공허": 160
    };

    if (성공) {
        증가량 = 강화증가량맵[등급] || 0;
        대상.강화 = (대상.강화 || 0) + 1;
        대상.공격력 += 증가량;
        유저.공격력 += 증가량;
        메시지 = `강화 성공! 공격력 +${증가량}`;
    }

    // 저장
    const { error: 저장오류 } = await supabaseAdmin
        .from("users")
        .update({
            장비목록: 장비목록,
            공격력: 유저.공격력,
            골드: 유저.골드
        })
        .eq("유저UID", 유저UID);

    if (저장오류) {
        return res.status(500).json({ 오류: "강화 결과 저장 실패" });
    }

    return res.json({
        성공,
        증가량,
        강화: 대상.강화,
        공격력: 유저.공격력,
        골드: 유저.골드,
        메시지
    });
});

app.post("/update-skill", async (req, res) => {
    const { 유저UID, 스킬, 숙련도 } = req.body;

    if (!유저UID || typeof 스킬 !== "object" || typeof 숙련도 !== "number") {
        return res.status(400).json({ 오류: "입력값 부족" });
    }

    const { error } = await supabaseAdmin
        .from("users")
        .update({ 스킬, 숙련도 })
        .eq("유저UID", 유저UID);

    if (error) {
        console.error("스킬 업데이트 실패:", error.message);
        return res.status(500).json({ 오류: "스킬 업데이트 실패" });
    }

    return res.json({ 성공: true });
});

app.post("/ranking", async (req, res) => {
    try {
        const { data: 유저들, error } = await supabaseAdmin
            .from("users")
            .select("유저아이디, 레벨, 공격력, 현재층, 장비목록, 합성기록")
            .order("공격력", { ascending: false })
            .limit(10);

        if (error) {
            return res.status(500).json({ 오류: "랭킹 조회 실패" });
        }

        return res.json({ 유저들 });
    } catch (e) {
        return res.status(500).json({ 오류: e.message });
    }
});

app.post("/delete-user", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) {
        return res.status(400).json({ 오류: "UID 누락됨" });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(유저UID);

    if (error) {
        console.error("Auth 삭제 실패:", error.message);
        return res.status(500).json({ 오류: "Auth 삭제 실패" });
    }

    return res.json({ 메시지: "탈퇴 처리 완료" });
});

app.listen(3000, () => {
    console.log("서버 실행 중: http://localhost:3000");
});

function 공격스킬적용(유저) {
    const 스킬 = 유저.스킬 || {};
    const 결과 = {
        크리티컬배율: 1,
        버서커배율: 1,
        버닝배율: 1,
        체력소모: 1
    };

    // 크리티컬
    const 크리계열 = [
        { 이름: "알파 크리티컬", 배율: 0.2 },
        { 이름: "베타 크리티컬", 배율: 0.4 },
        { 이름: "감마 크리티컬", 배율: 0.6 },
        { 이름: "델타 크리티컬", 배율: 0.8 },
        { 이름: "엡실론 크리티컬", 배율: 1.0 },
        { 이름: "제타 크리티컬", 배율: 1.2 },
        { 이름: "에타 크리티컬", 배율: 1.4 },
    ];
    const 크리레벨 = 스킬["크리티컬"] || 0;
    for (let i = 0; i < 크리계열.length; i++) {
        const 시작 = i * 10;
        const 현재 = Math.max(0, Math.min(크리레벨 - 시작, 10));
        if (현재 <= 0) break;
        const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
        if (Math.random() < 확률) {
            결과.크리티컬배율 += (크리계열[i].배율);
        } else break;
    }

    // 버서커
    const 버서커계열 = [
        { 이름: "앵거 버서커", 배율: 0.4, 소모: 1 },
        { 이름: "레이지 버서커", 배율: 0.8, 소모: 2 },
        { 이름: "프렌지 버서커", 배율: 1.2, 소모: 3 },
        { 이름: "매드니스 버서커", 배율: 1.6, 소모: 4 },
        { 이름: "하울 버서커", 배율: 2.0, 소모: 5 },
        { 이름: "새비지 버서커", 배율: 2.4, 소모: 6 },
        { 이름: "블러드 버서커", 배율: 2.8, 소모: 7 },
        { 이름: "카오스 버서커", 배율: 3.2, 소모: 8 },
    ];
    const 버서커레벨 = 스킬["버서커"] || 0;
    for (let i = 0; i < 버서커계열.length; i++) {
        const 시작 = i * 10;
        const 현재 = Math.max(0, Math.min(버서커레벨 - 시작, 10));
        if (현재 <= 0) break;
        const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
        if (Math.random() < 확률) {
            결과.버서커배율 += 버서커계열[i].배율;
            결과.체력소모 += 버서커계열[i].소모;
        } else break;
    }

    if (유저.남은체력 < 유저.최대체력 * 0.5) {
        const 버닝레벨 = 스킬["버닝"] || 0;
        const 버닝계열 = [
            { 이름: "인페르노 버닝", 배율: 0.6 },
            { 이름: "플레임 버닝", 배율: 1.2 },
            { 이름: "블레이징 버닝", 배율: 1.8 },
            { 이름: "헬파이어 버닝", 배율: 2.4 },
            { 이름: "피닉스 버닝", 배율: 3.0 }
        ];
        for (let i = 0; i < 버닝계열.length; i++) {
            const 시작 = i * 10;
            const 현재 = Math.max(0, Math.min(버닝레벨 - 시작, 10));
            if (현재 <= 0) break;
            const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
            if (Math.random() < 확률) {
                결과.버닝배율 += 버닝계열[i].배율;
            } else break;
        }
    }

    return 결과;
}

function 데미지계산(유저, 몬스터, 스킬결과) {
    const 방어력 = 몬스터.방어력 || 0;
    const 랜덤보정 = Math.random() * 0.2 + 0.8;

    const 기본데미지 = Math.max(0, 유저.공격력 - 방어력);
    const 랜덤데미지 = Math.floor(기본데미지 * 랜덤보정);

    const 최종배율 = (스킬결과.크리티컬배율) * (스킬결과.버서커배율) * (스킬결과.버닝배율);
    const 최종데미지 = Math.floor(랜덤데미지 * 최종배율);

    return 최종데미지;
}

function 전투시뮬레이션(유저, 몬스터) {
    let 유저HP = 유저.남은체력;
    let 몬스터HP = 몬스터.체력;

    while (유저HP > 0 && 몬스터HP > 0) {
        const 스킬 = 공격스킬적용(유저);
        const 데미지 = 데미지계산(유저, 몬스터, 스킬);

        몬스터HP -= 데미지;
        유저HP -= 스킬.체력소모;

        몬스터HP = Math.max(0, 몬스터HP);
        유저HP = Math.max(0, 유저HP);
    }

    return {
        결과: 유저HP <= 0 ? "패배" : "승리",
        유저남은체력: 유저HP,
        몬스터남은체력: 몬스터HP
    };
}

function 장비드랍판정(몬스터) {
    if (몬스터.타입 === "일반") return null;

    console.log("📦 드랍 시도 몬스터 타입:", 몬스터.타입);

    const 고정드랍 = {
        "레어": { 이름: "디아블로의 심장", 공격력: 30 },
        "신화": { 이름: "레비아탄의 비늘", 공격력: 90 },
        "고대": { 이름: "벨제부브의 꼬리", 공격력: 270 },
        "태초": { 이름: "사탄의 날개", 공격력: 675 },
        "공허": { 이름: "바론의 촉수", 공격력: 1600 }
    };

    const 드랍 = 고정드랍[몬스터.타입];
    if (!드랍) {
        console.warn("❌ 고정드랍에 해당 타입 없음:", 몬스터.타입);
        return null;
    }

    const 최소 = Math.floor(드랍.공격력 * 0.8);
    const 최대 = Math.floor(드랍.공격력 * 1.1);
    const 랜덤공격력 = Math.floor(Math.random() * (최대 - 최소 + 1)) + 최소;

    return {
        이름: 드랍.이름,
        공격력: 랜덤공격력,
        등급: 몬스터.타입,
        강화: 0
    };
}

function 보상계산(층) {
    const 경험치 = Math.floor(층 * 1 * 108);
    const 골드 = (Math.floor(Math.random() * 100) + 층 * 100) * 108;
    const 숙련도 = Math.floor(층 * 1 * 108);

    return { 경험치, 골드, 숙련도 };
}

function 레벨업판정(현재경험치, 현재레벨) {
    const 새레벨 = Math.floor(현재경험치 / 1000) + 1;

    const 증가량 = 새레벨 - 현재레벨;

    return {
        새레벨,
        증가한레벨: 증가량,
        공격력증가: 증가량 * 1 // 레벨 1당 공격력 +1
    };
}

function 드레인회복(유저) {
    const 스킬 = 유저.스킬 || {};
    const 드레인레벨 = 스킬["드레인"] || 0;

    const 스킬들 = [
        { 이름: "기가 드레인", 회복: 1 },
        { 이름: "테라 드레인", 회복: 2 },
        { 이름: "페타 드레인", 회복: 3 },
        { 이름: "엑사 드레인", 회복: 4 },
        { 이름: "제타 드레인", 회복: 5 },
        { 이름: "요타 드레인", 회복: 6 },
        { 이름: "로나 드레인", 회복: 7 },
        { 이름: "쿼카 드레인", 회복: 8 },
    ];

    let 총회복량 = 0;

    for (let i = 0; i < 스킬들.length; i++) {
        const 시작 = i * 10;
        const 현재레벨 = Math.max(0, Math.min(드레인레벨 - 시작, 10));
        if (현재레벨 <= 0) break;

        const 확률 = 현재레벨 >= 10 ? 1 : 현재레벨 * 0.1;
        if (Math.random() < 확률) {
            총회복량 += 스킬들[i].회복;
        } else break;
    }

    return 총회복량;
}

function 아이언바디회복(유저) {
    const 스킬 = 유저.스킬 || {};
    const 아이언레벨 = 스킬["아이언바디"] || 0;

    const 스킬들 = [
        { 이름: "스톤 아이언바디", 회복: 1 },
        { 이름: "스틸 아이언바디", 회복: 2 },
        { 이름: "티탄 아이언바디", 회복: 3 },
        { 이름: "플레이트 아이언바디", 회복: 4 },
        { 이름: "미스릴 아이언바디", 회복: 5 },
    ];

    let 공격전회복량 = 0;

    for (let i = 0; i < 스킬들.length; i++) {
        const 시작 = i * 10;
        const 현재 = Math.max(0, Math.min(아이언레벨 - 시작, 10));
        if (현재 <= 0) break;

        const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
        if (Math.random() < 확률) {
            공격전회복량 += 스킬들[i].회복;
        } else break;
    }

    return 공격전회복량;
}

function 인사이트추가숙련도(유저) {
    const 스킬 = 유저.스킬 || {};
    const 인사이트레벨 = 스킬["인사이트"] || 0;

    const 스킬들 = [
        { 이름: "마이크로 인사이트", 추가: 108 },
        { 이름: "나노 인사이트", 추가: 316 },
    ];

    let 추가숙련도 = 0;

    for (let i = 0; i < 스킬들.length; i++) {
        const 시작 = i * 10;
        const 현재 = Math.max(0, Math.min(인사이트레벨 - 시작, 10));
        if (현재 <= 0) break;

        const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
        if (Math.random() < 확률) {
            추가숙련도 += 스킬들[i].추가;
        } else break;
    }

    return 추가숙련도;
}

function 인텔리전스추가경험치(유저) {
    const 스킬 = 유저.스킬 || {};
    const 인텔리레벨 = 스킬["인텔리전스"] || 0;

    const 스킬들 = [
        { 이름: "클레어 인텔리전스", 추가: 108 },
        { 이름: "옵저브 인텔리전스", 추가: 316 },
    ];

    let 추가경험치 = 0;

    for (let i = 0; i < 스킬들.length; i++) {
        const 시작 = i * 10;
        const 현재 = Math.max(0, Math.min(인텔리레벨 - 시작, 10));
        if (현재 <= 0) break;

        const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
        if (Math.random() < 확률) {
            추가경험치 += 스킬들[i].추가;
        } else break;
    }

    return 추가경험치;
}

function 획득금화발굴(유저) {
    const 스킬 = 유저.스킬 || {};
    const 발굴레벨 = 스킬["발굴"] || 0;

    const 스킬들 = [
        { 이름: "루비 발굴", 증가: 0.2 },
        { 이름: "사파이어 발굴", 증가: 0.4 },
        { 이름: "에메랄드 발굴", 증가: 0.6 },
        { 이름: "다이아몬드 발굴", 증가: 0.8 },
        { 이름: "토파즈 발굴", 증가: 1.0 },
    ];

    let 금화배율 = 0;

    for (let i = 0; i < 스킬들.length; i++) {
        const 시작 = i * 10;
        const 현재 = Math.max(0, Math.min(발굴레벨 - 시작, 10));
        if (현재 <= 0) break;

        const 확률 = 현재 >= 10 ? 1 : 현재 * 0.1;
        if (Math.random() < 확률) {
            금화배율 += 스킬들[i].배율;
        } else break;
    }

    return 1 + 금화배율; // 곱셈용
}

function 전투보상반영(유저, 보상, 회복량, 레벨업정보, 전투체력) {
    const 새유저 = { ...유저 };

    새유저.경험치 += 보상.경험치;
    새유저.골드 += 보상.골드;
    새유저.숙련도 += 보상.숙련도;

    새유저.레벨 += 레벨업정보.증가한레벨;
    새유저.공격력 += 레벨업정보.공격력증가;

    새유저.남은체력 = Math.min(
        새유저.최대체력,
        전투체력 + 회복량
    );

    return 새유저;
}

function 현재악마불러오기(층) {
    const 일반몬스터이름 = [
        "I. 디나르", "II. 에리곤", "III. 도레알", "IV. 크로셀", "V. 루페스", "VI. 벨", "VII. 시에르", "VIII. 세레우스", "IX. 버알베리스", "X. 발라크",
        "XI. 로노베", "XII. 자간", "XIII. 안드라멜리우스", "XIV. 니베로스", "XV. 에이몬", "XVI. 라에스", "XVII. 아라타바", "XVIII. 바티바스", "XIX. 아몬", "XX. 안드로말리우스",
        "XXI. 바피메트", "XXII. 오로이아스", "XXIII. 오세", "XXIV. 아미", "XXV. 데카브리아", "XXVI. 벨리알", "XXVII. 디카리브", "XXVIII. 세이르", "XXIX. 오로버스", "XXX. 무루무르",
        "XXXI. 카이미", "XXXII. 알로세스", "XXXIII. 샤르나크", "XXXIV. 샤크", "XXXV. 사브낙", "XXXVI. 라하브", "XXXVII. 말포르스", "XXXVIII. 하우레스", "XXXIX. 피닉스", "XL. 부알",
        "XLI. 푸르카스", "XLII. 가프", "XLIII. 아스모데우스", "XLIV. 포르카스", "XLV. 보락스", "XLVI. 글라시아라볼라스", "XLVII. 나베리우스", "XLVIII. 아이몬", "XLIX. 프루푸스", "L. 살로스",
        "LI. 하프리", "LII. 페니악스", "LIII. 다이몬", "LIV. 스틸", "LV. 마르코시아스", "LVI. 보트스", "LVII. 제파르", "LVIII. 엘리고스", "LIX. 레리어", "LX. 베레트",
        "LXI. 시트리", "LXII. 구시온", "LXIII. 부에르", "LXIV. 카임", "LXV. 포르네우스", "LXVI. 부네", "LXVII. 아몬", "LXVIII. 마라바스", "LXIX. 푸르손", "LXX. 말파스",
        "LXXI. 파임", "LXXII. 바르바토스"
    ];

    const 일반목록 = 일반몬스터이름.map((이름, i) => ({
        이름,
        체력: 50 + (층 - 1) * 72 * 2 + i * 2,
        방어력: Math.floor(((층 - 1) * 72 + i) / 10),
        타입: "일반"
    }));

    const 기준몬스터 = 일반목록[Math.floor(Math.random() * 일반목록.length)];

    const 특수몬스터 = [
        {
            이름: "Ξ. 바론",
            확률: 0.001,
            체력: Math.floor(기준몬스터.체력 * 3.0),
            방어력: Math.floor(기준몬스터.방어력 * 2.0),
            타입: "공허"
        },
        {
            이름: "Ω. 사탄",
            확률: 0.003,
            체력: Math.floor(기준몬스터.체력 * 2.6),
            방어력: Math.floor(기준몬스터.방어력 * 1.8),
            타입: "태초"
        },
        {
            이름: "DCCLXXVII. 벨제부브",
            확률: 0.01,
            체력: Math.floor(기준몬스터.체력 * 2.2),
            방어력: Math.floor(기준몬스터.방어력 * 1.6),
            타입: "고대"
        },
        {
            이름: "LXXXIX. 레비아탄",
            확률: 0.02,
            체력: Math.floor(기준몬스터.체력 * 1.8),
            방어력: Math.floor(기준몬스터.방어력 * 1.4),
            타입: "신화"
        },
        {
            이름: "IV. 디아블로",
            확률: 0.05,
            체력: Math.floor(기준몬스터.체력 * 1.4),
            방어력: Math.floor(기준몬스터.방어력 * 1.2),
            타입: "레어"
        }
    ];

    for (const 몬스터 of 특수몬스터) {
        if (Math.random() < 몬스터.확률) {
            return 몬스터;
        }
    }

    return 기준몬스터;
}
