const express = require("express");
const cors = require("cors");
const path = require("path");

const { createClient } = require("@supabase/supabase-js"); // 🟡 Supabase Admin용

const app = express();
app.use(cors());
app.use(express.json());

// 🟡 gagl.html 요청 시 해당 파일 반환
app.get("/gagl.html", (req, res) => {
    res.sendFile(path.join(__dirname, "gagl.html"));
});

// ✅ Supabase Admin client 설정 (회원탈퇴용, 절대 클라이언트에 노출금지)
const supabaseAdmin = createClient(
    "https://piafesfywtvpachbfoxr.supabase.co", // 프로젝트 URL
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWZlc2Z5d3R2cGFjaGJmb3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDc4NDAxOCwiZXhwIjoyMDYwMzYwMDE4fQ.inGkUGNirltn3arVtb3rPvLpzoxK28OCDOx04rAH0EE"           // 서비스 롤 키
);

app.post("/get-user", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) {
        return res.status(400).json({ 오류: "유저UID 누락" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    // ✅ 마법의팔레트 자동 지정 로직 추가
    const 이메일팔레트맵 = {
        "gagl@gagl.com": "가글",
        "johny87@gagl.com": "네온사인",
        "pink@gagl.com": "핑크오션",
        "1234qwer@gagl.com": "황혼하늘",
        "saiha@gagl.com": "에메랄드숲",
        "009900@gagl.com": "겨울",
        "naataa@gagl.com": "민초",
        "sibasrigal1@gagl.com": "블라섬",
        "wlstjr1q2w@gagl.com": "지옥",
    };

    const 자동팔레트 = 이메일팔레트맵[유저.로그인이메일];
    if (자동팔레트 && 유저.마법의팔레트 !== 자동팔레트) {
        await supabaseAdmin
            .from("users")
            .update({ 마법의팔레트: 자동팔레트 })
            .eq("유저UID", 유저UID);
        유저.마법의팔레트 = 자동팔레트; // 클라이언트로도 최신값 반영
    }

    // const now = new Date();
    // const formatter = new Intl.DateTimeFormat("ko-KR", {
    //     weekday: "short",
    //     timeZone: "Asia/Seoul"
    // });
    // const parts = formatter.formatToParts(now);
    // const 요일 = parts.find(p => p.type === "weekday")?.value;

    // if (요일 === "일") {
    //     const { data: 전체합, error: 합계에러 } = await supabaseAdmin
    //         .from("users")
    //         .select("보스누적데미지");

    //     if (합계에러 || !전체합) {
    //         return res.status(500).json({ 오류: "펫단계 계산 실패 (총합 조회 에러)" });
    //     }

    //     const 누적데미지총합 = 전체합
    //         .filter(u => u.보스누적데미지 > 0)
    //         .reduce((합, u) => 합 + Number(u.보스누적데미지), 0);

    //     let 펫단계 = 0;
    //     if (누적데미지총합 >= 99_999_999) {
    //         펫단계 = 3;
    //     } else if (누적데미지총합 >= 9_999_999) {
    //         펫단계 = 2;
    //     } else if (누적데미지총합 >= 999_999) {
    //         펫단계 = 1;
    //     }

    //     await supabaseAdmin
    //         .from("users")
    //         .update({ 펫단계 })
    //         .neq("펫단계", 펫단계);

    // await supabaseAdmin
    //     .from("users")
    //     .update({ 보스누적데미지: 0 })
    //     .neq("보스누적데미지", 0); // 0이 아닌 유저만 업데이트 (불필요한 쓰기 방지)

    //     const { data: 대표유저, error: 보스에러 } = await supabaseAdmin
    //         .from("users")
    //         .select("보스넘버")
    //         .not("보스넘버", "is", null)
    //         .limit(1)
    //         .single();

    //     if (!대표유저 || 보스에러) {
    //         return res.status(500).json({ 오류: "보스넘버 조회 실패" });
    //     }

    //     const 현재보스번호 = 대표유저.보스넘버 ?? 0;
    //     const 다음보스번호 = (현재보스번호 + 1) % 6;

    //     await supabaseAdmin
    //         .from("users")
    //         .update({ 보스넘버: 다음보스번호 })
    //         .neq("보스넘버", 다음보스번호);
    // }

    const 장비맵 = {
        "일반": { 이름: "릴리트의 독니", 공격력: 30 },
        "레어": { 이름: "디아블로의 뿔", 공격력: 63 },
        "신화": { 이름: "레비아탄의 비늘", 공격력: 132 },
        "고대": { 이름: "벨제부브의 꼬리", 공격력: 276 },
        "태초": { 이름: "사탄의 날개", 공격력: 576 },
        "타락": { 이름: "루시퍼의 심장", 공격력: 1200 },
    };

    const 기록 = 유저.합성기록 || {};
    const 장비목록 = 유저.장비목록 || [];

    for (const [등급, { 이름, 공격력 }] of Object.entries(장비맵)) {
        const 키 = `${이름}|${등급}`;
        const 합성수 = 기록[키];

        if (합성수 !== undefined) {
            const 누적공격력 = (합성수 + 1) * 공격력;

            const 장비 = 장비목록.find(j => j.이름 === 이름 && j.등급 === 등급);
            if (장비) {
                장비.공격력 = 누적공격력;
            }
        }
    }
    유저.장비공격력 = 장비목록.reduce((합, j) => 합 + (j.공격력 || 0), 0);

    유저.최종공격력 = 최종공격력계산(유저);

    const { error: 업데이트에러 } = await supabaseAdmin
        .from("users")
        .update({
            장비목록,
            장비공격력: 유저.장비공격력,
            최종공격력: 유저.최종공격력,
            마법의팔레트: 유저.마법의팔레트 // 다시 한번 저장해도 무방
        })
        .eq("유저UID", 유저UID);

    if (업데이트에러) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    return res.json({ 유저데이터: { ...유저 } });
});

app.post("/boss-ranking", async (req, res) => {
    try {
        const { 유저UID } = req.body;

        // ✅ 모든 유저의 누적 데미지 합산
        const { data: 전체합, error: 합계에러 } = await supabaseAdmin
            .from("users")
            .select("보스누적데미지");

        if (합계에러 || !전체합) {
            return res.status(500).json({ 오류: "총합 계산 실패" });
        }

        const 누적데미지총합 = 전체합
            .filter(u => u.보스누적데미지 > 0)
            .reduce((합, u) => 합 + Number(u.보스누적데미지), 0);

        // ✅ 상위 10명 조회
        const { data: 유저들, error: 유저에러 } = await supabaseAdmin
            .from("users")
            .select("유저아이디, 보스누적데미지, 유저UID")
            .gt("보스누적데미지", 0)
            .order("보스누적데미지", { ascending: false })

        // 내 순위 계산
        const 내순위 = 유저들.findIndex(u => u.유저UID === 유저UID);
        const 내정보 = 내순위 >= 0 ? {
            순위: 내순위 + 1,
            유저아이디: 유저들[내순위].유저아이디,
            보스누적데미지: 유저들[내순위].보스누적데미지
        } : null;

        if (유저에러) {
            return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
        }

        res.json({ 순위: 유저들, 누적데미지총합, 내정보 });

    } catch (e) {
        console.error("boss-ranking 오류", e);
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }
});


app.post("/attack-boss", async (req, res) => {
    const { 유저데이터, 보스이름 } = req.body;
    const { 유저UID } = 유저데이터;
    const 전투로그 = [];

    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });


    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        weekday: "short",
        timeZone: "Asia/Seoul"
    });
    const parts = formatter.formatToParts(now);
    const 요일 = parts.find(p => p.type === "weekday")?.value;

    if (요일 === "토") {
        return res.status(403).json({ 오류: "보스가 점점 멀어집니다" });
    }
    if (요일 === "일") {
        return res.status(403).json({ 오류: "새로운 보스의 강림으로 대지가 갈라지는 중입니다" });
    }

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    let 현재스태미너 = 유저.현재스태미너 ?? 0;
    if (현재스태미너 < 10) {
        return res.json({ 결과: "불가", 메시지: "스태미너 부족" });
    }

    const 암포라 = 유저.유물목록?.["암포라"] || 0;
    const 발동확률 = 암포라 * 0.01;

    const 스태미너감소량 = Math.random() < 발동확률 ? 9 : 10;
    현재스태미너 -= 스태미너감소량;

    유저.스태미너소모총량 = (유저.스태미너소모총량 || 0) + 10;

    // 유저 체력 회복
    유저.남은체력 = 유저.최대체력;
    let 현재턴 = 1;

    // ✅ 보스 이름 반영
    const 보스 = {
        이름: 보스이름 || "BOSS",
        체력: 9999999,
        방어력: 0
    };

    // ✅ 전투시뮬레이션 단 한 번만 호출
    const 전투결과 = 전투시뮬레이션(유저, 보스, 전투로그, 현재턴, true); // 보스전: true

    const 누적데미지 = 전투로그.reduce((합, 로그) => {
        return 로그.타입 === "공격" ? 합 + Number(로그.효과) : 합;
    }, 0);

    유저.보스누적데미지 += 누적데미지;
    유저.남은체력 = 유저.최대체력;
    // 누적 데미지 저장
    await supabaseAdmin.from("users").update({
        현재스태미너,
        남은체력: 유저.최대체력,
        스태미너소모총량: 유저.스태미너소모총량,
        보스누적데미지: 유저.보스누적데미지
    }).eq("유저UID", 유저UID);

    return res.json({
        결과: "완료",
        누적데미지,
        유저데이터: {
            ...유저,
            현재스태미너,
            남은체력: 유저.최대체력,
            보스누적데미지: 유저.보스누적데미지
        },
        전투로그
    });
});

