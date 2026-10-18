import initWasm, {
  find_skill_counters,
  predict_gogma_keep_rolls,
  predict_gogma_rolls,
  predict_skill_rolls,
} from "./pkg/gogma_wasm_search.js";
import { localizedTargetName, t } from "./i18n.js";

const WEAPON_TYPES = [
  [0, "大剣"],
  [1, "片手剣"],
  [2, "双剣"],
  [3, "太刀"],
  [4, "ハンマー"],
  [5, "狩猟笛"],
  [6, "ランス"],
  [7, "ガンランス"],
  [8, "スラッシュアックス"],
  [9, "チャージアックス"],
  [10, "操虫棍"],
  [11, "弓"],
  [12, "ヘビィボウガン"],
  [13, "ライトボウガン"],
];

// The displayed element order differs from the RNG's attribute-force enum:
// Thunder uses 4 and Ice uses 3.
const ATTRIBUTES = [
  [0, "無属性"],
  [1, "火属性"],
  [2, "水属性"],
  [4, "雷属性"],
  [3, "氷属性"],
  [5, "龍属性"],
  [6, "毒属性"],
  [7, "麻痺属性"],
  [8, "睡眠属性"],
  [9, "爆破属性"],
];

const GOGMA_BONUSES = [
  [8, "基礎攻撃力強化Ⅱ"],
  [12, "基礎攻撃力強化Ⅲ"],
  [15, "基礎攻撃力強化ＥＸ"],
  [9, "会心率強化Ⅱ"],
  [13, "会心率強化Ⅲ"],
  [16, "会心率強化ＥＸ"],
  [11, "属性強化Ⅱ"],
  [14, "属性強化ＥＸ"],
  [6, "斬れ味強化"],
  [10, "斬れ味強化ＥＸ"],
];

const GOGMA_BONUS_CATEGORIES = [
  [0, "攻撃"],
  [1, "会心"],
  [2, "属性"],
  [3, "斬れ味・装填数"],
];

const SERIES_SKILLS = [
  "闢獣の力",
  "火竜の力",
  "暗器蛸の力",
  "鎧竜の守護",
  "雪獅子の闘志",
  "兇爪竜の力",
  "雷顎竜の闘志",
  "波衣竜の守護",
  "煌雷竜の力",
  "獄焔蛸の反逆",
  "凍峰竜の反逆",
  "黒蝕竜の力",
  "鎖刃竜の飢餓",
  "護鎖刃竜の命脈",
  "泡狐竜の力",
  "白熾龍の脈動",
  "海竜の渦雷",
  "千刃竜の闘志",
  "巨戟龍の黙示録",
  "暗黒騎士の証",
  "オメガレゾナンス",
];

const GROUP_SKILLS = [
  "甲虫の知らせ",
  "甲虫の擬態",
  "革細工の柔性",
  "革細工の滑性",
  "鱗張りの技法",
  "鱗重ねの工夫",
  "毛皮の昂揚",
  "毛皮の誘惑",
  "ヌシの誇り",
  "ヌシの憤激",
  "護竜の脈動",
  "護竜の守り",
  "先達の導き",
  "ヌシの魂",
];

// シリーズ・グループスキルで発動するスキルと効果のメモ（攻略大百科・Game8を参考に要約）
// シリーズスキル：[発動スキル, 2部位の効果, 4部位の効果]
const SERIES_SKILL_EFFECTS = {
  "黒蝕竜の力": ["黒蝕一体", "大型モンスターと対峙すると狂竜症に感染する", "狂竜症に感染し、攻撃力UP。克服するとさらに攻撃力UP"],
  "雷顎竜の闘志": ["無尽蔵", "追加のスタミナゲージを得る", "さらに長い追加のスタミナゲージを得る"],
  "兇爪竜の力": ["連撃強化", "「連撃」発動時、効果時間を延長し基礎攻撃力+3", "効果時間をさらに延長し基礎攻撃力+10"],
  "巨戟龍の黙示録": ["宣戦呼応", "戦闘中の大型モンスターが怒ると属性攻撃値UP", "上昇量がUPし、一定時間ダメージを防ぐ防壁を得る（再発動まで時間が必要）"],
  "闢獣の力": ["力自慢", "鍔迫り合い・相殺の成功で一定時間、基礎攻撃力+10", "鍔迫り合い・相殺の成功で一定時間、基礎攻撃力+25"],
  "火竜の力": ["灼熱化", "攻撃を当てると確率で追加の火属性ダメージ", "追加の火属性ダメージが上昇"],
  "暗器蛸の力": ["蛮勇の食卓", "こんがり肉などを食べると一定時間、基礎攻撃力+15", "こんがり肉などを食べると一定時間、基礎攻撃力+25"],
  "鎧竜の守護": ["無傷の重装", "体力が最大の時、受けるダメージ5%軽減", "体力が最大の時、受けるダメージ10%軽減"],
  "雪獅子の闘志": ["ウォークライ", "ジェスチャー「雄叫び」で一定時間、周りの攻撃力が少しUP（オトモ・サポートハンターは効果大）", "周りの攻撃力UPが大きくなる"],
  "波衣竜の守護": ["守護のヴェール", "特殊装具の使用で一定時間、防御力UP", "特殊装具の使用で一定時間、防御力と耐性値が大きくUP"],
  "煌雷竜の力": ["雷々響鳴", "「力の解放」の発動時間を少し延長", "「力の解放」の発動時間を延長"],
  "獄焔蛸の反逆": ["恨撃", "「逆恨み」発動中、追加で少しダメージ", "「逆恨み」発動中、追加でダメージ"],
  "凍峰竜の反逆": ["束縛反攻", "糸拘束・凍結・拘束攻撃からの解放や鍔迫り合いの後、一定時間攻撃力UP", "同じ条件で攻撃力が大きくUP"],
  "鎖刃竜の飢餓": ["加速再生", "攻撃を当て続けると体力が少し回復（武器種で回復量が変わる）", "攻撃を当て続けると体力が回復"],
  "護鎖刃竜の命脈": ["破壊衝動", "大型モンスターの傷口を破壊すると体力が少し回復", "傷口を破壊すると体力が回復"],
  "泡狐竜の力": ["泡沫の舞", "泡状態【大】にならず、泡状態の時に回避が強化", "さらに回避を何回か行うと泡状態【小】になる"],
  "白熾龍の脈動": ["超回復力", "赤ゲージが無くても体力がゆるやかに最大まで自動回復", "自動回復がより速くなる"],
  "海竜の渦雷": ["蒼雷一閃", "攻撃でダメージを蓄積させると追加の雷属性ダメージ＋一定時間会心率UP", "雷属性ダメージが上昇し、会心率UPの時間が少し延びる"],
  "千刃竜の闘志": ["千刃の身躱し", "「巧撃」の効果時間を延長。発動中に再び条件を満たすと少し延長（1回のみ）", "さらに、発動中に再び条件を満たすと攻撃力UP"],
  "暗黒騎士の証": ["ダークアーツ／ブラックナイト", "赤ゲージがある間、属性攻撃力UP。大剣の一部の溜め斬りが3段階溜めで強化", "特殊アクション「ブラックナイト」が使える"],
  "オメガレゾナンス": ["レゾナンス", "ファーとニアーが交互に発動し、条件を満たすと攻撃力か会心率UP", "さらに武器スキル「シールドオプション」「連携プログラム」が強化"],
};

// グループスキル（3部位）：[発動スキル, 効果]
const GROUP_SKILL_EFFECTS = {
  "甲虫の知らせ": ["ハニーハンター", "ハチミツの採取数が増える"],
  "甲虫の擬態": ["忍び歩き", "しゃがみ移動が速くなり、大型モンスターに見つかりにくい"],
  "革細工の柔性": ["採集の達人", "採集が速くなり、採集・剥ぎ取り中に攻撃を受けてものけぞらない"],
  "革細工の滑性": ["滑走強化", "地形を使ったスライディングの後、一定時間会心率UP"],
  "鱗張りの技法": ["乗り名人", "モンスターに乗りやすく、乗りが成功しやすい"],
  "鱗重ねの工夫": ["奮起", "体力40%以下で一定時間、スタミナ消費が減る"],
  "毛皮の昂揚": ["不屈", "力尽きるたびに攻撃力と防御力UP（最大2回）"],
  "毛皮の誘惑": ["陽動", "攻撃を当てるとモンスターの注意を強く引く"],
  "ヌシの誇り": ["激励", "旋律など範囲効果を発動した時、一時的な攻撃力UPを追加"],
  "ヌシの憤激": ["死中に活", "状態異常の間、基礎攻撃力+10（解除されると即終了）"],
  "護竜の脈動": ["竜乳活性", "竜乳結晶の近くで赤ゲージとスタミナの回復が速くなる"],
  "護竜の守り": ["竜都の護り", "竜都の跡形で属性ダメージ・特殊ダメージを軽減"],
  "先達の導き": ["探索者の幸運", "活性化した採取ポイントが出やすくなる"],
  "ヌシの魂": ["根性【果敢】", "HPのラインより上で致死ダメージを1回耐える。発動前は攻撃1.05倍・防御0.95倍、発動後は防御1.05倍・全耐性+3"],
};

function skillLabelWithEffect(label) {
  const effect = GROUP_SKILL_EFFECTS[label];
  return effect ? `${label}（${effect[0]}）` : label;
}

function skillEffectSpan(label) {
  const effect = document.createElement("small");
  effect.className = "skill-effect";
  const series = SERIES_SKILL_EFFECTS[label];
  if (series) {
    const [skill, two, four] = series;
    effect.append(
      Object.assign(document.createElement("span"), { textContent: `発動スキル：${skill}` }),
      Object.assign(document.createElement("span"), { textContent: `2部位：${two}` }),
      Object.assign(document.createElement("span"), { textContent: `4部位：${four}` }),
    );
  }
  return effect;
}

// グループスキルの選択欄の下に、選んだスキルの効果を表示する
function attachGroupEffectNote(select) {
  const note = document.createElement("small");
  note.className = "skill-effect group-effect-note";
  const update = () => {
    const label = GROUP_SKILLS[Number(select.value)];
    const effect = GROUP_SKILL_EFFECTS[label];
    note.textContent = effect ? `発動スキル：${effect[0]}（3部位）　${effect[1]}` : "";
  };
  select.addEventListener("change", update);
  update();
  select.after(note);
}

const BOW_WEAPON_TYPE = 11;
const HEAVY_BOWGUN_WEAPON_TYPE = 12;
const BOWGUN_WEAPON_TYPES = new Set([12, 13]);
const SHARPNESS_AMMO_BONUS_IDS = new Set([6, 10]);
const ELEMENT_BONUS_IDS = new Set([11, 14]);
const EX_BONUS_IDS = new Set([10, 14, 15, 16]);
const LORDS_SOUL_GROUP_INDEX = 13;
const PRIORITY_GROUP_SKILL_INDICES = [LORDS_SOUL_GROUP_INDEX];
const PRIORITY_SERIES_SKILL_INDICES = [11, 6, 5, 18];
const SKILL_COUNTER_GATE = 54;
const MAX_REGISTERED_TARGETS = 140;

// 元のサイトと見分けるため、タブの名前と見出しに「改良版」を付ける
document.title = "Gogma Seed Finder 改良版";
{
  const heroTitle = document.querySelector(".hero h1");
  if (heroTitle && !heroTitle.querySelector(".fork-badge")) {
    heroTitle.append(Object.assign(document.createElement("span"), {
      className: "fork-badge",
      textContent: "改良版",
    }));
  }
  const heroEyebrow = document.querySelector(".hero .eyebrow");
  if (heroEyebrow) heroEyebrow.textContent = "Monster Hunter Wilds · 改良版（元のツール：apeshinzo78）";
  document.head.append(Object.assign(document.createElement("style"), {
    textContent: `
      .fork-badge {
        display: inline-block;
        margin-left: 0.4em;
        padding: 0.12em 0.5em;
        border: 2px solid #d9b45a;
        border-radius: 0.3em;
        background: rgba(217, 180, 90, 0.18);
        color: #f3d27a;
        font-size: 0.38em;
        font-weight: 700;
        letter-spacing: 0.08em;
        vertical-align: middle;
        white-space: nowrap;
      }
    `,
  }));
}

// 「一致」列の見た目
document.head.append(Object.assign(document.createElement("style"), {
  textContent: `
    .skill-prediction-table { --match-column-width: 230px; }
    .skill-match-cell { min-width: var(--match-column-width); vertical-align: top; }
    /* 画面が広いときは「一致」列も左に固定して、横スクロールしても見えるようにする */
    @media (min-width: 900px) {
      .skill-prediction-table > thead > tr > th:nth-child(3),
      .skill-prediction-table > tbody > tr > td:nth-child(3) {
        position: sticky;
        left: calc(var(--offset-column-width) + var(--state-column-width));
        z-index: 2;
        width: var(--match-column-width);
        background: #151612;
        box-shadow: 8px 0 12px rgb(0 0 0 / 20%);
      }
      .skill-prediction-table > thead > tr > th:nth-child(3) { z-index: 5; background: #20221c; }
      .skill-prediction-table > tbody > tr > td:nth-child(2) { box-shadow: none; }
    }
    .skill-match-item { margin-bottom: 8px; }
    .skill-match-item:last-child { margin-bottom: 0; }
    .skill-match-name { font-size: 12px; font-weight: 700; color: #e8c766; margin-bottom: 4px; }
    .skill-match-none { color: #777; font-size: 12px; }
    .skill-effect { display: block; color: #a9a690; font-size: 0.72rem; font-weight: 400; line-height: 1.5; margin-top: 2px; }
    .skill-effect > span { display: block; }
    .group-effect-note { margin-top: 6px; max-width: 760px; white-space: normal; }
    /* シリーズスキルの選択欄：1つずつカードにして、説明が読めるようにする */
    .skill-filter-series-options {
      grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
      gap: 8px;
      max-height: 420px;
      padding: 2px;
    }
    .weapon-filter-row .skill-filter-series-options { max-height: none; overflow: visible; }
    .skill-filter-series-options label {
      align-items: flex-start;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid #3a3c31;
      border-radius: 8px;
      background: rgb(0 0 0 / 18%);
      white-space: normal;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .skill-filter-series-options label:has(input:checked) {
      border-color: #e8c766;
      background: rgb(214 179 92 / 12%);
    }
    .skill-filter-series-options input[type="checkbox"] { margin-top: 2px; }
    .weapon-filter-settings { display: block; }
    .weapon-filter-settings .skill-filter-intro p { margin: 4px 0 12px; color: #a9a690; font-size: 0.8rem; }
    .weapon-filter-empty { color: #a9a690; font-size: 0.8rem; }
    /* 共通の条件（当たり強調・条件一致だけ表示）：太い金色の枠。項目はシリーズスキル欄と同じく上にそろえる */
    .skill-filter-settings:not(.weapon-filter-settings) {
      align-items: start;
      border: 3px solid #b8973f;
      border-radius: 14px;
      background: rgb(214 179 92 / 5%);
    }
    /* 大枠（武器種ごとの条件）：太い金色の枠 */
    .skill-filter-settings.weapon-filter-settings {
      border: 3px solid #b8973f;
      border-radius: 14px;
      background: rgb(214 179 92 / 5%);
    }
    /* 中枠（武器種ごと）：大枠より少し細い枠。開いている武器種は明るく */
    .weapon-filter-row { border: 2px solid #5f6b52; border-radius: 10px; margin-bottom: 10px; background: rgb(95 120 80 / 8%); }
    .weapon-filter-row[open] { border-color: #8fae6f; background: rgb(110 150 90 / 10%); }
    .weapon-filter-row > summary { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; padding: 10px 14px; cursor: pointer; }
    .weapon-filter-body .text-button { color: #ffffff; border-color: rgb(255 255 255 / 55%); }
    .weapon-filter-body .text-button:hover { color: #ffffff; border-color: #ffffff; }
    .weapon-filter-name { font-weight: 700; color: #e8c766; min-width: 7em; }
    /* 名前の横の説明（今のボーナス・条件など）：大きく明るく */
    .weapon-filter-state { color: #ebe6d4; font-size: 0.9rem; font-weight: 600; }
    .weapon-filter-body { display: grid; gap: 12px; padding: 4px 14px 14px; }
    .weapon-filter-body > label { display: grid; gap: 4px; }
    .weapon-filter-body > label > select { max-width: 360px; }
    /* 復元ボーナス未来予測：武器種ごとの希望ボーナス */
    .bonus-wish-settings {
      margin: 18px 0 0;
      padding: 16px 18px;
      border: 3px solid #b8973f;
      border-radius: 14px;
      background: rgb(214 179 92 / 5%);
    }
    .bonus-wish-settings .skill-filter-intro strong { font-family: Georgia, "Yu Mincho", serif; font-size: 1.02rem; font-weight: 500; }
    .bonus-wish-settings .skill-filter-intro p { margin: 4px 0 10px; color: #a9a690; font-size: 0.78rem; line-height: 1.6; }
    .bonus-wish-toggle { display: inline-flex; gap: 8px; align-items: center; margin-bottom: 12px; font-size: 0.8rem; font-weight: 700; }
    .bonus-wish-categories { margin: 0; padding: 0; border: 0; }
    .bonus-wish-categories legend { margin-bottom: 6px; color: #d6d3c5; font-size: 0.76rem; font-weight: 800; }
    .bonus-wish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; max-width: 560px; }
    .bonus-wish-grid label, .bonus-wish-ex { display: grid; gap: 4px; font-size: 0.76rem; font-weight: 700; }
    .bonus-wish-ex { max-width: 300px; }
    .bonus-wish-grid select, .bonus-wish-ex select { height: 38px; }
    .bonus-wish-total { margin: 6px 0 0; color: #a9a690; font-size: 0.76rem; }
    .bonus-wish-total.over { color: #ff9f8f; font-weight: 700; }
    .bonus-wish-summary {
      margin-top: 18px;
      padding: 14px 18px;
      border: 2px solid #8fae6f;
      border-radius: 12px;
      background: rgb(110 150 90 / 10%);
    }
    .bonus-wish-summary h3 { margin: 0 0 8px; font-family: Georgia, "Yu Mincho", serif; font-size: 0.98rem; font-weight: 500; }
    .bonus-wish-summary h3:not(:first-child) { margin-top: 14px; }
    .bonus-wish-summary p { margin: 8px 0 0; color: #a9a690; font-size: 0.74rem; line-height: 1.6; }
    .bonus-wish-next-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .bonus-wish-next-list li { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; font-size: 0.8rem; padding: 4px 0; border-bottom: 1px solid rgb(255 255 255 / 6%); }
    .bonus-wish-next-list strong { color: #e8c766; min-width: 9em; }
    .bonus-wish-next-list .bonus-wish-next-result { min-width: 4.5em; font-size: 0.9rem; }
    .bonus-wish-next-kind { font-size: 0.72rem; color: #e8c766; }
    /* 回ごとの結果表：内部の縦スクロールをなくす（横に長いときの横スクロールだけ残す） */
    #comparison-table-wrap { max-height: none; overflow-y: visible; overflow-x: auto; }
    .comparison-more-bar { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; margin-top: 12px; }
    .comparison-more-bar[hidden] { display: none; }
    .comparison-more-status { color: #b9b6a4; font-size: 0.78rem; }
    .comparison-more-bar .text-button { color: #ffffff; }
    /* 追加の横スクロールバー：表の上と、画面の下にくっつくもの */
    /* 追加の横スクロールバー：案内文＋◀ バー ▶。溝をはっきり見せる */
    .table-scroll-holder {
      display: grid; grid-template-columns: auto 28px minmax(0, 1fr) 28px; gap: 8px; align-items: center;
      padding: 6px 10px; background: #2b2c25; border: 2px solid #e8c766; border-radius: 10px;
    }
    .table-scroll-holder[hidden] { display: none; }
    .table-scroll-holder.top { margin-top: 12px; }
    .table-scroll-holder.bottom { position: sticky; bottom: 0; z-index: 8; border-radius: 10px 10px 0 0; box-shadow: 0 -6px 16px rgb(0 0 0 / 50%); }
    .table-scroll-caption { color: #ffe39a; font-size: 0.74rem; font-weight: 800; white-space: nowrap; }
    .table-scroll-arrow { display: grid; place-items: center; height: 24px; border-radius: 6px; background: #3a3b31; color: #ffe39a; font-size: 0.8rem; cursor: pointer; user-select: none; }
    .table-scroll-arrow:hover { background: #4a4330; }
    .table-scroll-mirror { overflow-x: auto; overflow-y: hidden; height: 20px; border-radius: 999px; background: #141510; box-shadow: inset 0 0 0 1px #6b6a55; scrollbar-color: #e8c766 #141510; }
    .table-scroll-mirror::-webkit-scrollbar { height: 16px; }
    .table-scroll-mirror::-webkit-scrollbar-track { background: #141510; border-radius: 999px; }
    .table-scroll-mirror::-webkit-scrollbar-thumb { background: #e8c766; border: 3px solid #141510; border-radius: 999px; }
    .table-scroll-mirror > div { height: 1px; }
    /* 「何回先」の行と行の区切り：白い中太の線 */
    .comparison-table > tbody > tr:not(.repeat-header-row) > th,
    .comparison-table > tbody > tr:not(.repeat-header-row) > td { border-bottom: 3px solid rgb(240 240 240 / 75%); }
    /* 見出しの行は低く：長い登録名は1行で「…」省略（マウスを乗せると全文）。手持ちの5枠表示も1行に */
    .comparison-table thead th, .comparison-table > tbody > tr.repeat-header-row > th { padding-top: 6px; padding-bottom: 6px; vertical-align: bottom; }
    .comparison-table th .target-label-text,
    .comparison-table th .column-layout { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .comparison-table th .weapon-badge { white-space: nowrap; }
    /* 左の「何回先」と「保存後の状態」を大きく太く */
    .comparison-table > tbody > tr > th:first-child { font-size: 1rem; font-weight: 900; color: #ffe39a; }
    .comparison-table .saved-state-cell > span { font-size: 0.8rem; font-weight: 800; color: #e6e1cf; }
    .comparison-table .saved-state-cell > strong { font-size: 1.05rem; font-weight: 900; }
    .comparison-table .saved-state-cell button { font-size: 0.82rem; font-weight: 900; padding-top: 6px; padding-bottom: 6px; }
    .comparison-table .saved-state-cell .adopt-position-button { color: #d9f5c8; border-width: 2px; }
    /* 何回先ごとに入れ直す見出しの行 */
    .comparison-table > tbody > tr.repeat-header-row > th {
      padding: 6px 7px; border-top: 2px solid #5a5236; background: #20221c; color: #c8c5b5;
      font-size: 0.72rem; white-space: normal; overflow-wrap: anywhere;
    }
    .comparison-table > tbody > tr.repeat-header-row > th:nth-child(2) {
      position: sticky; left: var(--offset-column-width); z-index: 2;
    }
    @media (min-width: 900px) {
      .comparison-table > tbody > tr.repeat-header-row > th:nth-child(3) {
        position: sticky; left: calc(var(--offset-column-width) + var(--state-column-width)); z-index: 2;
      }
    }
    .next-match-table .next-action .match-adopt-button { margin: 0; white-space: nowrap; }
    /* 次の一致：見出し付きの表 */
    .bonus-wish-summary { overflow-x: auto; }
    .next-match-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .next-match-table th { padding: 6px 8px; border-bottom: 2px solid #5a6b4c; color: #b9b6a4; font-size: 0.72rem; font-weight: 800; text-align: left; white-space: nowrap; }
    .next-match-table td { padding: 6px 8px; border-bottom: 1px solid rgb(255 255 255 / 7%); vertical-align: middle; }
    .next-match-table .next-when { color: #cfeec0; font-size: 0.92rem; font-weight: 900; white-space: nowrap; }
    .next-match-table .next-weapon { color: #f2eddc; font-weight: 800; white-space: nowrap; }
    .next-match-table .next-label { color: #e8c766; font-weight: 800; }
    .next-match-table .next-note { color: #b9b6a4; font-size: 0.74rem; }
    .next-match-table .next-result .comparison-bonus-set { grid-template-columns: repeat(5, auto); justify-content: start; }
    .next-match-table tr.none td { opacity: 0.55; }
    .method-pair { white-space: nowrap; font-size: 0.78rem; color: #4a4a40; }
    .method-on { font-weight: 900; padding: 1px 6px; border-radius: 5px; }
    .method-on.reset { color: #1a1708; background: #e8c766; }
    .method-on.owned { color: #0d1f1d; background: #8fe0d6; }
    .method-off { color: #5f5e52; opacity: 0.6; }
    /* 武器種・属性の札（その横に登録名） */
    .weapon-badge {
      display: inline-block; margin-right: 6px; padding: 1px 8px; border: 1px solid #8a8670; border-radius: 6px;
      background: #2b2c25; color: #f2eddc; font-size: 0.74rem; font-weight: 800; vertical-align: 1px;
    }
    .bonus-wish-next-kind.owned { color: #8fe0d6; }
    .bonus-wish-next-list .comparison-bonus-set { grid-template-columns: repeat(5, auto); justify-content: start; }
    /* 大枠：A「登録した武器をまとめて予測」（金）、B「1つの武器だけを詳しく調べる」（青灰） */
    .big-frame { margin-top: 36px; padding: 24px 24px 28px; border: 4px solid #b8973f; border-radius: 18px; background: rgb(214 179 92 / 4%); }
    .big-frame.big-frame-detail { border-color: #6f84a6; background: rgb(111 132 166 / 6%); }
    .big-frame-note { margin: 4px 0 18px; padding: 10px 14px; border-left: 4px solid #6f84a6; background: rgb(111 132 166 / 12%); color: #d6dbe6; font-size: 0.82rem; line-height: 1.6; }
    /* 中枠：①②③ */
    .step-frame { margin-top: 20px; padding: 16px 18px 18px; border: 2px solid #6b6a55; border-radius: 14px; background: rgb(0 0 0 / 16%); }
    .step-frame-header { display: flex; gap: 12px; align-items: center; }
    .step-frame-header h3 { margin: 0; font-family: Georgia, "Yu Mincho", serif; font-size: 1.15rem; font-weight: 600; color: #f2eddc; }
    .step-frame-number { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #e8c766; color: #1a1708; font-weight: 900; }
    .step-frame-description { margin: 6px 0 14px; color: #b9b6a4; font-size: 0.8rem; line-height: 1.6; }
    .step-subheading { margin-top: 26px; padding-top: 16px; border-top: 1px dashed #5a5236; }
    .step-subheading h4 { margin: 0 0 4px; font-family: Georgia, "Yu Mincho", serif; font-size: 1rem; font-weight: 600; }
    .step-subheading p { margin: 0; color: #b9b6a4; font-size: 0.78rem; line-height: 1.6; }
    .comparison-table-options-hint { flex-basis: 100%; margin: 0; color: #a9a690; font-size: 0.72rem; }
    /* ②の中の希望ボーナス欄は、中枠と二重にならないよう枠を外す */
    .step-frame > .bonus-wish-settings:not(.owned-weapon-settings) { margin: 0; padding: 0; border: 0; background: none; }
    .step-frame > .bonus-wish-settings:not(.owned-weapon-settings) > .skill-filter-intro { display: none; }
    /* 次の一致：希望（例：攻撃×4）と、希望に当てはまる枠の強調 */
    .bonus-wish-next-target { padding: 2px 8px; border: 1px solid #8a7a45; border-radius: 999px; color: #ffe39a; font-size: 0.72rem; font-weight: 800; }
    /* 希望に当てはまる枠：EXだけ金の太い縁＋光。EX以外は縁を付けず、白い文字を読みやすく。関係ない枠：灰色で薄く */
    .comparison-bonus-set .bonus-tag.wish-part { opacity: 1; font-weight: 900; color: #ffffff; text-shadow: 0 1px 2px rgb(0 0 0 / 90%); }
    /* 金の太い縁＋金の光。縁は少し離して付け、中の色（攻撃＝オレンジなど）は変えない */
    .comparison-bonus-set .bonus-tag.wish-part.ex {
      outline: 3px solid #ffd44d; outline-offset: 2px;
      box-shadow: 0 0 14px 2px rgb(255 212 77 / 70%);
    }
    .bonus-tag.not-wish { opacity: 0.25; filter: grayscale(1); }
    /* 5枠を1つずつ指定 */
    .bonus-wish-mode { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0 0 12px; font-size: 0.82rem; font-weight: 700; }
    .bonus-wish-mode label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; white-space: nowrap; }
    .bonus-wish-mode input[type="radio"] { width: 18px; height: 18px; min-height: 0; margin: 0; padding: 0; accent-color: #e8c766; flex: none; }
    .bonus-wish-slots { display: grid; gap: 8px; max-width: 520px; }
    .bonus-wish-slot { display: grid; grid-template-columns: 4.5em 1fr 1fr; gap: 8px; align-items: center; font-size: 0.8rem; font-weight: 700; }
    .bonus-wish-slot select { height: 36px; }
    /* タブが6つになったので、広い画面では6列に（狭い画面は元の並び方のまま） */
    @media (min-width: 900px) {
      .app-tabs { grid-template-columns: repeat(var(--tab-count, 5), minmax(0, 1fr)); }
    }
    /* 手持ち武器の一覧：左端の武器種の札、並べ方の切り替え、武器種の見出し */
    .owned-type-badge {
      display: inline-block; min-width: 8.5em; padding: 3px 10px; border-radius: 6px; text-align: center;
      background: #2f2b1c; border: 1px solid #e8c766; color: #ffe39a; font-size: 0.82rem; font-weight: 900;
    }
    .owned-sort-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 10px; color: #d6d3c5; font-size: 0.8rem; font-weight: 700; }
    .owned-sort-button { padding: 6px 12px; border: 2px solid #3a3c31; border-radius: 8px; background: #151612; color: #c9c6b8; font-size: 0.78rem; font-weight: 800; cursor: pointer; }
    .owned-sort-button.active { border-color: #4f9a92; background: rgb(79 154 146 / 16%); color: #bff3ec; }
    .owned-group-heading { margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #4f9a92; color: #8fe0d6; font-size: 0.95rem; }
    /* 手持ち武器：小見出し・スキルのカード */
    .owned-form-subtitle { margin: 4px 0 0; color: #d6d3c5; font-size: 0.78rem; font-weight: 800; }
    .owned-skill-picker { display: grid; gap: 12px; }
    .owned-skill-options { max-height: none; }
    /* スキル未来予測：「所持済み：弓・火（攻撃激化）」の印 */
    .skill-owned-badge {
      display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 6px;
      background: #17302d; border: 1px solid #4f9a92; color: #bff3ec; font-size: 0.74rem; font-weight: 800;
    }
    .skill-adopt { margin-top: 6px; }
    /* 画面の真ん中に出す窓（いちばん手前に出す） */
    .skill-adopt-overlay {
      position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px;
      background: rgb(0 0 0 / 60%);
    }
    .skill-adopt-menu {
      display: grid; gap: 8px; width: min(640px, 100%); max-height: 85vh; overflow-y: auto;
      padding: 18px; border: 3px solid #e8c766; border-radius: 14px; background: #1b1c17; box-shadow: 0 16px 48px rgb(0 0 0 / 70%);
    }
    .skill-adopt-menu h3 { margin: 0; font-family: Georgia, "Yu Mincho", serif; font-size: 1.1rem; color: #f2eddc; }
    .skill-adopt-summary { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .skill-adopt-note { margin: 0 0 4px; color: #b9b6a4; font-size: 0.76rem; line-height: 1.6; }
    .skill-adopt-cancel { justify-self: end; margin-top: 4px; color: #ffffff; }
    .skill-adopt-heading { margin: 0; color: #ffe39a; font-size: 0.82rem; font-weight: 800; }
    .skill-adopt-summary .comparison-bonus-set { grid-template-columns: repeat(5, auto); }
    .skill-adopt-menu p { margin: 0 0 2px; color: #ffe39a; font-size: 0.78rem; font-weight: 800; }
    .skill-adopt-choice { padding: 6px 10px; border: 1px solid #5a5236; border-radius: 6px; background: #26271f; color: #f2eddc; font-size: 0.78rem; text-align: left; cursor: pointer; }
    .skill-adopt-choice:hover { border-color: #e8c766; background: #322f22; }
    .skill-adopt-choice { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }
    .skill-adopt-choice strong { color: #ffe39a; }
    .skill-adopt-detail { grid-column: 2; color: #d6d3c5; font-size: 0.72rem; }
    .skill-adopt-tag { grid-row: span 2; padding: 2px 8px; border-radius: 5px; background: #e8c766; color: #1a1708; font-size: 0.72rem; font-weight: 900; }
    /* 開け閉めできる欄：「▶ クリックで〜が開きます」の案内 */
    details.collapsible > summary { cursor: pointer; list-style: none; }
    details.collapsible > summary::-webkit-details-marker { display: none; }
    .collapsible-hint { color: #9fd18a; font-size: 0.74rem; font-weight: 700; white-space: nowrap; }
    details.collapsible:not([open]) .when-open, details.collapsible[open] > summary .when-closed { display: none; }
    details.collapsible[open] > summary .when-open { display: inline; }
    details.collapsible > summary:hover .collapsible-hint { color: #c6f0b4; text-decoration: underline; }
    /* 包んだ欄（登録済みリスト・1つの武器を調べる欄）の見出し */
    details.collapsible:not(.weapon-filter-row) { margin-top: 12px; border: 1px dashed #6b6a55; border-radius: 10px; }
    details.collapsible:not(.weapon-filter-row) > summary { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: baseline; padding: 10px 14px; }
    details.collapsible:not(.weapon-filter-row)[open] > summary { border-bottom: 1px dashed #6b6a55; }
    details.collapsible:not(.weapon-filter-row) > :not(summary) { margin: 12px 14px 14px; }
    .collapsible-title { color: #f2eddc; font-weight: 800; font-size: 0.86rem; }
    /* 登録欄の切り替え */
    .registration-switch { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 16px; }
    .registration-switch-label { color: #a9a690; font-size: 0.78rem; font-weight: 700; margin-right: 4px; }
    .registration-switch button {
      padding: 10px 16px; border: 2px solid #3a3c31; border-radius: 10px; background: #151612;
      color: #c9c6b8; font-size: 0.82rem; font-weight: 800; cursor: pointer;
    }
    .registration-switch button.active { border-color: #e8c766; background: rgb(214 179 92 / 14%); color: #ffe39a; }
    .registration-switch button[data-value="owned"].active { border-color: #4f9a92; background: rgb(79 154 146 / 16%); color: #bff3ec; }
    /* 表の上の設定バー */
    .comparison-table-options { display: flex; flex-wrap: wrap; gap: 10px 22px; align-items: end; margin-top: 18px; padding: 12px 16px; border: 1px solid #454233; border-radius: 10px; background: #151612; }
    .comparison-table-options > label:not(.checkbox-label) { display: grid; gap: 4px; max-width: 160px; font-size: 0.74rem; font-weight: 800; }
    .comparison-table-options .checkbox-label { display: inline-flex; gap: 8px; align-items: center; font-size: 0.8rem; font-weight: 700; }
    .comparison-table.compact-columns { min-width: 0; }
    .comparison-table.compact-columns > thead > tr > th:nth-child(3),
    .comparison-table.compact-columns > tbody > tr > td:nth-child(3) { position: static; width: auto; box-shadow: none; }
    .comparison-table.compact-columns .bonus-match-cell { min-width: 320px; }
    .comparison-table.compact-columns .match-items { display: flex; flex-wrap: wrap; gap: 8px; }
    .comparison-table.compact-columns .match-items .skill-match-item {
      margin: 0; padding: 8px 10px; border: 1px solid #5a5236; border-radius: 8px; background: rgb(0 0 0 / 22%);
    }
    .comparison-table.compact-columns .match-items .comparison-bonus-set { grid-template-columns: repeat(5, auto); }
    /* 全武器の列を並べた表：一致欄は2武器で1段、武器の間は白い破線 */
    .comparison-table:not(.compact-columns) { --match-column-width: 480px; }
    .comparison-table:not(.compact-columns) .match-items { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .comparison-table:not(.compact-columns) .match-items .skill-match-item {
      margin: 0; padding: 6px 8px; border-bottom: 2px dashed rgb(255 255 255 / 55%);
    }
    .comparison-table:not(.compact-columns) .match-items .skill-match-item:nth-child(odd) { border-right: 2px dashed rgb(255 255 255 / 55%); }
    .comparison-table:not(.compact-columns) .match-items .comparison-bonus-set { grid-template-columns: repeat(5, auto); justify-content: start; }
    .comparison-table:not(.compact-columns) .match-items .skill-match-name { white-space: normal; line-height: 1.4; }
    /* 一致欄を上下に分ける：上＝狙い（リセット・金）、下＝手持ちの強化（同じ構成・青緑）。一致がない側は出さない */
    .match-split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .match-half.empty { display: none; }
    .match-half { min-width: 0; padding: 6px 8px 8px; border-radius: 10px; border: 2px solid transparent; }
    .match-half.reset { border-color: rgb(232 199 102 / 55%); background: rgb(232 199 102 / 6%); }
    .match-half.owned { border-color: rgb(110 205 195 / 55%); background: rgb(110 205 195 / 7%); }
    .match-half-label { margin-bottom: 6px; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.04em; }
    .match-half.reset .match-half-label { color: #f3d27a; }
    .match-half.owned .match-half-label { color: #8fe0d6; }
    .match-kind-badge {
      display: inline-block; margin-right: 6px; padding: 1px 8px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 900; white-space: nowrap; vertical-align: 1px;
    }
    .match-kind-badge.reset { background: #e8c766; color: #1a1708; }
    .match-kind-badge.owned { background: #4fb8ad; color: #06201d; }
    .match-half.owned .skill-match-item { border-color: rgb(110 205 195 / 45%) !important; }
    /* 全武器の列を並べた表：上下に分けたので、それぞれの中は今までどおり2武器で1段 */
    .comparison-table:not(.compact-columns) { --match-column-width: 520px; }
    /* 武器の列：見出しとボーナスを縦の白線で区切り、ボーナスは上にそろえる */
    .comparison-table:not(.compact-columns) th.reset-column-header,
    .comparison-table:not(.compact-columns) th.owned-column-header,
    .comparison-table:not(.compact-columns) td.comparison-result-cell { border-left: 2px solid rgb(240 240 240 / 55%); }
    .comparison-table td.comparison-result-cell { vertical-align: top; }
    .match-adopt-button { display: inline-block; width: auto; margin-top: 4px; padding: 4px 10px; font-size: 0.7rem; }
    .bonus-wish-next-wish { color: #a9a690; font-size: 0.74rem; }
    .bonus-wish-next-result { font-weight: 800; color: #cfeec0; }
    .bonus-wish-next-list li.none .bonus-wish-next-result { color: #888; font-weight: 400; }
    .bonus-wish-plan { margin: 0; padding-left: 1.6em; display: grid; gap: 4px; font-size: 0.8rem; line-height: 1.6; }
    .comparison-table { --match-column-width: 240px; }
    .bonus-match-cell { min-width: var(--match-column-width); vertical-align: top; }
    .bonus-match-cell .comparison-bonus-set { grid-template-columns: repeat(3, minmax(42px, auto)); justify-content: start; }
    td.bonus-wish-hit { background: rgb(232 199 102 / 16%); box-shadow: inset 0 0 0 3px #e8c766, inset 0 0 18px rgb(232 199 102 / 25%); }
    /* 一致した行：金色の帯と左の太線で目立たせる */
    .prediction-table tbody tr.bonus-wish-row-hit,
    .detail-compact-table tbody tr.prediction-match {
      background: linear-gradient(90deg, rgb(232 199 102 / 20%), rgb(232 199 102 / 6%));
    }
    .prediction-table tbody tr.bonus-wish-row-hit > th:first-child,
    .detail-compact-table tbody tr.prediction-match > th:first-child {
      box-shadow: inset 5px 0 0 #e8c766;
      color: #ffe39a;
    }
    .detail-match-badge {
      display: inline-block; padding: 4px 9px; border-radius: 999px;
      background: #e8c766; color: #1a1708; font-size: 0.74rem; font-weight: 900; white-space: nowrap;
    }
    /* EXをもっと目立たせる：太い枠・強い光・白っぽい文字 */
    .bonus-tag.ex { border-width: 2px; font-weight: 900; text-shadow: 0 0 6px currentColor; }
    /* 色弱でも見分けやすい色分け（ユーザーは色弱。ユーザーが選んだ組み合わせ）：
       攻撃＝オレンジ、属性＝紫、斬れ味・装填＝白、会心＝灰色。青は紫と紛らわしいので使わない */
    .bonus-tag.attack { border-color: rgb(230 159 0 / 75%); background: rgb(230 159 0 / 14%); color: #ffdca0; }
    .bonus-tag.element { border-color: rgb(176 112 230 / 80%); background: rgb(140 70 200 / 20%); color: #ead6ff; }
    .bonus-tag.sharpness-ammo { border-color: rgb(230 230 230 / 70%); background: rgb(255 255 255 / 9%); color: #f4f4f4; }
    .bonus-tag.affinity { border-color: #7d7d7d; background: rgb(128 128 128 / 14%); color: #c8c8c8; }
    .bonus-tag.attack.ex { border-color: #ffc04d; background: #e69f00; box-shadow: 0 0 0 1px rgb(255 192 77 / 50%), 0 0 16px rgb(230 159 0 / 60%); color: #1a1000; text-shadow: none; }
    .bonus-tag.element.ex { border-color: #d4a6ff; background: #8e44c9; box-shadow: 0 0 0 1px rgb(212 166 255 / 50%), 0 0 16px rgb(142 68 201 / 70%); color: #ffffff; text-shadow: none; }
    .bonus-tag.sharpness-ammo.ex { border-color: #ffffff; background: #f2f2f2; box-shadow: 0 0 0 1px rgb(255 255 255 / 50%), 0 0 14px rgb(255 255 255 / 45%); color: #111111; text-shadow: none; }
    .bonus-tag.affinity.ex { border-color: #b5b5b5; background: #6b6b6b; box-shadow: 0 0 0 1px rgb(181 181 181 / 45%), 0 0 12px rgb(150 150 150 / 45%); color: #ffffff; text-shadow: none; }
    .bonus-tag:not(.ex) { opacity: 0.82; }
    /* 「1条件を詳しく絞り込む」の表をスキル未来予測と同じ詰めた形に */
    .detail-compact-table { --state-column-width: 140px; min-width: 760px; }
    .detail-compact-table th, .detail-compact-table td { padding: 8px 7px; }
    .detail-compact-table > thead > tr > th:nth-child(2),
    .detail-compact-table > tbody > tr > td:nth-child(2) {
      position: sticky; left: var(--offset-column-width); z-index: 2;
      width: var(--state-column-width); min-width: var(--state-column-width);
      background: #151612; box-shadow: 8px 0 12px rgb(0 0 0 / 20%);
    }
    .detail-compact-table > thead > tr > th:nth-child(2) { z-index: 5; background: #20221c; }
    .detail-compact-table tbody tr.prediction-match > td:nth-child(2) { background: #2a2617; }
    .detail-match-cell { width: 80px; }
    .detail-bonus-set { display: flex; flex-wrap: wrap; gap: 5px; }
    .detail-bonus-set .bonus-tag { min-width: 112px; padding: 5px 7px; }
    /* seed・復元カウンター検索：連続した復元ボーナス結果をカードで入力 */
    /* 左：1〜5枠目を縦に並べた枠リスト（押して入力先を選ぶ）／右：系統ごとのカード */
    .observation-row.card-input { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; align-items: start; padding: 14px; }
    .observation-row.card-input > label { display: none; }
    .observation-row.card-input .roll-number { font-size: 0.9rem; font-weight: 800; }
    .observation-card-body { display: grid; grid-template-columns: minmax(230px, 280px) minmax(0, 1fr); gap: 16px; align-items: start; min-width: 0; }
    .observation-slot-column { display: grid; gap: 6px; }
    .observation-slot-hint { margin: 0 0 2px; color: #a9a690; font-size: 0.7rem; }
    .observation-chips { display: grid; gap: 6px; }
    .observation-chip {
      display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 8px; align-items: center;
      min-width: 0; padding: 6px 8px; border: 1px solid #44473d; border-radius: 8px;
      background: #151612; color: #eee9da; font-size: 0.76rem; text-align: left; cursor: pointer;
    }
    .observation-chip:hover { border-color: #6b6a55; }
    .observation-chip-slot { color: #d6d3c5; font-weight: 800; white-space: nowrap; }
    .observation-chip-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .observation-chip-value.bonus-tag { opacity: 1; padding: 4px 8px; }
    .observation-chip.empty .observation-chip-value { color: #77745f; }
    .observation-chip.empty { border-style: dashed; }
    .observation-chip.active { border: 2px solid #e8c766; background: rgb(214 179 92 / 14%); }
    .observation-chip-marker { color: #ffe39a; font-size: 0.7rem; font-weight: 800; white-space: nowrap; }
    @media (max-width: 760px) {
      .observation-card-body { grid-template-columns: minmax(0, 1fr); }
    }
    /* ボーナスのカード：シリーズスキル選択欄と同じ形（選択中は金枠＋チェック） */
    /* 系統ごとに列を分け、見出しの下に段階（II→III→EX）を縦に並べる */
    .observation-palette { display: grid; grid-template-columns: repeat(var(--category-count, 4), minmax(0, 1fr)); gap: 10px; align-items: start; }
    .observation-category { display: grid; gap: 6px; min-width: 0; }
    .observation-category-heading {
      padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.05em;
      color: #f2eddc; user-select: none;
    }
    .observation-category.attack .observation-category-heading { background: rgb(201 102 90 / 28%); border-bottom: 2px solid #c9665a; }
    .observation-category.affinity .observation-category-heading { background: rgb(214 176 74 / 24%); border-bottom: 2px solid #d6b04a; }
    .observation-category.element .observation-category-heading { background: rgb(90 168 196 / 24%); border-bottom: 2px solid #5aa8c4; }
    .observation-category.sharpness-ammo .observation-category-heading { background: rgb(154 136 208 / 24%); border-bottom: 2px solid #9a88d0; }
    @media (max-width: 640px) {
      .observation-palette { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .observation-card {
      display: flex; gap: 10px; align-items: flex-start; min-width: 0;
      padding: 9px 11px; border: 1px solid #3a3c31; border-left-width: 4px; border-radius: 8px;
      background: rgb(0 0 0 / 18%); color: #eee9da; text-align: left; cursor: pointer;
    }
    .observation-card:hover { border-color: #6b6a55; background: rgb(255 255 255 / 4%); }
    .observation-card.attack { border-left-color: #c9665a; }
    .observation-card.affinity { border-left-color: #d6b04a; }
    .observation-card.element { border-left-color: #5aa8c4; }
    .observation-card.sharpness-ammo { border-left-color: #9a88d0; }
    .observation-card > span:last-child { display: grid; gap: 2px; min-width: 0; }
    .observation-card strong { font-size: 0.8rem; font-weight: 700; line-height: 1.35; }
    .observation-card-sub { color: #a9a690; font-size: 0.7rem; }
    .observation-card.ex strong { color: #ffe39a; text-shadow: 0 0 8px rgb(232 199 102 / 45%); }
    .observation-card-mark {
      flex: none; width: 18px; height: 18px; margin-top: 1px;
      border: 2px solid #6b6a55; border-radius: 4px; background: #151612;
    }
    .observation-card.selected { border-color: #e8c766; border-left-color: #e8c766; background: rgb(214 179 92 / 14%); }
    .observation-card.selected .observation-card-mark { border-color: #e8c766; background: #e8c766; position: relative; }
    .observation-card.selected .observation-card-mark::after {
      content: ""; position: absolute; left: 4px; top: 0; width: 5px; height: 10px;
      border: solid #1a1708; border-width: 0 2px 2px 0; transform: rotate(45deg);
    }
    .observation-clear { justify-self: end; color: #ffffff; font-size: 0.72rem; }
    /* 手持ち武器（同じ構成で再復元）：青緑系で狙い（リセット）と区別する */
    .owned-weapon-settings { border-color: #4f9a92; background: rgb(79 154 146 / 6%); }
    .owned-weapon-form { display: grid; gap: 10px; margin-bottom: 14px; padding: 12px 14px; border: 1px dashed #4f9a92; border-radius: 10px; }
    /* 名前と種類は長い言葉が入るので広く（例：【攻撃激化】状態異常＆属性やられ無効 火） */
    .owned-weapon-form-row {
      display: grid; gap: 8px; align-items: end;
      grid-template-columns: minmax(300px, 2.4fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(150px, 1fr) minmax(260px, 2fr);
    }
    @media (max-width: 1100px) {
      .owned-weapon-form-row { grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); }
    }
    .owned-weapon-form-row label, .owned-weapon-card label { display: grid; gap: 4px; font-size: 0.76rem; font-weight: 700; }
    .owned-weapon-form-row select, .owned-weapon-form-row input { height: 38px; }
    .owned-weapon-slots { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; max-width: 640px; }
    .owned-weapon-slots label { display: grid; gap: 4px; font-size: 0.72rem; font-weight: 700; }
    .owned-weapon-slots select { height: 36px; min-width: 0; }
    .owned-weapon-form .small-button { justify-self: start; }
    .owned-weapon-card .weapon-filter-name { color: #8fe0d6; }
    .owned-weapon-card .weapon-filter-body > label { max-width: 300px; }
    .owned-rule-controls { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 160px); gap: 8px; }
    .owned-rule-controls label { display: grid; gap: 4px; font-size: 0.76rem; font-weight: 700; }
    .owned-rule-controls label[hidden] { display: none; }
    .owned-rule-controls select { height: 38px; }
    /* 一致の条件をまとめて設定 */
    .owned-bulk-rule { display: grid; gap: 10px; padding: 4px 0 6px; }
    .owned-bulk-rule > label { display: grid; gap: 4px; max-width: 420px; font-size: 0.76rem; font-weight: 700; }
    .owned-bulk-rule > label select { height: 38px; }
    .owned-bulk-rule > button { justify-self: start; }
    .bonus-tag .tier-up { margin-left: 2px; color: #7dff8a; font-weight: 900; text-shadow: 0 0 6px rgb(125 255 138 / 60%); }
    .bonus-tag .tier-down { margin-left: 2px; color: #ff7a6b; font-weight: 900; }
    .owned-update-button { border-color: #4f9a92; color: #bff3ec; }
    .owned-card-actions { display: inline-flex; gap: 6px; margin-left: auto; }
    .owned-remove-button, .owned-move-button { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 50%; background: #30332b; color: #c9c6b8; font-weight: 900; cursor: pointer; }
    .owned-remove-button:hover { background: #5a2e28; color: #fff; }
    .owned-move-button:hover:not(:disabled) { background: #2f4f4b; color: #fff; }
    .owned-move-button:disabled { opacity: 0.3; cursor: default; }
    .owned-name-hint { margin: 0; color: #a9a690; font-size: 0.72rem; }
    .column-kind { display: block; margin-bottom: 2px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0; color: #a9a690; }
    .column-layout { display: block; margin-top: 2px; font-size: 0.66rem; color: #8fe0d6; }
    .comparison-table thead th.owned-column-header { background: #17302d; border-bottom: 2px solid #4f9a92; }
    .comparison-table thead th.owned-column-header .column-kind { color: #8fe0d6; }
    td.owned-result-cell { background: rgb(79 154 146 / 7%); }
    .detail-result-cell .keep-transition-button { display: inline-block; width: auto; margin-top: 6px; padding-inline: 14px; }
    @media (min-width: 900px) {
      .comparison-table > thead > tr > th:nth-child(3),
      .comparison-table > tbody > tr > td:nth-child(3) {
        position: sticky;
        left: calc(var(--offset-column-width) + var(--state-column-width));
        z-index: 2;
        background: #151612;
        box-shadow: 8px 0 12px rgb(0 0 0 / 20%);
      }
      .comparison-table > thead > tr > th:nth-child(3) { z-index: 5; background: #20221c; }
      .comparison-table > tbody > tr > td:nth-child(2) { box-shadow: none; }
      .comparison-table > tbody > tr.bonus-wish-row-hit > td:nth-child(2),
      .comparison-table > tbody > tr.bonus-wish-row-hit > td:nth-child(3) { background: #2a2617; }
    }
  `,
}));
const STORAGE_KEY = "gogma-seed-finder-state-v1";

