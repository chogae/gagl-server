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
    const { 유저UID, 현재층: 클라이언트층 } = req.body.유저데이터;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    // ✅ Supabase에서 유저 최신 정보 조회
    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    let 현재스태미너 = 유저.현재스태미너 ?? 100;

    // ✅ 스태미너 부족 시 차단
    if (현재스태미너 <= 0) {
        return res.json({ 결과: "불가", 메시지: "⚠️ 스태미너가 모두 소진되었습니다." });
    }

    // ✅ 스태미너 1 소모
    현재스태미너--;




    // ✅ 클라이언트층을 새유저 객체에 반영
    새유저.현재층 = 클라이언트층;

    // ✅ 장비 드랍 반영
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

        새유저.공격력 += 드랍장비.공격력;
    }

    // ✅ Supabase에 최종 저장
    await supabaseAdmin.from("users").update({
        레벨: 새유저.레벨,
        공격력: 새유저.공격력,
        경험치: 새유저.경험치,
        골드: 새유저.골드,
        최대체력: 새유저.최대체력,
        남은체력: 새유저.남은체력,
        숙련도: 새유저.숙련도,
        현재층: 새유저.현재층, // ✅ 저장됨
        스킬: 새유저.스킬,
        조우기록: 새유저.조우기록,
        합성기록: 새유저.합성기록,
        장비목록: 새유저.장비목록,
        킬카운트: 새유저.킬카운트,
        버전업: 새유저.버전업,
        현재스태미너
    }).eq("유저UID", 새유저.유저UID);

    return res.json({
        결과: "승리",
        몬스터,
        유저남은체력: 새유저.남은체력,
        보상: 기본보상,
        레벨업,
        회복: 드레인,
        유저데이터: {
            ...새유저,
            현재스태미너
        },
        드랍장비
    });
});