app.post("/attack-normal", async (req, res) => {
    const { 유저데이터 } = req.body;
    const { 유저UID, 현재층: 클라이언트층 } = 유저데이터;
    const 전투로그 = [];
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    let 현재스태미너 = 유저.현재스태미너 ?? 1000;
    if (현재스태미너 <= 0) {
        return res.json({ 결과: "불가", 메시지: "스태미너가 모두 소진되었습니다." });
    }

    const 모래시계개수 = 유저.유물목록?.["모래시계"] || 0;

    // 총 확률 계산 (예: 3개면 0.03%)
    const 확률 = 모래시계개수 * 0.001;

    // 확률 실패 시에만 스태미너 감소
    if (Math.random() > 확률) {
        현재스태미너--;
    }

    유저.스태미너소모총량++;

    const 몬스터 = 일반악마불러오기(클라이언트층 || 1);
    // 유저.조우기록 = 유저.조우기록 || {
    //     일반: 0
    // };
    // 유저.조우기록["일반"]++;

    const 회복전체력 = 유저.남은체력;
    const 추가회복 = 아이언바디회복(유저);
    let 현재턴 = 0;

    if (추가회복 > 0) {
        유저.남은체력 = Math.min(유저.최대체력, 회복전체력 + 추가회복);

        전투로그.push({
            턴: 현재턴,
            타입: "회복",  // 회복 타입 추가
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: 유저.남은체력,
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 몬스터.체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["아이언바디아이콘"],  // 회복 스킬 아이콘
            효과: `${추가회복}`,  // "체력 회복"만 표시
        });
    }
    현재턴++;

    const 전투 = 전투시뮬레이션(유저, 몬스터, 전투로그, 현재턴);

    if (전투.결과 === "패배") {
        const 유저복구 = {
            ...유저,
            남은체력: 유저.최대체력,
            현재스태미너
        };

        await supabaseAdmin.from("users").update({
            남은체력: 유저복구.남은체력,
            현재스태미너,
            현재층: 클라이언트층,
            // 조우기록: 유저.조우기록
        }).eq("유저UID", 유저UID);

        return res.json({
            결과: "패배",
            몬스터,
            유저남은체력: 전투.유저남은체력,
            유저데이터: 유저복구,
            전투로그
        });
    }

    const 보상 = 보상계산(클라이언트층, 유저, 몬스터);
    보상.숙련도 += 인사이트추가숙련도(유저);
    보상.경험치 = Math.floor(보상.경험치 * 인텔리전스추가경험치배율(유저));
    보상.골드 = Math.floor(보상.골드 * 획득금화발굴(유저));

    const 인사이트발동 = 인사이트추가숙련도(유저) > 0;
    const 인텔리전스발동 = 인텔리전스추가경험치배율(유저) > 1;
    const 발굴발동 = 획득금화발굴(유저) > 1;

    const 레벨업 = 레벨업판정(유저.경험치 + 보상.경험치, 유저.레벨);
    const 드레인 = 드레인회복(유저);

    if (드레인 > 0) {
        전투로그.push({
            턴: "종료", // 마지막 전투 턴 그대로 사용
            타입: "회복",
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: Math.min(유저.최대체력, 전투.유저남은체력 + 드레인),
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 전투.몬스터남은체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["드레인아이콘"],  // 드레인 아이콘 표시
            효과: `${드레인}`  // 회복량
        });
    }

    const 새유저 = 전투보상반영(유저, 보상, 드레인, 레벨업, 전투.유저남은체력);
    새유저.현재층 = 클라이언트층;

    const 드랍유물 = 유물드랍판정(몬스터, 유저);
    if (드랍유물) {
        새유저.유물목록 = 새유저.유물목록 || {};
        새유저.유물목록[드랍유물] = (새유저.유물목록[드랍유물] || 0) + 1;
    }

    const 최종공격력 = 최종공격력계산(새유저);
    새유저.최종공격력 = 최종공격력;
    const 최대체력 = 최대체력계산(새유저);
    새유저.최대체력 = 최대체력;

    let 레어몬스터이름 = 레어몬스터등장판정(유저);

    if (레어몬스터이름 && 현재스태미너 === 0) {
        현재스태미너++;
    }

    await supabaseAdmin.from("users").update({
        레벨: 새유저.레벨,
        레벨공격력: 새유저.레벨공격력,
        최종공격력: 최종공격력,
        경험치: 새유저.경험치,
        골드: 새유저.골드,
        최대체력: 새유저.최대체력,
        남은체력: 새유저.남은체력,
        숙련도: 새유저.숙련도,
        현재층: 새유저.현재층,
        스킬: 새유저.스킬,
        버전업: 새유저.버전업,
        유물목록: 새유저.유물목록,
        현재스태미너,
        스태미너소모총량: 유저.스태미너소모총량,
    }).eq("유저UID", 새유저.유저UID);


    return res.json({
        결과: "승리",
        몬스터,
        유저남은체력: 새유저.남은체력,
        보상,
        레벨업,
        회복: 드레인,
        추가골드: 보상.추가골드 || 0,
        추가숙련도: 보상.추가숙련도 || 0,
        유저데이터: {
            ...새유저,
            현재스태미너
        },
        레어몬스터이름,
        전투로그,
        드랍유물,
        스킬발동: {
            인사이트: 인사이트발동,   // true/false
            인텔리전스: 인텔리전스발동, // true/false
            발굴: 발굴발동              // true/false
        }
    });
});