const SAMPLE_OBSERVATIONS = [
  [11, 12, 15, 14, 11],
  [9, 14, 8, 16, 11],
  [6, 13, 10, 11, 8],
  [8, 12, 6, 15, 10],
  [15, 8, 8, 6, 16],
  [14, 8, 11, 15, 10],
];

const BOW_SAMPLE_OBSERVATIONS = [
  [13, 14, 15, 12, 15],
  [9, 13, 14, 16, 15],
  [11, 13, 12, 14, 14],
  [11, 13, 15, 14, 9],
  [11, 15, 13, 13, 12],
  [12, 16, 12, 15, 9],
];

const HEAVY_BOWGUN_SAMPLE_OBSERVATIONS = [
  [13, 6, 8, 12, 6],
  [13, 10, 12, 15, 6],
  [9, 15, 9, 16, 6],
  [12, 16, 6, 8, 9],
  [12, 13, 15, 6, 9],
  [15, 9, 6, 16, 12],
];

const form = document.querySelector("#search-form");
const errorBox = document.querySelector("#form-error");
const startButton = document.querySelector("#start-button");
const cancelButton = document.querySelector("#cancel-button");
const statusText = document.querySelector("#status-text");
const progressBar = document.querySelector("#progress-bar");
const progressValue = document.querySelector("#progress-value");
const checkedValue = document.querySelector("#checked-value");
const elapsedValue = document.querySelector("#elapsed-value");
const candidateValue = document.querySelector("#candidate-value");
const emptyResult = document.querySelector("#empty-result");
const candidateList = document.querySelector("#candidate-list");
const workerInput = document.querySelector("#worker-count");
const observationRows = document.querySelector("#observation-rows");
const removeObservationButton = document.querySelector("#remove-observation");
const weaponSelect = document.querySelector("#weapon-type");
const attributeSelect = document.querySelector("#attribute-force");
const counterStartInput = document.querySelector("#counter-start");
const counterEndInput = document.querySelector("#counter-end");
const counterEstimateInput = document.querySelector("#counter-estimate");
const counterRadiusSelect = document.querySelector("#counter-radius");
const applyCounterEstimateButton = document.querySelector("#apply-counter-estimate");
const counterRangeSummary = document.querySelector("#counter-range-summary");
const bonusPoolNote = document.querySelector("#bonus-pool-note");
const predictionPanel = document.querySelector("#prediction-panel");
const predictionStatus = document.querySelector("#prediction-status");
const predictionSeed = document.querySelector("#prediction-seed");
const predictionOrigin = document.querySelector("#prediction-origin");
const predictionWeaponSelect = document.querySelector("#prediction-weapon-type");
const predictionAttributeSelect = document.querySelector("#prediction-attribute-force");
const predictionCountInput = document.querySelector("#prediction-count");
const predictionPoolNote = document.querySelector("#prediction-pool-note");
const predictionFilters = document.querySelector("#prediction-filters");
const predictionIgnoreTier = document.querySelector("#prediction-ignore-tier");
const predictionMatchesOnly = document.querySelector("#prediction-matches-only");
const predictionFilterDescription = document.querySelector("#prediction-filter-description");
const predictionError = document.querySelector("#prediction-error");
const predictionRows = document.querySelector("#prediction-rows");
const comparisonStatus = document.querySelector("#comparison-status");
const comparisonWeaponSelect = document.querySelector("#comparison-weapon-type");
const comparisonAttributeSelect = document.querySelector("#comparison-attribute-force");
const comparisonCountInput = document.querySelector("#comparison-count");
const bonusExFilterEnabled = document.querySelector("#bonus-ex-filter-enabled");
const bonusExFilterCountSelect = document.querySelector("#bonus-ex-filter-count");
const addComparisonTargetButton = document.querySelector("#add-comparison-target");
const clearComparisonTargetsButton = document.querySelector("#clear-comparison-targets");
const comparisonTargetList = document.querySelector("#comparison-target-list");
const comparisonError = document.querySelector("#comparison-error");
const comparisonTableWrap = document.querySelector("#comparison-table-wrap");
const comparisonHeaderRow = document.querySelector("#comparison-header-row");
const comparisonRows = document.querySelector("#comparison-rows");
const exportBonusCsvButton = document.querySelector("#export-bonus-csv");
const bonusExportStatus = document.querySelector("#bonus-export-status");
const continuationCodeInput = document.querySelector("#continuation-code");
const openContinuationButton = document.querySelector("#open-continuation");
const continuationMessage = document.querySelector("#continuation-message");
const continuationError = document.querySelector("#continuation-error");
const skillStatus = document.querySelector("#skill-status");
const skillWeaponSelect = document.querySelector("#skill-weapon-type");
const skillAttributeSelect = document.querySelector("#skill-attribute-force");
const skillPredictionCountInput = document.querySelector("#skill-prediction-count");
const skillHighlightEnabled = document.querySelector("#skill-highlight-enabled");
const skillFilterEnabled = document.querySelector("#skill-filter-enabled");
const skillFilterGroupSelect = document.querySelector("#skill-filter-group");
const skillFilterOperatorSelect = document.querySelector("#skill-filter-operator");
const skillFilterSeriesOptions = document.querySelector("#skill-filter-series-options");
const exportSkillCsvButton = document.querySelector("#export-skill-csv");
const skillExportStatus = document.querySelector("#skill-export-status");
const skillObservationRows = document.querySelector("#skill-observation-rows");
const addSkillObservationButton = document.querySelector("#add-skill-observation");
const removeSkillObservationButton = document.querySelector("#remove-skill-observation");
const findSkillPositionButton = document.querySelector("#find-skill-position");
const skillError = document.querySelector("#skill-error");
const skillTableWrap = document.querySelector("#skill-table-wrap");
const skillPredictionRows = document.querySelector("#skill-prediction-rows");
const skillPredictionHeaderRow = document.querySelector("#skill-prediction-header-row");
const skillFutureStatus = document.querySelector("#skill-future-status");
const stateBaseSeed = document.querySelector("#state-base-seed");
const stateBonusCounter = document.querySelector("#state-bonus-counter");
const stateSkillCounter = document.querySelector("#state-skill-counter");
const stateBaseSeedStatus = document.querySelector("#state-base-seed-status");
const stateBonusCounterStatus = document.querySelector("#state-bonus-counter-status");
const stateSkillCounterStatus = document.querySelector("#state-skill-counter-status");
const saveStateSummary = document.querySelector("#save-state-summary");
const manualStateBaseSeedInput = document.querySelector("#manual-state-base-seed");
const manualStateBonusCounterInput = document.querySelector("#manual-state-bonus-counter");
const manualStateSkillCounterInput = document.querySelector("#manual-state-skill-counter");
const applyManualStateButton = document.querySelector("#apply-manual-state");
const manualStateMessage = document.querySelector("#manual-state-message");
const manualStateError = document.querySelector("#manual-state-error");
const skillSearchBaseSeed = document.querySelector("#skill-search-base-seed");
const bonusStateBaseSeedInput = document.querySelector("#bonus-state-base-seed");
const bonusStateCounterInput = document.querySelector("#bonus-state-counter");
const bonusStateSkillCounterInput = document.querySelector("#bonus-state-skill-counter");
const applyBonusStateButton = document.querySelector("#apply-bonus-state");
const bonusStateMessage = document.querySelector("#bonus-state-message");
const bonusStateError = document.querySelector("#bonus-state-error");
const skillStateBaseSeedInput = document.querySelector("#skill-state-base-seed");
const skillStateCounterInput = document.querySelector("#skill-state-counter");
const skillStateBonusCounterInput = document.querySelector("#skill-state-bonus-counter");
const applySkillStateButton = document.querySelector("#apply-skill-state");
const skillStateMessage = document.querySelector("#skill-state-message");
const skillStateError = document.querySelector("#skill-state-error");
const comparisonTargetLabelInput = document.querySelector("#comparison-target-label");
const skillTargetLabelInput = document.querySelector("#skill-target-label");
const skillTargetWeaponSelect = document.querySelector("#skill-target-weapon-type");
const skillTargetAttributeSelect = document.querySelector("#skill-target-attribute-force");
const addSkillTargetButton = document.querySelector("#add-skill-target");
const clearSkillTargetsButton = document.querySelector("#clear-skill-targets");
const skillTargetList = document.querySelector("#skill-target-list");
const skillTargetError = document.querySelector("#skill-target-error");
const bonusFutureKicker = document.querySelector("#bonus-future-kicker");
const bonusOperationReset = document.querySelector("#bonus-operation-reset");
const bonusOperationKeep = document.querySelector("#bonus-operation-keep");
const keepLayoutPanel = document.querySelector("#keep-layout-panel");
const keepLayoutInputs = document.querySelector("#keep-layout-inputs");
const keepLayoutSource = document.querySelector("#keep-layout-source");
const keepLayoutError = document.querySelector("#keep-layout-error");
const detailPredictionSection = document.querySelector(".detail-prediction-section");
// 「06 手持ち武器」タブ（手持ち武器の登録・編集だけをするページ）。タブの一覧を集める前に足しておく
const ownedTabContainer = createOwnedWeaponTab();
const tabButtons = [...document.querySelectorAll("[data-tab]")];
const tabViews = [...document.querySelectorAll("[data-tab-view]")];

const suggestedWorkers = Math.min(16, Math.max(1, navigator.hardwareConcurrency ?? 4));
workerInput.value = String(suggestedWorkers);
populateSelect(weaponSelect, WEAPON_TYPES, 8);
populateSelect(attributeSelect, ATTRIBUTES, 1);
populateSelect(predictionWeaponSelect, WEAPON_TYPES, 8);
populateSelect(predictionAttributeSelect, ATTRIBUTES, 1);
populateSelect(comparisonWeaponSelect, WEAPON_TYPES, 3);
populateSelect(comparisonAttributeSelect, ATTRIBUTES, 1);
populateSelect(skillWeaponSelect, WEAPON_TYPES, 8);
populateSelect(skillAttributeSelect, ATTRIBUTES, 1);
populateSelect(skillTargetWeaponSelect, WEAPON_TYPES, 3);
populateSelect(skillTargetAttributeSelect, ATTRIBUTES, 1);
populateSelect(
  skillFilterGroupSelect,
  [[-1, "指定しない"], ...prioritizedSkillOptions(GROUP_SKILLS, PRIORITY_GROUP_SKILL_INDICES)
    .map(([index, label]) => [index, skillLabelWithEffect(label)])],
  LORDS_SOUL_GROUP_INDEX,
);
attachGroupEffectNote(skillFilterGroupSelect);
renderSkillFilterSeriesOptions(new Set([11]));
const persistedAppState = loadPersistedAppState();
let saveState = persistedAppState.saveState;
let comparisonTargets = persistedAppState.targets;
let bonusPrediction = persistedAppState.bonusPrediction;
// 「リセット／同じ構成」の切り替えは廃止。表はリセット（狙い）と同じ構成（手持ち武器）を並べて出す
bonusPrediction.mode = "reset";
// 手持ち武器 [{ id, label, weaponType, attributeForce, categories: 1〜5枠目の系統, minEx }]
const OWNED_WEAPONS_KEY = "gogma-seed-finder-owned-weapons-v1";
const MAX_OWNED_WEAPONS = 140;
// 手持ち武器を「一致」にする条件
const OWNED_RULE_OPTIONS = [
  ["upgrade", "今より強くなる（どの枠も下がらず、1つ以上上がる）"],
  ["total", "合計で強くなる（下がる枠があっても全体で上がる）"],
  ["ex", "EXの数で判定"],
];
// 手持ち武器の名前の自動入力に使う「激化」と、武器種ごとの「種類」の最初の候補
// （種類は自由に書けて、書いたものは武器種ごとに候補として覚える）
const OWNED_BOOST_OPTIONS = [["", "なし"], ["攻撃激化", "【攻撃激化】"], ["属性激化", "【属性激化】"], ["会心激化", "【会心激化】"]];
// 激化タイプで決まる種類（弓：ビン、ガンランス：砲撃タイプ、スラアク・チャアク：ビン、ライトボウガン：速射できる弾）。
// 弓・ガンランス・ライトボウガン・狩猟笛（響玉）はユーザー確認済み。スラアク・チャアクは攻略サイト（GameWith）の表から
const OWNED_SUBTYPE_BY_BOOST = {
  5: { 攻撃激化: "状態異常＆属性やられ無効", 会心激化: "スタミナ継続回復", 属性激化: "防御力＆属性耐性UP" },
  7: { 攻撃激化: "通常", 会心激化: "放射", 属性激化: "拡散" },
  8: { 攻撃激化: "強撃", 会心激化: "強属性", 属性激化: "強属性" },
  9: { 攻撃激化: "榴弾" },
  11: { 攻撃激化: "接撃", 会心激化: "強撃", 属性激化: "貫通" },
  13: { 攻撃激化: "通常・散弾", 会心激化: "通常・貫通", 属性激化: "散弾・貫通" },
};
let ownedWeapons = loadOwnedWeapons();
let ownedWeaponSection = null;
// 復元ボーナス未来予測の画面設定（登録欄の切り替え・表の表示）。このブラウザに保存
const BONUS_VIEW_KEY = "gogma-seed-finder-bonus-view-v1";
let showAllComparisonColumns = null;
// 回ごとの結果表は内部スクロールをやめ、10回分ずつ表示する（「続きを表示」で増やす）
const COMPARISON_PAGE_SIZE = 10;
let comparisonRowLimit = COMPARISON_PAGE_SIZE;
let comparisonMoreBar = null;
// 横に長い表のための追加の横スクロールバー（表の上・画面の下）
let tableScrollMirrors = [];
// スキル未来予測タブに出す手持ち武器の登録欄
let skillOwnedContainer = null;
// 開け閉めできる欄は最初は閉じておき、開いた欄は書き直しても開いたままにする
const openDetailKeys = new Set();
// 武器種ごとの希望ボーナス { [weaponType]: { counts: [攻撃, 会心, 属性, 斬れ味・装填] } }
const BONUS_WISHES_KEY = "gogma-seed-finder-bonus-wishes-v1";
const BONUS_WISH_MAX = [5, 5, 4, 2];
// 5枠を1つずつ指定するときの段階（起動時に使うので上の方で定義）
const BONUS_SLOT_LEVELS = [[0, "段階は問わず"], [2, "III以上"], [3, "EXだけ"]];
let bonusWishes = loadJsonObject(BONUS_WISHES_KEY);
// 「1条件を詳しく絞り込む」でII・III・EXまで指定した希望 { [weaponType]: bonusId[] }
const DETAIL_TIER_WISHES_KEY = "gogma-seed-finder-detail-tier-wishes-v1";
let detailTierWishes = loadJsonObject(DETAIL_TIER_WISHES_KEY);
renderObservationRows(SAMPLE_OBSERVATIONS);
renderSkillObservationRows(Array.from({ length: 4 }, () => null));
updateBonusPoolNote();
updateCounterRangeSummary();
renderPredictionFilters();
updatePredictionPoolNote();

