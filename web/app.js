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
    .weapon-filter-state { color: #a9a690; font-size: 0.8rem; }
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
    /* 希望に当てはまる枠：金の太い縁＋光＋明るい文字。関係ない枠：灰色で薄く */
    .bonus-tag.wish-part {
      opacity: 1; outline: 3px solid #ffd44d; outline-offset: 1px; font-weight: 900; color: #ffffff;
      box-shadow: 0 0 14px rgb(255 212 77 / 70%); filter: brightness(1.25) saturate(1.3);
    }
    .bonus-tag.not-wish { opacity: 0.25; filter: grayscale(1); }
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
    .comparison-table.compact-columns .bonus-match-cell { display: flex; flex-wrap: wrap; gap: 8px; min-width: 320px; }
    .comparison-table.compact-columns .bonus-match-cell .skill-match-item {
      margin: 0; padding: 8px 10px; border: 1px solid #5a5236; border-radius: 8px; background: rgb(0 0 0 / 22%);
    }
    .comparison-table.compact-columns .bonus-match-cell .comparison-bonus-set { grid-template-columns: repeat(5, auto); }
    .match-adopt-button { display: inline-block; width: auto; margin-top: 4px; padding: 4px 10px; font-size: 0.7rem; }
    .bonus-wish-next-wish { color: #a9a690; font-size: 0.74rem; }
    .bonus-wish-next-result { font-weight: 800; color: #cfeec0; }
    .bonus-wish-next-list li.none .bonus-wish-next-result { color: #888; font-weight: 400; }
    .bonus-wish-plan { margin: 0; padding-left: 1.6em; display: grid; gap: 4px; font-size: 0.8rem; line-height: 1.6; }
    .comparison-table { --match-column-width: 150px; }
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
    .bonus-tag.attack.ex { border-color: #ff9a88; background: linear-gradient(135deg, rgb(205 70 52 / 70%), rgb(220 129 115 / 30%)); box-shadow: 0 0 0 1px rgb(255 154 136 / 45%), 0 0 16px rgb(230 85 65 / 55%); color: #fff3f0; }
    .bonus-tag.affinity.ex { border-color: #ffd86a; background: linear-gradient(135deg, rgb(190 145 35 / 70%), rgb(224 189 89 / 30%)); box-shadow: 0 0 0 1px rgb(255 216 106 / 45%), 0 0 16px rgb(210 165 40 / 55%); color: #fffbe8; }
    .bonus-tag.element.ex { border-color: #8fdcf5; background: linear-gradient(135deg, rgb(40 130 165 / 70%), rgb(105 183 208 / 30%)); box-shadow: 0 0 0 1px rgb(143 220 245 / 45%), 0 0 16px rgb(50 150 190 / 55%); color: #f0fbff; }
    .bonus-tag.sharpness-ammo.ex { border-color: #c4b3ff; background: linear-gradient(135deg, rgb(110 85 180 / 70%), rgb(162 146 207 / 30%)); box-shadow: 0 0 0 1px rgb(196 179 255 / 45%), 0 0 16px rgb(120 95 200 / 55%); color: #f7f3ff; }
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
    .owned-weapon-form-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
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
    .bonus-tag .tier-up { margin-left: 2px; color: #7dff8a; font-weight: 900; text-shadow: 0 0 6px rgb(125 255 138 / 60%); }
    .bonus-tag .tier-down { margin-left: 2px; color: #ff7a6b; font-weight: 900; }
    .owned-update-button { border-color: #4f9a92; color: #bff3ec; }
    .owned-remove-button { margin-left: auto; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; background: #30332b; color: #c9c6b8; cursor: pointer; }
    .owned-remove-button:hover { background: #5a2e28; color: #fff; }
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
const MAX_OWNED_WEAPONS = 60;
// 手持ち武器を「一致」にする条件
const OWNED_RULE_OPTIONS = [
  ["upgrade", "今より強くなる（どの枠も下がらず、1つ以上上がる）"],
  ["total", "合計で強くなる（下がる枠があっても全体で上がる）"],
  ["ex", "EXの数で判定"],
];
let ownedWeapons = loadOwnedWeapons();
let ownedWeaponSection = null;
// 復元ボーナス未来予測の画面設定（登録欄の切り替え・表の表示）。このブラウザに保存
const BONUS_VIEW_KEY = "gogma-seed-finder-bonus-view-v1";
let showAllComparisonColumns = null;
// 開け閉めできる欄は最初は閉じておき、開いた欄は書き直しても開いたままにする
const openDetailKeys = new Set();
// 武器種ごとの希望ボーナス { [weaponType]: { counts: [攻撃, 会心, 属性, 斬れ味・装填] } }
const BONUS_WISHES_KEY = "gogma-seed-finder-bonus-wishes-v1";
const BONUS_WISH_MAX = [5, 5, 4, 2];
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

document.querySelector("#bonus-operation-selector").addEventListener("change", () => {
  bonusPrediction.mode = bonusOperationKeep.checked ? "keep" : "reset";
  renderBonusOperation();
  persistAppState();
  renderPredictionFilters();
  updatePredictionPoolNote();
  void Promise.all([refreshPredictions(), refreshComparisonPredictions()]);
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
  // 切り替え欄は使わない（手持ち武器の登録で「同じ構成で再復元」も同じ表に出す）
  const operationSection = document.querySelector(".bonus-operation-section");
  if (operationSection) operationSection.style.display = "none";
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
  const weaponType = Number(weaponSelect.value);
  const selects = [...row.querySelectorAll("select")];
  // 隠したプルダウンが未入力だとブラウザが送信を黙って止めるので、未入力チェックは検索側に任せる
  selects.forEach((select) => { select.required = false; });
  const firstEmpty = selects.findIndex((select) => select.value === "");
  let active = firstEmpty === -1 ? 0 : firstEmpty;

  const body = document.createElement("div");
  body.className = "observation-card-body";
  const chips = document.createElement("div");
  chips.className = "observation-chips";
  const palette = document.createElement("div");
  palette.className = "observation-palette";

  const setValue = (index, value) => {
    selects[index].value = value;
    selects[index].dispatchEvent(new Event("change", { bubbles: true }));
  };

  const render = () => {
    chips.replaceChildren(...selects.map((select, index) => {
      const chip = document.createElement("button");
      const slotName = document.createElement("span");
      const value = document.createElement("span");
      const bonusId = select.value === "" ? null : Number(select.value);
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
    const activeValue = selects[active]?.value ?? "";
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
  for (const [bonusId, name] of availableGogmaBonuses()) {
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
      setValue(active, String(bonusId));
      const nextEmpty = selects.findIndex((select, index) => index > active && select.value === "");
      if (nextEmpty !== -1) active = nextEmpty;
      else if (active < 4) active += 1;
      render();
    });
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "text-button observation-clear";
  clearButton.textContent = "この回をクリア";
  clearButton.addEventListener("click", () => {
    selects.forEach((_, index) => setValue(index, ""));
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
  row.append(body);
  render();
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

  setStateFromBonus(candidate.seed, candidate.counter, "検索結果", true);
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
    return bonusWishFor(weaponType).counts
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
    if (counts.some((count) => count > 0)) bonusWishes[weaponType] = { counts };
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
    updateComparisonStatus();
    renderBonusWishSummary();
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
      header.append(kind, document.createTextNode(comparisonTargetName(target)));
      if (target.kind === "owned") {
        const layout = document.createElement("span");
        layout.className = "column-layout";
        layout.textContent = ownedLayoutText(target);
        header.append(layout);
      }
      return header;
    }),
  );

  const { count, minimumExCount, visibleIndices } = comparisonPredictionVisibility();
  comparisonRows.replaceChildren(
    ...visibleIndices.map((index) => createComparisonRow(index)),
  );
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

function createComparisonRow(index) {
  const row = document.createElement("tr");
  const offsetCell = document.createElement("th");

  offsetCell.scope = "row";
  offsetCell.textContent = `${index + 1}回先`;
  if (bonusExFilterEnabled.checked) row.classList.add("prediction-match");
  row.append(offsetCell, createSavedStateCell("bonus", index + 1, null, true));

  // 希望ボーナスに一致した武器を左側の「一致」列にまとめる
  const matchCell = document.createElement("td");
  matchCell.className = "bonus-match-cell";
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
      name.textContent = `${comparisonTargetName(target)}（${target.kind === "owned" ? "同じ構成" : "リセット"}）`;
      // 「一致」列だけで操作できるよう、採用ボタンもここに付ける
      const matchButton = target.kind === "owned"
        ? createAdoptOwnedUpdateButton(target, target.rolls[index], index + 1)
        : createAdoptAsOwnedButton(target, target.rolls[index], index + 1);
      matchButton.classList.add("match-adopt-button");
      item.append(name, createCompactBonusSet(target, target.rolls[index], true), matchButton);
      matchCell.append(item);
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

  if (matchCell.childElementCount === 0) {
    const none = document.createElement("span");
    none.className = "skill-match-none";
    none.textContent = "—";
    matchCell.append(none);
  } else {
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
  const need = highlightWish && target.kind !== "owned" ? [...bonusWishFor(target.weaponType).counts] : null;
  bonusIds.forEach((bonusId, slotIndex) => {
    const tag = document.createElement("span");
    tag.className = `bonus-tag compact ${bonusClassName(bonusId)}${EX_BONUS_IDS.has(bonusId) ? " ex" : ""}`;
    tag.textContent = compactGogmaBonusName(target.weaponType, bonusId);
    if (need) {
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

function bonusWishFor(weaponType) {
  const entry = bonusWishes[weaponType];
  return {
    counts: BONUS_WISH_MAX.map((max, category) =>
      Math.max(0, Math.min(max, Math.trunc(Number(entry?.counts?.[category]) || 0)))),
  };
}

function bonusWishTotal(wish) {
  return wish.counts.reduce((sum, count) => sum + count, 0);
}

// 狙い（リセット）は武器種ごとの希望、手持ち（同じ構成）は武器ごとのEX数
function targetHasWish(target) {
  return target.kind === "owned"
    ? (target.rule === "ex" ? target.minEx > 0 : ownedBonusesKnown(target))
    : bonusWishTotal(bonusWishFor(target.weaponType)) > 0;
}

function targetWishText(target) {
  return target.kind === "owned"
    ? `同じ構成で${ownedRuleText(target)}`
    : `リセットで ${bonusWishText(target.weaponType)}`;
}

function bonusWishText(weaponType) {
  const wish = bonusWishFor(weaponType);
  const parts = keepCategoriesForWeapon(weaponType, 1)
    .filter(([category]) => wish.counts[category] > 0)
    .map(([category, name]) => `${name}×${wish.counts[category]}`);
  return parts.length > 0 ? parts.join("＋") : "指定なし";
}

// リセット：系統の数（順不同・II/III/EXは区別しない）を満たすか。手持ち：EXの数が最低数以上か
function rollMatchesBonusWish(target, bonusIds) {
  if (target.kind === "owned") return ownedRollMatches(target, bonusIds);
  const wish = bonusWishFor(target.weaponType);
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

  const step1 = createStep("1", "武器を登録する",
    "「狙い」はリセットして再復元で狙う武器種・属性、「手持ち武器」は持っている武器（同じ構成で再復元してEXを厳選する武器）です。下のボタンで、どちらを登録するか切り替えます。");
  step1.append(...[
    document.querySelector(".comparison-settings"),
    document.querySelector(".comparison-actions"),
    comparisonTargetList,
    comparisonError,
    ownedWeaponSection,
  ].filter(Boolean));

  const step2 = createStep("2", "希望ボーナスを決める（狙い）",
    "狙いの武器種ごとに、リセットで欲しい系統の数を決めます。手持ち武器の条件は、①の「手持ち武器」の欄で武器ごとに決めます。");
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
function setupRegistrationSwitch() {
  const view = loadBonusView();
  const resetParts = [
    document.querySelector(".comparison-settings"),
    document.querySelector(".comparison-actions"),
    comparisonTargetList.closest("details") ?? comparisonTargetList,
    bonusWishSection.closest(".step-frame") ?? bonusWishSection,
  ].filter(Boolean);
  const intro = document.querySelector(".comparison-section .prediction-intro");
  if (intro) {
    intro.textContent = "登録した武器ぜんぶについて、これから何回再復元すると希望のボーナスが出るかを予測します。①で武器を登録し、②で希望を決めると、③に結果が出ます。";
  }

  const switcher = document.createElement("div");
  switcher.className = "registration-switch";
  const label = document.createElement("span");
  label.className = "registration-switch-label";
  label.textContent = "登録する";
  const buttons = [
    ["reset", "狙い（リセットして再復元）"],
    ["owned", "手持ち武器（同じ構成で再復元）"],
  ].map(([value, text]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.value = value;
    button.textContent = text;
    return button;
  });
  const apply = (value) => {
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.value === value));
    resetParts.forEach((part) => { part.style.display = value === "reset" ? "" : "none"; });
    ownedWeaponSection.style.display = value === "owned" ? "" : "none";
  };
  buttons.forEach((button) => button.addEventListener("click", () => {
    const next = loadBonusView();
    next.registration = button.dataset.value;
    persistBonusView(next);
    apply(button.dataset.value);
  }));
  switcher.append(label, ...buttons);
  (document.querySelector(".comparison-settings") ?? comparisonTargetList).before(switcher);
  apply(view.registration);
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
  description.textContent = "上で登録した武器種ごとに、リセットで欲しい系統の数を決めます（順不同・II／III／EXは区別しない）。当たりは表の「一致」列に出ます。設定はこのブラウザに保存されます。";
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
      if (counts.some((count) => count > 0)) bonusWishes[weaponType] = { counts };
      else delete bonusWishes[weaponType];
      persistBonusWishes();
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
    clearButton.addEventListener("click", () => {
      categorySelects.forEach((select) => { select.value = "0"; });
      save();
    });

    const body = document.createElement("div");
    body.className = "weapon-filter-body";
    body.append(categoryFieldset, note, clearButton);
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

  const list = document.createElement("ul");
  list.className = "bonus-wish-next-list";
  // 例：「あと1回（リセット）雷太刀  攻EX 攻II 会II 攻II 攻III  同じ回にほか2武器も一致」
  for (const { target, hits } of results) {
    const item = document.createElement("li");
    item.title = `条件：${targetWishText(target)}`;
    const when = document.createElement("span");
    when.className = "bonus-wish-next-result";
    const kind = document.createElement("span");
    kind.className = `bonus-wish-next-kind ${target.kind === "owned" ? "owned" : "reset"}`;
    kind.textContent = target.kind === "owned" ? "（同じ構成）" : "（リセット）";
    const name = document.createElement("strong");
    name.textContent = comparisonTargetName(target);
    if (hits.length === 0) {
      item.classList.add("none");
      when.textContent = "—";
      const none = document.createElement("span");
      none.className = "bonus-wish-next-wish";
      none.textContent = "表示範囲内に一致なし（表示する回数を増やしてください）";
      item.append(when, kind, name, none);
    } else {
      when.textContent = `あと${hits[0] + 1}回`;
      const others = results.filter((other) => other.target !== target && other.hits.includes(hits[0])).length;
      const wish = document.createElement("span");
      wish.className = "bonus-wish-next-target";
      wish.textContent = target.kind === "owned"
        ? `希望：${ownedRuleText(target)}`
        : `希望：${bonusWishText(target.weaponType)}`;
      const note = document.createElement("span");
      note.className = "bonus-wish-next-wish";
      note.textContent = others > 0 ? `同じ回にほか${others}武器も一致` : "";
      item.append(when, kind, name, wish, createCompactBonusSet(target, target.rolls[hits[0]], true), note);
    }
    list.append(item);
  }

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
      const name = comparisonTargetName(target);
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
        return {
          id: typeof weapon.id === "string" && weapon.id ? weapon.id : createTargetId(),
          label: typeof weapon.label === "string" ? weapon.label.slice(0, 24) : "",
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

function createAdoptAsOwnedButton(target, bonusIds, completedRolls) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "keep-transition-button";
  button.textContent = "採用して手持ちに登録";
  button.title = "この結果を採用してセーブしたものとして0地点を進め、この構成を手持ち武器に登録します";
  button.addEventListener("click", () => void adoptResetAsOwned(target, bonusIds, completedRolls));
  return button;
}

// リセットの当たりを採用：手持ち武器に登録（同じ武器種・属性があれば上書きを確認）して、0地点を進める
async function adoptResetAsOwned(target, bonusIds, completedRolls) {
  hideComparisonError();
  const categories = bonusIds.map(bonusCategoryId);
  const sameKind = ownedWeapons.filter((weapon) =>
    weapon.weaponType === target.weaponType && weapon.attributeForce === target.attributeForce);
  let weapon = null;
  if (sameKind.length > 0 && window.confirm(
    `手持ちに「${comparisonTargetName(sameKind[0])}」があります。この武器の構成を上書きしますか？\n（キャンセルを押すと、新しい武器として追加します）`,
  )) {
    weapon = sameKind[0];
    weapon.categories = categories;
    weapon.bonuses = [...bonusIds];
  } else {
    if (ownedWeapons.length >= MAX_OWNED_WEAPONS) {
      showComparisonError(`手持ち武器は最大${MAX_OWNED_WEAPONS}本です。不要な武器を削除してください。`);
      return;
    }
    weapon = {
      id: createTargetId(),
      label: "",
      weaponType: target.weaponType,
      attributeForce: target.attributeForce,
      bonuses: [...bonusIds],
      categories,
      rule: "upgrade",
      minEx: 2,
    };
    ownedWeapons.push(weapon);
  }
  persistOwnedWeapons();
  renderOwnedWeaponSection();
  await adoptBonusPosition(completedRolls);
  bonusStateMessage.textContent = `${completedRolls}回先の結果を採用して0地点を進め、「${comparisonTargetName(weapon)}」を手持ち武器（${ownedLayoutText(weapon)}）として登録しました。`;
}

function createAdoptOwnedUpdateButton(target, bonusIds, completedRolls) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "keep-transition-button owned-update-button";
  button.textContent = "採用して手持ちを更新";
  button.title = "この結果を採用してセーブしたものとして0地点を進め、この手持ち武器の今のボーナスを書き換えます";
  button.addEventListener("click", () => void adoptOwnedUpdate(target, bonusIds, completedRolls));
  return button;
}

// 同じ構成の結果を採用：手持ち武器の今のボーナスを更新して、0地点を進める
async function adoptOwnedUpdate(target, bonusIds, completedRolls) {
  const weapon = ownedWeapons.find((candidate) => candidate.id === target.id);
  if (!weapon) return;
  weapon.bonuses = [...bonusIds];
  weapon.categories = bonusIds.map(bonusCategoryId);
  persistOwnedWeapons();
  renderOwnedWeaponSection();
  await adoptBonusPosition(completedRolls);
  bonusStateMessage.textContent = `${completedRolls}回先の結果を採用して0地点を進め、「${comparisonTargetName(weapon)}」を ${ownedLayoutText(weapon)} に更新しました。`;
}

// 1〜5枠目の今のボーナス（II・III・EXまで）を選ぶ欄
function createOwnedSlotSelects(weaponType, attributeForce, bonuses) {
  const options = gogmaBonusesForWeapon(weaponType, attributeForce);
  return Array.from({ length: 5 }, (_, slotIndex) => {
    const label = document.createElement("label");
    const text = document.createElement("span");
    const select = document.createElement("select");
    text.textContent = `${slotIndex + 1}枠目`;
    populateSelect(select, [["", "選択"], ...options], bonuses[slotIndex] ?? "");
    label.append(text, select);
    return label;
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

function ownedWeaponFromInputs(base, slotsContainer, ruleSelect, exSelect) {
  const bonuses = readSlotSelects(slotsContainer);
  return {
    ...base,
    bonuses,
    categories: bonuses.map((bonusId) => bonusId === null ? null : bonusCategoryId(bonusId)),
    rule: ruleSelect.value,
    minEx: Number(exSelect.value),
  };
}

function readSlotSelects(container) {
  return [...container.querySelectorAll("select")].map((select) =>
    select.value === "" ? null : Number(select.value));
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

function renderOwnedWeaponSection() {
  if (!ownedWeaponSection) return;
  const intro = document.createElement("div");
  intro.className = "skill-filter-intro";
  const title = document.createElement("strong");
  title.textContent = "手持ち武器（同じ構成で再復元＝EX厳選）";
  const description = document.createElement("p");
  description.textContent = "実際に持っている武器と今のボーナスを登録すると、「同じ構成で再復元」したときの結果が表に並び、今より強くなる回が「一致」列に出ます（表の↑↓は今と比べて上がる／下がる枠）。ゲーム画面の1枠目〜5枠目の順番どおりに入れてください（順番が違うと予測がずれます）。";
  intro.append(title, description);

  // 追加フォーム
  const form = document.createElement("div");
  form.className = "owned-weapon-form";
  const nameLabel = document.createElement("label");
  const nameText = document.createElement("span");
  const nameInput = document.createElement("input");
  nameText.textContent = "名前（任意）";
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.placeholder = "例：メイン雷弓";
  nameLabel.append(nameText, nameInput);
  const weaponLabel = document.createElement("label");
  const weaponText = document.createElement("span");
  const weaponSelectEl = document.createElement("select");
  weaponText.textContent = "武器種";
  populateSelect(weaponSelectEl, WEAPON_TYPES, Number(comparisonWeaponSelect.value));
  weaponLabel.append(weaponText, weaponSelectEl);
  const attributeLabel = document.createElement("label");
  const attributeText = document.createElement("span");
  const attributeSelectEl = document.createElement("select");
  attributeText.textContent = "属性";
  populateSelect(attributeSelectEl, ATTRIBUTES, Number(comparisonAttributeSelect.value));
  attributeLabel.append(attributeText, attributeSelectEl);
  const formRule = createOwnedRuleControls({ rule: "upgrade", minEx: 2 });
  const slots = document.createElement("div");
  slots.className = "owned-weapon-slots";
  const renderFormSlots = () => {
    const current = readSlotSelects(slots);
    slots.replaceChildren(...createOwnedSlotSelects(
      Number(weaponSelectEl.value), Number(attributeSelectEl.value), current));
  };
  renderFormSlots();
  weaponSelectEl.addEventListener("change", renderFormSlots);
  attributeSelectEl.addEventListener("change", renderFormSlots);
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
    }, slots, formRule.ruleSelect, formRule.exSelect);
    const problem = ownedWeaponProblem(weapon);
    if (problem) {
      error.textContent = problem;
      error.hidden = false;
      return;
    }
    if (ownedWeapons.length >= MAX_OWNED_WEAPONS) {
      error.textContent = `手持ち武器は最大${MAX_OWNED_WEAPONS}本です。`;
      error.hidden = false;
      return;
    }
    ownedWeapons.push(weapon);
    persistOwnedWeapons();
    renderOwnedWeaponSection();
    void refreshComparisonPredictions();
  });
  const formRow = document.createElement("div");
  formRow.className = "owned-weapon-form-row";
  formRow.append(nameLabel, weaponLabel, attributeLabel);
  form.append(formRow, slots, formRule.wrap, addButton, error);

  // 登録済みの手持ち武器
  const cards = ownedWeapons.map((weapon) => {
    const card = document.createElement("details");
    card.className = "weapon-filter-row owned-weapon-card";
    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.className = "weapon-filter-name";
    name.textContent = comparisonTargetName(weapon);
    const state = document.createElement("span");
    state.className = "weapon-filter-state";
    const updateState = () => {
      const currentProblem = ownedWeaponProblem(weapon);
      state.textContent = currentProblem
        ? `⚠ ${currentProblem}`
        : `${t(optionName(WEAPON_TYPES, weapon.weaponType))}・${t(optionName(ATTRIBUTES, weapon.attributeForce))}｜${ownedLayoutText(weapon)}｜${ownedRuleText(weapon)}で一致`;
    };
    updateState();
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "owned-remove-button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `${comparisonTargetName(weapon)}を削除`);
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      ownedWeapons = ownedWeapons.filter((candidate) => candidate.id !== weapon.id);
      persistOwnedWeapons();
      renderOwnedWeaponSection();
      void refreshComparisonPredictions();
    });
    summary.append(name, state);
    setupCollapsible(card, summary, `owned:${weapon.id}`, "クリックで今のボーナスと条件の設定欄が開きます");
    summary.append(removeButton);

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
    const cardSlots = document.createElement("div");
    cardSlots.className = "owned-weapon-slots";
    cardSlots.append(...createOwnedSlotSelects(weapon.weaponType, weapon.attributeForce, weapon.bonuses));
    const cardRule = createOwnedRuleControls(weapon);
    const save = () => {
      const next = ownedWeaponFromInputs(weapon, cardSlots, cardRule.ruleSelect, cardRule.exSelect);
      // 以前の登録で系統だけ分かっている枠は、ボーナスを選ぶまで系統を残す
      next.categories = next.categories.map((category, slotIndex) => category ?? weapon.categories[slotIndex]);
      Object.assign(weapon, next, { label: renameInput.value.trim() });
      name.textContent = comparisonTargetName(weapon);
      updateState();
      persistOwnedWeapons();
      void refreshComparisonPredictions();
    };
    renameInput.addEventListener("change", save);
    cardSlots.addEventListener("change", save);
    cardRule.wrap.addEventListener("change", save);
    body.append(renameLabel, cardSlots, cardRule.wrap);
    card.append(summary, body);
    return card;
  });

  const listTitle = document.createElement("p");
  listTitle.className = "weapon-filter-empty";
  listTitle.textContent = ownedWeapons.length === 0
    ? "まだ登録がありません。表の「採用して手持ちに登録」からも登録できます。"
    : `登録済み ${ownedWeapons.length}本（名前を押すと構成を直せます）`;

  ownedWeaponSection.replaceChildren(intro, form, listTitle, ...cards);
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
    state.textContent = hasWeaponSkillFilter(weaponType)
      ? [
          entry.groupIndex >= 0 ? GROUP_SKILLS[entry.groupIndex] : null,
          entry.seriesIndices.length > 0 ? entry.seriesIndices.map((i) => SERIES_SKILLS[i]).join(" / ") : null,
        ].filter(Boolean).join(" ＋ ")
      : "共通の条件を使用";
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
      state.textContent = hasWeaponSkillFilter(weaponType)
        ? [
            next.groupIndex >= 0 ? GROUP_SKILLS[next.groupIndex] : null,
            next.seriesIndices.length > 0 ? next.seriesIndices.map((i) => SERIES_SKILLS[i]).join(" / ") : null,
          ].filter(Boolean).join(" ＋ ")
        : "共通の条件を使用";
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
    row.append(cell);

    if (conditionMatch) {
      const item = document.createElement("div");
      const name = document.createElement("div");
      item.className = "skill-match-item";
      name.className = "skill-match-name";
      name.textContent = comparisonTargetName(target);
      item.append(name, createSkillResultPair(roll, true));
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