app.post("/attack-rare", async (req, res) => {
    const { 유저데이터, 레어몬스터이름 } = req.body;
    const { 유저UID, 현재층: 클라이언트층 } = 유저데이터;
    const 전투로그 = [];

    if (!유저UID || !레어몬스터이름) {
        return res.status(400).json({ 오류: "입력값 누락" });
    }

    const { data: 유저 } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    let 현재스태미너 = 유저.현재스태미너 ?? 1000;
    if (현재스태미너 <= 0) {
        return res.json({ 결과: "불가", 메시지: "⚠️ 스태미너가 모두 소진되었습니다." });
    }

    const 모래시계개수 = 유저.유물목록?.["모래시계"] || 0;

    // 총 확률 계산 (예: 3개면 0.03%)
    const 확률 = 모래시계개수 * 0.001;

    // 확률 실패 시에만 스태미너 감소
    if (Math.random() > 확률) {
        현재스태미너--;
    }

    유저.스태미너소모총량++;

    const 몬스터 = 레어악마불러오기(클라이언트층 || 1, 레어몬스터이름);

    // ✅ 조우기록 갱신
    const 타입 = 몬스터.타입 || "";
    유저.조우기록 = 유저.조우기록 || {
        일반: 0,
        레어: 0,
        신화: 0,
        고대: 0,
        태초: 0,
        타락: 0,
        황금: 0,
        계시: 0 // 🔥 숙고블린용 타입 추가
    };
    if (유저.조우기록[타입] !== undefined) {
        유저.조우기록[타입]++;
    }

    const 회복전체력 = 유저.남은체력;
    const 추가회복 = 아이언바디회복(유저);
    let 현재턴 = 0;

    if (추가회복 > 0) {
        유저.남은체력 = Math.min(유저.최대체력, 회복전체력 + 추가회복);

        전투로그.push({
            턴: 현재턴,
            타입: "회복",  // 회복 타입 추가
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: 유저.남은체력,
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 몬스터.체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["아이언바디아이콘"],  // 회복 스킬 아이콘
            효과: `${추가회복}`,  // "체력 회복"만 표시
        });
    }
    현재턴++;

    const 전투 = 전투시뮬레이션(유저, 몬스터, 전투로그, 현재턴);

    if (전투.결과 === "패배") {
        const 유저복구 = {
            ...유저,
            남은체력: 유저.최대체력,
            현재스태미너
        };

        await supabaseAdmin.from("users").update({
            남은체력: 유저복구.남은체력,
            현재스태미너,
            현재층: 클라이언트층,
            조우기록: 유저.조우기록
        }).eq("유저UID", 유저UID);

        return res.json({
            결과: "패배",
            몬스터,
            유저남은체력: 전투.유저남은체력,
            유저데이터: 유저복구,
            전투로그
        });
    }

    // ✅ 보상 계산
    const 보상 = 보상계산(클라이언트층, 유저, 몬스터);
    보상.숙련도 += 인사이트추가숙련도(유저);
    보상.경험치 += Math.floor(보상.경험치 * 인텔리전스추가경험치배율(유저));
    보상.골드 = Math.floor(보상.골드 * 획득금화발굴(유저));

    const 인사이트발동 = 인사이트추가숙련도(유저) > 0;
    const 인텔리전스발동 = 인텔리전스추가경험치배율(유저) > 1;
    const 발굴발동 = 획득금화발굴(유저) > 1;

    const 레벨업 = 레벨업판정(유저.경험치 + 보상.경험치, 유저.레벨);
    const 드레인 = 드레인회복(유저);

    if (드레인 > 0) {
        전투로그.push({
            턴: 현재턴, // 마지막 전투 턴 그대로 사용
            타입: "회복",
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: Math.min(유저.최대체력, 전투.유저남은체력 + 드레인),
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 전투.몬스터남은체력,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터.방어력,
            아이콘: ["드레인아이콘"],  // 드레인 아이콘 표시
            효과: `${드레인}`  // 회복량
        });
    }

    const 새유저 = 전투보상반영(유저, 보상, 드레인, 레벨업, 전투.유저남은체력);
    새유저.현재층 = 클라이언트층;

    // ✅ 드랍 장비 판정
    const 드랍장비 = 장비드랍판정(몬스터, 유저);
    if (드랍장비) {
        새유저.장비목록 = 새유저.장비목록 || [];
        새유저.합성기록 = 새유저.합성기록 || {};
        const 키 = `${드랍장비.이름}|${드랍장비.등급}`;
        const 기존 = 새유저.장비목록.find(j => j.이름 === 드랍장비.이름 && j.등급 === 드랍장비.등급);

        if (기존) {
            새유저.합성기록[키] = (새유저.합성기록[키] || 0) + 1;
            새유저.최대체력 += 1;
            기존.공격력 += 드랍장비.공격력;
            새유저.장비공격력 += 드랍장비.공격력;
        } else {
            새유저.장비목록.push(드랍장비);
            새유저.합성기록[키] = 0;
            새유저.장비공격력 += 드랍장비.공격력;
        }
    }

    const 드랍유물 = 유물드랍판정(몬스터, 유저);
    if (드랍유물) {
        새유저.유물목록 = 새유저.유물목록 || {};
        새유저.유물목록[드랍유물] = (새유저.유물목록[드랍유물] || 0) + 1;
    }

    const 최종공격력 = 최종공격력계산(새유저);
    새유저.최종공격력 = 최종공격력;
    const 최대체력 = 최대체력계산(새유저);
    새유저.최대체력 = 최대체력;

    let 새로운레어몬스터이름 = 레어몬스터등장판정(유저);
    if (새로운레어몬스터이름 && 현재스태미너 === 0) {
        현재스태미너++;
    }

    await supabaseAdmin.from("users").update({
        레벨: 새유저.레벨,
        레벨공격력: 새유저.레벨공격력,
        장비공격력: 새유저.장비공격력,
        최종공격력: 최종공격력,
        경험치: 새유저.경험치,
        골드: 새유저.골드,
        최대체력: 최대체력,
        남은체력: 새유저.남은체력,
        숙련도: 새유저.숙련도,
        현재층: 새유저.현재층,
        스킬: 새유저.스킬,
        조우기록: 새유저.조우기록,
        합성기록: 새유저.합성기록,
        장비목록: 새유저.장비목록,
        버전업: 새유저.버전업,
        유물목록: 새유저.유물목록,
        현재스태미너,
        스태미너소모총량: 유저.스태미너소모총량,
    }).eq("유저UID", 유저UID);


    return res.json({
        결과: "승리",
        몬스터,
        유저남은체력: 새유저.남은체력,
        보상,
        레벨업,
        회복: 드레인,
        드랍장비,
        추가골드: 보상.추가골드 || 0,
        추가숙련도: 보상.추가숙련도 || 0,
        유저데이터: {
            ...새유저,
            현재스태미너
        },
        레어몬스터이름: 새로운레어몬스터이름,
        전투로그,
        드랍유물,
        스킬발동: {
            인사이트: 인사이트발동,   // true/false
            인텔리전스: 인텔리전스발동, // true/false
            발굴: 발굴발동              // true/false
        }
    });
    console.log("🧪 입력받은 유저데이터:", req.body.유저데이터);
    console.log("🧪 레어몬스터이름:", req.body.레어몬스터이름);
    console.log("🧪 몬스터 정보:", 몬스터);
    console.log("🧪 유저 상태:", 유저);

});