let activeWorkers = [];
let workerProgress = [];
let completedWorkers = 0;
let foundCandidates = new Map();
let startedAt = 0;
let elapsedTimer = null;
let cancelled = false;
let lastSearchConfig = null;
let selectedCandidate = null;
let predictionRolls = [];
let predictionWasmReady = null;
let predictionRequestId = 0;
let comparisonRollSets = [];
let comparisonRequestId = 0;
let skillPredictionRollSets = [];
// 武器種ごとの条件 { [weaponType]: { groupIndex, seriesIndices: number[] } }
const WEAPON_SKILL_FILTERS_KEY = "gogma-seed-finder-weapon-filters-v1";
let weaponSkillFilters = loadWeaponSkillFilters();
let weaponFilterSection = null;
let bonusWishSection = null;
let bonusWishSummary = null;
let bonusWishMatchesOnly = null;
let selectedSkillCounter = null;
let skillObservedCount = 0;
let currentSkillObservations = [];

renderComparisonTargets();
renderBonusOperation();
syncRuntimeFromSaveState();
renderSaveState();
setActiveTab(location.hash.slice(1) || "guide", false);
if (selectedCandidate) {
  void Promise.all([refreshPredictions(), refreshComparisonPredictions()]);
}
if (selectedSkillCounter !== null) void refreshSkillPredictions();

document.querySelector("#load-sample").addEventListener("click", () => {
  weaponSelect.value = "8";
  attributeSelect.value = "1";
  document.querySelector("#counter-start").value = "475";
  document.querySelector("#counter-end").value = "485";
  counterEstimateInput.value = "480";
  counterRadiusSelect.value = "5";
  document.querySelector("#seed-start").value = "0";
  document.querySelector("#seed-end").value = "99999999";
  renderObservationRows(SAMPLE_OBSERVATIONS);
  updateBonusPoolNote();
  updateCounterRangeSummary();
  hideError();
});

document.querySelector("#load-bow-sample").addEventListener("click", () => {
  weaponSelect.value = String(BOW_WEAPON_TYPE);
  attributeSelect.value = "4";
  document.querySelector("#counter-start").value = "475";
  document.querySelector("#counter-end").value = "485";
  counterEstimateInput.value = "480";
  counterRadiusSelect.value = "5";
  document.querySelector("#seed-start").value = "0";
  document.querySelector("#seed-end").value = "99999999";
  renderObservationRows(BOW_SAMPLE_OBSERVATIONS);
  updateBonusPoolNote();
  updateCounterRangeSummary();
  hideError();
});

document.querySelector("#load-heavy-bowgun-sample").addEventListener("click", () => {
  weaponSelect.value = String(HEAVY_BOWGUN_WEAPON_TYPE);
  attributeSelect.value = "3";
  document.querySelector("#counter-start").value = "475";
  document.querySelector("#counter-end").value = "485";
  counterEstimateInput.value = "480";
  counterRadiusSelect.value = "5";
  document.querySelector("#seed-start").value = "0";
  document.querySelector("#seed-end").value = "99999999";
  renderObservationRows(HEAVY_BOWGUN_SAMPLE_OBSERVATIONS);
  updateBonusPoolNote();
  updateCounterRangeSummary();
  hideError();
});

weaponSelect.addEventListener("change", () => {
  const currentValues = snapshotObservationValues();
  renderObservationRows(currentValues);
  updateBonusPoolNote();
  hideError();
});

attributeSelect.addEventListener("change", () => {
  const currentValues = snapshotObservationValues();
  renderObservationRows(currentValues);
  updateBonusPoolNote();
  hideError();
});

applyCounterEstimateButton.addEventListener("click", () => applyEstimatedCounterRange());
counterStartInput.addEventListener("input", () => updateCounterRangeSummary());
counterEndInput.addEventListener("input", () => updateCounterRangeSummary());

document.querySelector("#add-observation").addEventListener("click", () => {
  observationRows.append(createObservationRow());
  renumberObservationRows();
});

removeObservationButton.addEventListener("click", () => {
  const rows = observationRows.querySelectorAll(".observation-row");
  if (rows.length > 1) rows[rows.length - 1].remove();
  renumberObservationRows();
});

observationRows.addEventListener("change", () => hideError());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    beginSearch(readConfig());
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
  }
});

cancelButton.addEventListener("click", () => finishCancelled());

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

// 希望は武器種ごとに覚えているので、武器種を変えたらその武器種の希望を呼び出す
predictionWeaponSelect.addEventListener("change", () => {
  renderPredictionFilters();
  updatePredictionPoolNote();
  void refreshPredictions();
});

predictionAttributeSelect.addEventListener("change", () => {
  renderPredictionFilters();
  updatePredictionPoolNote();
  void refreshPredictions();
});
predictionCountInput.addEventListener("change", () => void refreshPredictions());
predictionIgnoreTier.addEventListener("change", () => {
  renderPredictionFilters();
  renderPredictionTable();
});
predictionMatchesOnly.addEventListener("change", () => renderPredictionTable());
predictionFilters.addEventListener("change", () => {
  saveDetailFilters();
  renderPredictionTable();
});

addComparisonTargetButton.addEventListener("click", () => void addComparisonTarget());
clearComparisonTargetsButton.addEventListener("click", () => {
  comparisonTargets = [];
  comparisonRollSets = [];
  renderComparisonTargets();
  renderComparisonTable();
  clearSkillPredictionResults();
  persistAppState();
});
comparisonCountInput.addEventListener("change", () => void refreshComparisonPredictions());
[bonusExFilterEnabled, bonusExFilterCountSelect]
  .forEach((control) => control.addEventListener("change", () => renderComparisonTable()));
exportBonusCsvButton.addEventListener("click", () => exportVisibleBonusPredictionsCsv());

addSkillTargetButton.addEventListener("click", () => void addSkillTarget());
clearSkillTargetsButton.addEventListener("click", () => {
  comparisonTargets = [];
  comparisonRollSets = [];
  renderComparisonTargets();
  renderComparisonTable();
  clearSkillPredictionResults();
  persistAppState();
});

applyBonusStateButton.addEventListener("click", () => void applyBonusPredictionState());
applySkillStateButton.addEventListener("click", () => void applySkillPredictionState());
applyManualStateButton.addEventListener("click", () => applyManualSaveState());

// 「ボーナスを同じ構成で再復元」を選ぶと手持ち武器の登録欄が開き、「リセット」を選ぶと閉じる
document.querySelector("#bonus-operation-selector").addEventListener("change", () => {
  const view = loadBonusView();
  view.registration = bonusOperationKeep.checked ? "owned" : "reset";
  persistBonusView(view);
  renderBonusOperation();
});

openContinuationButton.addEventListener("click", () => void openContinuationCode());
continuationCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void openContinuationCode();
  }
});

addSkillObservationButton.addEventListener("click", () => {
  skillObservationRows.append(createSkillObservationRow());
  renumberSkillObservationRows();
  resetSkillSearchFeedback();
});

removeSkillObservationButton.addEventListener("click", () => {
  const rows = skillObservationRows.querySelectorAll(".skill-observation-row");
  if (rows.length > 1) rows[rows.length - 1].remove();
  renumberSkillObservationRows();
  resetSkillSearchFeedback();
});

skillObservationRows.addEventListener("change", () => resetSkillSearchFeedback());
skillWeaponSelect.addEventListener("change", () => resetSkillSearchFeedback());
skillAttributeSelect.addEventListener("change", () => resetSkillSearchFeedback());
skillPredictionCountInput.addEventListener("change", () => {
  if (selectedSkillCounter !== null) void refreshSkillPredictions();
});
[skillHighlightEnabled, skillFilterEnabled, skillFilterGroupSelect, skillFilterOperatorSelect]
  .forEach((control) => control.addEventListener("change", () => renderSkillPredictionTable()));
skillFilterSeriesOptions.addEventListener("change", () => renderSkillPredictionTable());
exportSkillCsvButton.addEventListener("click", () => exportVisibleSkillPredictionsCsv());
findSkillPositionButton.addEventListener("click", () => void findSkillPosition());

function createOwnedWeaponTab() {
  const nav = document.querySelector(".app-tabs");
  const lastView = [...document.querySelectorAll("[data-tab-view]")].pop();
  if (!nav || !lastView) return null;
  const button = document.createElement("button");
  const number = document.createElement("span");
  button.type = "button";
  button.className = "tab-button";
  button.dataset.tab = "owned";
  button.setAttribute("aria-selected", "false");
  number.textContent = String(nav.querySelectorAll("[data-tab]").length + 1).padStart(2, "0");
  button.append(number, "手持ち武器");
  nav.append(button);
  nav.style.setProperty("--tab-count", String(nav.children.length));

  const view = document.createElement("div");
  view.className = "tab-view";
  view.dataset.tabView = "owned";
  const panel = document.createElement("section");
  panel.className = "panel owned-tab-panel";
  const heading = document.createElement("div");
  heading.className = "section-heading";
  const headingText = document.createElement("div");
  const step = document.createElement("p");
  const title = document.createElement("h2");
  step.className = "step";
  step.textContent = "MY WEAPONS";
  title.textContent = "手持ち武器";
  headingText.append(step, title);
  heading.append(headingText);
  const description = document.createElement("p");
  description.className = "prediction-intro";
  description.textContent = "持っている武器を1本ずつ登録します。ここで登録した武器は、「復元ボーナス未来予測」（同じ構成で再復元の予測・今より強くなる回の判定）と「スキル未来予測」（すでに持っている組み合わせの判定）の両方で使われます。どのタブで登録・編集しても、同じ内容です。";
  const container = document.createElement("section");
  container.className = "bonus-wish-settings owned-weapon-settings";
  container.dataset.ownedWhere = "tab";
  panel.append(heading, description, container);
  view.append(panel);
  lastView.after(view);
  return container;
}

function readConfig() {
  const weaponType = readInteger("weapon-type", "武器種", 0, 13);
  const attributeForce = readInteger("attribute-force", "武器の属性", 0, 9);
  const counterStart = readInteger("counter-start", "内部位置の開始", 0, 0xffffffff);
  const counterEnd = readInteger("counter-end", "内部位置の終了", 0, 0xffffffff);
  const seedStart = readInteger("seed-start", "seed開始", 0, 99_999_999);
  const seedEnd = readInteger("seed-end", "seed終了", 0, 99_999_999);
  const requestedWorkers = readInteger("worker-count", "並列Worker数", 1, 16);

  if (counterStart > counterEnd) throw new Error("内部位置の開始は終了以下にしてください。");
  if (seedStart > seedEnd) throw new Error("seed開始は終了以下にしてください。");

  const observations = readObservations();
  validateGogmaObservations(weaponType, attributeForce, observations);
  const totalSeeds = seedEnd - seedStart + 1;
  return {
    weaponType,
    attributeForce,
    counterStart,
    counterEnd,
    counterGate: 35,
    seedStart,
    seedEnd,
    observations,
    workerCount: Math.min(requestedWorkers, totalSeeds),
    chunkSize: 50_000,
  };
}

function applyEstimatedCounterRange() {
  const estimate = Number(counterEstimateInput.value);
  const radius = Number(counterRadiusSelect.value);
  if (!Number.isSafeInteger(estimate) || estimate < 0 || estimate > 0xffffffff) {
    showError("推定した現在値は0〜4,294,967,295の整数で入力してください。");
    return;
  }
  if (!Number.isSafeInteger(radius) || radius < 0) return;

  counterStartInput.value = String(Math.max(0, estimate - radius));
  counterEndInput.value = String(Math.min(0xffffffff, estimate + radius));
  hideError();
  updateCounterRangeSummary();
}

function updateCounterRangeSummary() {
  const start = Number(counterStartInput.value);
  const end = Number(counterEndInput.value);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    counterRangeSummary.textContent = "有効な開始・終了を入力してください。";
    counterRangeSummary.className = "counter-range-summary warning";
    return;
  }

  const candidateCount = end - start + 1;
  const suffix = candidateCount > 1001
    ? "非常に長時間かかります。端末やブラウザによっては完了が難しい場合があります。"
    : candidateCount > 501
      ? "非常に長時間かかります。可能なら推定値を見直して範囲を分割してください。"
      : candidateCount > 101
        ? "候補数が多いため長時間かかります。"
        : candidateCount > 25
          ? "端末によっては数分かかります。"
          : "狭い探索範囲です。推定値に自信がある場合に使用してください。";
  counterRangeSummary.textContent = `現在の探索範囲: ${start.toLocaleString("ja-JP")}〜${end.toLocaleString("ja-JP")}（${candidateCount.toLocaleString("ja-JP")}候補）。${suffix}`;
  counterRangeSummary.className = `counter-range-summary${candidateCount > 25 ? " warning" : ""}`;
}

function readInteger(id, label, minimum, maximum) {
  const raw = document.querySelector(`#${id}`).value.trim();
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}は${minimum}〜${maximum.toLocaleString("ja-JP")}の整数で入力してください。`);
  }
  return value;
}

function populateSelect(select, options, selectedValue) {
  select.replaceChildren(
    ...options.map(([value, label]) => {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = label;
      option.selected = value === selectedValue;
      return option;
    }),
  );
}

function prioritizedSkillOptions(labels, priorityIndices) {
  const priority = new Set(priorityIndices);
  return [
    ...priorityIndices.map((index) => [index, labels[index]]),
    ...labels.flatMap((label, index) => priority.has(index) ? [] : [[index, label]]),
  ];
}

function renderSkillFilterSeriesOptions(selectedIndices = new Set()) {
  skillFilterSeriesOptions.replaceChildren(
    ...prioritizedSkillOptions(SERIES_SKILLS, PRIORITY_SERIES_SKILL_INDICES).map(([index, label]) => {
      const optionLabel = document.createElement("label");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");
      checkbox.type = "checkbox";
      checkbox.name = "skill-filter-series";
      checkbox.value = String(index);
      checkbox.checked = selectedIndices.has(index);
      text.textContent = label;
      text.append(skillEffectSpan(label));
      optionLabel.append(checkbox, text);
      return optionLabel;
    }),
  );
}

function loadPersistedAppState() {
  const emptyState = {
    baseSeed: null,
    bonusCounter: null,
    skillCounter: null,
    baseSource: null,
    bonusSource: null,
    skillSource: null,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    const candidateState = saved?.saveState ?? {};
    const baseSeed = candidateState.baseSeed === null || candidateState.baseSeed === undefined
      ? Number.NaN
      : Number(candidateState.baseSeed);
    const bonusCounter = candidateState.bonusCounter === null || candidateState.bonusCounter === undefined
      ? Number.NaN
      : Number(candidateState.bonusCounter);
    const skillCounter = candidateState.skillCounter === null || candidateState.skillCounter === undefined
      ? Number.NaN
      : Number(candidateState.skillCounter);
    const normalizedState = {
      ...emptyState,
      baseSeed: Number.isSafeInteger(baseSeed) && baseSeed >= 0 && baseSeed <= 99_999_999
        ? baseSeed
        : null,
      bonusCounter: isValidCounter(bonusCounter) ? bonusCounter : null,
      skillCounter: isValidCounter(skillCounter) ? skillCounter : null,
      baseSource: typeof candidateState.baseSource === "string" ? candidateState.baseSource : null,
      bonusSource: typeof candidateState.bonusSource === "string" ? candidateState.bonusSource : null,
      skillSource: typeof candidateState.skillSource === "string" ? candidateState.skillSource : null,
    };
    const targets = Array.isArray(saved?.targets)
      ? saved.targets
          .filter((target) =>
            Number.isSafeInteger(target?.weaponType) &&
            target.weaponType >= 0 &&
            target.weaponType <= 13 &&
            Number.isSafeInteger(target?.attributeForce) &&
            target.attributeForce >= 0 &&
            target.attributeForce <= 9,
          )
          .slice(0, MAX_REGISTERED_TARGETS)
          .map((target, index) => ({
            id: typeof target.id === "string" && target.id ? target.id : `legacy-${index}`,
            weaponType: target.weaponType,
            attributeForce: target.attributeForce,
            label: typeof target.label === "string" ? target.label.slice(0, 24) : "",
            keepCategories: normalizeKeepCategories(target.keepCategories),
            keepSource: typeof target.keepSource === "string" ? target.keepSource : null,
          }))
      : [];
    const bonusPrediction = {
      mode: saved?.bonusPrediction?.mode === "keep" ? "keep" : "reset",
    };
    return { saveState: normalizedState, targets, bonusPrediction };
  } catch {
    return { saveState: emptyState, targets: [], bonusPrediction: { mode: "reset" } };
  }
}

function persistAppState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ saveState, targets: comparisonTargets, bonusPrediction }),
    );
  } catch {
    // The app remains usable when storage is unavailable.
  }
}

function normalizeKeepCategories(categories) {
  if (!Array.isArray(categories) || categories.length !== 5) return [null, null, null, null, null];
  return categories.map((category) =>
    Number.isSafeInteger(category) && category >= 0 && category <= 3 ? category : null,
  );
}

function createTargetId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `target-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setActiveTab(tabName, updateHash = true) {
  const validTab = tabViews.some((view) => view.dataset.tabView === tabName)
    ? tabName
    : "guide";
  for (const button of tabButtons) {
    const active = button.dataset.tab === validTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }
  for (const view of tabViews) {
    const active = view.dataset.tabView === validTab;
    view.classList.toggle("active", active);
    view.hidden = !active;
  }
  if (updateHash && location.hash !== `#${validTab}`) history.replaceState(null, "", `#${validTab}`);
}

function syncRuntimeFromSaveState() {
  selectedCandidate = saveState.baseSeed !== null && saveState.bonusCounter !== null
    ? { seed: saveState.baseSeed, counter: saveState.bonusCounter }
    : null;
  selectedSkillCounter = saveState.baseSeed !== null ? saveState.skillCounter : null;
  if (selectedCandidate && !lastSearchConfig) {
    lastSearchConfig = {
      weaponType: Number(weaponSelect.value),
      attributeForce: Number(attributeSelect.value),
      counterGate: 35,
      observations: [],
    };
  }
}

function stateSourceText(source, fallback) {
  return source ? `${source}から設定` : fallback;
}

function renderSaveState() {
  const knownCount = [saveState.baseSeed, saveState.bonusCounter, saveState.skillCounter]
    .filter((value) => value !== null).length;
  stateBaseSeed.textContent = saveState.baseSeed === null
    ? "未特定"
    : saveState.baseSeed.toLocaleString("ja-JP");
  stateBonusCounter.textContent = saveState.bonusCounter === null
    ? "未特定"
    : saveState.bonusCounter.toLocaleString("ja-JP");
  stateSkillCounter.textContent = saveState.skillCounter === null
    ? "未特定"
    : saveState.skillCounter.toLocaleString("ja-JP");
  stateBaseSeedStatus.textContent = stateSourceText(saveState.baseSource, "検索または手入力が必要");
  stateBonusCounterStatus.textContent = stateSourceText(saveState.bonusSource, "検索または手入力が必要");
  stateSkillCounterStatus.textContent = stateSourceText(saveState.skillSource, "スキル結果から特定");
  saveStateSummary.textContent = knownCount === 3 ? "3値を特定済み" : `${knownCount}/3 特定済み`;
  saveStateSummary.className = `status-pill${knownCount === 3 ? " complete" : ""}`;
  manualStateBaseSeedInput.value = saveState.baseSeed ?? "";
  manualStateBonusCounterInput.value = saveState.bonusCounter ?? "";
  manualStateSkillCounterInput.value = saveState.skillCounter ?? "";
  skillSearchBaseSeed.textContent = saveState.baseSeed === null
    ? "未特定"
    : saveState.baseSeed.toLocaleString("ja-JP");

  bonusStateBaseSeedInput.value = saveState.baseSeed ?? "";
  bonusStateCounterInput.value = saveState.bonusCounter ?? "";
  bonusStateSkillCounterInput.value = saveState.skillCounter ?? t("未特定");
  skillStateBaseSeedInput.value = saveState.baseSeed ?? "";
  skillStateCounterInput.value = saveState.skillCounter ?? "";
  skillStateBonusCounterInput.value = saveState.bonusCounter ?? t("未特定");
  predictionSeed.textContent = saveState.baseSeed === null
    ? "—"
    : saveState.baseSeed.toLocaleString("ja-JP");

  const stateCode = currentStateCode();
  if (stateCode) continuationCodeInput.value = stateCode;
  syncRuntimeFromSaveState();
  updateComparisonStatus();
  resetSkillSearchFeedback();
  persistAppState();
}

function renderBonusOperation() {
  const keepMode = bonusPrediction.mode === "keep";
  bonusOperationReset.checked = !keepMode;
  bonusOperationKeep.checked = keepMode;
  keepLayoutPanel.hidden = !keepMode;
  detailPredictionSection.hidden = keepMode;
  bonusFutureKicker.textContent = "BONUS FUTURE";
  // 「ゲーム内で行う再復元」の2つのボタンは、手持ち武器の登録欄の開け閉めに使う。
  // 予測のしかたは切り替えない（表には狙い＝リセットと手持ち＝同じ構成の両方が出る）
  keepLayoutPanel.hidden = true;
  const ownedOpen = loadBonusView().registration === "owned";
  bonusOperationReset.checked = !ownedOpen;
  bonusOperationKeep.checked = ownedOpen;
  if (ownedWeaponSection) ownedWeaponSection.style.display = ownedOpen ? "" : "none";
  renderKeepLayoutInputs();
  updateComparisonStatus();
}

function renderKeepLayoutInputs() {
  keepLayoutError.hidden = true;
  if (comparisonTargets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "prediction-empty";
    empty.textContent = "先にEX厳選する武器を登録してください。";
    keepLayoutInputs.replaceChildren(empty);
    keepLayoutSource.textContent = "武器登録待ち";
    keepLayoutSource.className = "status-pill";
    return;
  }

  let readyCount = 0;
  let incompleteCount = 0;
  const cards = comparisonTargets.map((target) => {
    const card = document.createElement("section");
    const heading = document.createElement("div");
    const name = document.createElement("strong");
    const source = document.createElement("span");
    const slots = document.createElement("div");
    const categories = normalizeKeepCategories(target.keepCategories);
    const problem = keepLayoutProblem(target);
    const hasUnselectedSlot = categories.some((category) => category === null);
    target.keepCategories = categories;
    card.className = `keep-layout-card${problem ? " incomplete" : ""}`;
    heading.className = "keep-layout-card-heading";
    slots.className = "keep-layout-slots";
    name.textContent = comparisonTargetName(target);
    if (hasUnselectedSlot) {
      incompleteCount += 1;
      source.textContent = "5枠すべて選択してください";
      source.className = "keep-layout-warning";
    } else if (problem) {
      source.textContent = problem;
      source.className = "keep-layout-warning";
    } else {
      source.textContent = target.keepSource ? `${target.keepSource}から設定` : "現在構成を入力";
    }
    heading.append(name, source);

    const options = keepCategoriesForWeapon(target.weaponType, target.attributeForce);
    for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
      const label = document.createElement("label");
      const text = document.createElement("span");
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      text.textContent = `${slotIndex + 1}枠目`;
      placeholder.value = "";
      placeholder.textContent = "系統を選択";
      placeholder.selected = categories[slotIndex] === null;
      select.append(placeholder);
      select.classList.toggle("unselected", categories[slotIndex] === null);
      select.setAttribute("aria-invalid", String(categories[slotIndex] === null));
      for (const [category, categoryName] of options) {
        const option = document.createElement("option");
        option.value = String(category);
        option.textContent = categoryName;
        option.selected = categories[slotIndex] === category;
        select.append(option);
      }
      select.addEventListener("change", () => {
        target.keepCategories[slotIndex] = select.value === "" ? null : Number(select.value);
        target.keepSource = "手入力";
        persistAppState();
        renderKeepLayoutInputs();
        void Promise.all([refreshPredictions(), refreshComparisonPredictions()]);
      });
      label.append(text, select);
      slots.append(label);
    }
    if (problem === null) readyCount += 1;
    card.append(heading, slots);
    return card;
  });
  keepLayoutInputs.replaceChildren(...cards);
  keepLayoutSource.textContent = `${readyCount}/${comparisonTargets.length} 構成入力済み`;
  keepLayoutSource.className = `status-pill${readyCount === comparisonTargets.length ? " complete" : ""}`;
  if (incompleteCount > 0) {
    keepLayoutError.textContent = `${incompleteCount}件の武器に未選択の枠があります。各武器の5枠をすべて選択してください。`;
    keepLayoutError.hidden = false;
  }
}

function keepCategoriesForWeapon(weaponType, attributeForce) {
  if (weaponType === BOW_WEAPON_TYPE) {
    return GOGMA_BONUS_CATEGORIES.filter(
      ([category]) => category !== 3 && !(attributeForce === 0 && category === 2),
    );
  }
  if (BOWGUN_WEAPON_TYPES.has(weaponType)) {
    return GOGMA_BONUS_CATEGORIES
      .filter(([category]) => category !== 2)
      .map(([category, name]) => [category, category === 3 ? "装填数" : name]);
  }
  return GOGMA_BONUS_CATEGORIES
    .filter(([category]) => !(attributeForce === 0 && category === 2))
    .map(([category, name]) => [category, category === 3 ? "斬れ味" : name]);
}

function keepLayoutProblem(target) {
  const categories = normalizeKeepCategories(target.keepCategories);
  if (categories.some((category) => category === null)) return "5枠の現在構成を入力してください。";
  if (target.weaponType === BOW_WEAPON_TYPE && categories.includes(3)) {
    return "弓には斬れ味・装填系を設定できません。";
  }
  if (BOWGUN_WEAPON_TYPES.has(target.weaponType) && categories.includes(2)) {
    return "ボウガンには属性系を設定できません。";
  }
  if (target.attributeForce === 0 && categories.includes(2)) {
    return "無属性武器には属性系を設定できません。";
  }
  const count = (category) => categories.filter((value) => value === category).length;
  if (count(2) > 4) return "属性系は合計4枠までです。";
  if (count(3) > 2) return "斬れ味・装填系は合計2枠までです。";
  return null;
}

function requireTargetKeepCategories(target) {
  const problem = keepLayoutProblem(target);
  if (problem) throw new Error(`${comparisonTargetName(target)}: ${t(problem)}`);
  return target.keepCategories;
}

function currentStateCode() {
  if (saveState.baseSeed === null || saveState.bonusCounter === null) return null;
  return formatStateContinuationCode(
    saveState.baseSeed,
    saveState.bonusCounter,
    saveState.skillCounter,
  );
}

function setStateFromBonus(baseSeed, bonusCounter, source, clearSkill = false) {
  const baseChanged = saveState.baseSeed !== null && saveState.baseSeed !== baseSeed;
  saveState = {
    ...saveState,
    baseSeed,
    bonusCounter,
    skillCounter: baseChanged || clearSkill ? null : saveState.skillCounter,
    baseSource: source,
    bonusSource: source,
    skillSource: baseChanged || clearSkill ? null : saveState.skillSource,
  };
  renderSaveState();
}

function setStateFromSkill(baseSeed, skillCounter, source) {
  const baseChanged = saveState.baseSeed !== null && saveState.baseSeed !== baseSeed;
  saveState = {
    ...saveState,
    baseSeed,
    bonusCounter: baseChanged ? null : saveState.bonusCounter,
    skillCounter,
    baseSource: source,
    bonusSource: baseChanged ? null : saveState.bonusSource,
    skillSource: source,
  };
  renderSaveState();
}