app.post("/refresh-stamina", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today9am = new Date(kstNow);
    today9am.setHours(9, 0, 0, 0);

    let 현재스태미너 = 유저.현재스태미너 ?? 100;
    let 최대스태미너 = 유저.최대스태미너 ?? 100;
    let 갱신시각 = 유저.스태미너갱신시각 ? new Date(유저.스태미너갱신시각) : null;

    if (!갱신시각 || 갱신시각 < today9am) {
        현재스태미너 = 최대스태미너;
        갱신시각 = today9am;
    }

    await supabaseAdmin.from("users").update({
        현재스태미너,
        스태미너갱신시각: 갱신시각.toISOString()
    }).eq("유저UID", 유저.유저UID);

    return res.json({
        유저데이터: {
            ...유저,
            현재스태미너,
            스태미너갱신시각: 갱신시각.toISOString()
        }
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
        "신화": 30000,
        "고대": 100000,
        "태초": 300000,
        "공허": 1000000
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
        "레어": 9,
        "신화": 27,
        "고대": 54,
        "태초": 134,
        "공허": 240
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
    const { 유저UID, 스킬이름, 행동 } = req.body;

    if (!유저UID || !스킬이름 || !행동) {
        return res.status(400).json({ 오류: "입력값 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("스킬, 숙련도")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    let 스킬 = 유저.스킬 || {};
    let 숙련도 = 유저.숙련도 || 0;

    // ✅ 전체 초기화 요청 분기
    if (스킬이름 === "전체" && 행동 === "초기화") {
        const 총투자 = Object.values(스킬).reduce((a, b) => a + b, 0);
        let 환급 = 0;
        let 투자순번 = 총투자;

        for (let i = 0; i < 총투자; i++) {
            환급 += 투자순번--;
        }

        숙련도 += 환급;
        스킬 = {};

        const { error: 저장오류 } = await supabaseAdmin
            .from("users")
            .update({ 스킬, 숙련도 })
            .eq("유저UID", 유저UID);

        if (저장오류) {
            return res.status(500).json({ 오류: "초기화 저장 실패" });
        }

        return res.json({ 성공: true, 스킬, 숙련도 });
    }

    // ✅ 아래는 단일 스킬에 대한 투자/회수/마스터 처리
    const 스킬정보 = {
        버서커: { 단계: Array(10).fill(0) },
        드레인: { 단계: Array(8).fill(0) },
        발굴: { 단계: Array(5).fill(0) },
        아이언바디: { 단계: Array(5).fill(0) },
        인사이트: { 단계: Array(2).fill(0) },
        크리티컬: { 단계: Array(13).fill(0) },
        버닝: { 단계: Array(5).fill(0) },
        인텔리전스: { 단계: Array(2).fill(0) },
    };

    if (!스킬정보[스킬이름]) {
        return res.status(400).json({ 오류: "존재하지 않는 스킬" });
    }

    const 단계수 = 스킬정보[스킬이름].단계.length;
    const 최대레벨 = 단계수 * 10;
    const 현재레벨 = 스킬[스킬이름] || 0;
    const 총투자 = Object.values(스킬).reduce((a, b) => a + b, 0);

    if (행동 === "투자") {
        if (현재레벨 >= 최대레벨) return res.status(400).json({ 오류: "최종단계입니다" });
        const 비용 = 총투자 + 1;
        if (숙련도 < 비용) return res.status(400).json({ 오류: "숙련도 부족" });

        숙련도 -= 비용;
        스킬[스킬이름] = 현재레벨 + 1;
    }

    else if (행동 === "회수") {
        if (현재레벨 <= 0) return res.status(400).json({ 오류: "회수할 스킬 없음" });

        숙련도 += 총투자;
        스킬[스킬이름] = 현재레벨 - 1;
    }

    else if (행동 === "마스터") {
        let 레벨 = 현재레벨;
        let 투자 = 총투자;

        while (레벨 < 최대레벨) {
            const 비용 = 투자 + 1;
            if (숙련도 < 비용) break;
            숙련도 -= 비용;
            레벨++;
            투자++;
        }

        스킬[스킬이름] = 레벨;
    }

    else if (행동 === "초기화") {
        let 환급 = 0;
        let 투자순번 = 총투자;

        for (let i = 0; i < 현재레벨; i++) {
            환급 += 투자순번--;
        }

        숙련도 += 환급;
        스킬[스킬이름] = 0;
    }

    else {
        return res.status(400).json({ 오류: "알 수 없는 행동" });
    }

    const { error: 저장오류 } = await supabaseAdmin
        .from("users")
        .update({ 스킬, 숙련도 })
        .eq("유저UID", 유저UID);

    if (저장오류) {
        return res.status(500).json({ 오류: "스킬 저장 실패" });
    }

    return res.json({ 성공: true, 스킬, 숙련도 });
});

app.post("/register-user", async (req, res) => {
    const { 유저UID, 유저아이디, 기기ID, 로그인이메일 } = req.body;

    if (!유저UID || !유저아이디 || !기기ID) {
        return res.status(400).json({ 오류: "입력값 누락" });
    }

    const 삽입값 = {
        유저UID,
        유저아이디,
        로그인이메일,
        기기ID,
        레벨: 1,
        공격력: 10,
        경험치: 0,
        골드: 10000,
        최대체력: 10,
        남은체력: 10,
        숙련도: 0,
        현재층: 1,
        현재악마번호: Math.floor(Math.random() * 72) + 1,
        스킬: {},
        조우기록: { 일반: 0, 레어: 0, 신화: 0, 고대: 0, 태초: 0, 공허: 0 },
        합성기록: {},
        장비목록: [],
        킬카운트: 0,
        강림몬스터: {},
        버전업: 2,
        현재스태미너: 100,
        최대스태미너: 100,
        스태미너갱신시각: new Date().toISOString()
    };

    const { error: 삽입오류 } = await supabaseAdmin
        .from("users")
        .insert(삽입값);

    if (삽입오류) {
        return res.status(500).json({ 오류: "유저 DB 저장 실패" });
    }

    return res.json({ 유저데이터: 삽입값 });
});

app.post("/ranking", async (req, res) => {
    const { 유저UID } = req.body;

    try {
        // 1. 상위 10명 조회
        const { data: 유저들, error } = await supabaseAdmin
            .from("users")
            .select("유저아이디, 레벨, 공격력, 현재층, 장비목록, 합성기록")
            .eq("버전업", 1)
            .order("공격력", { ascending: false })
            .limit(10);

        if (error) {
            return res.status(500).json({ 오류: "랭킹 조회 실패" });
        }

        // 2. 내 순위 계산
        let 내순위 = null;
        if (유저UID) {
            const { data: 전체유저 } = await supabaseAdmin
                .from("users")
                .select("유저UID, 공격력")
                .eq("버전업", 1)
                .order("공격력", { ascending: false });

            내순위 = 전체유저.findIndex(u => u.유저UID === 유저UID);
        }

        return res.json({ 유저들, 내순위 });
    } catch (e) {
        return res.status(500).json({ 오류: e.message });
    }
});

app.post("/delete-user", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) {
        return res.status(400).json({ 오류: "UID 누락됨" });
    }

    try {
        // 1. users 테이블 삭제
        const { error: 테이블삭제오류 } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("유저UID", 유저UID);

        if (테이블삭제오류) {
            console.error("유저 테이블 삭제 실패:", 테이블삭제오류.message);
            return res.status(500).json({ 오류: "유저 테이블 삭제 실패" });
        }

        // 2. Supabase Auth 계정 삭제
        const { error: 인증삭제오류 } = await supabaseAdmin.auth.admin.deleteUser(유저UID);

        if (인증삭제오류) {
            console.error("Auth 삭제 실패:", 인증삭제오류.message);
            return res.status(500).json({ 오류: "인증 계정 삭제 실패" });
        }

        return res.json({ 메시지: "유저 데이터 및 인증 삭제 완료" });
    } catch (e) {
        console.error("유저 삭제 중 예외:", e.message);
        return res.status(500).json({ 오류: "서버 예외 발생" });
    }
});

app.post("/update-username", async (req, res) => {
    const { 유저UID, 새아이디 } = req.body;

    if (!유저UID || !새아이디 || 새아이디.length > 8) {
        return res.status(400).json({ 오류: "입력값 누락 또는 길이 초과" });
    }

    // ✅ 이미 존재하는 아이디 있는지 확인
    const { data: 중복, error: 조회오류 } = await supabaseAdmin
        .from("users")
        .select("유저UID")
        .eq("유저아이디", 새아이디)
        .neq("유저UID", 유저UID);

    if (조회오류) {
        return res.status(500).json({ 오류: "중복 확인 실패" });
    }

    if (중복.length > 0) {
        return res.status(409).json({ 오류: "이미 사용 중인 아이디입니다" });
    }

    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({ 유저아이디: 새아이디 })
        .eq("유저UID", 유저UID);

    if (업데이트오류) {
        return res.status(500).json({ 오류: "아이디 변경 실패" });
    }

    return res.json({ 성공: true });
});


app.listen(3000, () => {
    console.log("서버 실행 중: http://localhost:3000");
});