app.post("/refresh-stamina", async (req, res) => {
    const { 유저UID } = req.body;
    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    // ✅ 현재 한국 시각의 '시간 정수' 계산 (0~23)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Seoul"
    });
    const parts = formatter.formatToParts(now);
    const 현재시간정수 = Number(parts.find(p => p.type === "hour")?.value);

    // ✅ 유저 정보 조회
    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    const 저장된시간 = 유저.스태미너갱신시간 ?? 현재시간정수;
    let 현재스태미너 = 유저.현재스태미너 ?? 1000;
    const 최대스태미너 = 유저.최대스태미너 ?? 1000;

    // ✅ 시간 차이 계산 (자정 넘을 경우 보정)
    let 시간차이 = 현재시간정수 - 저장된시간;
    if (시간차이 < 0) 시간차이 += 24;

    // ✅ 스태미너 회복량 계산 및 적용
    const 회복량 = 시간차이 * 60;
    현재스태미너 = Math.min(현재스태미너 + 회복량, 최대스태미너);

    // ✅ DB에 반영
    await supabaseAdmin.from("users").update({
        현재스태미너,
        스태미너갱신시간: 현재시간정수
    }).eq("유저UID", 유저UID);

    // ✅ 응답 반환
    return res.json({
        유저데이터: {
            ...유저,
            현재스태미너,
            스태미너갱신시간: 현재시간정수
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
        "일반": 10000,
        "레어": 30000,
        "신화": 100000,
        "고대": 200000,
        "태초": 300000,
        "타락": 400000,
    };

    const 강화비용 = 강화비용맵[등급];
    if (typeof 강화비용 !== "number") {
        return res.status(400).json({ 오류: "알 수 없는 등급" });
    }

    if ((유저.골드 || 0) < 강화비용) {
        return res.status(400).json({ 오류: `골드 부족: ${강화비용} 필요` });
    }

    const 모루개수 = 유저.유물목록?.["모루"] || 0;

    let 증가량 = 0;
    let 성공 = Math.random() < (0.61 + 0.001 * 모루개수);
    let 메시지 = "강화 실패..";

    유저.골드 -= 강화비용;

    const 강화증가량맵 = {
        "일반": 5,
        "레어": 15,
        "신화": 30,
        "고대": 80,
        "태초": 150,
        "타락": 240,
    };

    const 단계값 = 강화증가량맵[등급] || 0;

    if (성공) {
        증가량 = 단계값;
        대상.강화 = (대상.강화 || 0) + 1;
        메시지 = `강화 성공! 공격력 +${증가량}`;
    } else {
        if ((대상.강화 || 0) > 0) {
            증가량 = -단계값;
            대상.강화 -= 1;
            메시지 = `강화 실패.. 강화 수치가 1 감소하고 공격력 ${증가량}`;
        } else {
            증가량 = 0;
            메시지 = "강화 실패..";
        }
    }

    대상.공격력 += 증가량;
    유저.장비공격력 += 증가량;

    const 최종공격력 = 최종공격력계산(유저);
    유저.최종공격력 = 최종공격력;

    const { error: 저장오류 } = await supabaseAdmin
        .from("users")
        .update({
            장비목록: 장비목록,
            장비공격력: 유저.장비공격력,
            최종공격력: 최종공격력,
            골드: 유저.골드
        })
        .eq("유저UID", 유저UID);

    if (저장오류) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    return res.json({
        성공,
        증가량,
        강화: 대상.강화,
        장비공격력: 유저.장비공격력,
        무기공격력: 대상.공격력, // ✅ 추가!
        최종공격력: 최종공격력,
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
        .select("스킬, 숙련도, 유물목록")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    let 스킬 = 유저.스킬 || {};
    let 숙련도 = 유저.숙련도 || 0;

    if (스킬이름 === "전체" && 행동 === "초기화") {
        const 플라워 = 유저.유물목록?.["플라워"] || 0;

        if (플라워 < 1) {
            return res.status(400).json({ 오류: "플라워 유물이 부족합니다" });
        }

        const 총투자 = Object.values(스킬).reduce((a, b) => a + b, 0);
        const 환급 = 500 * 총투자 * (총투자 + 1) / 2;

        숙련도 += 환급;
        스킬 = {};

        const 유물목록 = { ...유저.유물목록, 플라워: 플라워 - 1 }; // 1개 차감

        const { error: 저장오류 } = await supabaseAdmin
            .from("users")
            .update({ 스킬, 숙련도, 유물목록 })  // ← 유물목록도 같이 저장
            .eq("유저UID", 유저UID);

        if (저장오류) return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });

        return res.json({ 성공: true, 스킬, 숙련도, 스킬상태: {}, 유물목록 }); // ← 유물목록도 같이 반환
    }

    const 스킬정보 = {
        버서커: { 단계: Array(23).fill(0) },
        드레인: { 단계: Array(23).fill(0) },
        발굴: { 단계: Array(23).fill(0) },
        아이언바디: { 단계: Array(23).fill(0) },
        인사이트: { 단계: Array(1).fill(0) },
        크리티컬: { 단계: Array(23).fill(0) },
        버닝: { 단계: Array(23).fill(0) },
        인텔리전스: { 단계: Array(23).fill(0) },
        브로큰: { 단계: Array(23).fill(0) },
    };

    if (!스킬정보[스킬이름]) {
        return res.status(400).json({ 오류: "구현중입니다. 조금만 기다려주세요" });
    }

    const 단계수 = 스킬정보[스킬이름].단계.length;
    const 최대레벨 = 단계수;
    const 현재레벨 = 스킬[스킬이름] || 0;
    const 총투자 = Object.values(스킬).reduce((a, b) => a + b, 0);

    if (행동 === "습득") {
        if (현재레벨 >= 최대레벨) return res.status(400).json({ 오류: "최종단계입니다" });

        const 투자 = 총투자;
        const 필요한숙련도 = (투자 + 1) * 500;

        if (숙련도 < 필요한숙련도) return res.status(400).json({ 오류: "숙련도 부족" });

        숙련도 -= 필요한숙련도;
        스킬[스킬이름] = 현재레벨 + 1;
    }

    else if (행동 === "회수") {
        if (현재레벨 < 1) return res.status(400).json({ 오류: "회수할 스킬 없음" });

        const 투자 = 총투자;
        const 환급숙련도 = 투자 * 500;

        숙련도 += 환급숙련도;
        스킬[스킬이름] = 현재레벨 - 1;
    }

    else {
        return res.status(400).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    // ✅ 스킬상태 계산: 각 계열의 현재 이름과 설명
    const 스킬상태 = {};
    for (const 키 in 스킬정보) {
        const 레벨 = 스킬[키] || 0;
        const 인덱스 = Math.min(레벨 - 1, 스킬정보[키].단계.length - 1);
        if (레벨 > 0) {
            스킬상태[키] = {
                이름: 스킬정보[키].단계[인덱스]
            };
        } else {
            스킬상태[키] = {
                이름: 스킬정보[키].단계[0]
            };
        }
    }

    const { error: 저장오류 } = await supabaseAdmin
        .from("users")
        .update({ 스킬, 숙련도 })
        .eq("유저UID", 유저UID);

    if (저장오류) return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });

    return res.json({ 성공: true, 스킬, 숙련도, 스킬상태 });
});