function readStateNumber(input, label, maximum) {
  const value = Number(input.value.trim());
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${label}は0〜${maximum.toLocaleString("ja-JP")}の整数で入力してください。`);
  }
  return value;
}

function readOptionalStateNumber(input, label, maximum) {
  if (input.value.trim() === "") return null;
  return readStateNumber(input, label, maximum);
}

function applyManualSaveState() {
  manualStateError.hidden = true;
  manualStateMessage.textContent = "";
  try {
    const baseSeed = readStateNumber(manualStateBaseSeedInput, "基準seed", 99_999_999);
    const bonusCounter = readOptionalStateNumber(
      manualStateBonusCounterInput,
      "復元ボーナスカウンター",
      0xffffffff,
    );
    const skillCounter = readOptionalStateNumber(
      manualStateSkillCounterInput,
      "スキルカウンター",
      0xffffffff,
    );
    saveState = {
      baseSeed,
      bonusCounter,
      skillCounter,
      baseSource: "手入力",
      bonusSource: bonusCounter === null ? null : "手入力",
      skillSource: skillCounter === null ? null : "手入力",
    };
    renderSaveState();
    manualStateMessage.textContent = "入力した値を現在のセーブ状態に設定しました。空欄のカウンターは未特定として扱います。";
  } catch (error) {
    manualStateError.textContent = error instanceof Error ? error.message : String(error);
    manualStateError.hidden = false;
  }
}

async function applyBonusPredictionState() {
  bonusStateError.hidden = true;
  bonusStateMessage.textContent = "";
  try {
    const baseSeed = readStateNumber(bonusStateBaseSeedInput, "基準seed", 99_999_999);
    const bonusCounter = readStateNumber(
      bonusStateCounterInput,
      "復元ボーナスカウンター",
      0xffffffff,
    );
    setStateFromBonus(baseSeed, bonusCounter, "手入力");
    predictionPanel.hidden = false;
    await Promise.all([refreshPredictions(), refreshComparisonPredictions()]);
    bonusStateMessage.textContent = "入力した基準seedと復元ボーナスカウンターを0地点として予測しました。";
  } catch (error) {
    bonusStateError.textContent = error instanceof Error ? error.message : String(error);
    bonusStateError.hidden = false;
  }
}

async function applySkillPredictionState() {
  skillStateError.hidden = true;
  skillStateMessage.textContent = "";
  try {
    const baseSeed = readStateNumber(skillStateBaseSeedInput, "基準seed", 99_999_999);
    const skillCounter = readStateNumber(skillStateCounterInput, "スキルカウンター", 0xffffffff);
    setStateFromSkill(baseSeed, skillCounter, "手入力");
    await refreshSkillPredictions();
    skillStateMessage.textContent = "入力した基準seedとスキルカウンターを0地点として予測しました。";
  } catch (error) {
    skillStateError.textContent = error instanceof Error ? error.message : String(error);
    skillStateError.hidden = false;
  }
}

function formatGogmaContinuationCode(candidate, completedRolls) {
  const nextGogmaCounter = candidate.counter + completedRolls;
  if (!isValidCounter(nextGogmaCounter)) {
    throw new Error("保存後の内部位置が対応範囲を超えました。");
  }
  return formatStateContinuationCode(candidate.seed, nextGogmaCounter, saveState.skillCounter);
}

function formatSkillContinuationCode(completedRolls) {
  if (saveState.baseSeed === null || saveState.skillCounter === null) {
    throw new Error("基準seedまたはスキルカウンターが特定されていません。");
  }
  if (saveState.bonusCounter === null) return null;
  const nextSkillCounter = saveState.skillCounter + completedRolls;
  if (!isValidCounter(nextSkillCounter)) {
    throw new Error("保存後のスキルカウンターが対応範囲を超えました。");
  }
  return formatStateContinuationCode(
    saveState.baseSeed,
    saveState.bonusCounter,
    nextSkillCounter,
  );
}

function formatStateContinuationCode(seed, gogmaCounter, skillCounter = null) {
  if (skillCounter === null) return `GSF1-${seed}-${gogmaCounter}`;
  return `GSF2-B${seed}-G${gogmaCounter}-S${skillCounter}`;
}

function isValidCounter(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff;
}

function parseContinuationCode(rawCode) {
  const code = rawCode.trim();
  const fullMatch = code.match(/^GSF2-B(\d{1,8})-G(\d{1,10})-S(\d{1,10})$/i);
  const bonusOnlyMatch = code.match(/^GSF1-(\d{1,8})-(\d{1,10})$/i);
  if (!fullMatch && !bonusOnlyMatch) {
    throw new Error(
      "セーブ状態コードは GSF2-B基準seed-G復元カウンター-Sスキルカウンター、またはGSF1形式で入力してください。",
    );
  }

  const match = fullMatch ?? bonusOnlyMatch;
  const seed = Number(match[1]);
  const gogmaCounter = Number(match[2]);
  const skillCounter = fullMatch ? Number(match[3]) : null;
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 99_999_999) {
    throw new Error("状態コード内の基準seedが範囲外です。");
  }
  if (!isValidCounter(gogmaCounter)) {
    throw new Error("状態コード内の復元ボーナスカウンターが範囲外です。");
  }
  if (skillCounter !== null && !isValidCounter(skillCounter)) {
    throw new Error("状態コード内のスキルカウンターが範囲外です。");
  }
  return { seed, counter: gogmaCounter, skillCounter };
}

async function openContinuationCode() {
  hideContinuationError();
  continuationMessage.textContent = "";

  try {
    const parsedState = parseContinuationCode(continuationCodeInput.value);
    const candidate = { seed: parsedState.seed, counter: parsedState.counter };
    stopWorkers();
    resetResults();
    lastSearchConfig = {
      weaponType: Number(weaponSelect.value),
      attributeForce: Number(attributeSelect.value),
      counterGate: 35,
      observations: [],
    };
    saveState = {
      baseSeed: parsedState.seed,
      bonusCounter: parsedState.counter,
      skillCounter: parsedState.skillCounter,
      baseSource: "状態コード",
      bonusSource: "状態コード",
      skillSource: parsedState.skillCounter === null ? null : "状態コード",
    };
    renderSaveState();
    foundCandidates.set(candidateKey(candidate), candidate);
    statusText.textContent = "状態コード読込";
    statusText.className = "status-pill complete";
    renderCandidates();
    if (comparisonTargets.length === 0) {
      comparisonTargets.push({
        id: createTargetId(),
        weaponType: Number(weaponSelect.value),
        attributeForce: Number(attributeSelect.value),
        label: "",
        keepCategories: [null, null, null, null, null],
        keepSource: null,
      });
    }
    renderComparisonTargets();
    renderPredictionFilters();
    predictionPanel.hidden = false;
    await Promise.all([
      refreshPredictions(),
      refreshComparisonPredictions(),
      parsedState.skillCounter === null ? Promise.resolve() : refreshSkillPredictions(),
    ]);
    continuationMessage.textContent = parsedState.skillCounter === null
      ? "状態を読み込みました。基準seedと復元ボーナスカウンターを引き継いでいます。"
      : "状態を読み込みました。基準seedと2つのカウンターを引き継いでいます。";
    setActiveTab("bonus-future");
  } catch (error) {
    showContinuationError(error instanceof Error ? error.message : String(error));
  }
}

async function useContinuationCode(code) {
  if (!code) return;
  continuationCodeInput.value = code;
  hideContinuationError();
  continuationMessage.textContent = `セーブ状態コードを入力欄へコピーしました: ${code}`;
  try {
    await navigator.clipboard.writeText(code);
    continuationMessage.textContent = `セーブ状態コードをクリップボードへコピーしました: ${code}`;
  } catch {
    // Clipboard permission is not available in every browser context. The input is still populated.
  }
}

function showContinuationError(message) {
  continuationError.textContent = message;
  continuationError.hidden = false;
}

function hideContinuationError() {
  continuationError.textContent = "";
  continuationError.hidden = true;
}

function renderObservationRows(rolls) {
  observationRows.replaceChildren(...rolls.map((roll) => createObservationRow(roll)));
  renumberObservationRows();
}

function renderSkillObservationRows(rolls) {
  skillObservationRows.replaceChildren(
    ...rolls.map((roll) => createSkillObservationRow(roll)),
  );
  renumberSkillObservationRows();
}

function createSkillObservationRow(value = null) {
  const row = document.createElement("div");
  row.className = "skill-observation-row";

  const rollNumber = document.createElement("span");
  rollNumber.className = "roll-number";
  row.append(rollNumber);

  row.append(
    createIndexedSkillSelect("series", SERIES_SKILLS, value?.seriesIndex ?? null),
    createIndexedSkillSelect("group", GROUP_SKILLS, value?.groupIndex ?? null),
  );
  return row;
}

function createIndexedSkillSelect(kind, skills, selectedIndex) {
  const label = document.createElement("label");
  const accessibleLabel = document.createElement("span");
  const select = document.createElement("select");
  const placeholder = document.createElement("option");

  accessibleLabel.className = `sr-only ${kind}-skill-label`;
  select.dataset.skillKind = kind;
  placeholder.value = "";
  placeholder.textContent = kind === "series" ? "シリーズを選択" : "グループを選択";
  placeholder.disabled = true;
  placeholder.selected = selectedIndex === null;
  select.append(placeholder);

  skills.forEach((skill, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = skill;
    option.selected = selectedIndex === index;
    select.append(option);
  });

  label.append(accessibleLabel, select);
  return label;
}

function renumberSkillObservationRows() {
  const rows = [...skillObservationRows.querySelectorAll(".skill-observation-row")];
  rows.forEach((row, rollIndex) => {
    row.querySelector(".roll-number").textContent = `再付与 ${rollIndex + 1}`;
    row.querySelector(".series-skill-label").textContent =
      `再付与${rollIndex + 1}のシリーズスキル`;
    row.querySelector(".group-skill-label").textContent =
      `再付与${rollIndex + 1}のグループスキル`;
  });
  removeSkillObservationButton.disabled = rows.length <= 1;
}

function readSkillObservations() {
  const rows = [...skillObservationRows.querySelectorAll(".skill-observation-row")];
  if (rows.length === 0) throw new Error("スキル再付与結果を1回以上入力してください。");

  return rows.map((row, rollIndex) => {
    const seriesSelect = row.querySelector('[data-skill-kind="series"]');
    const groupSelect = row.querySelector('[data-skill-kind="group"]');
    if (seriesSelect.value === "" || groupSelect.value === "") {
      throw new Error(`再付与${rollIndex + 1}のシリーズとグループを選択してください。`);
    }
    return Number(seriesSelect.value) * GROUP_SKILLS.length + Number(groupSelect.value);
  });
}

function availableGogmaBonuses() {
  return gogmaBonusesForWeapon(Number(weaponSelect.value), Number(attributeSelect.value));
}

function gogmaBonusesForWeapon(weaponType, attributeForce = null) {
  if (weaponType === BOW_WEAPON_TYPE) {
    return GOGMA_BONUSES.filter(
      ([id]) => !SHARPNESS_AMMO_BONUS_IDS.has(id)
        && !(attributeForce === 0 && ELEMENT_BONUS_IDS.has(id)),
    );
  }
  if (BOWGUN_WEAPON_TYPES.has(weaponType)) {
    return GOGMA_BONUSES.filter(([id]) => !ELEMENT_BONUS_IDS.has(id)).map(([id, name]) => {
      if (id === 6) return [id, "装填数強化 +1"];
      if (id === 10) return [id, "装填強化ＥＸ"];
      return [id, name];
    });
  }
  return attributeForce === 0
    ? GOGMA_BONUSES.filter(([id]) => !ELEMENT_BONUS_IDS.has(id))
    : GOGMA_BONUSES;
}

function gogmaBonusName(weaponType, bonusId) {
  return gogmaBonusesForWeapon(weaponType).find(([id]) => id === bonusId)?.[1] ?? `ID ${bonusId}`;
}

function compactGogmaBonusName(weaponType, bonusId) {
  const sharpnessAmmoPrefix = BOWGUN_WEAPON_TYPES.has(weaponType) ? "装" : "斬";
  const labels = new Map([
    [6, `${sharpnessAmmoPrefix}I`],
    [8, "攻II"],
    [9, "会II"],
    [10, `${sharpnessAmmoPrefix}EX`],
    [11, "属II"],
    [12, "攻III"],
    [13, "会III"],
    [14, "属EX"],
    [15, "攻EX"],
    [16, "会EX"],
  ]);
  return labels.get(bonusId) ?? `ID ${bonusId}`;
}

function updateBonusPoolNote() {
  const weaponType = Number(weaponSelect.value);
  const attributeForce = Number(attributeSelect.value);
  if (weaponType === BOW_WEAPON_TYPE) {
    bonusPoolNote.textContent = attributeForce === 0
      ? "無属性の弓は攻撃・会心の6候補です。属性強化と斬れ味・装填系は抽選されません。"
      : "弓は攻撃・会心・属性の8候補です。斬れ味・装填系は抽選されません。";
    return;
  }
  if (BOWGUN_WEAPON_TYPES.has(weaponType)) {
    bonusPoolNote.textContent =
      "ボウガンは攻撃・会心・装填の8候補です。属性強化は抽選されず、装填系は合計2枠までです。";
    return;
  }
  bonusPoolNote.textContent = attributeForce === 0
    ? "無属性の近接武器は攻撃・会心・斬れ味の8候補です。属性強化は抽選されません。"
    : "近接武器は攻撃・会心・属性・斬れ味の10候補です。";
}

function updatePredictionPoolNote() {
  const weaponType = Number(predictionWeaponSelect.value);
  const attributeForce = Number(predictionAttributeSelect.value);
  if (bonusPrediction.mode === "keep") {
    predictionPoolNote.textContent =
      "「ボーナスを同じ構成で再復元」は、登録武器ごとの5枠系統を維持したままII・III・EX等だけを再抽選します。";
    return;
  }
  if (weaponType === BOW_WEAPON_TYPE) {
    predictionPoolNote.textContent = attributeForce === 0
      ? "無属性の弓は攻撃・会心の6候補で計算します。属性強化と斬れ味・装填系は出ません。"
      : "弓の未来は攻撃・会心・属性の8候補で計算します。斬れ味・装填系は出ません。";
    return;
  }
  if (BOWGUN_WEAPON_TYPES.has(weaponType)) {
    predictionPoolNote.textContent =
      "ボウガンの未来は攻撃・会心・装填の8候補で計算します。属性強化は出ません。";
    return;
  }
  predictionPoolNote.textContent = attributeForce === 0
    ? "無属性の近接武器は攻撃・会心・斬れ味の8候補で計算します。属性強化は出ません。"
    : "近接武器の未来は攻撃・会心・属性・斬れ味の10候補で計算します。";
}

function snapshotObservationValues() {
  return [...observationRows.querySelectorAll(".observation-row")].map((row) =>
    [...row.querySelectorAll("select")].map((select) =>
      select.value === "" ? null : Number(select.value),
    ),
  );
}

function createObservationRow(values = null) {
  const row = document.createElement("div");
  row.className = "observation-row";

  const rollNumber = document.createElement("span");
  rollNumber.className = "roll-number";
  row.append(rollNumber);

  for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
    const label = document.createElement("label");
    const accessibleLabel = document.createElement("span");
    accessibleLabel.className = "sr-only slot-label";
    const select = document.createElement("select");
    select.required = true;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "選択してください";
    placeholder.disabled = true;
    const bonuses = availableGogmaBonuses();
    const selectedId = values?.[slotIndex] ?? null;
    const selectedIdIsAvailable = bonuses.some(([id]) => id === selectedId);
    placeholder.selected = selectedId === null || !selectedIdIsAvailable;
    select.append(placeholder);

    for (const [id, name] of bonuses) {
      const option = document.createElement("option");
      option.value = String(id);
      option.textContent = name;
      option.selected = selectedId === id;
      select.append(option);
    }

    label.append(accessibleLabel, select);
    row.append(label);
  }
  enhanceObservationRowWithCards(row);
  return row;
}

// プルダウンの代わりにカードで入力する。カードを押すと選択中の枠に入り、次の空き枠へ進む。
// 値は隠したプルダウンに入れるので、検索側の読み取りはそのまま。
function enhanceObservationRowWithCards(row) {
  row.classList.add("card-input");
  const selects = [...row.querySelectorAll("select")];
  // 隠したプルダウンが未入力だとブラウザが送信を黙って止めるので、未入力チェックは検索側に任せる
  selects.forEach((select) => { select.required = false; });
  const picker = createBonusCardPicker({
    weaponType: Number(weaponSelect.value),
    options: availableGogmaBonuses(),
    values: selects.map((select) => select.value === "" ? null : Number(select.value)),
    clearText: "この回をクリア",
    onChange: (index, bonusId) => {
      selects[index].value = bonusId === null ? "" : String(bonusId);
      selects[index].dispatchEvent(new Event("change", { bubbles: true }));
    },
  });
  row.append(picker.element);
}

// 5枠のボーナスをカードで選ぶ部品（左：1〜5枠目、右：系統ごとのカード）。
// seed検索の結果入力と、手持ち武器の登録で使う
function createBonusCardPicker({ weaponType, options, values, onChange, clearText = "5枠をクリア" }) {
  const current = Array.from({ length: 5 }, (_, index) => values?.[index] ?? null);
  const firstEmpty = current.findIndex((value) => value === null);
  let active = firstEmpty === -1 ? 0 : firstEmpty;

  const body = document.createElement("div");
  body.className = "observation-card-body";
  const chips = document.createElement("div");
  chips.className = "observation-chips";
  const palette = document.createElement("div");
  palette.className = "observation-palette";

  const setValue = (index, bonusId) => {
    current[index] = bonusId;
    onChange?.(index, bonusId, [...current]);
  };

  const render = () => {
    chips.replaceChildren(...current.map((bonusId, index) => {
      const chip = document.createElement("button");
      const slotName = document.createElement("span");
      const value = document.createElement("span");
      chip.type = "button";
      chip.className = "observation-chip";
      slotName.className = "observation-chip-slot";
      slotName.textContent = `${index + 1}枠目`;
      value.className = "observation-chip-value";
      if (bonusId === null) {
        chip.classList.add("empty");
        value.textContent = "未選択";
      } else {
        value.classList.add("bonus-tag", bonusClassName(bonusId));
        if (EX_BONUS_IDS.has(bonusId)) value.classList.add("ex");
        value.textContent = gogmaBonusName(weaponType, bonusId);
      }
      chip.append(slotName, value);
      if (index === active) {
        const marker = document.createElement("span");
        marker.className = "observation-chip-marker";
        marker.textContent = "◀ 入力中";
        chip.append(marker);
      }
      chip.classList.toggle("active", index === active);
      chip.title = `${index + 1}枠目（押すとこの枠を選び直せます）`;
      chip.addEventListener("click", () => {
        active = index;
        render();
      });
      return chip;
    }));
    // 選んでいる枠に入っているボーナスのカードを、チェック付きの金枠にする
    const activeValue = current[active] === null ? "" : String(current[active]);
    cards.forEach((card) => card.classList.toggle("selected", card.dataset.bonusId === activeValue));
  };

  const cards = [];
  // 系統ごとの列（見出し＋段階のカードを縦に並べる）
  const categoryColumns = new Map();
  const categoryLabel = (className) => ({
    attack: "攻撃",
    affinity: "会心",
    element: "属性",
    "sharpness-ammo": BOWGUN_WEAPON_TYPES.has(weaponType) ? "装填" : "斬れ味",
  })[className];
  const columnFor = (className) => {
    if (!categoryColumns.has(className)) {
      const column = document.createElement("div");
      const heading = document.createElement("div");
      column.className = `observation-category ${className}`;
      heading.className = "observation-category-heading";
      heading.textContent = categoryLabel(className);
      column.append(heading);
      categoryColumns.set(className, column);
      palette.append(column);
    }
    return categoryColumns.get(className);
  };
  for (const [bonusId, name] of options) {
    const card = document.createElement("button");
    const mark = document.createElement("span");
    const text = document.createElement("span");
    const title = document.createElement("strong");
    const sub = document.createElement("span");
    card.type = "button";
    card.className = `observation-card ${bonusClassName(bonusId)}${EX_BONUS_IDS.has(bonusId) ? " ex" : ""}`;
    card.dataset.bonusId = String(bonusId);
    mark.className = "observation-card-mark";
    title.textContent = name;
    sub.className = "observation-card-sub";
    sub.textContent = EX_BONUS_IDS.has(bonusId) ? `${categoryLabel(bonusClassName(bonusId))}系・EX` : `${categoryLabel(bonusClassName(bonusId))}系`;
    text.append(title, sub);
    card.append(mark, text);
    cards.push(card);
    columnFor(bonusClassName(bonusId)).append(card);
    card.addEventListener("click", () => {
      setValue(active, bonusId);
      const nextEmpty = current.findIndex((value, index) => index > active && value === null);
      if (nextEmpty !== -1) active = nextEmpty;
      else if (active < 4) active += 1;
      render();
    });
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "text-button observation-clear";
  clearButton.textContent = clearText;
  clearButton.addEventListener("click", () => {
    current.forEach((_, index) => setValue(index, null));
    active = 0;
    render();
  });
  palette.style.setProperty("--category-count", String(categoryColumns.size));

  const slotColumn = document.createElement("div");
  slotColumn.className = "observation-slot-column";
  const slotHint = document.createElement("p");
  slotHint.className = "observation-slot-hint";
  slotHint.textContent = "枠を押して選び、右のカードで入力";
  slotColumn.append(slotHint, chips, clearButton);
  body.append(slotColumn, palette);
  render();
  return { element: body, getValues: () => [...current] };
}

function renumberObservationRows() {
  const rows = [...observationRows.querySelectorAll(".observation-row")];
  rows.forEach((row, rollIndex) => {
    row.querySelector(".roll-number").textContent = row.classList.contains("card-input")
      ? `${rollIndex + 1}回目の再復元`
      : `抽選 ${rollIndex + 1}`;
    row.querySelectorAll(".slot-label").forEach((label, slotIndex) => {
      label.textContent = `${slotIndex + 1}枠目`;
      label.parentElement.querySelector("select").setAttribute(
        "aria-label",
        t(`抽選${rollIndex + 1}の${slotIndex + 1}枠目`),
      );
    });
  });
  removeObservationButton.disabled = rows.length <= 1;
}

function readObservations() {
  const rows = [...observationRows.querySelectorAll(".observation-row")];
  if (rows.length === 0) throw new Error("抽選結果を1回以上入力してください。");

  return rows.flatMap((row, rollIndex) =>
    [...row.querySelectorAll("select")].map((select, slotIndex) => {
      if (select.value === "") {
        throw new Error(`抽選${rollIndex + 1}の${slotIndex + 1}枠目を選択してください。`);
      }
      return Number(select.value);
    }),
  );
}

function validateGogmaObservations(weaponType, attributeForce, observations) {
  const availableIds = new Set(
    gogmaBonusesForWeapon(weaponType, attributeForce).map(([id]) => id),
  );

  for (let offset = 0; offset < observations.length; offset += 5) {
    const rollIndex = offset / 5;
    const roll = observations.slice(offset, offset + 5);
    const exactCounts = new Map();

    for (const [slotIndex, bonusId] of roll.entries()) {
      if (!availableIds.has(bonusId)) {
        const bonusName = GOGMA_BONUSES.find(([id]) => id === bonusId)?.[1] ?? `ID ${bonusId}`;
        throw new Error(
          `抽選${rollIndex + 1}の${slotIndex + 1}枠目「${bonusName}」は、選択した武器種・属性では抽選されません。武器種・属性と入力内容を確認してください。`,
        );
      }
      exactCounts.set(bonusId, (exactCounts.get(bonusId) ?? 0) + 1);
    }

    for (const [bonusId, count] of exactCounts) {
      if (count > 2) {
        throw new Error(
          `抽選${rollIndex + 1}の「${gogmaBonusName(weaponType, bonusId)}」が${count}枠あります。同一ボーナスは最大2枠です。入力内容を確認してください。`,
        );
      }
    }

    const sharpnessAmmoCount = roll.filter((bonusId) =>
      SHARPNESS_AMMO_BONUS_IDS.has(bonusId)
    ).length;
    if (sharpnessAmmoCount > 2) {
      const categoryName = BOWGUN_WEAPON_TYPES.has(weaponType) ? "装填系" : "斬れ味系";
      throw new Error(
        `抽選${rollIndex + 1}の${categoryName}ボーナスが${sharpnessAmmoCount}枠あります。${categoryName}は合計2枠までです。入力内容を確認してください。`,
      );
    }
  }
}

function beginSearch(config) {
  stopWorkers();
  hideError();
  resetResults();
  lastSearchConfig = config;
  cancelled = false;
  startedAt = performance.now();
  completedWorkers = 0;
  workerProgress = Array(config.workerCount).fill(null).map(() => ({ checked: 0, total: 0 }));

  setRunning(true);
  statusText.textContent = "探索中";
  statusText.className = "status-pill running";
  emptyResult.textContent = "候補を探索しています…";
  elapsedTimer = window.setInterval(updateElapsed, 100);

  const totalSeeds = config.seedEnd - config.seedStart + 1;
  const baseSize = Math.floor(totalSeeds / config.workerCount);
  const remainder = totalSeeds % config.workerCount;
  let cursor = config.seedStart;

  for (let workerId = 0; workerId < config.workerCount; workerId += 1) {
    const partitionSize = baseSize + (workerId < remainder ? 1 : 0);
    const partitionStart = cursor;
    const partitionEnd = cursor + partitionSize - 1;
    cursor = partitionEnd + 1;

    const worker = new Worker(new URL("./search-worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", (event) => finishWithError(event.message));
    activeWorkers.push(worker);
    worker.postMessage({
      type: "start",
      workerId,
      config: {
        ...config,
        seedStart: partitionStart,
        seedEnd: partitionEnd,
      },
    });
  }
}

function handleWorkerMessage({ data }) {
  if (cancelled) return;
  if (data.type === "progress") {
    workerProgress[data.workerId] = { checked: data.checked, total: data.total };
    recordCandidates(data.pairs);
    updateProgress();
    return;
  }
  if (data.type === "error") {
    finishWithError(data.message);
    return;
  }
  if (data.type === "done") {
    completedWorkers += 1;
    if (completedWorkers === activeWorkers.length) finishComplete();
  }
}

function recordCandidates(flatPairs) {
  for (let index = 0; index < flatPairs.length; index += 2) {
    const seed = flatPairs[index];
    const counter = flatPairs[index + 1];
    foundCandidates.set(`${seed}:${counter}`, { seed, counter });
  }
  renderCandidates();
}

function renderCandidates() {
  const candidates = [...foundCandidates.values()].sort(
    (left, right) => left.seed - right.seed || left.counter - right.counter,
  );
  candidateValue.textContent = candidates.length.toLocaleString("ja-JP");
  candidateList.replaceChildren(
    ...candidates.map((candidate, index) => {
      const { seed, counter } = candidate;
      const item = document.createElement("li");
      const button = document.createElement("button");
      const selected = candidateKey(candidate) === candidateKey(selectedCandidate);
      button.type = "button";
      button.className = "candidate-button";
      button.setAttribute("aria-pressed", String(selected));
      button.innerHTML = `<div><span>セーブ状態</span><strong>候補 ${index + 1}</strong></div><div><span>基準seed</span><strong>${seed.toLocaleString("ja-JP")}</strong></div><div><span>復元ボーナスカウンター</span><strong>${counter.toLocaleString("ja-JP")}</strong></div><span class="candidate-action">${selected ? "現在の状態" : "この状態を使用"}</span>`;
      button.addEventListener("click", () => void selectCandidate(candidate));
      item.classList.toggle("selected", selected);
      item.append(button);
      return item;
    }),
  );
  emptyResult.hidden = candidates.length > 0;
}

function candidateKey(candidate) {
  return candidate ? `${candidate.seed}:${candidate.counter}` : "";
}

function updateProgress() {
  const checked = workerProgress.reduce((sum, worker) => sum + worker.checked, 0);
  const total = workerProgress.reduce((sum, worker) => sum + worker.total, 0);
  const percent = total === 0 ? 0 : (checked / total) * 100;
  progressBar.style.width = `${percent}%`;
  progressValue.textContent = `${percent.toFixed(2)}%`;
  checkedValue.textContent = checked.toLocaleString("ja-JP");
  updateElapsed();
}

function updateElapsed() {
  if (!startedAt) return;
  elapsedValue.textContent = `${((performance.now() - startedAt) / 1000).toFixed(1)}秒`;
}

function finishComplete() {
  updateProgress();
  progressBar.style.width = "100%";
  progressValue.textContent = "100.00%";
  statusText.textContent = "完了";
  statusText.className = "status-pill complete";
  if (foundCandidates.size === 0) {
    const start = lastSearchConfig?.counterStart;
    const end = lastSearchConfig?.counterEnd;
    const range = Number.isSafeInteger(start) && Number.isSafeInteger(end)
      ? `${start.toLocaleString("ja-JP")}〜${end.toLocaleString("ja-JP")}`
      : "指定範囲";
    emptyResult.textContent = `候補を特定できませんでした。入力内容が正しい場合、現在の復元ボーナスカウンターが探索範囲（${range}）の外にある可能性があります。これまでこのセーブデータで復元ボーナスを抽選した、おおよその累計回数が含まれるように範囲を変更して、もう一度お試しください。`;
  }
  if (foundCandidates.size === 1) {
    const [candidate] = foundCandidates.values();
    void selectCandidate(candidate);
  }
  cleanupAfterRun();
}

function finishCancelled() {
  if (activeWorkers.length === 0) return;
  cancelled = true;
  activeWorkers.forEach((worker) => worker.postMessage({ type: "cancel" }));
  statusText.textContent = "中止";
  statusText.className = "status-pill";
  cleanupAfterRun();
}

function finishWithError(message) {
  cancelled = true;
  const impossibleObservation = /Gogma observation (\d+) violates the game's bonus limits/.exec(message);
  const detail = impossibleObservation
    ? `抽選${impossibleObservation[1]}の5枠がゲーム内の復元ボーナス上限に合いません。入力内容を確認してください。`
    : message;
  showError(`探索を開始できませんでした: ${detail}`);
  statusText.textContent = "エラー";
  statusText.className = "status-pill";
  cleanupAfterRun();
}

function cleanupAfterRun() {
  window.clearInterval(elapsedTimer);
  elapsedTimer = null;
  updateElapsed();
  setRunning(false);
  stopWorkers();
}

function stopWorkers() {
  activeWorkers.forEach((worker) => worker.terminate());
  activeWorkers = [];
}

function resetResults() {
  foundCandidates = new Map();
  candidateList.replaceChildren();
  emptyResult.hidden = false;
  candidateValue.textContent = "0";
  checkedValue.textContent = "0";
  progressValue.textContent = "0.00%";
  elapsedValue.textContent = "0.0秒";
  progressBar.style.width = "0%";
}

async function selectCandidate(candidate) {
  if (!lastSearchConfig) return;

  // スキルカウンターは復元カウンターとは別なので、基準seedが同じなら消さない（seedが変わったときだけ消える）
  setStateFromBonus(candidate.seed, candidate.counter, "検索結果");
  predictionOrigin.textContent = "0";
  predictionWeaponSelect.value = String(lastSearchConfig.weaponType);
  predictionAttributeSelect.value = String(lastSearchConfig.attributeForce);
  comparisonWeaponSelect.value = String(lastSearchConfig.weaponType);
  comparisonAttributeSelect.value = String(lastSearchConfig.attributeForce);
  skillWeaponSelect.value = String(lastSearchConfig.weaponType);
  skillAttributeSelect.value = String(lastSearchConfig.attributeForce);
  const searchTarget = {
    weaponType: lastSearchConfig.weaponType,
    attributeForce: lastSearchConfig.attributeForce,
    label: "",
  };
  if (
    comparisonTargets.length < MAX_REGISTERED_TARGETS &&
    !comparisonTargets.some(
      (target) => comparisonCombinationKey(target) === comparisonCombinationKey(searchTarget),
    )
  ) {
    comparisonTargets.push({
      ...searchTarget,
      id: createTargetId(),
      keepCategories: [null, null, null, null, null],
      keepSource: null,
    });
  }
  renderComparisonTargets();
  persistAppState();
  renderPredictionFilters();
  updatePredictionPoolNote();
  predictionPanel.hidden = false;
  renderCandidates();
  await Promise.all([refreshPredictions(), refreshComparisonPredictions()]);
  setActiveTab("bonus-future");
}

function loadJsonObject(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

// 「強化段階を区別しない」ときは武器種ごとの希望ボーナス（系統の数）を、
// 区別するときはII・III・EXまで指定した希望を、武器種ごとに呼び出す
function detailFilterValuesFor(weaponType) {
  if (predictionIgnoreTier.checked) {
    const wish = bonusWishFor(weaponType);
    if (wish.mode === "slots") {
      return activeWishSlots(wish).filter((slot) => slot.c >= 0).map((slot) => slot.c);
    }
    return wish.counts
      .flatMap((count, category) => Array.from({ length: count }, () => category))
      .slice(0, 5);
  }
  const saved = detailTierWishes[weaponType];
  return Array.isArray(saved) ? saved : [];
}

function saveDetailFilters() {
  const weaponType = Number(predictionWeaponSelect.value);
  const values = snapshotPredictionFilters().filter((value) => value !== null);
  if (predictionIgnoreTier.checked) {
    const counts = [0, 0, 0, 0];
    for (const category of values) counts[category] += 1;
    // ここで決めた希望は「系統の数」として保存する（5枠指定の中身は残しておく）
    const slots = bonusWishes[weaponType]?.slots;
    if (counts.some((count) => count > 0) || slots) bonusWishes[weaponType] = { mode: "counts", counts, slots };
    else delete bonusWishes[weaponType];
    persistBonusWishes();
    renderBonusWishSection();
    renderComparisonTable();
    return;
  }
  if (values.length > 0) detailTierWishes[weaponType] = values;
  else delete detailTierWishes[weaponType];
  try {
    localStorage.setItem(DETAIL_TIER_WISHES_KEY, JSON.stringify(detailTierWishes));
  } catch {
    // The app remains usable when storage is unavailable.
  }
}

function renderPredictionFilters(values = detailFilterValuesFor(Number(predictionWeaponSelect.value))) {
  const weaponType = Number(predictionWeaponSelect.value);
  const attributeForce = Number(predictionAttributeSelect.value);
  const ignoreTier = predictionIgnoreTier.checked;
  const bonuses = ignoreTier
    ? keepCategoriesForWeapon(weaponType, attributeForce).map(([id, name]) => [
        id,
        name === "装填数" ? "装填" : name,
      ])
    : gogmaBonusesForWeapon(weaponType, attributeForce);

  predictionFilterDescription.textContent = ignoreTier
    ? "「ボーナスをリセットして再復元」で欲しい系統構成を順不同で探します。例：攻撃×4＋斬れ味×1"
    : "Ⅱ・Ⅲ・EXまで含めて、欲しいボーナスを順不同で指定します。";

  predictionFilters.replaceChildren(
    ...Array.from({ length: 5 }, (_, index) => {
      const label = document.createElement("label");
      const text = document.createElement("span");
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      const selectedId = values[index] ?? null;
      const selectedIdIsAvailable = bonuses.some(([id]) => id === selectedId);

      text.textContent = `希望 ${index + 1}`;
      placeholder.value = "";
      placeholder.textContent = "指定なし";
      placeholder.selected = selectedId === null || !selectedIdIsAvailable;
      select.append(placeholder);

      for (const [id, name] of bonuses) {
        const option = document.createElement("option");
        option.value = String(id);
        option.textContent = name;
        option.selected = selectedId === id;
        select.append(option);
      }

      label.append(text, select);
      return label;
    }),
  );
}

function snapshotPredictionFilters() {
  return [...predictionFilters.querySelectorAll("select")].map((select) =>
    select.value === "" ? null : Number(select.value),
  );
}

async function refreshPredictions() {
  if (!selectedCandidate || !lastSearchConfig) return;
  if (bonusPrediction.mode === "keep") {
    predictionRolls = [];
    predictionRows.replaceChildren();
    predictionStatus.textContent = "「ボーナスを同じ構成で再復元」の未来は武器一覧で比較します";
    predictionStatus.className = "status-pill";
    return;
  }

  const requestId = ++predictionRequestId;
  hidePredictionError();
  predictionStatus.textContent = "未来を計算中";
  predictionStatus.className = "status-pill running";

  try {
    const predictionCount = readPredictionCount();
    const weaponType = Number(predictionWeaponSelect.value);
    const attributeForce = Number(predictionAttributeSelect.value);
    const matchesSearchWeapon =
      bonusPrediction.mode === "reset" &&
      weaponType === lastSearchConfig.weaponType &&
      attributeForce === lastSearchConfig.attributeForce;
    const observationCount = lastSearchConfig.observations.length / 5;
    const generatedCount = matchesSearchWeapon
      ? Math.max(predictionCount, observationCount)
      : predictionCount;

    await ensurePredictionWasm();
    const detailTarget = { weaponType, attributeForce, label: "" };
    const flattened = predictBonusRollsForTarget(detailTarget, generatedCount);
    if (requestId !== predictionRequestId) return;

    if (
      matchesSearchWeapon &&
      !flattenedPrefixMatches(flattened, lastSearchConfig.observations)
    ) {
      throw new Error(
        "観測結果と予測の先頭が一致しません。武器種・属性・候補を確認してください。",
      );
    }

    predictionRolls = Array.from({ length: predictionCount }, (_, index) => ({
      index,
      bonusIds: Array.from(flattened.slice(index * 5, index * 5 + 5)),
      observed: matchesSearchWeapon && index < observationCount,
    }));
    renderPredictionTable();
  } catch (error) {
    if (requestId !== predictionRequestId) return;
    predictionRolls = [];
    predictionRows.replaceChildren();
    predictionStatus.textContent = "予測エラー";
    predictionStatus.className = "status-pill";
    showPredictionError(error instanceof Error ? error.message : String(error));
  }
}

function readPredictionCount() {
  const value = Number(predictionCountInput.value);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    throw new Error("表示する回数は1〜10,000の整数で入力してください。");
  }
  return value;
}

async function ensurePredictionWasm() {
  predictionWasmReady ??= initWasm();
  await predictionWasmReady;
}

function predictBonusRollsForTarget(target, count) {
  const common = [
    selectedCandidate.seed,
    target.weaponType,
    target.attributeForce,
    selectedCandidate.counter,
    lastSearchConfig?.counterGate ?? 35,
    count,
  ];
  if (bonusPrediction.mode === "reset") return predict_gogma_rolls(...common);
  return predict_gogma_keep_rolls(
    ...common,
    new Uint8Array(requireTargetKeepCategories(target)),
  );
}

function bonusCategoryId(bonusId) {
  if ([8, 12, 15].includes(bonusId)) return 0;
  if ([9, 13, 16].includes(bonusId)) return 1;
  if ([11, 14].includes(bonusId)) return 2;
  if ([6, 10].includes(bonusId)) return 3;
  throw new Error(`未対応の復元ボーナスIDです: ${bonusId}`);
}

async function beginKeepOptimization(target, bonusIds, completedRolls) {
  if (saveState.baseSeed === null || saveState.bonusCounter === null) return;
  let profile = target.id
    ? comparisonTargets.find((candidate) => candidate.id === target.id)
    : comparisonTargets.find(
        (candidate) => comparisonCombinationKey(candidate) === comparisonCombinationKey(target),
      );
  if (!profile) {
    if (comparisonTargets.length >= MAX_REGISTERED_TARGETS) {
      showComparisonError(`EX厳選へ引き継ぐには、登録武器を${MAX_REGISTERED_TARGETS}件未満にしてください。`);
      return;
    }
    profile = {
      ...target,
      id: createTargetId(),
      label: target.label ?? "",
      keepCategories: [null, null, null, null, null],
      keepSource: null,
    };
    comparisonTargets.push(profile);
  }
  profile.keepCategories = bonusIds.map(bonusCategoryId);
  profile.keepSource = `${completedRolls}回先のリセット結果`;
  bonusPrediction.mode = "keep";

  const nextCounter = saveState.bonusCounter + completedRolls;
  if (!isValidCounter(nextCounter)) return;
  setStateFromBonus(saveState.baseSeed, nextCounter, "予測結果");
  lastSearchConfig = {
    weaponType: profile.weaponType,
    attributeForce: profile.attributeForce,
    counterGate: 35,
    observations: [],
  };
  predictionWeaponSelect.value = String(profile.weaponType);
  predictionAttributeSelect.value = String(profile.attributeForce);
  predictionOrigin.textContent = "0";
  renderComparisonTargets();
  renderBonusOperation();
  renderPredictionFilters();
  updatePredictionPoolNote();
  bonusStateMessage.textContent = `${comparisonTargetName(profile)}の${completedRolls}回先を採用した状態へ進み、「ボーナスを同じ構成で再復元」のEX厳選に切り替えました。`;
  await Promise.all([refreshPredictions(), refreshComparisonPredictions()]);
  setActiveTab("bonus-future");
}

function flattenedPrefixMatches(actual, expected) {
  if (actual.length < expected.length) return false;
  return expected.every((value, index) => actual[index] === value);
}

function renderPredictionTable() {
  if (!selectedCandidate) return;

  const requirements = snapshotPredictionFilters().filter((value) => value !== null);
  const matchedRolls = predictionRolls.filter((roll) =>
    rollContainsRequirements(roll.bonusIds, requirements),
  );
  const visibleRolls =
    requirements.length > 0 && predictionMatchesOnly.checked ? matchedRolls : predictionRolls;

  if (requirements.length === 0) {
    predictionStatus.textContent = `${predictionRolls.length.toLocaleString("ja-JP")}回を表示`;
  } else {
    predictionStatus.textContent = `${predictionRolls.length.toLocaleString("ja-JP")}回中 ${matchedRolls.length.toLocaleString("ja-JP")}回一致`;
  }
  predictionStatus.className = "status-pill complete";
  renderDetailPredictionHeader();

  if (visibleRolls.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "prediction-empty";
    cell.textContent = "指定した構成は表示範囲内にありません。表示回数を増やしてください。";
    row.append(cell);
    predictionRows.replaceChildren(row);
    return;
  }

  predictionRows.replaceChildren(
    ...visibleRolls.map((roll) => createPredictionRow(roll, requirements)),
  );
}

function rollContainsRequirements(bonusIds, requirements) {
  const remaining = new Map();
  for (const bonusId of bonusIds) {
    const value = predictionIgnoreTier.checked ? bonusCategoryId(bonusId) : bonusId;
    remaining.set(value, (remaining.get(value) ?? 0) + 1);
  }
  for (const requiredId of requirements) {
    const count = remaining.get(requiredId) ?? 0;
    if (count === 0) return false;
    remaining.set(requiredId, count - 1);
  }
  return true;
}

function createPredictionRow(roll, requirements) {
  const weaponType = Number(predictionWeaponSelect.value);
  const row = document.createElement("tr");
  const offsetCell = document.createElement("th");
  const matches = requirements.length > 0 && rollContainsRequirements(roll.bonusIds, requirements);

  row.classList.toggle("prediction-match", matches);
  row.classList.toggle("prediction-observed", roll.observed);
  offsetCell.scope = "row";
  offsetCell.textContent = `${roll.index + 1}回先`;
  if (roll.observed) {
    const badge = document.createElement("span");
    badge.className = "observed-badge";
    badge.textContent = "実測一致";
    offsetCell.append(badge);
  }
  row.append(offsetCell);
  // スキル未来予測と同じく、保存後の状態は小さく表示する
  row.append(createSavedStateCell("bonus", roll.index + 1, null, true));

  const matchCell = document.createElement("td");
  matchCell.className = "detail-match-cell";
  if (matches) {
    const badge = document.createElement("span");
    badge.className = "detail-match-badge";
    badge.textContent = "★ 一致";
    matchCell.append(badge);
  } else {
    const none = document.createElement("span");
    none.className = "skill-match-none";
    none.textContent = "—";
    matchCell.append(none);
  }
  row.append(matchCell);

  const resultCell = document.createElement("td");
  resultCell.className = "detail-result-cell";
  const tags = document.createElement("div");
  tags.className = "detail-bonus-set";
  for (const bonusId of roll.bonusIds) {
    const tag = document.createElement("span");
    tag.className = `bonus-tag ${bonusClassName(bonusId)}${EX_BONUS_IDS.has(bonusId) ? " ex" : ""}`;
    tag.textContent = gogmaBonusName(weaponType, bonusId);
    tags.append(tag);
  }
  resultCell.append(tags);
  resultCell.append(createAdoptAsOwnedButton(
    { weaponType, attributeForce: Number(predictionAttributeSelect.value) },
    roll.bonusIds,
    roll.index + 1,
  ));
  row.append(resultCell);

  return row;
}

function renderDetailPredictionHeader() {
  const table = predictionRows.closest("table");
  const headerRow = table?.querySelector("thead tr");
  if (!headerRow) return;
  table.classList.add("detail-compact-table");
  headerRow.replaceChildren(...["何回先", "保存後の状態", "一致", "5枠の結果"].map((label) => {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = label;
    return header;
  }));
}

function createSavedStateCell(kind, completedRolls, keepTransition = null, compact = false) {
  const cell = document.createElement("td");
  const counterLabel = document.createElement("span");
  const counterValue = document.createElement("strong");
  const actions = document.createElement("div");
  const adoptButton = document.createElement("button");
  const isBonus = kind === "bonus";
  const currentCounter = isBonus ? saveState.bonusCounter : saveState.skillCounter;
  const nextCounter = currentCounter === null ? null : currentCounter + completedRolls;
  const code = isBonus
    ? selectedCandidate ? formatGogmaContinuationCode(selectedCandidate, completedRolls) : null
    : formatSkillContinuationCode(completedRolls);

  cell.className = `continuation-code-cell saved-state-cell${compact ? " compact-state" : ""}`;
  counterLabel.textContent = compact
    ? isBonus ? "復元" : "スキル"
    : isBonus ? "保存後の復元ボーナスカウンター" : "保存後のスキルカウンター";
  counterValue.textContent = nextCounter === null ? "未特定" : nextCounter.toLocaleString("ja-JP");
  actions.className = "saved-state-actions";

  if (code) {
    const codeButton = document.createElement("button");
    codeButton.type = "button";
    codeButton.className = "continuation-code-button";
    codeButton.textContent = compact ? "コード" : code;
    codeButton.title = t(`セーブ状態コードをコピー: ${code}`);
    codeButton.addEventListener("click", () => void useContinuationCode(code));
    actions.append(codeButton);
  }

  adoptButton.type = "button";
  adoptButton.className = "adopt-position-button";
  adoptButton.textContent = compact ? "ここを0にする" : "この位置を新しい0にする";
  adoptButton.addEventListener("click", () => {
    if (isBonus) void adoptBonusPosition(completedRolls);
    else void adoptSkillPosition(completedRolls);
  });
  actions.append(adoptButton);
  if (isBonus && keepTransition) {
    const keepButton = document.createElement("button");
    keepButton.type = "button";
    keepButton.className = "keep-transition-button";
    keepButton.textContent = "この構成でEX厳選へ";
    keepButton.addEventListener("click", () => void beginKeepOptimization(
      keepTransition.target,
      keepTransition.bonusIds,
      completedRolls,
    ));
    actions.append(keepButton);
  }
  cell.append(counterLabel, counterValue, actions);
  return cell;
}

async function adoptBonusPosition(completedRolls) {
  if (saveState.baseSeed === null || saveState.bonusCounter === null) return;
  const nextCounter = saveState.bonusCounter + completedRolls;
  if (!isValidCounter(nextCounter)) return;
  setStateFromBonus(saveState.baseSeed, nextCounter, "予測結果");
  lastSearchConfig = {
    weaponType: Number(predictionWeaponSelect.value),
    attributeForce: Number(predictionAttributeSelect.value),
    counterGate: 35,
    observations: [],
  };
  predictionOrigin.textContent = "0";
  bonusStateMessage.textContent = `復元ボーナスカウンター${nextCounter.toLocaleString("ja-JP")}を新しい0地点にしました。`;
  await Promise.all([
    refreshPredictions(),
    refreshComparisonPredictions(),
    saveState.skillCounter === null ? Promise.resolve() : refreshSkillPredictions(),
  ]);
  setActiveTab("bonus-future");
}

async function adoptSkillPosition(completedRolls) {
  if (saveState.baseSeed === null || saveState.skillCounter === null) return;
  const nextCounter = saveState.skillCounter + completedRolls;
  if (!isValidCounter(nextCounter)) return;
  setStateFromSkill(saveState.baseSeed, nextCounter, "予測結果");
  currentSkillObservations = [];
  skillObservedCount = 0;
  skillStateMessage.textContent = `スキルカウンター${nextCounter.toLocaleString("ja-JP")}を新しい0地点にしました。`;
  await Promise.all([
    refreshSkillPredictions(),
    selectedCandidate ? refreshPredictions() : Promise.resolve(),
    selectedCandidate ? refreshComparisonPredictions() : Promise.resolve(),
  ]);
  setActiveTab("skill-future");
}

function bonusClassName(bonusId) {
  if ([8, 12, 15].includes(bonusId)) return "attack";
  if ([9, 13, 16].includes(bonusId)) return "affinity";
  if ([11, 14].includes(bonusId)) return "element";
  return "sharpness-ammo";
}

async function addComparisonTarget() {
  hideComparisonError();
  const target = {
    weaponType: Number(comparisonWeaponSelect.value),
    attributeForce: Number(comparisonAttributeSelect.value),
    label: comparisonTargetLabelInput.value.trim(),
  };
  if (!registerTarget(target, showComparisonError, bonusPrediction.mode === "keep")) return;
  comparisonTargetLabelInput.value = "";
  await Promise.all([refreshComparisonPredictions(), refreshSkillPredictions()]);
}

async function addSkillTarget() {
  hideSkillTargetError();
  const target = {
    weaponType: Number(skillTargetWeaponSelect.value),
    attributeForce: Number(skillTargetAttributeSelect.value),
    label: skillTargetLabelInput.value.trim(),
  };
  if (!registerTarget(target, showSkillTargetError, false)) return;
  skillTargetLabelInput.value = "";
  await Promise.all([refreshComparisonPredictions(), refreshSkillPredictions()]);
}

function registerTarget(target, showError, allowDuplicateCombination) {
  const duplicateCombination = comparisonTargets.filter(
    (existing) => comparisonCombinationKey(existing) === comparisonCombinationKey(target),
  );
  if (duplicateCombination.length > 0 && !allowDuplicateCombination) {
    showError("この武器種・属性は登録済みです。EX未厳選の別武器は「ボーナスを同じ構成で再復元」を選んでから登録してください。");
    return false;
  }
  if (duplicateCombination.length > 0 && !target.label) {
    showError("同じ武器種・属性の別武器には、区別できる表示名を入力してください。");
    return false;
  }
  if (
    target.label &&
    comparisonTargets.some((existing) => existing.label && existing.label === target.label)
  ) {
    showError("同じ表示名が登録済みです。別の名前を入力してください。");
    return false;
  }
  if (comparisonTargets.length >= MAX_REGISTERED_TARGETS) {
    showError(`予測対象は最大${MAX_REGISTERED_TARGETS}件です。不要な武器を削除してください。`);
    return false;
  }
  comparisonTargets.push({
    ...target,
    id: createTargetId(),
    keepCategories: [null, null, null, null, null],
    keepSource: null,
  });
  renderComparisonTargets();
  persistAppState();
  return true;
}

function comparisonTargetKey(target) {
  return target.id;
}

function comparisonCombinationKey(target) {
  return `${target.weaponType}:${target.attributeForce}`;
}

function uniqueTargetsByCombination(targets = comparisonTargets) {
  const unique = new Map();
  for (const target of targets) {
    const key = comparisonCombinationKey(target);
    if (!unique.has(key)) unique.set(key, target);
  }
  return [...unique.values()];
}

function optionName(options, value) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? String(value);
}

function comparisonTargetName(target) {
  if (target.label) return target.label;
  const weapon = optionName(WEAPON_TYPES, target.weaponType);
  const attributeName = optionName(ATTRIBUTES, target.attributeForce);
  return localizedTargetName(weapon, attributeName);
}

// 「片手剣・毒」のように武器種と属性を並べた文字
function weaponAndAttributeText(target) {
  const weapon = t(optionName(WEAPON_TYPES, target.weaponType));
  const attribute = t(optionName(ATTRIBUTES, target.attributeForce)).replace("属性", "");
  return `${weapon}・${attribute}`;
}

// 表示用の名前：［片手剣・毒］の札 ＋ 登録名（登録名があるときだけ）
function createWeaponBadge(target) {
  const badge = document.createElement("span");
  badge.className = "weapon-badge";
  badge.textContent = weaponAndAttributeText(target);
  if (!target.label) return [badge];
  const label = document.createElement("span");
  label.className = "target-label-text";
  label.textContent = target.label;
  label.title = target.label;
  return [badge, label];
}

// 文章用：「片手剣・毒「【攻撃激化】毒」」
function targetNameWithWeapon(target) {
  const base = weaponAndAttributeText(target);
  return target.label ? `${base}「${target.label}」` : base;
}

function predictionCsvTargetName(target) {
  const weapon = optionName(WEAPON_TYPES, target.weaponType);
  const attribute = optionName(ATTRIBUTES, target.attributeForce);
  const kind = target.kind === "owned" ? ` / 手持ち・同じ構成 ${ownedLayoutText(target)}` : "";
  return `${comparisonTargetName(target)} (${t(weapon)} / ${t(attribute)}${kind})`;
}

function downloadCsv(filename, headers, rows) {
  const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderComparisonTargets() {
  const createItems = (targets) => targets.map((target) => {
      const item = document.createElement("span");
      const text = document.createElement("span");
      const removeButton = document.createElement("button");
      item.className = "comparison-target";
      text.textContent = comparisonTargetName(target);
      removeButton.type = "button";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", t(`${comparisonTargetName(target)}を比較対象から削除`));
      removeButton.addEventListener("click", () => {
        comparisonTargets = comparisonTargets.filter(
          (candidate) => comparisonTargetKey(candidate) !== comparisonTargetKey(target),
        );
        renderComparisonTargets();
        persistAppState();
        void Promise.all([refreshComparisonPredictions(), refreshSkillPredictions()]);
      });
      item.append(text, removeButton);
      return item;
    });
  comparisonTargetList.replaceChildren(...createItems(comparisonTargets));
  skillTargetList.replaceChildren(...createItems(uniqueTargetsByCombination()));
  clearComparisonTargetsButton.disabled = comparisonTargets.length === 0;
  clearSkillTargetsButton.disabled = comparisonTargets.length === 0;
  renderKeepLayoutInputs();
  updateComparisonStatus();
  renderWeaponFilterSection();
  renderBonusWishSection();
  updateRegisteredListTitles();
}

function readComparisonCount() {
  const value = Number(comparisonCountInput.value);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    throw new Error("比較表の表示回数は1〜10,000の整数で入力してください。");
  }
  return value;
}

async function refreshComparisonPredictions() {
  const requestId = ++comparisonRequestId;
  hideComparisonError();

  const usableOwned = ownedWeapons.filter((weapon) => ownedWeaponProblem(weapon) === null);
  if (!selectedCandidate || (comparisonTargets.length === 0 && usableOwned.length === 0)) {
    comparisonRollSets = [];
    renderComparisonTable();
    return;
  }

  comparisonStatus.textContent = "比較表を計算中";
  comparisonStatus.className = "status-pill running";

  try {
    const count = readComparisonCount();
    await ensurePredictionWasm();
    const toRolls = (flattened) => Array.from({ length: count }, (_, index) =>
      Array.from(flattened.slice(index * 5, index * 5 + 5)));
    const nextRollSets = [
      // 狙い：リセットして再復元
      ...uniqueTargetsByCombination().map((target) => ({
        ...target,
        kind: "reset",
        rolls: toRolls(predict_gogma_rolls(
          selectedCandidate.seed, target.weaponType, target.attributeForce,
          selectedCandidate.counter, lastSearchConfig?.counterGate ?? 35, count,
        )),
      })),
      // 手持ち武器：同じ構成で再復元
      ...usableOwned.map((weapon) => ({
        ...weapon,
        kind: "owned",
        rolls: toRolls(predict_gogma_keep_rolls(
          selectedCandidate.seed, weapon.weaponType, weapon.attributeForce,
          selectedCandidate.counter, lastSearchConfig?.counterGate ?? 35, count,
          new Uint8Array(weapon.categories),
        )),
      })),
    ];
    if (requestId !== comparisonRequestId) return;
    comparisonRollSets = nextRollSets;
    comparisonRowLimit = COMPARISON_PAGE_SIZE;
    renderComparisonTable();
  } catch (error) {
    if (requestId !== comparisonRequestId) return;
    comparisonRollSets = [];
    renderComparisonTable();
    showComparisonError(error instanceof Error ? error.message : String(error));
  }
}

function comparisonPredictionVisibility() {
  if (comparisonRollSets.length === 0) {
    return { count: 0, minimumExCount: Number(bonusExFilterCountSelect.value), visibleIndices: [] };
  }

  const count = comparisonRollSets[0].rolls.length;
  const minimumExCount = Number(bonusExFilterCountSelect.value);
  const rowMeetsExThreshold = (index) => comparisonRollSets.some((target) =>
    target.rolls[index].filter((bonusId) => EX_BONUS_IDS.has(bonusId)).length >= minimumExCount
  );
  const rowMatchesWish = (index) => comparisonRollSets.some((target) =>
    rollMatchesBonusWish(target, target.rolls[index])
  );
  const wishOnly = !!bonusWishMatchesOnly?.checked;
  const visibleIndices = Array.from({ length: count }, (_, index) => index)
    .filter((index) => !bonusExFilterEnabled.checked || rowMeetsExThreshold(index))
    .filter((index) => !wishOnly || rowMatchesWish(index));
  return { count, minimumExCount, visibleIndices };
}

function renderComparisonTable() {
  if (!selectedCandidate || comparisonRollSets.length === 0) {
    comparisonHeaderRow.replaceChildren();
    comparisonRows.replaceChildren();
    comparisonTableWrap.hidden = true;
    exportBonusCsvButton.disabled = true;
    bonusExportStatus.textContent = "予測結果を表示するとCSVへ出力できます。";
    if (comparisonMoreBar) comparisonMoreBar.hidden = true;
    updateComparisonStatus();
    renderBonusWishSummary();
    updateTableScrollMirrors();
    return;
  }

  const offsetHeader = document.createElement("th");
  const continuationHeader = document.createElement("th");
  offsetHeader.scope = "col";
  offsetHeader.textContent = "何回先";
  continuationHeader.scope = "col";
  continuationHeader.textContent = "保存後の状態";
  const matchHeader = document.createElement("th");
  matchHeader.scope = "col";
  matchHeader.textContent = "一致";
  const showAll = !!showAllComparisonColumns?.checked;
  comparisonTableWrap.querySelector("table")?.classList.toggle("compact-columns", !showAll);
  comparisonHeaderRow.replaceChildren(
    offsetHeader,
    continuationHeader,
    matchHeader,
    ...(showAll ? comparisonRollSets : []).map((target) => {
      const header = document.createElement("th");
      const kind = document.createElement("span");
      header.scope = "col";
      header.className = target.kind === "owned" ? "owned-column-header" : "reset-column-header";
      kind.className = "column-kind";
      kind.textContent = target.kind === "owned" ? "手持ち・同じ構成" : "狙い・リセット";
      header.append(kind, ...createWeaponBadge(target));
      // 見出しを低く保つため、手持ち武器の今のボーナスはマウスを乗せたときだけ出す
      if (target.kind === "owned") header.title = `今のボーナス：${ownedLayoutText(target)}`;
      return header;
    }),
  );

  const { count, minimumExCount, visibleIndices } = comparisonPredictionVisibility();
  // 全武器の列を並べたときは、どの行でも武器が分かるよう「何回先」ごとに見出しの行を入れ直す
  comparisonRows.replaceChildren(
    ...visibleIndices.slice(0, comparisonRowLimit).flatMap((index, position) => {
      const row = createComparisonRow(index);
      if (!showAll || position === 0) return [row];
      const repeatHeader = comparisonHeaderRow.cloneNode(true);
      repeatHeader.removeAttribute("id");
      repeatHeader.className = "repeat-header-row";
      return [repeatHeader, row];
    }),
  );
  renderComparisonMoreBar(visibleIndices.length);
  if (visibleIndices.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3 + (showAll ? comparisonRollSets.length : 0);
    cell.className = "prediction-empty";
    cell.textContent = bonusWishMatchesOnly?.checked
      ? "条件に合う結果は表示範囲内にありません。表示回数を増やすか、条件を変更してください。"
      : `EXが${minimumExCount}個以上の結果は表示範囲内にありません。表示回数を増やすか最低EX数を下げてください。`;
    row.append(cell);
    comparisonRows.replaceChildren(row);
  }
  comparisonTableWrap.hidden = false;
  exportBonusCsvButton.disabled = visibleIndices.length === 0;
  bonusExportStatus.textContent = bonusExFilterEnabled.checked
    ? `EX条件一致で現在表示中の${visibleIndices.length.toLocaleString("ja-JP")}行をCSVへ出力します。`
    : `現在表示中の${visibleIndices.length.toLocaleString("ja-JP")}行をCSVへ出力します。`;
  const resetCount = comparisonRollSets.filter((target) => target.kind !== "owned").length;
  const ownedCount = comparisonRollSets.length - resetCount;
  const filterStatus = bonusExFilterEnabled.checked
    ? `・EX${minimumExCount}個以上 ${visibleIndices.length.toLocaleString("ja-JP")}行`
    : "";
  comparisonStatus.textContent = `狙い${resetCount}・手持ち${ownedCount} × ${count.toLocaleString("ja-JP")}回${filterStatus}`;
  comparisonStatus.className = "status-pill complete";
  renderBonusWishSummary();
  updateTableScrollMirrors();
}

function exportVisibleBonusPredictionsCsv() {
  const { visibleIndices } = comparisonPredictionVisibility();
  if (visibleIndices.length === 0 || comparisonRollSets.length === 0) {
    showComparisonError("CSVへ出力できる復元ボーナス未来予測の結果がありません。");
    return;
  }

  hideComparisonError();
  const headers = [
    t("何回先"),
    t("カウンター位置"),
    "一致",
    ...comparisonRollSets.flatMap((target) => Array.from({ length: 5 }, (_, index) =>
      `${predictionCsvTargetName(target)} ${t(`${index + 1}枠目`)}`
    )),
  ];
  const rows = visibleIndices.map((index) => [
    index + 1,
    saveState.bonusCounter + index + 1,
    comparisonRollSets
      .filter((target) => rollMatchesBonusWish(target, target.rolls[index]))
      .map((target) => comparisonTargetName(target))
      .join(" / "),
    ...comparisonRollSets.flatMap((target) => target.rolls[index].map((bonusId) =>
      t(gogmaBonusName(target.weaponType, bonusId))
    )),
  ]);
  downloadCsv(
    `gogma-bonus-${bonusPrediction.mode}-future-seed-${saveState.baseSeed}-counter-${saveState.bonusCounter}.csv`,
    headers,
    rows,
  );
  bonusExportStatus.textContent = `${rows.length.toLocaleString("ja-JP")}行・${headers.length.toLocaleString("ja-JP")}列をCSVへ出力しました。`;
}

// 横に長い表のための横スクロールバー（表の上と、画面の下にくっつくもの）。表と動きを合わせる
function setupTableScrollMirrors() {
  if (tableScrollMirrors.length > 0) return;
  // 「◀ 左右に動かすと表が横に動きます ▶」の案内つきの枠に入れて、スクロールバーだと分かるようにする
  tableScrollMirrors =["top", "bottom"].map((position) => {
    const holder = document.createElement("div");
    const left = document.createElement("span");
    const right = document.createElement("span");
    const caption = document.createElement("span");
    const mirror = document.createElement("div");
    const inner = document.createElement("div");
    holder.className = `table-scroll-holder ${position}`;
    left.className = "table-scroll-arrow";
    right.className = "table-scroll-arrow";
    left.textContent = "◀";
    right.textContent = "▶";
    caption.className = "table-scroll-caption";
    caption.textContent = "左右に動かすと表が横に動きます";
    mirror.className = "table-scroll-mirror";
    mirror.title = "左右に動かすと表が横に動きます";
    mirror.append(inner);
    // 矢印を押しても横に動く
    left.addEventListener("click", () => { comparisonTableWrap.scrollLeft -= 400; });
    right.addEventListener("click", () => { comparisonTableWrap.scrollLeft += 400; });
    holder.append(caption, left, mirror, right);
    if (position === "top") comparisonTableWrap.before(holder);
    else comparisonTableWrap.after(holder);
    return mirror;
  });
  let syncing = false;
  const syncFrom = (source) => {
    if (syncing) return;
    syncing = true;
    for (const element of [comparisonTableWrap, ...tableScrollMirrors]) {
      if (element !== source) element.scrollLeft = source.scrollLeft;
    }
    syncing = false;
  };
  for (const element of [comparisonTableWrap, ...tableScrollMirrors]) {
    element.addEventListener("scroll", () => syncFrom(element));
  }
  window.addEventListener("resize", () => updateTableScrollMirrors());
}

function updateTableScrollMirrors() {
  const overflowing = !comparisonTableWrap.hidden
    && comparisonTableWrap.scrollWidth > comparisonTableWrap.clientWidth + 2;
  for (const mirror of tableScrollMirrors) {
    mirror.parentElement.hidden = !overflowing;
    mirror.firstElementChild.style.width = `${comparisonTableWrap.scrollWidth}px`;
    mirror.scrollLeft = comparisonTableWrap.scrollLeft;
  }
}

// 表の下の「続きを10回分表示」「すべて表示」
function renderComparisonMoreBar(total) {
  if (!comparisonMoreBar) {
    comparisonMoreBar = document.createElement("div");
    comparisonMoreBar.className = "comparison-more-bar";
    comparisonTableWrap.after(comparisonMoreBar);
  }
  const shown = Math.min(comparisonRowLimit, total);
  const rest = total - shown;
  const status = document.createElement("span");
  status.className = "comparison-more-status";
  status.textContent = `${total.toLocaleString("ja-JP")}行中 ${shown.toLocaleString("ja-JP")}行を表示中`;
  if (rest <= 0) {
    comparisonMoreBar.replaceChildren(status);
    comparisonMoreBar.hidden = total === 0;
    return;
  }
  const more = document.createElement("button");
  more.type = "button";
  more.className = "secondary small-button";
  more.textContent = `続きを${Math.min(COMPARISON_PAGE_SIZE, rest)}回分表示（残り${rest.toLocaleString("ja-JP")}回）`;
  more.addEventListener("click", () => {
    comparisonRowLimit += COMPARISON_PAGE_SIZE;
    renderComparisonTable();
  });
  const all = document.createElement("button");
  all.type = "button";
  all.className = "text-button";
  all.textContent = "すべて表示";
  all.addEventListener("click", () => {
    comparisonRowLimit = Infinity;
    renderComparisonTable();
  });
  comparisonMoreBar.replaceChildren(status, more, all);
  comparisonMoreBar.hidden = false;
}

function createComparisonRow(index) {
  const row = document.createElement("tr");
  const offsetCell = document.createElement("th");

  offsetCell.scope = "row";
  offsetCell.textContent = `${index + 1}回先`;
  if (bonusExFilterEnabled.checked) row.classList.add("prediction-match");
  row.append(offsetCell, createSavedStateCell("bonus", index + 1, null, true));

  // 希望ボーナスに一致した武器を左側の「一致」列にまとめる。
  // 見分けやすいよう、上＝狙い（リセット）、下＝手持ちの強化（同じ構成）に分ける
  const matchCell = document.createElement("td");
  matchCell.className = "bonus-match-cell";
  const matchSplit = document.createElement("div");
  matchSplit.className = "match-split";
  const createMatchHalf = (kind, labelText) => {
    const half = document.createElement("div");
    half.className = `match-half ${kind}`;
    const label = document.createElement("div");
    label.className = "match-half-label";
    label.textContent = labelText;
    // 並べ方（2武器で1段など）を変えやすいよう、一致した武器は入れ物に入れる
    const items = document.createElement("div");
    items.className = "match-items";
    half.append(label, items);
    matchSplit.append(half);
    return { half, items };
  };
  const resetHalf = createMatchHalf("reset", "狙い（リセット）");
  const ownedHalf = createMatchHalf("owned", "手持ちの強化（同じ構成）");
  matchCell.append(matchSplit);
  row.append(matchCell);

  const showAll = !!showAllComparisonColumns?.checked;
  for (const target of comparisonRollSets) {
    const cell = document.createElement("td");
    const bonusSet = createCompactBonusSet(target, target.rolls[index]);
    if (rollMatchesBonusWish(target, target.rolls[index])) {
      cell.classList.add("bonus-wish-hit");
      const item = document.createElement("div");
      const name = document.createElement("div");
      item.className = "skill-match-item";
      name.className = "skill-match-name";
      const kindBadge = document.createElement("span");
      kindBadge.className = `match-kind-badge ${target.kind === "owned" ? "owned" : "reset"}`;
      kindBadge.textContent = target.kind === "owned" ? "手持ちの強化" : "狙い";
      name.append(kindBadge, ...createWeaponBadge(target));
      // 「一致」列だけで操作できるよう、採用ボタンもここに付ける
      const matchButton = target.kind === "owned"
        ? createAdoptOwnedUpdateButton(target, target.rolls[index], index + 1)
        : createAdoptAsOwnedButton(target, target.rolls[index], index + 1);
      matchButton.classList.add("match-adopt-button");
      item.append(name, createCompactBonusSet(target, target.rolls[index], true), matchButton);
      (target.kind === "owned" ? ownedHalf : resetHalf).items.append(item);
    }
    if (!showAll) continue;
    if (target.kind === "owned") {
      cell.classList.add("owned-result-cell");
      bonusSet.append(createAdoptOwnedUpdateButton(target, target.rolls[index], index + 1));
    } else {
      bonusSet.append(createAdoptAsOwnedButton(target, target.rolls[index], index + 1));
    }
    cell.classList.add("comparison-result-cell");
    cell.append(bonusSet);
    row.append(cell);
  }

  const hasReset = resetHalf.items.childElementCount > 0;
  const hasOwned = ownedHalf.items.childElementCount > 0;
  if (!hasReset && !hasOwned) {
    const none = document.createElement("span");
    none.className = "skill-match-none";
    none.textContent = "—";
    matchCell.replaceChildren(none);
  } else {
    // 片方だけ一致したときは、空いた側を出さない
    if (!hasReset) resetHalf.half.classList.add("empty");
    if (!hasOwned) ownedHalf.half.classList.add("empty");
    row.classList.add("prediction-match", "bonus-wish-row-hit");
  }
  return row;
}

function createCompactBonusSet(target, bonusIds, highlightWish = false) {
  const bonusSet = document.createElement("div");
  bonusSet.className = "comparison-bonus-set";
  // 手持ち武器は、今のボーナスと枠ごとに比べて ↑（上がる）／↓（下がる）を付ける
  const current = target.kind === "owned" && ownedBonusesKnown(target) ? target.bonuses : null;
  // 狙い（リセット）は、希望の系統に当てはまる枠を強調し、それ以外を薄くする
  const wish = highlightWish && target.kind !== "owned" ? bonusWishFor(target.weaponType) : null;
  const need = wish && wish.mode === "counts" ? [...wish.counts] : null;
  const slotUsed = wish && wish.mode === "slots" ? slotWishAssignment(wish, bonusIds).used : null;
  bonusIds.forEach((bonusId, slotIndex) => {
    const tag = document.createElement("span");
    tag.className = `bonus-tag compact ${bonusClassName(bonusId)}${EX_BONUS_IDS.has(bonusId) ? " ex" : ""}`;
    tag.textContent = compactGogmaBonusName(target.weaponType, bonusId);
    if (slotUsed) {
      tag.classList.add(slotUsed.has(slotIndex) ? "wish-part" : "not-wish");
    } else if (need) {
      const category = bonusCategoryId(bonusId);
      if (need[category] > 0) {
        need[category] -= 1;
        tag.classList.add("wish-part");
      } else {
        tag.classList.add("not-wish");
      }
    }
    if (current) {
      const diff = bonusTierRank(bonusId) - bonusTierRank(current[slotIndex]);
      if (diff !== 0) {
        const arrow = document.createElement("span");
        arrow.className = diff > 0 ? "tier-up" : "tier-down";
        arrow.textContent = diff > 0 ? "↑" : "↓";
        tag.append(arrow);
      }
    }
    bonusSet.append(tag);
  });
  return bonusSet;
}

// 同じ系統の中での段階（II・斬れ味強化・属性II＜III＜EX）
function bonusTierRank(bonusId) {
  if ([15, 16, 14, 10].includes(bonusId)) return 3;
  if ([12, 13].includes(bonusId)) return 2;
  return 1;
}

function ownedBonusesKnown(weapon) {
  return Array.isArray(weapon.bonuses) && weapon.bonuses.every((bonusId) => bonusId !== null);
}

// 手持ち武器の判定。「同じ構成で再復元」は枠ごとの系統が変わらないので、枠ごとに段階を比べられる
function ownedRollMatches(weapon, bonusIds) {
  if (weapon.rule === "ex" || !ownedBonusesKnown(weapon)) {
    return weapon.rule === "ex" && weapon.minEx > 0
      && bonusIds.filter((bonusId) => EX_BONUS_IDS.has(bonusId)).length >= weapon.minEx;
  }
  const diffs = bonusIds.map((bonusId, slotIndex) =>
    bonusTierRank(bonusId) - bonusTierRank(weapon.bonuses[slotIndex]));
  if (weapon.rule === "total") return diffs.reduce((sum, diff) => sum + diff, 0) > 0;
  return diffs.every((diff) => diff >= 0) && diffs.some((diff) => diff > 0);
}

function ownedRuleText(weapon) {
  if (weapon.rule === "ex") return `EX ${weapon.minEx}個以上`;
  if (!ownedBonusesKnown(weapon)) return "今のボーナスを入れると判定できます";
  return weapon.rule === "total" ? "合計で今より強い" : "今より強い（上位互換）";
}

function persistBonusWishes() {
  try {
    localStorage.setItem(BONUS_WISHES_KEY, JSON.stringify(bonusWishes));
  } catch {
    // The app remains usable when storage is unavailable.
  }
}

// 希望の持ち方は2通り：mode "counts"＝系統の数（順不同・段階は区別しない）、
// mode "slots"＝5枠を1つずつ（系統 c：-1=何でも、段階 lv：0=問わず／2=III以上／3=EXだけ。並びは順不同）

function normalizeWishSlots(slots) {
  return Array.from({ length: 5 }, (_, index) => {
    const slot = Array.isArray(slots) ? slots[index] : null;
    const c = Math.trunc(Number(slot?.c));
    const lv = Math.trunc(Number(slot?.lv));
    return {
      c: c >= 0 && c <= 3 ? c : -1,
      lv: [0, 2, 3].includes(lv) ? lv : 0,
    };
  });
}

function bonusWishFor(weaponType) {
  const entry = bonusWishes[weaponType];
  return {
    mode: entry?.mode === "slots" ? "slots" : "counts",
    counts: BONUS_WISH_MAX.map((max, category) =>
      Math.max(0, Math.min(max, Math.trunc(Number(entry?.counts?.[category]) || 0)))),
    slots: normalizeWishSlots(entry?.slots),
  };
}

function bonusWishTotal(wish) {
  return wish.counts.reduce((sum, count) => sum + count, 0);
}

// 「何でも・段階は問わず」以外の枠が1つでもあれば、希望ありとみなす
function activeWishSlots(wish) {
  return wish.slots.filter((slot) => slot.c >= 0 || slot.lv > 0);
}

function bonusWishActive(wish) {
  return wish.mode === "slots"
    ? activeWishSlots(wish).length > 0
    : bonusWishTotal(wish) > 0;
}

function bonusFitsSlot(bonusId, slot) {
  return (slot.c < 0 || bonusCategoryId(bonusId) === slot.c) && bonusTierRank(bonusId) >= slot.lv;
}

// 5枠指定の希望と結果の組み合わせ。条件の厳しい枠から順に、結果の枠を1つずつ割り当てる。
// 全部割り当てられたら matched=true。返す used は「希望の枠に当てはまった結果の枠」の番号
function slotWishAssignment(wish, bonusIds) {
  const slots = activeWishSlots(wish)
    .sort((a, b) => (b.lv - a.lv) || ((b.c >= 0) - (a.c >= 0)));
  const taken = new Array(bonusIds.length).fill(false);
  const assign = (slotIndex) => {
    if (slotIndex === slots.length) return true;
    for (let i = 0; i < bonusIds.length; i += 1) {
      if (taken[i] || !bonusFitsSlot(bonusIds[i], slots[slotIndex])) continue;
      taken[i] = true;
      if (assign(slotIndex + 1)) return true;
      taken[i] = false;
    }
    return false;
  };
  if (slots.length > 0 && assign(0)) {
    return { matched: true, used: new Set(taken.flatMap((value, i) => (value ? [i] : []))) };
  }
  // 一致しないときも、当てはまる枠はできるだけ強調する
  taken.fill(false);
  for (const slot of slots) {
    const i = bonusIds.findIndex((bonusId, index) => !taken[index] && bonusFitsSlot(bonusId, slot));
    if (i >= 0) taken[i] = true;
  }
  return { matched: false, used: new Set(taken.flatMap((value, i) => (value ? [i] : []))) };
}

function wishSlotText(weaponType, slot) {
  const categoryName = slot.c < 0
    ? "何でも"
    : (keepCategoriesForWeapon(weaponType, 1).find(([category]) => category === slot.c)?.[1]
      ?? GOGMA_BONUS_CATEGORIES[slot.c][1]);
  if (slot.lv === 3) return `${categoryName}EX`;
  if (slot.lv === 2) return slot.c === 0 || slot.c === 1 ? `${categoryName}III以上` : `${categoryName}EX`;
  return categoryName;
}

// 狙い（リセット）は武器種ごとの希望、手持ち（同じ構成）は武器ごとのEX数
function targetHasWish(target) {
  return target.kind === "owned"
    ? (target.rule === "ex" ? target.minEx > 0 : ownedBonusesKnown(target))
    : bonusWishActive(bonusWishFor(target.weaponType));
}

function targetWishText(target) {
  return target.kind === "owned"
    ? `同じ構成で${ownedRuleText(target)}`
    : `リセットで ${bonusWishText(target.weaponType)}`;
}

function bonusWishText(weaponType) {
  const wish = bonusWishFor(weaponType);
  if (wish.mode === "slots") {
    // 同じ指定はまとめる（例：攻撃EX×2＋攻撃×2＋属性EX）
    const grouped = new Map();
    for (const slot of activeWishSlots(wish)) {
      const text = wishSlotText(weaponType, slot);
      grouped.set(text, (grouped.get(text) ?? 0) + 1);
    }
    const slotParts = [...grouped].map(([text, count]) => (count > 1 ? `${text}×${count}` : text));
    return slotParts.length > 0 ? slotParts.join("＋") : "指定なし";
  }
  const parts = keepCategoriesForWeapon(weaponType, 1)
    .filter(([category]) => wish.counts[category] > 0)
    .map(([category, name]) => `${name}×${wish.counts[category]}`);
  return parts.length > 0 ? parts.join("＋") : "指定なし";
}

// リセット：系統の数（順不同・II/III/EXは区別しない）を満たすか。手持ち：EXの数が最低数以上か
function rollMatchesBonusWish(target, bonusIds) {
  if (target.kind === "owned") return ownedRollMatches(target, bonusIds);
  const wish = bonusWishFor(target.weaponType);
  if (wish.mode === "slots") return slotWishAssignment(wish, bonusIds).matched;
  const total = bonusWishTotal(wish);
  if (total === 0 || total > 5) return false;
  const counts = [0, 0, 0, 0];
  for (const bonusId of bonusIds) counts[bonusCategoryId(bonusId)] += 1;
  return wish.counts.every((need, category) => counts[category] >= need);
}

// 開け閉めする欄の共通処理：初期は閉じる・開閉を覚える・「クリックで開きます」の案内を付ける
function setupCollapsible(details, summary, key, openText = "クリックで設定欄が開きます") {
  details.classList.add("collapsible");
  details.open = openDetailKeys.has(key);
  details.addEventListener("toggle", () => {
    if (details.open) openDetailKeys.add(key);
    else openDetailKeys.delete(key);
  });
  const hint = document.createElement("span");
  hint.className = "collapsible-hint";
  const closed = document.createElement("span");
  const opened = document.createElement("span");
  closed.className = "when-closed";
  opened.className = "when-open";
  closed.textContent = `▶ ${openText}`;
  opened.textContent = "▼ クリックで閉じます";
  hint.append(closed, opened);
  summary.append(hint);
}

// 既にある要素を、開け閉めできる欄で包む
function wrapInCollapsible(element, key, titleText, openText) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const title = document.createElement("span");
  title.className = "collapsible-title";
  title.textContent = titleText;
  summary.append(title);
  element.before(details);
  details.append(summary, element);
  setupCollapsible(details, summary, key, openText);
  return { details, title };
}

function loadBonusView() {
  const saved = loadJsonObject(BONUS_VIEW_KEY);
  return {
    registration: saved.registration === "owned" ? "owned" : "reset",
    matchesOnly: saved.matchesOnly !== false,
    showAllColumns: saved.showAllColumns === true,
    // 手持ち武器の登録欄で直前に選んだもの（次の登録でも同じものを選んだ状態にする）
    ownedForm: saved.ownedForm && typeof saved.ownedForm === "object" ? saved.ownedForm : {},
    // 武器種ごとに使った「種類」（例：弓→貫通、ガンランス→通常）。名前の自動入力の候補にする
    subtypeHistory: saved.subtypeHistory && typeof saved.subtypeHistory === "object" ? saved.subtypeHistory : {},
    // 手持ち武器の一覧の並べ方：manual＝登録した順（↑↓で並び替え）、type＝武器種ごと
    ownedSort: saved.ownedSort === "type" ? "type" : "manual",
  };
}
function persistBonusView(view) {
  try {
    localStorage.setItem(BONUS_VIEW_KEY, JSON.stringify(view));
  } catch {
    // The app remains usable when storage is unavailable.
  }
}
// 画面を「大枠A：登録した武器をまとめて予測（①登録 ②希望 ③結果）」と
// 「大枠B：1つの武器だけを詳しく調べる」に分けて、何の話かを分かりやすくする
function setupComparisonFrames() {
  const section = document.querySelector(".comparison-section");
  if (!section) return;
  section.classList.add("big-frame", "big-frame-main");
  const heading = section.querySelector(".comparison-heading h2, .comparison-heading h3");
  if (heading) heading.textContent = "登録した武器をまとめて予測";

  const createStep = (number, title, description) => {
    const frame = document.createElement("section");
    const header = document.createElement("div");
    const badge = document.createElement("span");
    const titleEl = document.createElement("h3");
    const descriptionEl = document.createElement("p");
    frame.className = "step-frame";
    header.className = "step-frame-header";
    badge.className = "step-frame-number";
    badge.textContent = number;
    titleEl.textContent = title;
    descriptionEl.className = "step-frame-description";
    descriptionEl.textContent = description;
    header.append(badge, titleEl);
    frame.append(header, descriptionEl);
    return frame;
  };

  const step1 = createStep("1", "狙いの武器を登録する",
    "リセットして再復元で狙う武器種・属性を登録します。持っている武器を「同じ構成で再復元」してEXを厳選したいときは、上の「ゲーム内で行う再復元」で「ボーナスを同じ構成で再復元」を選ぶと、手持ち武器の登録欄が開きます。");
  step1.append(...[
    document.querySelector(".comparison-settings"),
    document.querySelector(".comparison-actions"),
    comparisonTargetList,
    comparisonError,
  ].filter(Boolean));

  // 手持ち武器の登録欄は「ゲーム内で行う再復元」の2つのボタンのすぐ下に置く
  const operationSelector = document.querySelector("#bonus-operation-selector");
  if (operationSelector) operationSelector.after(ownedWeaponSection);
  else step1.append(ownedWeaponSection);

  const step2 = createStep("2", "希望ボーナスを決める（狙い）",
    "狙いの武器種ごとに、リセットで欲しいボーナスを決めます（系統の数か、5枠を1つずつ）。手持ち武器の条件は、①の「手持ち武器」の欄で武器ごとに決めます。");
  step2.append(bonusWishSection);

  const step3 = createStep("3", "結果を見る",
    "まず「次の一致」で、どの武器があと何回で希望どおりになるかを確認します。その下の表は、何回先ごとの詳しい結果です。");
  const tableHeading = document.createElement("div");
  tableHeading.className = "step-subheading";
  const tableTitle = document.createElement("h4");
  const tableDescription = document.createElement("p");
  tableTitle.textContent = "回ごとの結果表";
  tableDescription.textContent = "1行が「何回先」の1回分です。「一致」列に、その回に希望どおりになる武器が出ます。採用するときは、その武器の「採用して〜」ボタンか、左の「ここを0にする」を押します。下の設定は、この表の表示を切り替えるものです。";
  tableHeading.append(tableTitle, tableDescription);
  step3.append(...[
    bonusWishSummary,
    tableHeading,
    comparisonTableWrap,
    document.querySelector(".bonus-export-actions"),
    document.querySelector(".comparison-section .adoption-note"),
  ].filter(Boolean));
  const adoptionNote = step3.querySelector(".adoption-note");
  if (adoptionNote) {
    adoptionNote.textContent = "「ここを0にする」は、ゲーム内でその回まで進めてセーブしたときに押します。「採用して手持ちに登録」「採用して手持ちを更新」は、0地点を進めるのと手持ち武器の登録・更新をまとめて行います。";
  }

  const firstStepAnchor = section.querySelector(".prediction-intro") ?? section.querySelector(".comparison-heading");
  firstStepAnchor.after(step1, step2, step3);

  // 登録済みの武器のリストは長くなるので、最初は閉じておく（件数だけ見せる）
  wrapInCollapsible(comparisonTargetList, "registered-list", "登録済みの狙い", "クリックで一覧が開きます");
  wrapInCollapsible(skillTargetList, "skill-registered-list", "登録済みの武器", "クリックで一覧が開きます");
  updateRegisteredListTitles();

  // スキル未来予測タブにも手持ち武器の登録欄を出す（持っているスキルの登録用。最初は閉じる）
  skillOwnedContainer = document.createElement("section");
  skillOwnedContainer.className = "bonus-wish-settings owned-weapon-settings";
  skillOwnedContainer.dataset.ownedWhere = "skill";
  skillTargetList.closest("details")?.after(skillOwnedContainer);
  wrapInCollapsible(skillOwnedContainer, "skill-owned", "手持ち武器（持っているスキルの登録・編集）", "クリックで開きます（06 手持ち武器タブと同じ内容です）");

  // 大枠B：「1条件を詳しく絞り込む」は別の調べ方。普段は閉じておく
  if (detailPredictionSection) {
    detailPredictionSection.classList.add("big-frame", "big-frame-detail");
    const note = document.createElement("p");
    note.className = "big-frame-note";
    note.textContent = "ここは上とは別の調べ方です。登録しなくても、1つの武器種・属性だけを選んで、II・III・EXまで細かく指定して探せます（seed検索の直後に、入力した結果と予測が合っているかの確認にも使えます）。";
    const detailHeading = detailPredictionSection.querySelector(".section-heading") ?? detailPredictionSection.firstElementChild;
    const body = document.createElement("div");
    body.className = "detail-collapsible-body";
    body.append(...[...detailPredictionSection.children].filter((child) => child !== detailHeading));
    detailPredictionSection.append(note, body);
    wrapInCollapsible(body, "detail-section", "1つの武器を細かい条件で調べる", "クリックで開きます");
  }
}

function updateRegisteredListTitles() {
  const resetTitle = comparisonTargetList.closest("details")?.querySelector(".collapsible-title");
  if (resetTitle) resetTitle.textContent = `登録済みの狙い（${comparisonTargets.length}件）`;
  const skillTitle = skillTargetList.closest("details")?.querySelector(".collapsible-title");
  if (skillTitle) skillTitle.textContent = `登録済みの武器（${uniqueTargetsByCombination().length}件）`;
}

// 登録欄の切り替え：「狙い（リセット）」と「手持ち武器（同じ構成）」のどちらか一方だけを出す
// 「ゲーム内で行う再復元」の説明を、手持ち武器の登録欄の開け閉めに合わせて書き直す
function setupRegistrationSwitch() {
  const intro = document.querySelector(".comparison-section .prediction-intro");
  if (intro) {
    intro.textContent = "登録した武器ぜんぶについて、これから何回再復元すると希望のボーナスが出るかを予測します。①で狙いの武器を登録し、②で希望を決めると、③に結果が出ます（上で登録した手持ち武器も③に出ます）。";
  }
  const operationSection = document.querySelector(".bonus-operation-section");
  const description = operationSection?.querySelector("p:not(.step)");
  if (description) {
    description.textContent = "「ボーナスを同じ構成で再復元」を選ぶと、手持ち武器（同じ構成で再復元してEXを厳選する武器）の登録欄が下に開きます。どちらを選んでも、下の結果には狙い（リセット）と手持ち武器（同じ構成）の両方が出ます。";
  }
  renderBonusOperation();
}

// 表のすぐ上に「表示する回数」と表示の切り替えをまとめる
function setupComparisonTableOptions() {
  const view = loadBonusView();
  const bar = document.createElement("div");
  bar.className = "comparison-table-options";
  const countLabel = comparisonCountInput.closest("label");
  if (countLabel) bar.append(countLabel);

  const makeToggle = (text, checked, onChange) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const span = document.createElement("span");
    label.className = "checkbox-label";
    input.type = "checkbox";
    input.checked = checked;
    span.textContent = text;
    input.addEventListener("change", () => onChange(input.checked));
    label.append(input, span);
    bar.append(label);
    return input;
  };
  bonusWishMatchesOnly = makeToggle("表は、希望ボーナスに一致した行だけ表示", view.matchesOnly, (checked) => {
    const next = loadBonusView();
    next.matchesOnly = checked;
    persistBonusView(next);
    renderComparisonTable();
  });
  showAllComparisonColumns = makeToggle("表に、登録した全武器の結果も1列ずつ並べる（横に長くなり、横スクロールで見ます）", view.showAllColumns, (checked) => {
    const next = loadBonusView();
    next.showAllColumns = checked;
    persistBonusView(next);
    renderComparisonTable();
  });
  const countHint = document.createElement("p");
  countHint.className = "comparison-table-options-hint";
  countHint.textContent = "「表示する回数」は、何回先まで予測するかです（上の「次の一致」にも使われます）。";
  bar.append(countHint);
  comparisonTableWrap.before(bar);
  setupTableScrollMirrors();
}

function renderBonusWishSection() {
  if (!bonusWishSection) {
    bonusWishSection = document.createElement("section");
    bonusWishSection.className = "bonus-wish-settings";
    document.querySelector(".bonus-ex-filter-settings")?.after(bonusWishSection);
    bonusWishSummary = document.createElement("div");
    bonusWishSummary.className = "bonus-wish-summary";
    bonusWishSummary.hidden = true;
    comparisonTableWrap.before(bonusWishSummary);
    ownedWeaponSection = document.createElement("section");
    ownedWeaponSection.className = "bonus-wish-settings owned-weapon-settings";
    bonusWishSection.after(ownedWeaponSection);
    // 「EX数で絞り込む」は「一致」＋「一致した行だけ表示」と役割がかぶるので使わない
    const exFilterBox = document.querySelector(".bonus-ex-filter-settings");
    if (exFilterBox) exFilterBox.style.display = "none";
    bonusExFilterEnabled.checked = false;
    setupComparisonFrames();
    setupRegistrationSwitch();
    setupComparisonTableOptions();
  }
  renderOwnedWeaponSection();

  const weaponTypes = [...new Set(comparisonTargets.map((target) => target.weaponType))]
    .sort((a, b) => a - b);

  const intro = document.createElement("div");
  intro.className = "skill-filter-intro";
  const title = document.createElement("strong");
  title.textContent = "狙い（リセットして再復元）の希望ボーナス";
  const description = document.createElement("p");
  description.textContent = "上で登録した武器種ごとに、リセットで欲しいボーナスを決めます（系統の数か、5枠を1つずつ。どちらも順不同）。当たりは表の「一致」列に出ます。設定はこのブラウザに保存されます。";
  intro.append(title, description);

  if (weaponTypes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "weapon-filter-empty";
    empty.textContent = "武器を登録すると、ここに武器種ごとの設定欄が出ます。";
    bonusWishSection.replaceChildren(intro, empty);
    return;
  }

  const rows = weaponTypes.map((weaponType) => {
    const row = document.createElement("details");
    row.className = "weapon-filter-row";

    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.className = "weapon-filter-name";
    name.textContent = t(optionName(WEAPON_TYPES, weaponType));
    const state = document.createElement("span");
    state.className = "weapon-filter-state";
    const updateState = () => {
      state.textContent = bonusWishText(weaponType);
    };
    updateState();
    summary.append(name, state);
    setupCollapsible(row, summary, `bonus-wish:${weaponType}`);

    const wish = bonusWishFor(weaponType);
    const categoryFieldset = document.createElement("fieldset");
    categoryFieldset.className = "bonus-wish-categories";
    const legend = document.createElement("legend");
    legend.textContent = "リセットして再復元で狙う系統の数（5枠中）";
    const categoryGrid = document.createElement("div");
    categoryGrid.className = "bonus-wish-grid";
    const categorySelects = new Map();
    for (const [category, categoryName] of keepCategoriesForWeapon(weaponType, 1)) {
      const label = document.createElement("label");
      const text = document.createElement("span");
      const select = document.createElement("select");
      text.textContent = categoryName;
      populateSelect(
        select,
        Array.from({ length: BONUS_WISH_MAX[category] + 1 }, (_, count) => [count, count === 0 ? "—" : `${count}枠`]),
        wish.counts[category],
      );
      label.append(text, select);
      categoryGrid.append(label);
      categorySelects.set(category, select);
    }
    const total = document.createElement("p");
    total.className = "bonus-wish-total";
    categoryFieldset.append(legend, categoryGrid, total);

    // 指定のしかた：系統の数／5枠を1つずつ
    const modeBox = document.createElement("div");
    modeBox.className = "bonus-wish-mode";
    const modeRadios = [
      ["counts", "系統の数で指定（段階は区別しない）"],
      ["slots", "5枠を1つずつ指定（EX・III以上も指定できる）"],
    ].map(([value, text]) => {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `bonus-wish-mode-${weaponType}`;
      radio.value = value;
      radio.checked = wish.mode === value;
      label.append(radio, text);
      modeBox.append(label);
      return radio;
    });

    // 5枠を1つずつ：系統（何でも／攻撃…）＋段階（問わず／III以上／EXだけ）。並びは順不同
    const slotFieldset = document.createElement("fieldset");
    slotFieldset.className = "bonus-wish-categories";
    const slotLegend = document.createElement("legend");
    slotLegend.textContent = "5枠の希望（並び順は関係なし。いらない枠は「何でも」のまま）";
    const slotList = document.createElement("div");
    slotList.className = "bonus-wish-slots";
    const categoryOptions = [[-1, "何でも"], ...keepCategoriesForWeapon(weaponType, 1)];
    const slotSelects = wish.slots.map((slot, index) => {
      const line = document.createElement("label");
      line.className = "bonus-wish-slot";
      const text = document.createElement("span");
      text.textContent = `${index + 1}枠目`;
      const categorySelect = document.createElement("select");
      populateSelect(categorySelect, categoryOptions, slot.c);
      const levelSelect = document.createElement("select");
      // III があるのは攻撃・会心だけ。属性・斬れ味・何でもは「問わず／EXだけ」
      const fillLevels = (selected) => {
        const category = Number(categorySelect.value);
        const levels = category === 0 || category === 1
          ? BONUS_SLOT_LEVELS
          : BONUS_SLOT_LEVELS.filter(([level]) => level !== 2);
        const value = levels.some(([level]) => level === selected) ? selected : (selected === 2 ? 3 : 0);
        populateSelect(levelSelect, levels, value);
      };
      fillLevels(slot.lv);
      categorySelect.addEventListener("change", () => fillLevels(Number(levelSelect.value)));
      line.append(text, categorySelect, levelSelect);
      slotList.append(line);
      return { categorySelect, levelSelect, fillLevels };
    });
    slotFieldset.append(slotLegend, slotList);

    const updateModeView = () => {
      const slotsMode = modeRadios[1].checked;
      categoryFieldset.hidden = slotsMode;
      slotFieldset.hidden = !slotsMode;
    };
    updateModeView();

    const note = document.createElement("p");
    note.className = "weapon-filter-empty";
    note.textContent = weaponType === BOW_WEAPON_TYPE
      ? "弓は斬れ味・装填系が出ません。無属性の弓は属性も出ません。"
      : BOWGUN_WEAPON_TYPES.has(weaponType)
        ? "ボウガンは属性が出ません。装填系は2枠までです。"
        : "斬れ味は2枠まで、属性は4枠までです。無属性の武器は属性が出ません。";

    const updateTotal = () => {
      const sum = bonusWishTotal(bonusWishFor(weaponType));
      total.textContent = sum > 5 ? `合計 ${sum}枠：5枠を超えているので一致しません` : `合計 ${sum} / 5枠`;
      total.classList.toggle("over", sum > 5);
    };
    updateTotal();

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "text-button";
    clearButton.textContent = "この武器種の希望をクリア";

    const save = () => {
      const counts = [0, 0, 0, 0];
      categorySelects.forEach((select, category) => { counts[category] = Number(select.value); });
      const mode = modeRadios[1].checked ? "slots" : "counts";
      const slots = slotSelects.map(({ categorySelect, levelSelect }) => ({
        c: Number(categorySelect.value),
        lv: Number(levelSelect.value),
      }));
      if (mode === "slots" || counts.some((count) => count > 0)
        || slots.some((slot) => slot.c >= 0 || slot.lv > 0)) {
        bonusWishes[weaponType] = { mode, counts, slots };
      } else {
        delete bonusWishes[weaponType];
      }
      persistBonusWishes();
      updateModeView();
      updateState();
      updateTotal();
      renderComparisonTable();
      // 下の「1条件を詳しく絞り込む」が同じ武器種なら、希望をそろえる
      if (predictionIgnoreTier.checked && Number(predictionWeaponSelect.value) === weaponType) {
        renderPredictionFilters();
        renderPredictionTable();
      }
    };
    categoryGrid.addEventListener("change", save);
    slotList.addEventListener("change", save);
    modeBox.addEventListener("change", save);
    clearButton.addEventListener("click", () => {
      categorySelects.forEach((select) => { select.value = "0"; });
      slotSelects.forEach(({ categorySelect, fillLevels }) => {
        categorySelect.value = "-1";
        fillLevels(0);
      });
      save();
    });

    const body = document.createElement("div");
    body.className = "weapon-filter-body";
    body.append(modeBox, categoryFieldset, slotFieldset, note, clearButton);
    row.append(summary, body);
    return row;
  });

  bonusWishSection.replaceChildren(intro, ...rows);
}

// 武器ごとの「次の一致」と、カウンターの小さい順に並べた採用の順番
function renderBonusWishSummary() {
  if (!bonusWishSummary) return;
  const wishedTargets = comparisonRollSets.filter((target) => targetHasWish(target));
  if (!selectedCandidate || wishedTargets.length === 0) {
    bonusWishSummary.hidden = true;
    bonusWishSummary.replaceChildren();
    return;
  }

  const count = comparisonRollSets[0].rolls.length;
  const results = wishedTargets.map((target) => {
    const hits = [];
    target.rolls.forEach((roll, index) => {
      if (rollMatchesBonusWish(target, roll)) hits.push(index);
    });
    return { target, hits };
  });
  // 近い当たりから順に並べ、表示範囲内に当たりがない武器は最後にまとめる
  results.sort((a, b) => (a.hits[0] ?? Infinity) - (b.hits[0] ?? Infinity));

  const title = document.createElement("h3");
  title.textContent = `次の一致（表示中の${count.toLocaleString("ja-JP")}回の中）`;

  // 見出し付きの表：あと何回｜方法｜武器種・属性｜登録名｜希望｜結果（5枠）｜備考
  const list = document.createElement("table");
  list.className = "next-match-table";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const label of ["あと何回", "方法", "武器種・属性", "登録名", "希望", "結果（5枠）", "備考", "採用"]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.append(th);
  }
  head.append(headRow);
  const body = document.createElement("tbody");
  const cell = (className, ...children) => {
    const td = document.createElement("td");
    td.className = className;
    td.append(...children);
    return td;
  };
  for (const { target, hits } of results) {
    const row = document.createElement("tr");
    row.title = `条件：${targetWishText(target)}`;
    // 方法：「リセット・同構成」の両方を書き、該当する方だけ強調
    const method = document.createElement("span");
    method.className = "method-pair";
    const reset = document.createElement("span");
    const same = document.createElement("span");
    reset.textContent = "リセット";
    same.textContent = "同構成";
    reset.className = target.kind === "owned" ? "method-off" : "method-on reset";
    same.className = target.kind === "owned" ? "method-on owned" : "method-off";
    method.append(reset, "・", same);
    const wish = document.createElement("span");
    wish.className = "bonus-wish-next-target";
    wish.textContent = target.kind === "owned" ? ownedRuleText(target) : bonusWishText(target.weaponType);
    if (hits.length === 0) {
      row.classList.add("none");
      const none = document.createElement("span");
      none.textContent = "表示範囲内に一致なし（表示する回数を増やしてください）";
      row.append(
        cell("next-when", "—"), cell("next-method", method), cell("next-weapon", weaponAndAttributeText(target)),
        cell("next-label", target.label || "—"), cell("next-wish", wish), cell("next-result none-text", none), cell("next-note", ""),
        cell("next-action", ""),
      );
    } else {
      const others = results.filter((other) => other.target !== target && other.hits.includes(hits[0])).length;
      // その回の結果を採用するボタン（狙い：手持ちに登録／手持ち：手持ちを更新）
      const adoptButton = target.kind === "owned"
        ? createAdoptOwnedUpdateButton(target, target.rolls[hits[0]], hits[0] + 1)
        : createAdoptAsOwnedButton(target, target.rolls[hits[0]], hits[0] + 1);
      adoptButton.classList.add("match-adopt-button");
      row.append(
        cell("next-when", `あと${hits[0] + 1}回`), cell("next-method", method), cell("next-weapon", weaponAndAttributeText(target)),
        cell("next-label", target.label || "—"), cell("next-wish", wish),
        cell("next-result", createCompactBonusSet(target, target.rolls[hits[0]], true)),
        cell("next-note", others > 0 ? `同じ回にほか${others}武器も一致` : ""),
        cell("next-action", adoptButton),
      );
    }
    body.append(row);
  }
  list.append(head, body);

  // 同じ回に2つの当たりが重なったら、他にも当たりがある武器はその次の当たりへずらす
  const plan = [];
  const usedIndices = new Set();
  let remaining = results.filter(({ hits }) => hits.length > 0);
  while (remaining.length > 0) {
    let best = null;
    for (const entry of remaining) {
      const index = entry.hits.find((hit) => !usedIndices.has(hit));
      if (index !== undefined && (best === null || index < best.index)) best = { entry, index };
    }
    if (best === null) {
      // 当たりが全部ほかと重なっている武器は、最初の当たりで「重なり」として出す
      for (const entry of remaining) plan.push({ target: entry.target, index: entry.hits[0] });
      break;
    }
    plan.push({ target: best.entry.target, index: best.index });
    usedIndices.add(best.index);
    remaining = remaining.filter((entry) => entry !== best.entry);
  }
  plan.sort((a, b) => a.index - b.index);

  const children = [title, list];
  if (plan.length > 0) {
    const planTitle = document.createElement("h3");
    planTitle.textContent = "採用の順番（例）";
    const planList = document.createElement("ol");
    planList.className = "bonus-wish-plan";
    let previous = 0;
    for (const { target, index } of plan) {
      const step = document.createElement("li");
      const advance = index + 1 - previous;
      const name = targetNameWithWeapon(target);
      const method = target.kind === "owned" ? "「同じ構成で再復元」" : "「リセットして再復元」";
      step.textContent = advance <= 0
        ? `${index + 1}回先：${name}（同じ回で別の武器と重なっています。どちらか1つを選んでください）`
        : advance === 1
          ? `${index + 1}回先：次の1回を${name}で${method}して採用・セーブ`
          : `${index + 1}回先：${advance - 1}回は別の武器で再復元して進める → ${advance}回目を${name}で${method}して採用・セーブ`;
      planList.append(step);
      previous = Math.max(previous, index + 1);
    }
    const planNote = document.createElement("p");
    planNote.textContent = "復元ボーナスカウンターは全武器・どちらの再復元でも共通なので、当たりまでの途中の再復元はどの武器で行っても1つずつ進みます。ただし、再復元した武器のボーナスは変わるので、採用済みの武器では進めないでください。採用したら、その行の「ここを0にする」で続きを予測できます（リセットの当たりは「採用して手持ちに登録」を押すと、0地点の更新と手持ち登録をまとめて行います）。";
    children.push(planTitle, planList, planNote);
  }

  bonusWishSummary.replaceChildren(...children);
  bonusWishSummary.hidden = false;
}

function loadOwnedWeapons() {
  try {
    const saved = JSON.parse(localStorage.getItem(OWNED_WEAPONS_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((weapon) =>
        Number.isSafeInteger(weapon?.weaponType) && weapon.weaponType >= 0 && weapon.weaponType <= 13 &&
        Number.isSafeInteger(weapon?.attributeForce) && weapon.attributeForce >= 0 && weapon.attributeForce <= 9)
      .slice(0, MAX_OWNED_WEAPONS)
      .map((weapon) => {
        const validIds = new Set(GOGMA_BONUSES.map(([id]) => id));
        const bonuses = Array.isArray(weapon.bonuses) && weapon.bonuses.length === 5
          ? weapon.bonuses.map((bonusId) => validIds.has(bonusId) ? bonusId : null)
          : [null, null, null, null, null];
        const savedCategories = normalizeKeepCategories(weapon.categories);
        const label = typeof weapon.label === "string" ? weapon.label.slice(0, 24) : "";
        const validIndex = (value, list) =>
          Number.isSafeInteger(value) && value >= 0 && value < list.length ? value : null;
        // 激化タイプが保存されていない以前の登録は、名前の「【攻撃激化】」などから読み取る
        const boostFromLabel = OWNED_BOOST_OPTIONS.find(([value]) => value && label.startsWith(`【${value}】`))?.[0] ?? "";
        return {
          id: typeof weapon.id === "string" && weapon.id ? weapon.id : createTargetId(),
          label,
          boost: OWNED_BOOST_OPTIONS.some(([value]) => value === weapon.boost) ? weapon.boost : boostFromLabel,
          subtype: typeof weapon.subtype === "string" ? weapon.subtype.slice(0, 14) : "",
          seriesIndex: validIndex(weapon.seriesIndex, SERIES_SKILLS),
          groupIndex: validIndex(weapon.groupIndex, GROUP_SKILLS),
          weaponType: weapon.weaponType,
          attributeForce: weapon.attributeForce,
          bonuses,
          // 今のボーナスが分かる枠はそこから系統を決める（以前の登録は系統だけのこともある）
          categories: bonuses.map((bonusId, slotIndex) =>
            bonusId === null ? savedCategories[slotIndex] : bonusCategoryId(bonusId)),
          rule: OWNED_RULE_OPTIONS.some(([value]) => value === weapon.rule)
            ? weapon.rule
            : (Array.isArray(weapon.bonuses) ? "upgrade" : "ex"),
          minEx: Math.max(1, Math.min(5, Math.trunc(Number(weapon.minEx) || 2))),
        };
      });
  } catch {
    return [];
  }
}

function persistOwnedWeapons() {
  try {
    localStorage.setItem(OWNED_WEAPONS_KEY, JSON.stringify(ownedWeapons));
  } catch {
    // The app remains usable when storage is unavailable.
  }
}

function ownedWeaponProblem(weapon) {
  return keepLayoutProblem({ ...weapon, keepCategories: weapon.categories });
}

// 復元ボーナスを1枠も入れていない（スキルだけ登録した）武器か
function ownedBonusesEmpty(weapon) {
  return normalizeKeepCategories(weapon.categories).every((category) => category === null);
}

// 例：「兇爪竜の力＋ヌシの魂」。未登録なら空文字
function ownedSkillText(weapon) {
  const parts = [
    weapon.seriesIndex === null ? null : SERIES_SKILLS[weapon.seriesIndex],
    weapon.groupIndex === null ? null : GROUP_SKILLS[weapon.groupIndex],
  ].filter(Boolean);
  return parts.join("＋");
}

// その武器種・属性で、同じシリーズ＋グループのスキルを持っている手持ち武器
function ownedSkillHolders(target, roll) {
  return ownedWeapons.filter((weapon) =>
    weapon.weaponType === target.weaponType
    && weapon.attributeForce === target.attributeForce
    && weapon.seriesIndex === roll.seriesIndex
    && weapon.groupIndex === roll.groupIndex);
}

function ownedWeaponDefaultName(weapon) {
  return localizedTargetName(
    optionName(WEAPON_TYPES, weapon.weaponType),
    optionName(ATTRIBUTES, weapon.attributeForce),
  );
}

// 例：「攻III 攻EX 攻II 攻II 属EX」（今のボーナスが分からないときは「攻 攻 攻 攻 属」）
function ownedLayoutText(weapon) {
  if (ownedBonusesKnown(weapon)) {
    return weapon.bonuses.map((bonusId) => compactGogmaBonusName(weapon.weaponType, bonusId)).join(" ");
  }
  const names = new Map(keepCategoriesForWeapon(weapon.weaponType, weapon.attributeForce));
  return normalizeKeepCategories(weapon.categories)
    .map((category) => category === null ? "？" : (names.get(category) ?? "？").slice(0, 1))
    .join(" ");
}

// 採用するときの窓（画面の真ん中・いちばん手前）。押しただけでは何も変わらず、窓で選んだときに反映する。
// choices: [{ tag?, name, detail?, onChoose }]。「やめる」・窓の外・Esc で閉じる
function openAdoptDialog({ title, summary = [], note, heading, choices }) {
  const overlay = document.createElement("div");
  overlay.className = "skill-adopt-overlay";
  const menu = document.createElement("div");
  menu.className = "skill-adopt-menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  const onKey = (event) => { if (event.key === "Escape") close(); };
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });

  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  const summaryEl = document.createElement("div");
  summaryEl.className = "skill-adopt-summary";
  summaryEl.append(...summary);
  const noteEl = document.createElement("p");
  noteEl.className = "skill-adopt-note";
  noteEl.textContent = note;
  const headingEl = document.createElement("p");
  headingEl.className = "skill-adopt-heading";
  headingEl.textContent = heading;
  const buttons = choices.map(({ tag, name, detail, onChoose }) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "skill-adopt-choice";
    if (tag) {
      const tagEl = document.createElement("span");
      tagEl.className = "skill-adopt-tag";
      tagEl.textContent = tag;
      item.append(tagEl);
    }
    const nameEl = document.createElement("strong");
    nameEl.textContent = name;
    item.append(nameEl);
    if (detail) {
      const detailEl = document.createElement("span");
      detailEl.className = "skill-adopt-detail";
      detailEl.textContent = detail;
      item.append(detailEl);
    }
    item.addEventListener("click", () => {
      close();
      void onChoose();
    });
    return item;
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "text-button skill-adopt-cancel";
  cancel.textContent = "やめる";
  cancel.addEventListener("click", close);
  menu.append(titleEl, summaryEl, noteEl, headingEl, ...buttons, cancel);
  overlay.append(menu);
  document.body.append(overlay);
  buttons[0]?.focus();
}

// 「弓・火・攻撃激化｜今のスキル：…｜攻EX 攻III …」（上書きする武器を見分けるための説明）
function ownedWeaponDetailText(weapon) {
  return [
    `${weaponAndAttributeText(weapon)}・${weapon.boost || "激化未設定"}`,
    `今のスキル：${ownedSkillText(weapon) || "未登録"}`,
    `今のボーナス：${ownedBonusesEmpty(weapon) ? "未入力" : ownedLayoutText(weapon)}`,
  ].join("｜");
}

function createAdoptAsOwnedButton(target, bonusIds, completedRolls) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "keep-transition-button";
  button.textContent = "採用して手持ちに登録";
  button.title = "押すと、どの手持ち武器に反映するかを選ぶ窓が出ます";
  button.addEventListener("click", () => {
    const sameKind = ownedWeapons.filter((weapon) =>
      weapon.weaponType === target.weaponType && weapon.attributeForce === target.attributeForce);
    openAdoptDialog({
      title: `${completedRolls}回先の復元ボーナスを手持ち武器に反映`,
      summary: [...createWeaponBadge(target), createCompactBonusSet(target, bonusIds)],
      note: "選ぶと、その武器の今の復元ボーナスを書き換え（または新しく登録し）、復元ボーナスカウンターの0地点もこの回まで進めます。",
      heading: sameKind.length > 0
        ? "どの武器の復元ボーナスを上書きしますか？（同じ武器種・属性の手持ち武器）"
        : "同じ武器種・属性の手持ち武器はありません。新しく登録します。",
      choices: [
        ...sameKind.map((weapon) => ({
          tag: "上書き",
          name: comparisonTargetName(weapon),
          detail: ownedWeaponDetailText(weapon),
          onChoose: () => adoptResetToOwned(weapon, bonusIds, completedRolls),
        })),
        ...OWNED_BOOST_OPTIONS.map(([boost]) => ({
          name: `＋ 新しい手持ち武器として登録（${weaponAndAttributeText(target)}・${boost || "激化未設定"}）`,
          onChoose: () => adoptResetAsNewOwned(target, boost, bonusIds, completedRolls),
        })),
      ],
    });
  });
  return button;
}

// リセットの当たりを採用：選んだ手持ち武器の復元ボーナスを上書きして、0地点を進める
async function adoptResetToOwned(weapon, bonusIds, completedRolls) {
  weapon.bonuses = [...bonusIds];
  weapon.categories = bonusIds.map(bonusCategoryId);
  onOwnedWeaponsChanged();
  await adoptBonusPosition(completedRolls);
  bonusStateMessage.textContent = `${completedRolls}回先の結果を採用して0地点を進め、「${comparisonTargetName(weapon)}」の復元ボーナスを ${ownedLayoutText(weapon)} に上書きしました。`;
}

// リセットの当たりを採用：激化タイプを選んで新しい手持ち武器として登録し、0地点を進める
async function adoptResetAsNewOwned(target, boost, bonusIds, completedRolls) {
  hideComparisonError();
  if (ownedWeapons.length >= MAX_OWNED_WEAPONS) {
    showComparisonError(`手持ち武器は最大${MAX_OWNED_WEAPONS}本です。不要な武器を削除してください。`);
    return;
  }
  const attribute = optionName(ATTRIBUTES, target.attributeForce).replace("属性", "");
  const subtype = OWNED_SUBTYPE_BY_BOOST[target.weaponType]?.[boost] ?? "";
  const weapon = {
    id: createTargetId(),
    label: boost ? `【${boost}】${subtype ? `${subtype} ` : ""}${attribute}` : "",
    weaponType: target.weaponType,
    attributeForce: target.attributeForce,
    boost,
    subtype,
    seriesIndex: null,
    groupIndex: null,
    bonuses: [...bonusIds],
    categories: bonusIds.map(bonusCategoryId),
    rule: "upgrade",
    minEx: 2,
  };
  ownedWeapons.push(weapon);
  onOwnedWeaponsChanged();
  await adoptBonusPosition(completedRolls);
  bonusStateMessage.textContent = `${completedRolls}回先の結果を採用して0地点を進め、「${comparisonTargetName(weapon)}」を手持ち武器（${ownedLayoutText(weapon)}）として登録しました。`;
}

function createAdoptOwnedUpdateButton(target, bonusIds, completedRolls) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "keep-transition-button owned-update-button";
  button.textContent = "採用して手持ちを更新";
  button.title = "押すと、反映してよいかを確かめる窓が出ます";
  button.addEventListener("click", () => {
    const weapon = ownedWeapons.find((candidate) => candidate.id === target.id);
    if (!weapon) return;
    const before = document.createElement("span");
    before.className = "skill-adopt-detail";
    before.textContent = `今：${ownedBonusesEmpty(weapon) ? "未入力" : ownedLayoutText(weapon)}　→　新しく：`;
    openAdoptDialog({
      title: `${completedRolls}回先の復元ボーナスで手持ち武器を更新`,
      summary: [...createWeaponBadge(target), before, createCompactBonusSet(target, bonusIds)],
      note: `「${comparisonTargetName(weapon)}」の今のボーナスを書き換えて、復元ボーナスカウンターの0地点を${completedRolls}回先まで進めます。`,
      heading: "反映してよいですか？",
      choices: [{
        tag: "反映",
        name: `${comparisonTargetName(weapon)} を更新する`,
        detail: ownedWeaponDetailText(weapon),
        onChoose: () => adoptOwnedUpdate(target, bonusIds, completedRolls),
      }],
    });
  });
  return button;
}

// 同じ構成の結果を採用：手持ち武器の今のボーナスを更新して、0地点を進める
async function adoptOwnedUpdate(target, bonusIds, completedRolls) {
  const weapon = ownedWeapons.find((candidate) => candidate.id === target.id);
  if (!weapon) return;
  weapon.bonuses = [...bonusIds];
  weapon.categories = bonusIds.map(bonusCategoryId);
  onOwnedWeaponsChanged();
  await adoptBonusPosition(completedRolls);
  bonusStateMessage.textContent = `${completedRolls}回先の結果を採用して0地点を進め、「${comparisonTargetName(weapon)}」を ${ownedLayoutText(weapon)} に更新しました。`;
}

// 1〜5枠目の今のボーナス（II・III・EXまで）をカードで選ぶ欄。その武器で出ないボーナスは外す
function createOwnedBonusPicker(weaponType, attributeForce, bonuses, onChange) {
  const options = gogmaBonusesForWeapon(weaponType, attributeForce);
  const available = new Set(options.map(([id]) => id));
  return createBonusCardPicker({
    weaponType,
    options,
    values: bonuses.map((bonusId) => available.has(bonusId) ? bonusId : null),
    onChange: (_, __, values) => onChange(values),
  });
}

function createOwnedRuleControls(weapon) {
  const wrap = document.createElement("div");
  wrap.className = "owned-rule-controls";
  const ruleLabel = document.createElement("label");
  const ruleText = document.createElement("span");
  const ruleSelect = document.createElement("select");
  ruleText.textContent = "一致にする条件";
  populateSelect(ruleSelect, OWNED_RULE_OPTIONS, weapon.rule);
  ruleLabel.append(ruleText, ruleSelect);
  const exLabel = document.createElement("label");
  const exText = document.createElement("span");
  const exSelect = createMinExSelect(weapon.minEx);
  exText.textContent = "EXの数";
  exLabel.append(exText, exSelect);
  const syncVisibility = () => { exLabel.hidden = ruleSelect.value !== "ex"; };
  ruleSelect.addEventListener("change", syncVisibility);
  syncVisibility();
  wrap.append(ruleLabel, exLabel);
  return { wrap, ruleSelect, exSelect };
}

function ownedWeaponFromInputs(base, bonuses, ruleSelect, exSelect) {
  return {
    ...base,
    bonuses,
    categories: bonuses.map((bonusId) => bonusId === null ? null : bonusCategoryId(bonusId)),
    rule: ruleSelect.value,
    minEx: Number(exSelect.value),
  };
}

function createMinExSelect(value) {
  const select = document.createElement("select");
  populateSelect(
    select,
    [1, 2, 3, 4, 5].map((count) => [count, count === 5 ? "EX 5個" : `EX ${count}個以上`]),
    value,
  );
  return select;
}

// 手持ち武器の登録欄は「04 復元ボーナス」「05 スキル」「06 手持ち武器」の3か所に同じものを出す（データは共通）
function ownedWeaponContainers() {
  return [ownedWeaponSection, skillOwnedContainer, ownedTabContainer].filter(Boolean);
}

// 手持ち武器が変わったら、ほかの場所の登録欄と、両方の予測表を書き直す（編集中の欄は書き直さない）
function onOwnedWeaponsChanged(editingContainer = null) {
  persistOwnedWeapons();
  renderOwnedWeaponSection(editingContainer);
  void refreshComparisonPredictions();
  if (skillPredictionRollSets.length > 0) renderSkillPredictionTable();
}

// シリーズスキル・グループスキルをカードで1つずつ選ぶ欄（「未登録」も選べる）
function createOwnedSkillPicker(seriesIndex, groupIndex, onChange) {
  const element = document.createElement("div");
  element.className = "owned-skill-picker";
  const values = { seriesIndex, groupIndex };
  const name = `owned-skill-${createTargetId()}`;
  const makeGroup = (title, kind, options, current, effectOf) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "skill-filter-series";
    const legend = document.createElement("legend");
    legend.textContent = title;
    const grid = document.createElement("div");
    grid.className = "skill-filter-series-options owned-skill-options";
    for (const [index, label] of [[-1, "未登録"], ...options]) {
      const option = document.createElement("label");
      const radio = document.createElement("input");
      const text = document.createElement("span");
      radio.type = "radio";
      radio.name = `${name}-${kind}`;
      radio.value = String(index);
      radio.checked = (current ?? -1) === index;
      text.textContent = label;
      if (index >= 0) text.append(effectOf(label));
      radio.addEventListener("change", () => {
        values[kind] = index < 0 ? null : index;
        onChange({ ...values });
      });
      option.append(radio, text);
      grid.append(option);
    }
    fieldset.append(legend, grid);
    return fieldset;
  };
  const groupEffect = (label) => {
    const small = document.createElement("small");
    small.className = "skill-effect";
    const effect = GROUP_SKILL_EFFECTS[label];
    if (effect) small.textContent = `発動スキル：${effect[0]}（3部位）`;
    return small;
  };
  element.append(
    makeGroup("グループスキル", "groupIndex", prioritizedSkillOptions(GROUP_SKILLS, PRIORITY_GROUP_SKILL_INDICES), groupIndex, groupEffect),
    makeGroup("シリーズスキル", "seriesIndex", prioritizedSkillOptions(SERIES_SKILLS, PRIORITY_SERIES_SKILL_INDICES), seriesIndex, skillEffectSpan),
  );
  return { element, getValues: () => ({ ...values }) };
}

function renderOwnedWeaponSection(skipContainer = null) {
  for (const container of ownedWeaponContainers()) {
    if (container !== skipContainer) buildOwnedWeaponContent(container);
  }
}

function buildOwnedWeaponContent(container) {
  const where = container.dataset.ownedWhere ?? "bonus";
  const intro = document.createElement("div");
  intro.className = "skill-filter-intro";
  const title = document.createElement("strong");
  title.textContent = "手持ち武器";
  const description = document.createElement("p");
  description.textContent = "持っている武器を1本ずつ登録します。今のボーナス（1枠目〜5枠目をゲーム画面の順番どおりに）を入れると「同じ構成で再復元」の予測と今より強くなる回の判定に、スキルを入れるとスキル未来予測の「所持済み」の判定に使われます。どちらか片方だけでも登録できます。";
  intro.append(title, description);

  // 追加フォーム
  const form = document.createElement("div");
  form.className = "owned-weapon-form";
  // 直前に選んだもの（なければ狙いの登録欄の選択）を選んだ状態で始める
  const lastForm = loadBonusView().ownedForm;
  const makeField = (labelText, control) => {
    const label = document.createElement("label");
    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(text, control);
    return label;
  };
  const boostSelect = document.createElement("select");
  populateSelect(boostSelect, OWNED_BOOST_OPTIONS, OWNED_BOOST_OPTIONS.some(([value]) => value === lastForm.boost) ? lastForm.boost : "");
  const weaponSelectEl = document.createElement("select");
  populateSelect(weaponSelectEl, WEAPON_TYPES,
    Number.isSafeInteger(lastForm.weaponType) ? lastForm.weaponType : Number(comparisonWeaponSelect.value));
  const attributeSelectEl = document.createElement("select");
  populateSelect(attributeSelectEl, ATTRIBUTES,
    Number.isSafeInteger(lastForm.attributeForce) ? lastForm.attributeForce : Number(comparisonAttributeSelect.value));
  const subtypeInput = document.createElement("input");
  subtypeInput.type = "text";
  subtypeInput.maxLength = 14;
  subtypeInput.placeholder = "例：貫通／通常";
  subtypeInput.value = typeof lastForm.subtype === "string" ? lastForm.subtype : "";
  const subtypeList = document.createElement("datalist");
  subtypeList.id = `owned-subtype-list-${createTargetId()}`;
  subtypeInput.setAttribute("list", subtypeList.id);
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.placeholder = "例：メイン雷弓";
  const nameHint = document.createElement("p");
  nameHint.className = "owned-name-hint";

  // 名前の自動入力：「【攻撃激化】貫通 氷」。自分で書き換えたら、その後は上書きしない
  let nameEditedByHand = false;
  const autoName = () => {
    const boost = boostSelect.value;
    const subtype = subtypeInput.value.trim();
    const attribute = optionName(ATTRIBUTES, Number(attributeSelectEl.value)).replace("属性", "");
    if (!boost && !subtype) return "";
    // 例：「【属性激化】貫通 氷」、種類のない武器は「【会心激化】火」
    return `${boost ? `【${boost}】` : ""}${subtype ? `${subtype} ` : ""}${attribute}`;
  };
  const updateName = () => {
    if (!nameEditedByHand) nameInput.value = autoName();
    nameHint.textContent = nameEditedByHand
      ? "名前は手入力中です（自動入力に戻すには、名前を空にしてください）"
      : "激化・種類・属性から名前を自動で入れます。自由に書き換えることもできます。";
  };
  const updateSubtypeList = () => {
    const weaponType = Number(weaponSelectEl.value);
    const history = loadBonusView().subtypeHistory[weaponType] ?? [];
    const suggestions = [...new Set([...Object.values(OWNED_SUBTYPE_BY_BOOST[weaponType] ?? {}), ...history])];
    subtypeList.replaceChildren(...suggestions.map((value) => {
      const option = document.createElement("option");
      option.value = value;
      return option;
    }));
  };
  const rememberForm = () => {
    const view = loadBonusView();
    view.ownedForm = {
      boost: boostSelect.value,
      weaponType: Number(weaponSelectEl.value),
      attributeForce: Number(attributeSelectEl.value),
      subtype: subtypeInput.value.trim(),
    };
    persistBonusView(view);
  };
  nameInput.addEventListener("input", () => {
    nameEditedByHand = nameInput.value.trim() !== "";
    updateName();
  });
  // 激化タイプで種類が決まる武器（弓・ガンランスなど）は、種類を自動で入れる
  const applySubtypeFromBoost = () => {
    const table = OWNED_SUBTYPE_BY_BOOST[Number(weaponSelectEl.value)];
    if (table) subtypeInput.value = table[boostSelect.value] ?? "";
  };
  boostSelect.addEventListener("change", () => { applySubtypeFromBoost(); updateName(); rememberForm(); });
  subtypeInput.addEventListener("input", () => { updateName(); rememberForm(); });
  weaponSelectEl.addEventListener("change", () => {
    // 武器種が変わったら、前の武器種の種類は合わないので入れ直す
    subtypeInput.value = "";
    applySubtypeFromBoost();
    updateSubtypeList();
    updateName();
    rememberForm();
  });
  attributeSelectEl.addEventListener("change", () => { updateName(); rememberForm(); });
  updateSubtypeList();
  updateName();

  const boostLabel = makeField("激化タイプ", boostSelect);
  const weaponLabel = makeField("武器種", weaponSelectEl);
  const attributeLabel = makeField("属性", attributeSelectEl);
  const subtypeLabel = makeField("種類（激化で自動・書き換え可）", subtypeInput);
  subtypeLabel.append(subtypeList);
  const nameLabel = makeField("名前（任意・自動入力）", nameInput);
  const formRule = createOwnedRuleControls({ rule: "upgrade", minEx: 2 });
  const slots = document.createElement("div");
  slots.className = "owned-weapon-picker";
  let formBonuses = [null, null, null, null, null];
  const renderFormSlots = () => {
    const picker = createOwnedBonusPicker(
      Number(weaponSelectEl.value), Number(attributeSelectEl.value), formBonuses,
      (values) => { formBonuses = values; },
    );
    formBonuses = picker.getValues();
    slots.replaceChildren(picker.element);
  };
  renderFormSlots();
  weaponSelectEl.addEventListener("change", renderFormSlots);
  attributeSelectEl.addEventListener("change", renderFormSlots);
  const bonusTitle = document.createElement("p");
  bonusTitle.className = "owned-form-subtitle";
  bonusTitle.textContent = "今の復元ボーナス（任意・入れるなら5枠すべて）";
  // スキル（任意）。長いので開け閉めできる欄に入れる
  let formSkills = { seriesIndex: null, groupIndex: null };
  const formSkillPicker = createOwnedSkillPicker(null, null, (values) => { formSkills = values; });
  const formSkillBox = document.createElement("div");
  formSkillBox.append(formSkillPicker.element);
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "secondary small-button";
  addButton.textContent = "手持ち武器を登録";
  const error = document.createElement("p");
  error.className = "error";
  error.hidden = true;
  addButton.addEventListener("click", () => {
    const weapon = ownedWeaponFromInputs({
      id: createTargetId(),
      label: nameInput.value.trim(),
      weaponType: Number(weaponSelectEl.value),
      attributeForce: Number(attributeSelectEl.value),
      boost: boostSelect.value,
      subtype: subtypeInput.value.trim(),
      seriesIndex: formSkills.seriesIndex,
      groupIndex: formSkills.groupIndex,
    }, formBonuses, formRule.ruleSelect, formRule.exSelect);
    // 復元ボーナスは空でもよい（スキルだけの登録）。入れるなら5枠そろっていること
    const problem = ownedBonusesEmpty(weapon) ? null : ownedWeaponProblem(weapon);
    if (problem) {
      error.textContent = problem;
      error.hidden = false;
      return;
    }
    if (ownedBonusesEmpty(weapon) && weapon.seriesIndex === null && weapon.groupIndex === null) {
      error.textContent = "今の復元ボーナスか、スキルのどちらかを入れてください。";
      error.hidden = false;
      return;
    }
    if (ownedWeapons.length >= MAX_OWNED_WEAPONS) {
      error.textContent = `手持ち武器は最大${MAX_OWNED_WEAPONS}本です。`;
      error.hidden = false;
      return;
    }
    ownedWeapons.push(weapon);
    // 選んだ武器種・属性・激化・種類を覚え、種類は武器種ごとの候補に足す
    rememberForm();
    const subtype = subtypeInput.value.trim();
    if (subtype) {
      const view = loadBonusView();
      const history = view.subtypeHistory[weapon.weaponType] ?? [];
      view.subtypeHistory[weapon.weaponType] = [...new Set([subtype, ...history])].slice(0, 12);
      persistBonusView(view);
    }
    onOwnedWeaponsChanged();
  });
  const formRow = document.createElement("div");
  formRow.className = "owned-weapon-form-row";
  formRow.append(nameLabel, weaponLabel, attributeLabel, boostLabel, subtypeLabel);
  form.append(formRow, nameHint, bonusTitle, slots, formSkillBox, formRule.wrap, addButton, error);
  wrapInCollapsible(formSkillBox, `owned-form-skill:${where}`, "スキル（任意）：シリーズスキル・グループスキル", "クリックでスキルの選択欄が開きます");

  // 登録済みの手持ち武器（並べ方：登録した順／武器種ごと）
  const sortMode = loadBonusView().ownedSort;
  const attributeOrder = new Map(ATTRIBUTES.map(([value], index) => [value, index]));
  const boostOrder = new Map(OWNED_BOOST_OPTIONS.map(([value], index) => [value, index]));
  const displayWeapons = sortMode === "type"
    ? [...ownedWeapons].sort((a, b) =>
      a.weaponType - b.weaponType
      || attributeOrder.get(a.attributeForce) - attributeOrder.get(b.attributeForce)
      || (boostOrder.get(a.boost) ?? 0) - (boostOrder.get(b.boost) ?? 0))
    : ownedWeapons;
  const cards = displayWeapons.map((weapon) => {
    const card = document.createElement("details");
    card.className = "weapon-filter-row owned-weapon-card";
    const summary = document.createElement("summary");
    // 左端に武器種の札（ぱっと見で弓・ガンランスなどが分かるように）
    const typeBadge = document.createElement("span");
    typeBadge.className = "owned-type-badge";
    typeBadge.textContent = t(optionName(WEAPON_TYPES, weapon.weaponType));
    summary.append(typeBadge);
    const name = document.createElement("span");
    name.className = "weapon-filter-name";
    name.textContent = comparisonTargetName(weapon);
    const state = document.createElement("span");
    state.className = "weapon-filter-state";
    const updateState = () => {
      const bonusPart = ownedBonusesEmpty(weapon)
        ? "復元ボーナス未入力"
        : ownedWeaponProblem(weapon)
          ? `⚠ ${ownedWeaponProblem(weapon)}`
          : `${ownedLayoutText(weapon)}｜${ownedRuleText(weapon)}で一致`;
      const skillPart = ownedSkillText(weapon) ? `スキル：${ownedSkillText(weapon)}` : "スキル未登録";
      state.textContent = `${weaponAndAttributeText(weapon)}${weapon.boost ? `・${weapon.boost}` : ""}｜${bonusPart}｜${skillPart}`;
    };
    updateState();
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "owned-remove-button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `${comparisonTargetName(weapon)}を削除`);
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (!window.confirm(`「${comparisonTargetName(weapon)}」を手持ち武器から削除しますか？`)) return;
      ownedWeapons = ownedWeapons.filter((candidate) => candidate.id !== weapon.id);
      onOwnedWeaponsChanged();
    });
    // 並び替え（表の列や一覧の順番にも反映される）
    const moveButton = (text, label, offset) => {
      const button = document.createElement("button");
      const index = ownedWeapons.indexOf(weapon);
      button.type = "button";
      button.className = "owned-move-button";
      button.textContent = text;
      button.title = label;
      button.setAttribute("aria-label", `${comparisonTargetName(weapon)}を${label}`);
      button.disabled = index + offset < 0 || index + offset >= ownedWeapons.length;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const from = ownedWeapons.indexOf(weapon);
        const to = from + offset;
        if (to < 0 || to >= ownedWeapons.length) return;
        [ownedWeapons[from], ownedWeapons[to]] = [ownedWeapons[to], ownedWeapons[from]];
        onOwnedWeaponsChanged();
      });
      return button;
    };
    summary.append(name, state);
    setupCollapsible(card, summary, `owned:${where}:${weapon.id}`, "クリックで設定欄が開きます");
    const actions = document.createElement("span");
    actions.className = "owned-card-actions";
    // ↑↓ は「登録した順」のときだけ（武器種ごとに並べているときは順番が自動で決まる）
    if (sortMode === "manual") actions.append(moveButton("↑", "上へ移動", -1), moveButton("↓", "下へ移動", 1));
    actions.append(removeButton);
    summary.append(actions);

    const body = document.createElement("div");
    body.className = "weapon-filter-body";
    const renameLabel = document.createElement("label");
    const renameText = document.createElement("span");
    const renameInput = document.createElement("input");
    renameText.textContent = "名前";
    renameInput.type = "text";
    renameInput.maxLength = 24;
    renameInput.value = weapon.label;
    renameInput.placeholder = ownedWeaponDefaultName(weapon);
    renameLabel.append(renameText, renameInput);
    const boostLabel = document.createElement("label");
    const boostText = document.createElement("span");
    const cardBoostSelect = document.createElement("select");
    boostText.textContent = "激化タイプ";
    populateSelect(cardBoostSelect, OWNED_BOOST_OPTIONS, weapon.boost);
    boostLabel.append(boostText, cardBoostSelect);
    let cardBonuses = [...weapon.bonuses];
    let cardSkills = { seriesIndex: weapon.seriesIndex, groupIndex: weapon.groupIndex };
    const cardRule = createOwnedRuleControls(weapon);
    const save = () => {
      const next = ownedWeaponFromInputs(weapon, cardBonuses, cardRule.ruleSelect, cardRule.exSelect);
      // 以前の登録で系統だけ分かっている枠は、ボーナスを選ぶまで系統を残す
      next.categories = next.categories.map((category, slotIndex) => category ?? weapon.categories[slotIndex]);
      Object.assign(weapon, next, {
        label: renameInput.value.trim(),
        boost: cardBoostSelect.value,
        seriesIndex: cardSkills.seriesIndex,
        groupIndex: cardSkills.groupIndex,
      });
      name.textContent = comparisonTargetName(weapon);
      updateState();
      onOwnedWeaponsChanged(container);
    };
    const cardPicker = createOwnedBonusPicker(weapon.weaponType, weapon.attributeForce, cardBonuses, (values) => {
      cardBonuses = values;
      save();
    });
    cardBonuses = cardPicker.getValues();
    const cardSlots = document.createElement("div");
    cardSlots.className = "owned-weapon-picker";
    cardSlots.append(cardPicker.element);
    const cardBonusTitle = document.createElement("p");
    cardBonusTitle.className = "owned-form-subtitle";
    cardBonusTitle.textContent = "今の復元ボーナス";
    const cardSkillPicker = createOwnedSkillPicker(weapon.seriesIndex, weapon.groupIndex, (values) => {
      cardSkills = values;
      save();
    });
    const cardSkillBox = document.createElement("div");
    cardSkillBox.append(cardSkillPicker.element);
    renameInput.addEventListener("change", save);
    cardBoostSelect.addEventListener("change", save);
    cardRule.wrap.addEventListener("change", save);
    body.append(renameLabel, boostLabel, cardBonusTitle, cardSlots, cardSkillBox, cardRule.wrap);
    card.append(summary, body);
    wrapInCollapsible(cardSkillBox, `owned-skill:${where}:${weapon.id}`,
      `スキル：${ownedSkillText(weapon) || "未登録"}`, "クリックでスキルの選択欄が開きます");
    return card;
  });

  const listTitle = document.createElement("p");
  listTitle.className = "weapon-filter-empty";
  listTitle.textContent = ownedWeapons.length === 0
    ? "まだ登録がありません。表の「採用して手持ちに登録」からも登録できます。"
    : `登録済み ${ownedWeapons.length}本（名前を押すと構成を直せます）`;

  // 並べ方の切り替え（どの場所の一覧でも共通）
  const sortBar = document.createElement("div");
  sortBar.className = "owned-sort-bar";
  const sortLabel = document.createElement("span");
  sortLabel.textContent = "並べ方：";
  sortBar.append(sortLabel, ...[
    ["manual", "登録した順（↑↓で並び替え）"],
    ["type", "武器種ごと"],
  ].map(([value, text]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `owned-sort-button${sortMode === value ? " active" : ""}`;
    button.textContent = text;
    button.addEventListener("click", () => {
      const view = loadBonusView();
      view.ownedSort = value;
      persistBonusView(view);
      renderOwnedWeaponSection();
    });
    return button;
  }));

  // 武器種ごとのときは、武器種の見出しを挟む
  const listItems = [];
  cards.forEach((card, index) => {
    const weapon = displayWeapons[index];
    if (sortMode === "type" && (index === 0 || displayWeapons[index - 1].weaponType !== weapon.weaponType)) {
      const groupHeading = document.createElement("h4");
      groupHeading.className = "owned-group-heading";
      const count = displayWeapons.filter((other) => other.weaponType === weapon.weaponType).length;
      groupHeading.textContent = `${t(optionName(WEAPON_TYPES, weapon.weaponType))}（${count}本）`;
      listItems.push(groupHeading);
    }
    listItems.push(card);
  });

  container.replaceChildren(intro, form, listTitle);
  if (ownedWeapons.length > 0) {
    const bulkBox = createOwnedBulkRuleBox();
    container.append(bulkBox, sortBar);
    wrapInCollapsible(bulkBox, `owned-bulk:${where}`, "一致の条件をまとめて設定（全部／武器種ごと）", "クリックで設定欄が開きます");
  }
  container.append(...listItems);
}

// 手持ち武器の「一致にする条件」を、全部または武器種ごとにまとめて書き換える
function createOwnedBulkRuleBox() {
  const box = document.createElement("div");
  box.className = "owned-bulk-rule";
  const description = document.createElement("p");
  description.className = "weapon-filter-empty";
  description.textContent = "登録済みの手持ち武器の「一致にする条件」を、まとめて同じものにします。あとから1本ずつ直すこともできます。";
  const targetLabel = document.createElement("label");
  const targetText = document.createElement("span");
  targetText.textContent = "対象";
  const targetSelect = document.createElement("select");
  const weaponTypes = [...new Set(ownedWeapons.map((weapon) => weapon.weaponType))].sort((a, b) => a - b);
  const countOf = (weaponType) => ownedWeapons.filter((weapon) => weapon.weaponType === weaponType).length;
  populateSelect(targetSelect, [
    ["all", `すべての手持ち武器（${ownedWeapons.length}本）`],
    ...weaponTypes.map((weaponType) =>
      [String(weaponType), `${t(optionName(WEAPON_TYPES, weaponType))}だけ（${countOf(weaponType)}本）`]),
  ], "all");
  targetLabel.append(targetText, targetSelect);
  const rule = createOwnedRuleControls({ rule: "upgrade", minEx: 2 });
  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.className = "secondary small-button";
  applyButton.textContent = "まとめて設定する";
  applyButton.addEventListener("click", () => {
    const targets = targetSelect.value === "all"
      ? ownedWeapons
      : ownedWeapons.filter((weapon) => weapon.weaponType === Number(targetSelect.value));
    const ruleName = rule.ruleSelect.value === "ex"
      ? `EX ${rule.exSelect.value}個以上`
      : optionName(OWNED_RULE_OPTIONS, rule.ruleSelect.value);
    const targetName = targetSelect.selectedOptions[0]?.textContent ?? "";
    if (!window.confirm(`${targetName}の一致にする条件を「${ruleName}」にします。よろしいですか？`)) return;
    for (const weapon of targets) {
      weapon.rule = rule.ruleSelect.value;
      weapon.minEx = Number(rule.exSelect.value);
    }
    onOwnedWeaponsChanged();
  });
  box.append(description, targetLabel, rule.wrap, applyButton);
  return box;
}

function updateComparisonStatus() {
  if (comparisonTargets.length === 0 && ownedWeapons.length === 0) {
    comparisonStatus.textContent = "予測対象を登録してください";
  } else if (!selectedCandidate) {
    comparisonStatus.textContent = `${comparisonTargets.length.toLocaleString("ja-JP")}件・基準seedと復元カウンター待ち`;
  } else if (comparisonRollSets.length === 0) {
    if (bonusPrediction.mode === "keep") {
      const ready = comparisonTargets.filter((target) => keepLayoutProblem(target) === null).length;
      comparisonStatus.textContent = `${ready}/${comparisonTargets.length} 武器の構成入力済み`;
    } else {
      comparisonStatus.textContent = `${comparisonTargets.length.toLocaleString("ja-JP")}条件`;
    }
  }
  comparisonStatus.className = "status-pill";
}

function showComparisonError(message) {
  comparisonError.textContent = message;
  comparisonError.hidden = false;
}

function hideComparisonError() {
  comparisonError.textContent = "";
  comparisonError.hidden = true;
}

async function findSkillPosition() {
  hideSkillError();
  resetSkillSearchFeedback();

  if (saveState.baseSeed === null) {
    showSkillError("先に基準seedを検索するか、未来予測タブで基準seedを入力してください。");
    return;
  }

  findSkillPositionButton.disabled = true;
  skillStatus.textContent = "スキルカウンターを探索中";
  skillStatus.className = "status-pill running";

  try {
    const observations = readSkillObservations();
    const counterStart = readInteger("skill-counter-start", "スキル内部位置の開始", 0, 0xffffffff);
    const counterEnd = readInteger("skill-counter-end", "スキル内部位置の終了", 0, 0xffffffff);
    if (counterStart > counterEnd) {
      throw new Error("スキル内部位置の開始は終了以下にしてください。");
    }

    await ensurePredictionWasm();
    const counters = Array.from(
      find_skill_counters(
        saveState.baseSeed,
        Number(skillWeaponSelect.value),
        Number(skillAttributeSelect.value),
        SKILL_COUNTER_GATE,
        counterStart,
        counterEnd,
        new Uint16Array(observations),
      ),
    );

    if (counters.length === 0) {
      throw new Error(
        "一致するスキルカウンターがありません。武器種・属性・入力順を確認し、必要なら探索範囲を広げてください。",
      );
    }
    if (counters.length > 1) {
      skillStatus.textContent = `${counters.length.toLocaleString("ja-JP")}候補`;
      skillStatus.className = "status-pill";
      showSkillError(
        `候補が${counters.length.toLocaleString("ja-JP")}件あります。続きの再付与結果を追加してください。`,
      );
      return;
    }

    selectedSkillCounter = counters[0];
    skillObservedCount = observations.length;
    currentSkillObservations = observations;
    setStateFromSkill(saveState.baseSeed, selectedSkillCounter, "検索結果");
    const observedTarget = {
      weaponType: Number(skillWeaponSelect.value),
      attributeForce: Number(skillAttributeSelect.value),
      label: "",
    };
    if (
      comparisonTargets.length < MAX_REGISTERED_TARGETS &&
      !comparisonTargets.some(
        (target) => comparisonCombinationKey(target) === comparisonCombinationKey(observedTarget),
      )
    ) {
      comparisonTargets.push({
        ...observedTarget,
        id: createTargetId(),
        keepCategories: [null, null, null, null, null],
        keepSource: null,
      });
      renderComparisonTargets();
      persistAppState();
    }
    await verifySkillObservationPrefix(observations);
    renderPredictionTable();
    renderComparisonTable();
    await refreshSkillPredictions();
    skillStatus.textContent = `スキルカウンター ${selectedSkillCounter.toLocaleString("ja-JP")} を特定`;
    skillStatus.className = "status-pill complete";
  } catch (error) {
    if (selectedSkillCounter === null) {
      skillStatus.textContent = "位置未特定";
      skillStatus.className = "status-pill";
    }
    showSkillError(error instanceof Error ? error.message : String(error));
  } finally {
    findSkillPositionButton.disabled = false;
  }
}

async function verifySkillObservationPrefix(observations) {
  await ensurePredictionWasm();
  const tableIndices = predict_skill_rolls(
    saveState.baseSeed,
    Number(skillWeaponSelect.value),
    Number(skillAttributeSelect.value),
    saveState.skillCounter,
    SKILL_COUNTER_GATE,
    observations.length,
  );
  if (!flattenedPrefixMatches(tableIndices, observations)) {
    throw new Error("観測したスキル結果と特定位置の先頭が一致しません。");
  }
}

async function refreshSkillPredictions() {
  if (saveState.baseSeed === null || saveState.skillCounter === null) {
    clearSkillPredictionResults();
    skillFutureStatus.textContent = "基準seedとスキルカウンターを入力してください";
    return;
  }
  if (comparisonTargets.length === 0) {
    clearSkillPredictionResults();
    skillFutureStatus.textContent = "予測対象を登録してください";
    return;
  }

  skillFutureStatus.textContent = "スキル未来を計算中";
  skillFutureStatus.className = "status-pill running";

  try {
    const predictionCount = readSkillPredictionCount();
    await ensurePredictionWasm();
    skillPredictionRollSets = uniqueTargetsByCombination().map((target) => {
      const tableIndices = predict_skill_rolls(
        saveState.baseSeed,
        target.weaponType,
        target.attributeForce,
        saveState.skillCounter,
        SKILL_COUNTER_GATE,
        predictionCount,
      );
      return {
        ...target,
        rolls: Array.from(tableIndices, (tableIndex) => ({
          seriesIndex: Math.floor(tableIndex / GROUP_SKILLS.length),
          groupIndex: tableIndex % GROUP_SKILLS.length,
        })),
      };
    });
    renderSkillPredictionTable();
  } catch (error) {
    clearSkillPredictionResults();
    skillFutureStatus.textContent = "予測エラー";
    skillFutureStatus.className = "status-pill";
    showSkillTargetError(error instanceof Error ? error.message : String(error));
  }
}

function readSkillPredictionCount() {
  const value = Number(skillPredictionCountInput.value);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    throw new Error("スキルの表示回数は1〜10,000の整数で入力してください。");
  }
  return value;
}

function selectedSkillFilter() {
  return {
    enabled: skillFilterEnabled.checked,
    groupIndex: Number(skillFilterGroupSelect.value),
    operator: skillFilterOperatorSelect.value,
    seriesIndices: new Set(
      [...skillFilterSeriesOptions.querySelectorAll('input[name="skill-filter-series"]:checked')]
        .map((checkbox) => Number(checkbox.value)),
    ),
  };
}

function loadWeaponSkillFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(WEAPON_SKILL_FILTERS_KEY) ?? "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function persistWeaponSkillFilters() {
  try {
    localStorage.setItem(WEAPON_SKILL_FILTERS_KEY, JSON.stringify(weaponSkillFilters));
  } catch {
    // The app remains usable when storage is unavailable.
  }
}

function hasWeaponSkillFilter(weaponType) {
  const entry = weaponSkillFilters[weaponType];
  return !!entry && (entry.groupIndex >= 0 || entry.seriesIndices.length > 0);
}

// 武器種ごとの条件があればそれを使う（グループとシリーズは常にAND）。なければ共通の条件
function skillFilterForTarget(filter, target) {
  if (!hasWeaponSkillFilter(target.weaponType)) return filter;
  const entry = weaponSkillFilters[target.weaponType];
  return {
    ...filter,
    groupIndex: entry.groupIndex,
    operator: "and",
    seriesIndices: new Set(entry.seriesIndices),
  };
}

function renderWeaponFilterSection() {
  if (!weaponFilterSection) {
    weaponFilterSection = document.createElement("section");
    weaponFilterSection.className = "skill-filter-settings weapon-filter-settings";
    document.querySelector(".skill-filter-settings")?.after(weaponFilterSection);
  }

  const weaponTypes = [...new Set(comparisonTargets.map((target) => target.weaponType))]
    .sort((a, b) => a - b);

  const intro = document.createElement("div");
  intro.className = "skill-filter-intro";
  const title = document.createElement("strong");
  title.textContent = "武器種ごとの条件";
  const description = document.createElement("p");
  description.textContent = "武器種ごとにグループスキルとシリーズスキルを指定できます。指定した武器種は「グループスキル かつ 選んだシリーズスキルのどれか」で判定し、上の共通の条件は使いません。何も指定していない武器種は共通の条件で判定します。";
  intro.append(title, description);

  if (weaponTypes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "weapon-filter-empty";
    empty.textContent = "武器を登録すると、ここに武器種ごとの設定欄が出ます。";
    weaponFilterSection.replaceChildren(intro, empty);
    return;
  }

  const rows = weaponTypes.map((weaponType) => {
    const entry = weaponSkillFilters[weaponType] ?? { groupIndex: -1, seriesIndices: [] };
    const row = document.createElement("details");
    row.className = "weapon-filter-row";

    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.className = "weapon-filter-name";
    name.textContent = t(optionName(WEAPON_TYPES, weaponType));
    const state = document.createElement("span");
    state.className = "weapon-filter-state";
    const stateText = (current) => hasWeaponSkillFilter(weaponType)
      ? [
          current.groupIndex >= 0 ? GROUP_SKILLS[current.groupIndex] : null,
          current.seriesIndices.length > 0 ? current.seriesIndices.map((i) => SERIES_SKILLS[i]).join(" / ") : null,
        ].filter(Boolean).join(" ＋ ")
      : "共通の条件を使用";
    state.textContent = stateText(entry);
    summary.append(name, state);
    setupCollapsible(row, summary, `skill-filter:${weaponType}`);

    const groupLabel = document.createElement("label");
    groupLabel.textContent = "グループスキル";
    const groupSelect = document.createElement("select");
    populateSelect(
      groupSelect,
      [[-1, "指定しない"], ...prioritizedSkillOptions(GROUP_SKILLS, PRIORITY_GROUP_SKILL_INDICES)
        .map(([index, label]) => [index, skillLabelWithEffect(label)])],
      entry.groupIndex,
    );
    groupLabel.append(groupSelect);
    attachGroupEffectNote(groupSelect);

    const seriesFieldset = document.createElement("fieldset");
    seriesFieldset.className = "skill-filter-series";
    const legend = document.createElement("legend");
    legend.textContent = "シリーズスキル（複数選択はOR）";
    const seriesOptions = document.createElement("div");
    seriesOptions.className = "skill-filter-series-options";
    seriesOptions.append(
      ...prioritizedSkillOptions(SERIES_SKILLS, PRIORITY_SERIES_SKILL_INDICES).map(([index, label]) => {
        const optionLabel = document.createElement("label");
        const checkbox = document.createElement("input");
        const text = document.createElement("span");
        checkbox.type = "checkbox";
        checkbox.value = String(index);
        checkbox.checked = entry.seriesIndices.includes(index);
        text.textContent = label;
        text.append(skillEffectSpan(label));
        optionLabel.append(checkbox, text);
        return optionLabel;
      }),
    );
    seriesFieldset.append(legend, seriesOptions);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "text-button";
    clearButton.textContent = "この武器種の条件をクリア";

    const save = () => {
      const next = {
        groupIndex: Number(groupSelect.value),
        seriesIndices: [...seriesOptions.querySelectorAll("input:checked")].map((c) => Number(c.value)),
      };
      if (next.groupIndex >= 0 || next.seriesIndices.length > 0) weaponSkillFilters[weaponType] = next;
      else delete weaponSkillFilters[weaponType];
      persistWeaponSkillFilters();
      state.textContent = stateText(next);
      renderSkillPredictionTable();
    };
    groupSelect.addEventListener("change", save);
    seriesOptions.addEventListener("change", save);
    clearButton.addEventListener("click", () => {
      groupSelect.value = "-1";
      seriesOptions.querySelectorAll("input").forEach((c) => (c.checked = false));
      groupSelect.dispatchEvent(new Event("change"));
    });

    const body = document.createElement("div");
    body.className = "weapon-filter-body";
    body.append(groupLabel, seriesFieldset, clearButton);
    row.append(summary, body);
    return row;
  });

  weaponFilterSection.replaceChildren(intro, ...rows);
}

function skillRollMatchesFilter(roll, filter) {
  const hasGroup = filter.groupIndex >= 0;
  const hasSeries = filter.seriesIndices.size > 0;
  const groupMatches = hasGroup && roll.groupIndex === filter.groupIndex;
  const seriesMatches = hasSeries && filter.seriesIndices.has(roll.seriesIndex);

  if (!hasGroup && !hasSeries) return false;
  if (!hasGroup) return seriesMatches;
  if (!hasSeries) return groupMatches;
  return filter.operator === "and"
    ? groupMatches && seriesMatches
    : groupMatches || seriesMatches;
}

function skillPredictionVisibility(filter = selectedSkillFilter()) {
  if (skillPredictionRollSets.length === 0) {
    return { count: 0, matchingRowCount: 0, visibleIndices: [] };
  }

  const count = skillPredictionRollSets[0].rolls.length;
  const allIndices = Array.from({ length: count }, (_, index) => index);
  const rowMatchesFilter = (index) => skillPredictionRollSets.some((target) =>
    skillRollMatchesFilter(target.rolls[index], skillFilterForTarget(filter, target))
  );
  const matchingIndices = allIndices.filter(rowMatchesFilter);
  return {
    count,
    matchingRowCount: matchingIndices.length,
    visibleIndices: filter.enabled ? matchingIndices : allIndices,
  };
}

function renderSkillPredictionTable() {
  if (skillPredictionRollSets.length === 0) return;

  const skillFilter = selectedSkillFilter();
  const highlightEnabled = skillHighlightEnabled.checked;
  const { count, matchingRowCount, visibleIndices } = skillPredictionVisibility(skillFilter);
  const conditionMatchCount = skillPredictionRollSets.reduce((total, target) => {
    const targetFilter = skillFilterForTarget(skillFilter, target);
    return total + target.rolls.filter((roll) => skillRollMatchesFilter(roll, targetFilter)).length;
  }, 0);

  const filterStatus = skillFilter.enabled
    ? `・条件一致${matchingRowCount.toLocaleString("ja-JP")}行`
    : "";
  skillFutureStatus.textContent = `${skillPredictionRollSets.length.toLocaleString("ja-JP")}件 × ${count.toLocaleString("ja-JP")}回・条件一致${conditionMatchCount.toLocaleString("ja-JP")}セル${filterStatus}`;
  skillFutureStatus.className = "status-pill complete";
  skillTableWrap.hidden = false;
  exportSkillCsvButton.disabled = visibleIndices.length === 0;
  skillExportStatus.textContent = skillFilter.enabled
    ? `条件一致で現在表示中の${visibleIndices.length.toLocaleString("ja-JP")}行をCSVへ出力します。`
    : `現在表示中の${visibleIndices.length.toLocaleString("ja-JP")}行をCSVへ出力します。`;

  const offsetHeader = document.createElement("th");
  const stateHeader = document.createElement("th");
  offsetHeader.scope = "col";
  offsetHeader.textContent = "何回先";
  stateHeader.scope = "col";
  stateHeader.textContent = "保存後の状態";
  const matchHeader = document.createElement("th");
  matchHeader.scope = "col";
  matchHeader.textContent = "一致";
  skillPredictionHeaderRow.replaceChildren(
    offsetHeader,
    stateHeader,
    matchHeader,
    ...skillPredictionRollSets.map((target) => {
      const header = document.createElement("th");
      header.scope = "col";
      header.textContent = comparisonTargetName(target);
      return header;
    }),
  );

  if (visibleIndices.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3 + skillPredictionRollSets.length;
    cell.className = "prediction-empty";
    cell.textContent = "指定したグループ・シリーズ条件に合う結果は表示範囲内にありません。表示回数を増やすか条件を変更してください。";
    row.append(cell);
    skillPredictionRows.replaceChildren(row);
    return;
  }

  skillPredictionRows.replaceChildren(
    ...visibleIndices.map((index) => createSkillPredictionRow(index, skillFilter, highlightEnabled)),
  );
}

function exportVisibleSkillPredictionsCsv() {
  const { visibleIndices } = skillPredictionVisibility();
  if (visibleIndices.length === 0 || skillPredictionRollSets.length === 0) {
    showSkillTargetError("CSVへ出力できるスキル未来予測の結果がありません。");
    return;
  }

  hideSkillTargetError();
  const headers = [
    t("何回先"),
    t("カウンター位置"),
    ...skillPredictionRollSets.flatMap((target) => {
      const targetName = predictionCsvTargetName(target);
      return [
        `${targetName} ${t("シリーズスキル")}`,
        `${targetName} ${t("グループスキル")}`,
      ];
    }),
  ];
  const rows = visibleIndices.map((index) => [
    index + 1,
    saveState.skillCounter + index + 1,
    ...skillPredictionRollSets.flatMap((target) => {
      const roll = target.rolls[index];
      return [
        t(SERIES_SKILLS[roll.seriesIndex] ?? `シリーズ ${roll.seriesIndex}`),
        t(GROUP_SKILLS[roll.groupIndex] ?? `グループ ${roll.groupIndex}`),
      ];
    }),
  ]);
  downloadCsv(
    `gogma-skill-future-seed-${saveState.baseSeed}-counter-${saveState.skillCounter}.csv`,
    headers,
    rows,
  );
  skillExportStatus.textContent = `${rows.length.toLocaleString("ja-JP")}行・${headers.length.toLocaleString("ja-JP")}列をCSVへ出力しました。`;
}

function createSkillPredictionRow(index, skillFilter, highlightEnabled) {
  const row = document.createElement("tr");
  const offsetCell = document.createElement("th");
  offsetCell.scope = "row";
  offsetCell.textContent = `${index + 1}回先`;
  row.append(offsetCell, createSavedStateCell("skill", index + 1, null, true));

  // 条件に一致した武器を左側の「一致」列にまとめる
  const matchCell = document.createElement("td");
  matchCell.className = "skill-match-cell";
  row.append(matchCell);

  for (const target of skillPredictionRollSets) {
    const roll = target.rolls[index];
    const cell = document.createElement("td");
    const conditionMatch = highlightEnabled && skillRollMatchesFilter(roll, skillFilterForTarget(skillFilter, target));
    cell.append(createSkillResultPair(roll, conditionMatch));
    // すでに持っている組み合わせは、一致から外さずに「所持済み：弓・火（攻撃激化）」と表示するだけ
    const holdersBadge = createOwnedSkillBadge(target, roll);
    if (holdersBadge) cell.append(holdersBadge);
    row.append(cell);

    if (conditionMatch) {
      const item = document.createElement("div");
      const name = document.createElement("div");
      item.className = "skill-match-item";
      name.className = "skill-match-name";
      name.append(...createWeaponBadge(target));
      item.append(name, createSkillResultPair(roll, true));
      if (holdersBadge) item.append(createOwnedSkillBadge(target, roll));
      item.append(createSkillAdoptButton(target, roll, index + 1));
      matchCell.append(item);
    }
  }

  if (matchCell.childElementCount === 0) {
    const none = document.createElement("span");
    none.className = "skill-match-none";
    none.textContent = "—";
    matchCell.append(none);
  }
  return row;
}

// 「所持済み：弓・火（攻撃激化）」の印。その武器種・属性で同じ組み合わせを持っていなければ null
function createOwnedSkillBadge(target, roll) {
  const holders = ownedSkillHolders(target, roll);
  if (holders.length === 0) return null;
  const badge = document.createElement("div");
  badge.className = "skill-owned-badge";
  const lines = [...new Set(holders.map((weapon) =>
    `${weaponAndAttributeText(weapon)}（${weapon.boost || "激化未設定"}）`))];
  badge.textContent = `所持済み：${lines.join("／")}`;
  badge.title = holders.map((weapon) => comparisonTargetName(weapon)).join("\n");
  return badge;
}

// スキルの当たりを採用するボタン。押すと、どの手持ち武器に付けるか（または新しく登録するか）を選ぶ
function createSkillAdoptButton(target, roll, completedRolls) {
  const wrap = document.createElement("div");
  wrap.className = "skill-adopt";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "keep-transition-button match-adopt-button";
  button.textContent = "採用して手持ちに反映";
  button.title = "このスキルを採用してセーブしたものとしてスキルカウンターの0地点を進め、手持ち武器に反映します";
  // 表の中に出すと下の行（左に固定した一致列）の後ろに隠れるので、画面の真ん中に出す窓にする
  button.addEventListener("click", () => {
    const sameKind = ownedWeapons.filter((weapon) =>
      weapon.weaponType === target.weaponType && weapon.attributeForce === target.attributeForce);
    openAdoptDialog({
      title: `${completedRolls}回先のスキルを手持ち武器に反映`,
      summary: [...createWeaponBadge(target), createSkillResultPair(roll, true)],
      note: "選ぶと、その武器のスキルを書き換え（または新しく登録し）、スキルカウンターの0地点もこの回まで進めます。",
      heading: sameKind.length > 0
        ? "どの武器のスキルを上書きしますか？（同じ武器種・属性の手持ち武器）"
        : "同じ武器種・属性の手持ち武器はありません。新しく登録します。",
      // 同じ武器が2本以上あっても見分けられるよう、激化・今のスキル・今の復元ボーナスまで出す
      choices: [
        ...sameKind.map((weapon) => ({
          tag: "上書き",
          name: comparisonTargetName(weapon),
          detail: ownedWeaponDetailText(weapon),
          onChoose: () => adoptSkillToOwned(weapon, roll, completedRolls),
        })),
        ...OWNED_BOOST_OPTIONS.map(([boost]) => ({
          name: `＋ 新しい手持ち武器として登録（${weaponAndAttributeText(target)}・${boost || "激化未設定"}）`,
          onChoose: () => adoptSkillAsNewOwned(target, boost, roll, completedRolls),
        })),
      ],
    });
  });
  wrap.append(button);
  return wrap;
}

async function adoptSkillToOwned(weapon, roll, completedRolls) {
  weapon.seriesIndex = roll.seriesIndex;
  weapon.groupIndex = roll.groupIndex;
  onOwnedWeaponsChanged();
  await adoptSkillPosition(completedRolls);
}

async function adoptSkillAsNewOwned(target, boost, roll, completedRolls) {
  if (ownedWeapons.length >= MAX_OWNED_WEAPONS) {
    showSkillTargetError(`手持ち武器は最大${MAX_OWNED_WEAPONS}本です。不要な武器を削除してください。`);
    return;
  }
  const attribute = optionName(ATTRIBUTES, target.attributeForce).replace("属性", "");
  const subtype = OWNED_SUBTYPE_BY_BOOST[target.weaponType]?.[boost] ?? "";
  ownedWeapons.push({
    id: createTargetId(),
    label: boost ? `【${boost}】${subtype ? `${subtype} ` : ""}${attribute}` : "",
    weaponType: target.weaponType,
    attributeForce: target.attributeForce,
    boost,
    subtype,
    seriesIndex: roll.seriesIndex,
    groupIndex: roll.groupIndex,
    bonuses: [null, null, null, null, null],
    categories: [null, null, null, null, null],
    rule: "upgrade",
    minEx: 2,
  });
  onOwnedWeaponsChanged();
  await adoptSkillPosition(completedRolls);
}

function createSkillResultPair(roll, conditionMatch) {
  const tags = document.createElement("div");
  const seriesTag = document.createElement("span");
  const groupTag = document.createElement("span");
  tags.className = "skill-result-pair";
  seriesTag.className = `skill-tag series${conditionMatch ? " desired" : ""}`;
  seriesTag.textContent = SERIES_SKILLS[roll.seriesIndex] ?? `シリーズ ${roll.seriesIndex}`;
  groupTag.className = `skill-tag group${conditionMatch ? " jackpot" : ""}`;
  groupTag.textContent = GROUP_SKILLS[roll.groupIndex] ?? `グループ ${roll.groupIndex}`;
  tags.append(seriesTag, groupTag);
  return tags;
}

function clearSkillPredictionResults() {
  skillPredictionRollSets = [];
  skillPredictionHeaderRow.replaceChildren();
  skillPredictionRows.replaceChildren();
  skillTableWrap.hidden = true;
  exportSkillCsvButton.disabled = true;
  skillExportStatus.textContent = "予測結果を表示するとCSVへ出力できます。";
}

function resetSkillSearchFeedback() {
  skillStatus.textContent = saveState.skillCounter === null
    ? "観測結果を入力してください"
    : `現在のスキルカウンター ${saveState.skillCounter.toLocaleString("ja-JP")}`;
  skillStatus.className = `status-pill${saveState.skillCounter === null ? "" : " complete"}`;
  hideSkillError();
}

function showSkillError(message) {
  skillError.textContent = message;
  skillError.hidden = false;
}

function hideSkillError() {
  skillError.textContent = "";
  skillError.hidden = true;
}

function showSkillTargetError(message) {
  skillTargetError.textContent = message;
  skillTargetError.hidden = false;
}

function hideSkillTargetError() {
  skillTargetError.textContent = "";
  skillTargetError.hidden = true;
}

function showPredictionError(message) {
  predictionError.textContent = message;
  predictionError.hidden = false;
}

function hidePredictionError() {
  predictionError.textContent = "";
  predictionError.hidden = true;
}

function setRunning(running) {
  startButton.disabled = running;
  cancelButton.disabled = !running;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}
