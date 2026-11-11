// NPC 이름·직업·대사만 담는다. 대사를 고칠 때는 이 파일만 고치면 된다.
//
// byQuest: 퀘스트 상태에 따라 다른 대사를 고른다 (없으면 default)
//   퀘스트 상태: none(받기 전) → active(진행 중) → hasLantern(랜턴 보유) → done(완료)
// pages: 대화창 한 장씩. E 를 누를 때마다 다음 장으로 넘어간다.
//   expr  : 초상화 표정 (normal | smile | worried)
//   lines : 대사 두 줄
// onEnd: 대화가 끝났을 때 일어나는 일 (startQuest | completeQuest)

Game.DIALOGUES = {
  // 어부: 대화만 하는 NPC — 마을 분위기, 힌트, 퀘스트 후 반응
  fisher: {
    name: '강씨',
    role: '어부',
    byQuest: {
      default: {
        pages: [
          { expr: 'normal', lines: ['안개가 이렇게 짙으면 오늘은 배를 못 띄우겠구먼.', '자네가 새로 온 심부름꾼인가? 잘 부탁하네.'] },
          { expr: 'smile',  lines: ['심부름거리가 필요하면 등대지기 영감한테 가 보게.', '부두 끝 등대 아래에 있을 걸세.'] },
        ],
      },
      active: {
        pages: [
          { expr: 'normal', lines: ['랜턴을 찾는다고? 저쪽 상자 더미를 봐 보게.', '바람이 불면 물건이 그쪽으로 몰리거든.'] },
        ],
      },
      hasLantern: {
        pages: [
          { expr: 'smile', lines: ['오, 그게 영감 랜턴이구먼.', '어서 가져다주게. 해가 지기 전에 말이야.'] },
        ],
      },
      done: {
        pages: [
          { expr: 'smile', lines: ['등대에 불이 들어왔구먼!', '자네 덕분에 오늘 밤 배들이 길을 잃지 않겠어.'] },
        ],
      },
    },
  },

  // 등대지기: 퀘스트를 주는 NPC — 랜턴을 잃어버려 걱정하는 중
  keeper: {
    name: '백 영감',
    role: '등대지기',
    byQuest: {
      default: {
        pages: [
          { expr: 'worried', lines: ['이보게, 자네가 그 심부름꾼이로군.', '큰일일세. 등대 랜턴이 사라졌어.'] },
          { expr: 'worried', lines: ['아마 부둣가 어딘가에 떨어뜨린 모양이야.', '오늘 밤 불을 켜야 하니 좀 찾아 주겠나?'] },
        ],
        onEnd: 'startQuest',
      },
      active: {
        pages: [
          { expr: 'worried', lines: ['아직 못 찾았나?', '부둣가 상자나 통 안을 잘 살펴보게.'] },
        ],
      },
      hasLantern: {
        pages: [
          { expr: 'smile', lines: ['오오! 바로 그 랜턴일세!', '이리 주게. 당장 불을 켜야겠어.'] },
          { expr: 'smile', lines: ['고맙네, 심부름꾼 양반.', '자네 덕분에 오늘 밤 등대가 빛나겠어.'] },
        ],
        onEnd: 'completeQuest',
      },
      done: {
        pages: [
          { expr: 'smile', lines: ['불빛이 보이나? 이제 안심일세.', '또 일이 생기면 부탁하겠네.'] },
        ],
      },
    },
  },
};

// 퀘스트에서 보여 줄 "할 일" 문구
Game.OBJECTIVES = {
  noBag:      '가방 챙기기',
  none:       '부둣가에서 일거리 찾기',
  active:     '잃어버린 등대 랜턴 찾기',
  hasLantern: '등대지기에게 랜턴 가져다주기',
  done:       '완료! 등대에 불이 켜졌다',
};