app.post("/register-user", async (req, res) => {
    const { 유저UID, 유저아이디, 기기ID, 로그인이메일 } = req.body;

    if (!유저UID || !유저아이디 || !기기ID) {
        return res.status(400).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Seoul"
    });
    const parts = formatter.formatToParts(now);
    const 현재시간 = Number(parts.find(p => p.type === "hour")?.value);

    const 이메일팔레트맵 = {
        "gagl@gagl.com": "가글",
        "johny87@gagl.com": "네온사인",
        "pink@gagl.com": "핑크오션",
        "1234qwer@gagl.com": "황혼하늘",
        "saiha@gagl.com": "에메랄드숲",
        "009900@gagl.com": "겨울",
        "naataa@gagl.com": "민초",
        "sibasrigal1@gagl.com": "블라섬",
        "wlstjr1q2w@gagl.com": "지옥",
    };

    const 마법의팔레트 = 이메일팔레트맵[로그인이메일] || null;

    //신규유저
    const 삽입값 = {
        유저UID,
        유저아이디,
        로그인이메일,
        기기ID,
        레벨: 1,
        레벨공격력: 10,
        전직공격력: 1,
        최종공격력: 10,
        장비공격력: 0,
        펫단계: 0,
        경험치: 0,
        골드: 100000,
        최대체력: 10,
        남은체력: 10,
        숙련도: 0,
        현재층: 1,
        현재악마번호: Math.floor(Math.random() * 72) + 1,
        스킬: {},
        조우기록: { 일반: 0, 레어: 0, 신화: 0, 고대: 0, 태초: 0, 타락: 0 },
        합성기록: {},
        장비목록: [],
        버전업: 6,
        현재스태미너: 1000,
        최대스태미너: 1000,
        스태미너갱신시간: 현재시간,
        전직정보: {
            "백인장": 0,
            "오백인장": 0,
            "천인장": 0,
            "만인장": 0,
            "부장군": 0,
            "장군": 0,
            "대장군": 0,
            "대사마": 0,
            "승상": 0,
            "후": 0,
            "공": 0,
            "제후": 0,
            "왕": 0,
            "황제": 0,
            "천황": 0,
            "제황": 0,
            "태황": 0,
            "천제": 0
        },
        마법의팔레트,
    };

    const { error: 삽입오류 } = await supabaseAdmin
        .from("users")
        .insert(삽입값);

    if (삽입오류) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    return res.json({ 유저데이터: 삽입값 });
});

app.post("/ranking", async (req, res) => {
    const { 유저UID } = req.body;

    try {
        const { data: 유저들, error } = await supabaseAdmin
            .from("users")
            .select("유저UID, 로그인이메일, 유저아이디, 레벨, 최종공격력, 현재층, 장비목록, 합성기록, 전직정보, 마법의팔레트")
            .eq("버전업", 6)
            .not("최종공격력", "is", null)
            .order("최종공격력", { ascending: false })

        if (error) {
            return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
        }

        for (const 유저 of 유저들) {
            유저.직위 = 최고전직명(유저.전직정보) || "";
        }

        return res.json({ 유저들 });
    } catch (e) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
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
            return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
        }

        // 2. Supabase Auth 계정 삭제
        const { error: 인증삭제오류 } = await supabaseAdmin.auth.admin.deleteUser(유저UID);

        if (인증삭제오류) {
            console.error("Auth 삭제 실패:", 인증삭제오류.message);
            return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
        }

        return res.json({ 메시지: "유저 데이터 및 인증 삭제 완료" });
    } catch (e) {
        console.error("유저 삭제 중 예외:", e.message);
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
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
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    if (중복.length > 0) {
        return res.status(409).json({ 오류: "이미 사용 중인 아이디입니다" });
    }

    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update({ 유저아이디: 새아이디 })
        .eq("유저UID", 유저UID);

    if (업데이트오류) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    return res.json({ 성공: true });
});

app.post("/get-job-info", async (req, res) => {
    const { 유저UID } = req.body;

    if (!유저UID) return res.status(400).json({ 오류: "유저UID 누락" });

    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("전직정보, 경험치")
        .eq("유저UID", 유저UID)
        .single();

    if (error || !유저) return res.status(404).json({ 오류: "유저 정보 없음" });

    return res.json({
        전직정보: 유저.전직정보,
        경험치: 유저.경험치
    });
});

app.post("/promote-job", async (req, res) => {
    const { 유저UID, 직위 } = req.body;

    if (!유저UID || !직위) {
        return res.status(400).json({ 오류: "유저UID 또는 직위 누락" });
    }

    // 유저 정보 불러오기
    const { data: 유저, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("유저UID", 유저UID)
        .single();

    const 전직정보 = 유저.전직정보 ?? {};
    const 완료전직갯수 = Object.values(전직정보).filter(v => v === 1).length;
    const 비용 = (완료전직갯수 + 1) * 50000;

    if (error || !유저) {
        return res.status(404).json({ 오류: "유저 정보 없음" });
    }

    const 경험치 = 유저.경험치 ?? 0;

    if (경험치 < 비용) {
        return res.status(400).json({ 오류: "경험치 부족" });
    }

    if (전직정보[직위] === 1) {
        return res.status(400).json({ 오류: "이미 전직 완료된 직위입니다" });
    }

    전직정보[직위] = 1;

    유저.전직공격력 = 완료전직갯수 + 2;
    const 새레벨 = Math.floor((경험치 - 비용) / 1000) + 1;

    const 새레벨공격력 = 10 + (새레벨 - 1) * 5;
    유저.레벨공격력 = 새레벨공격력;

    const 최종공격력 = 최종공격력계산(유저);
    유저.최종공격력 = 최종공격력;

    const 업데이트 = {
        레벨공격력: 새레벨공격력,
        최종공격력: 최종공격력,
        경험치: 경험치 - 비용,
        레벨: 새레벨,
        전직정보,
        전직공격력: 완료전직갯수 + 2  // ✅ 추가됨
    };

    const { error: 업데이트오류 } = await supabaseAdmin
        .from("users")
        .update(업데이트)
        .eq("유저UID", 유저UID);

    if (업데이트오류) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }

    return res.json({ 성공: true, 전직정보: 전직정보, 경험치: 경험치 - 비용, 레벨: 새레벨, 최종공격력: 최종공격력 });
});

function 최고전직명(전직정보) {
    const 전직순서 = ["백인장", "오백인장", "천인장", "만인장", "부장군", "장군", "대장군", "대사마", "승상", "후", "공", "제후", "왕", "황제", "천황", "제황", "태황", "천제"];

    let 마지막직위 = null;
    for (const 직위 of 전직순서) {
        if (전직정보?.[직위] === 1) {
            마지막직위 = 직위;
        } else {
            break;
        }
    }
    return 마지막직위;
}

app.post("/gamble-Equipment", async (req, res) => {
    const { 유저UID, 종류 } = req.body;
    const 비용 = 100000;

    try {
        const { data: 유저, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("유저UID", 유저UID)
            .single();

        if (error || !유저) return res.status(400).json({ 오류: "유저 정보 없음" });


        if (종류 === "고급") {
            const 티켓 = 유저.유물목록?.["티켓"] || 0;
            if (티켓 < 1) {
                return res.status(400).json({ 오류: "티켓이 부족합니다" });
            }
            유저.유물목록["티켓"] = 티켓 - 1;
        }

        const 장비맵 = {
            "일반": { 이름: "릴리트의 독니", 공격력: 30 },
            "레어": { 이름: "디아블로의 뿔", 공격력: 63 },
            "신화": { 이름: "레비아탄의 비늘", 공격력: 132 },
            "고대": { 이름: "벨제부브의 꼬리", 공격력: 276 },
            "태초": { 이름: "사탄의 날개", 공격력: 576 },
            "타락": { 이름: "루시퍼의 심장", 공격력: 1200 }
        };

        // 유저 조회 후 추가
        const 클로버 = 유저.유물목록?.["클로버"] || 0;
        const 보정 = 1 + 0.001 * 클로버;

        let 확률표;

        if (종류 === "고급") {
            확률표 = [
                { 등급: "타락", 확률: 보정 * (1 - Math.pow(1 - 1 / 25600, 500)) },
                { 등급: "태초", 확률: 보정 * (1 - Math.pow(1 - 1 / 12800, 500)) },
                { 등급: "고대", 확률: 보정 * (1 - Math.pow(1 - 1 / 6400, 500)) },
                { 등급: "신화", 확률: 보정 * (1 - Math.pow(1 - 1 / 3200, 500)) },
                { 등급: "레어", 확률: 보정 * (1 - Math.pow(1 - 1 / 1600, 500)) }
            ];
        } else {
            확률표 = [
                { 등급: "태초", 확률: 보정 * (1 - Math.pow(1 - 1 / 12800, 500)) },
                { 등급: "고대", 확률: 보정 * (1 - Math.pow(1 - 1 / 6400, 500)) },
                { 등급: "신화", 확률: 보정 * (1 - Math.pow(1 - 1 / 3200, 500)) },
                { 등급: "레어", 확률: 보정 * (1 - Math.pow(1 - 1 / 1600, 500)) },
                { 등급: "일반", 확률: 보정 * (1 - Math.pow(1 - 1 / 800, 500)) }
            ];
        }

        const 퍼즐 = 유저.유물목록?.["퍼즐"] || 0;
        const 퍼즐발동 = Math.random() < 0.001 * 퍼즐;

        if (종류 !== "고급" && !퍼즐발동 && 유저.골드 < 비용) {
            return res.status(400).json({ 오류: "골드 부족" });
        }

        if (종류 !== "고급" && !퍼즐발동) {
            유저.골드 -= 비용;
        }

        const 남은골드 = 유저.골드;


        let r = Math.random();
        let 누적 = 0;
        let 뽑힌등급 = 확률표[확률표.length - 1].등급;

        for (const 항목 of 확률표) {
            누적 += 항목.확률;
            if (r < 누적) {
                뽑힌등급 = 항목.등급;
                break;
            }
        }


        const 드랍장비 = 장비맵[뽑힌등급];

        const 장비목록 = 유저.장비목록 || [];
        const 기록 = 유저.합성기록 || {};
        const 키 = `${드랍장비.이름}|${뽑힌등급}`;
        let 기존 = 장비목록.find(j => j.이름 === 드랍장비.이름 && j.등급 === 뽑힌등급);
        let 체력증가량 = 0;
        let 공격력증가량 = 드랍장비.공격력;

        if (기존) {
            기존.공격력 += 드랍장비.공격력;
            기록[키] = (기록[키] || 0) + 1;
            if (뽑힌등급 === "태초" || 뽑힌등급 === "타락") {
                체력증가량 = 1;
            }
        } else {
            장비목록.push({ 이름: 드랍장비.이름, 등급: 뽑힌등급, 공격력: 드랍장비.공격력, 강화: 0 });
            기록[키] = 0;
        }

        유저.장비공격력 += 공격력증가량;
        유저.최종공격력 = 최종공격력계산(유저);

        const 업데이트 = {
            골드: 남은골드,
            장비목록,
            합성기록: 기록,
            최대체력: 유저.최대체력 + 체력증가량,
            장비공격력: 유저.장비공격력,
            최종공격력: 유저.최종공격력,
            ...(종류 === "고급" ? { 유물목록: 유저.유물목록 } : {}),
        };

        await supabaseAdmin
            .from("users")
            .update(업데이트)
            .eq("유저UID", 유저UID);

        const 유저데이터 = { ...유저, ...업데이트 };

        return res.json({
            유저데이터,
            장비: { ...드랍장비, 등급: 뽑힌등급 },
            결과: "성공",
            퍼즐발동
        });

    } catch (e) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }
});

app.post("/gamble-Relic", async (req, res) => {
    const { 유저UID } = req.body;
    const 비용 = 100000;

    try {
        const { data: 유저, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("유저UID", 유저UID)
            .single();

        if (error || !유저) {
            return res.status(400).json({ 오류: "유저 정보 없음" });
        }

        const 후보 = Object.keys(레어유물데이터).filter(이름 => {
            const 보유 = 유저.유물목록?.[이름] || 0;
            return 보유 < 99;
        });

        // ⛔️ 먼저 후보 유물이 있는지 확인
        if (후보.length === 0) {
            return res.status(400).json({ 오류: "더 이상 획득 가능한 유물이 없습니다" });
        }

        const 퍼즐 = 유저.유물목록?.["퍼즐"] || 0;
        const 퍼즐발동 = Math.random() < 0.001 * 퍼즐;

        // ⛔️ 퍼즐이 없고, 골드도 부족하면 중단
        if (!퍼즐발동 && 유저.골드 < 비용) {
            return res.status(400).json({ 오류: "골드 부족" });
        }

        // ✅ 이제 안전하게 차감
        if (!퍼즐발동) {
            유저.골드 -= 비용;
        }

        const 유물이름 = 후보[Math.floor(Math.random() * 후보.length)];
        const 유물목록 = { ...유저.유물목록 };
        유물목록[유물이름] = (유물목록[유물이름] || 0) + 1;

        const 업데이트 = {
            골드: 유저.골드,
            유물목록
        };

        await supabaseAdmin
            .from("users")
            .update(업데이트)
            .eq("유저UID", 유저UID);

        const 유저데이터 = { ...유저, ...업데이트 };

        return res.json({
            결과: "성공",
            유저데이터,
            유물이름,
            퍼즐발동
        });
    } catch (e) {
        return res.status(500).json({ 오류: "제잘못아니고 서버오류입니다. 잠시 후 새로고침하시고 다시 시도하세요" });
    }
});

app.listen(3000, () => {
});

function 크리티컬배율계산(유저) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["크리티컬"] || 0;
    if (레벨 <= 0) return 1; // 배운 게 없으면 기본값 1배

    // 각 레벨당 10% → 0.1 증가, 기본 배율 1
    return 1 + 레벨 * 0.1;
}

function 버서커배율계산(유저) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["버서커"] || 0;

    return {
        배율: 레벨 > 0 ? 1.1 * 레벨 + 1.1 : 1, // 기본 1배
        체력소모: 레벨
    };
}

function 버닝배율계산(유저, 현재HP, 최대HP) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["버닝"] || 0;

    // 체력이 50% 이상이면 발동 안 함
    if (현재HP > 최대HP * 0.5) return 1;

    return 레벨 > 0 ? 1 + 레벨 * 0.2 : 1;
}

function 브로큰방어무시율계산(유저) {
    const 스킬 = 유저.스킬 || {};
    const 레벨 = 스킬["브로큰"] || 0;
    return 레벨 * 0.04;
}

function 데미지계산(유저, 몬스터, 스킬결과) {
    let 방어력 = 몬스터.방어력 || 0;

    const 쉴드밴개수 = 유저.유물목록?.["쉴드밴"] || 0;
    const 보정 = 1 - 0.01 * 쉴드밴개수;

    if (스킬결과.방어무시율 > 0) {
        방어력 = Math.floor(방어력 * (1 - 스킬결과.방어무시율) * 보정);
    }

    const 랜덤보정 = Math.random() * 0.4 + 0.8;

    const 기본데미지 = Math.max(0, 유저.최종공격력 - 방어력);
    const 랜덤데미지 = Math.floor(기본데미지 * 랜덤보정);

    const 최종배율 = (스킬결과.크리티컬배율) * (스킬결과.버서커배율) * (스킬결과.버닝배율);
    const 최종데미지 = Math.floor(랜덤데미지 * 최종배율);

    return 최종데미지;
}

function 전투시뮬레이션(유저, 몬스터, 전투로그, 시작턴, 보스전 = false) {
    let 유저HP = 유저.남은체력;

    const 하트마이너스 = 유저.유물목록?.["하트마이너스"] || 0;
    const 보정 = 1 - 0.001 * 하트마이너스;
    몬스터.체력 = Math.floor(몬스터.체력 * 보정);
    let 몬스터HP = 몬스터.체력;
    let 현재턴 = 시작턴;

    while (유저HP > 0 && (보스전 || 몬스터HP > 0)) {
        몬스터HP = Math.max(0, 몬스터HP);
        유저HP = Math.max(0, 유저HP);

        유저HP--;

        // 🟡 스킬별 개별 계산
        const 크리티컬배율 = 크리티컬배율계산(유저);
        const { 배율: 버서커배율, 체력소모 } = 버서커배율계산(유저);
        const 버닝배율 = 버닝배율계산(유저, 유저HP, 유저.최대체력);
        const 방어무시율 = 브로큰방어무시율계산(유저);

        const 데미지 = 데미지계산(유저, 몬스터, {
            크리티컬배율,
            버서커배율,
            버닝배율,
            방어무시율
        });

        유저HP -= 체력소모;

        if (!보스전) {
            몬스터HP -= 데미지;
            몬스터HP = Math.max(0, 몬스터HP);
        }

        const 발동아이콘 = [];
        if (크리티컬배율 > 1) 발동아이콘.push("크리티컬아이콘");
        if (버서커배율 > 1) 발동아이콘.push("버서커아이콘");
        if (버닝배율 > 1) 발동아이콘.push("버닝아이콘");
        if (방어무시율 > 0) 발동아이콘.push("브로큰아이콘");

        const 쉴드밴개수 = 유저.유물목록?.["쉴드밴"] || 0;
        const 방어보정 = 1 - 0.01 * 쉴드밴개수;

        const 몬스터방어력계산 = Math.floor(
            (몬스터.방어력 || 0) *
            (1 - 방어무시율) *
            방어보정
        );

        전투로그.push({
            턴: 현재턴,
            타입: "공격",
            유저아이디: 유저.유저아이디,
            유저공격력: 유저.공격력,
            유저최종공격력: 유저.최종공격력,
            유저체력: 유저HP,
            유저최대체력: 유저.최대체력,
            몬스터이름: 몬스터.이름,
            몬스터체력: 보스전 ? 몬스터.체력 : 몬스터HP,
            몬스터최대체력: 몬스터.체력,
            몬스터방어력: 몬스터방어력계산,
            아이콘: 발동아이콘,
            효과: `${데미지}`
        });

        현재턴++;
    }

    return {
        결과: 유저HP <= 0 ? "패배" : "승리",
        유저남은체력: 유저HP,
        몬스터남은체력: 몬스터HP
    };
}


function 장비드랍판정(몬스터, 유저) {
    const 고정드랍 = {
        "일반": { 이름: "릴리트의 독니", 공격력: 30 },
        "레어": { 이름: "디아블로의 뿔", 공격력: 63 },
        "신화": { 이름: "레비아탄의 비늘", 공격력: 132 },
        "고대": { 이름: "벨제부브의 꼬리", 공격력: 276 },
        "태초": { 이름: "사탄의 날개", 공격력: 576 },
        "타락": { 이름: "루시퍼의 심장", 공격력: 1200 },
    };

    const 드랍 = 고정드랍[몬스터.타입];
    const 드랍확률 = 1; // 기본 100% 드랍. 나중에 조건부로 바꿔도 됨

    if (!드랍 || Math.random() > 드랍확률) return null;

    return {
        이름: 드랍.이름,
        공격력: 드랍.공격력,
        등급: 몬스터.타입,
        강화: 0
    };
}

function 유물드랍판정(몬스터, 유저) {
    // 최대갯수 99개 초과한 유물은 드랍 후보에서 제외
    const 후보유물 = Object.keys(일반유물데이터).filter(유물이름 => {
        const 보유량 = (유저.유물목록?.[유물이름] || 0);
        return 보유량 < 99;
    });

    const 드랍확률 = 0.003;

    if (후보유물.length > 0 && Math.random() < 드랍확률) {
        const 랜덤유물 = 후보유물[Math.floor(Math.random() * 후보유물.length)];
        return 랜덤유물;
    }

    return null; // 드랍 안됨
}

function 보상계산(층, 유저, 몬스터) {
    let 경험치 = 400;
    let 감소율 = 0.2;
    for (let i = 1; i < 유저.레벨; i++) {
        경험치 *= (1 - 감소율);
        감소율 *= 0.9;
    }

    const 보정계수 = 0.9 + Math.random() * 0.2;
    경험치 = Math.floor(경험치 * 보정계수);

    let 골드 = Math.floor(Math.random() * 100) + (층 - 1) * 100;
    let 숙련도 = Math.floor(층 * 1);

    let 추가골드 = 0;
    let 추가숙련도 = 0;

    if (몬스터.타입 === "황금") {
        추가골드 = 골드 * 19;
        골드 *= 20;
    }

    if (몬스터.타입 === "계시") {
        추가숙련도 = 숙련도 * 19;
        숙련도 *= 20;
    }

    return { 경험치, 골드, 숙련도, 추가골드, 추가숙련도 };
}

function 레벨업판정(현재경험치, 현재레벨) {
    const 새레벨 = Math.floor(현재경험치 / 1000) + 1;

    const 증가량 = 새레벨 - 현재레벨;

    return {
        새레벨,
        증가한레벨: 증가량,
        증가한공격력: 증가량 * 5
    };
}

function 드레인회복(유저) {
    const 스킬 = 유저.스킬 || {};
    const 드레인레벨 = 스킬["드레인"] || 0;

    // 레벨만큼 회복
    return 드레인레벨;
}

function 아이언바디회복(유저) {
    const 스킬 = 유저.스킬 || {};
    const 아이언레벨 = 스킬["아이언바디"] || 0;

    return 아이언레벨; // 각 레벨당 +1 회복
}

function 인사이트추가숙련도(유저) {
    const 스킬 = 유저.스킬 || {};
    const 인사이트레벨 = 스킬["인사이트"] || 0;

    return 인사이트레벨; // 레벨 1당 추가숙련도 1
}

function 인텔리전스추가경험치배율(유저) {
    const 스킬 = 유저.스킬 || {};
    const 인텔리레벨 = 스킬["인텔리전스"] || 0;

    // 레벨당 10% → 곱셈용 1.0 + 레벨 * 0.1
    return 1 + 인텔리레벨 * 0.1;
}

function 획득금화발굴(유저) {
    const 스킬 = 유저.스킬 || {};
    const 발굴레벨 = 스킬["발굴"] || 0;

    // 각 레벨당 10% 증가 → 곱셈 배율로 1.0 + (레벨 × 0.1)
    return 1 + 발굴레벨 * 0.1;
}

function 전투보상반영(유저, 보상, 회복량, 레벨업정보, 전투체력) {
    const 새유저 = { ...유저 };

    새유저.유저UID = 유저.유저UID;
    새유저.경험치 += 보상.경험치;
    새유저.골드 += 보상.골드;
    새유저.숙련도 += 보상.숙련도;

    새유저.레벨 += 레벨업정보.증가한레벨;
    새유저.레벨공격력 += 레벨업정보.증가한공격력;
    새유저.남은체력 = Math.min(
        새유저.최대체력,
        전투체력 + 회복량
    );

    return 새유저;
}

function 일반악마불러오기(층) {
    const 일반몬스터이름 = [
        "디나르", "에리곤", "도레알", "크로셀", "루페스", "벨", "시에르", "세레우스", "버알베리스", "발라크",
        "로노베", "자간", "안드라멜리우스", "니베로스", "에이몬", "라에스", "아라타바", "바티바스", "아몬", "안드로말리우스",
        "바피메트", "오로이아스", "오세", "아미", "데카브리아", "벨리알", "디카리브", "세이르", "오로버스", "무루무르",
        "카이미", "알로세스", "샤르나크", "샤크", "사브낙", "라하브", "말포르스", "하우레스", "피닉스", "부알",
        "푸르카스", "가프", "아스모데우스", "포르카스", "보락스", "글라시아라볼라스", "나베리우스", "아이몬", "프루푸스", "살로스",
        "하프리", "페니악스", "다이몬", "스틸", "마르코시아스", "보트스", "제파르", "엘리고스", "레리어", "베레트",
        "시트리", "구시온", "부에르", "카임", "포르네우스", "부네", "아몬", "마라바스", "푸르손", "말파스",
        "파임", "바르바토스"
    ];

    const 랜덤가중치 = () => (Math.random() * 0.2 + 0.9); // 0.9 ~ 1.1 랜덤

    const 일반목록 = 일반몬스터이름.map((이름, i) => {
        const 기준체력 = 층 === 1 ? 30 : 30 * Math.pow(10, 층 - 1);
        const 기준방어력 = 층 === 1 ? 1 : Math.pow(10, 층 - 1);

        return {
            이름,
            체력: Math.floor(기준체력 * 랜덤가중치()),
            방어력: Math.floor(기준방어력 * 랜덤가중치()),
            타입: "일반"
        };
    });

    const 기준몬스터 = 일반목록[Math.floor(Math.random() * 일반목록.length)];

    return 기준몬스터;
}

function 레어악마불러오기(층, 이름) {
    const 이름맵 = {
        "루시퍼": { 체력계수: 3.2, 방어계수: 1.6, 타입: "타락" },
        "사탄": { 체력계수: 2.0, 방어계수: 1.5, 타입: "태초" },
        "벨제부브": { 체력계수: 1.8, 방어계수: 1.4, 타입: "고대" },
        "레비아탄": { 체력계수: 1.6, 방어계수: 1.3, 타입: "신화" },
        "디아블로": { 체력계수: 1.2, 방어계수: 1.1, 타입: "레어" },
        "릴리트": { 체력계수: 1, 방어계수: 1, 타입: "일반" },
        "숙고블린": { 체력계수: 1.4, 방어계수: 1.2, 타입: "계시" },
        "황금고블린": { 체력계수: 0.8, 방어계수: 0.8, 타입: "황금" },
    };

    const 설정 = 이름맵[이름];
    if (!설정) return null;

    const 기준체력 = 층 === 1 ? 30 : 30 * Math.pow(10, 층 - 1);
    const 기준방어력 = 층 === 1 ? 1 : Math.pow(10, 층 - 1);

    const 랜덤가중치 = () => (Math.random() * 0.2 + 0.9);

    return {
        이름,
        체력: Math.floor(기준체력 * 설정.체력계수 * 랜덤가중치()),
        방어력: Math.floor(기준방어력 * 설정.방어계수 * 랜덤가중치()),
        타입: 설정.타입
    };
}

function 최종공격력계산(유저) {
    const 레벨공격력 = 유저.레벨공격력 || 10;
    const 장비공격력 = 유저.장비공격력 || 0;
    const 전직공격력 = 유저.전직공격력 || 1;
    const 펫단계원본 = 유저.펫단계 || 0;
    const 펫배율 = 1 + 0.1 * 펫단계원본;
    const 소드개수 = 유저.유물목록?.["소드"] || 0;

    const 최종공격력 = (레벨공격력 + 장비공격력)
        * (전직공격력 * 0.1 + 0.9)
        * (1 + 0.01 * 소드개수)
        * 펫배율;

    return Math.round(최종공격력);
}

function 최대체력계산(유저) {
    const 합성기록 = 유저.합성기록 || {}; // 또는 새유저.합성기록
    const 총합성횟수 = Object.values(합성기록).reduce((a, b) => a + b, 0);

    const 하트개수 = 유저.유물목록?.["하트플러스"] || 0;
    const 보정 = 1 + 0.01 * 하트개수;
    return Math.round((10 + 총합성횟수) * 보정);
}

function 레어몬스터등장판정(유저) {
    const 고스트개수 = 유저.유물목록?.["고스트"] || 0;
    const 보정 = 1 + 0.01 * 고스트개수;

    const 후보 = [
        { 이름: "루시퍼", 확률: 보정 * (1 / 25600) },
        { 이름: "사탄", 확률: 보정 * (1 / 12800) },
        { 이름: "벨제부브", 확률: 보정 * (1 / 6400) },
        { 이름: "레비아탄", 확률: 보정 * (1 / 3200) },
        { 이름: "디아블로", 확률: 보정 * (1 / 1600) },
        { 이름: "릴리트", 확률: 보정 * (1 / 800) },
        { 이름: "숙고블린", 확률: 보정 * (1 / 200) },
        { 이름: "황금고블린", 확률: 보정 * (1 / 200) },
    ];


    // ⛔️ 모든 확률 합계
    const 총합 = 후보.reduce((합, 항목) => 합 + 항목.확률, 0);
    const 남은확률 = Math.max(0, 1 - 총합);  // null 확률

    if (남은확률 > 0) 후보.push({ 이름: null, 확률: 남은확률 });

    const r = Math.random();
    let 누적 = 0;
    for (const 항목 of 후보) {
        누적 += 항목.확률;
        if (r < 누적) return 항목.이름;
    }
    return null;
}

const 일반유물데이터 = {
    "소드": { 설명: "공격력이 증가합니다" }, //완료
    "하트플러스": { 설명: "체력이 증가합니다" }, //완료
    "고스트": { 설명: "히든몬스터 등장률이 증가합니다" }, //완료
    "쉴드밴": { 설명: "악마들의 방어력을 감소시킵니다" }, //완료
    "하트마이너스": { 설명: "악마들의 체력을 감소시킵니다" }, //완료
    "클로버": { 설명: "도박확률이 증가합니다" }, //완료
    "모래시계": { 설명: "스태미너 소모를 무시합니다" }, //완료
    "암포라": { 설명: "보스전 스태미너 소모량을 감소시킵니다" },
    "퍼즐": { 설명: "도박비용을 무시합니다" },
};
const 레어유물데이터 = {
    "소드": { 설명: "공격력이 증가합니다" }, //완료
    "하트플러스": { 설명: "체력이 증가합니다" }, //완료
    "고스트": { 설명: "히든몬스터 등장률이 증가합니다" }, //완료
    "쉴드밴": { 설명: "악마들의 방어력을 감소시킵니다" }, //완료
    "하트마이너스": { 설명: "악마들의 체력을 감소시킵니다" }, //완료
    "클로버": { 설명: "도박확률이 증가합니다" }, //완료
    "모래시계": { 설명: "스태미너 소모를 무시합니다" }, //완료
    "암포라": { 설명: "보스전 스태미너 소모량을 감소시킵니다" },
    "퍼즐": { 설명: "도박비용을 무시합니다" },
    "플라워": { 설명: "스킬을 초기화합니다" },
    "티켓": { 설명: "고급장비뽑기에 사용됩니다" },
};

// 🟡 정적 파일 경로 설정
app.use(express.static(path.join(__dirname)));

