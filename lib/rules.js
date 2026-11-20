// Rule-based check against ingredients that are prohibited in cosmetics or treated as
// medicines in Japan. This runs independently of the AI so that well-known red flags
// are never missed. Matching is done on the printed text and the English name.
// The list is a starting point for reference, not a complete legal database.

export const RULES = [
  {
    id: "mercury",
    level: "danger",
    patterns: [/mercur/i, /\bcalomel\b/i, /水銀/, /甘汞/, /汞/, /수은/],
    msg: {
      ja: "水銀・水銀化合物は日本の化粧品基準で配合禁止です。海外の美白クリームで検出例があります。使用を中止してください。",
      en: "Mercury compounds are prohibited in cosmetics in Japan and have been found in some imported whitening creams. Stop using it.",
      zh: "汞及其化合物在日本化妆品标准中禁止使用，海外美白霜曾被检出。请停止使用。",
      ko: "수은 및 수은 화합물은 일본 화장품 기준에서 배합 금지입니다. 해외 미백 크림에서 검출 사례가 있습니다. 사용을 중단하세요.",
    },
  },
  {
    id: "steroid",
    level: "danger",
    patterns: [
      /clobetasol/i, /betamethason/i, /dexamethason/i, /hydrocortison/i, /prednisol/i,
      /triamcinolon/i, /fluocinol/i, /mometason/i,
      /クロベタゾール/, /ベタメタゾン/, /デキサメタゾン/, /ヒドロコルチゾン/, /プレドニゾロン/,
      /氯倍他索/, /倍他米松/, /地塞米松/, /氢化可的松/,
      /스테로이드/, /베타메타손/, /덱사메타손/,
    ],
    msg: {
      ja: "副腎皮質ステロイドは医薬品成分で、化粧品には配合できません。長期使用で皮膚が薄くなるなどの副作用があります。",
      en: "Corticosteroids are medicinal ingredients and cannot be used in cosmetics in Japan. Long-term use can thin the skin.",
      zh: "皮质类固醇属于药品成分，在日本不能添加于化妆品中。长期使用可能导致皮肤变薄等副作用。",
      ko: "부신피질 스테로이드는 의약품 성분으로 화장품에 배합할 수 없습니다. 장기 사용 시 피부가 얇아지는 등의 부작용이 있습니다.",
    },
  },
  {
    id: "tretinoin",
    level: "warning",
    patterns: [/tretinoin/i, /retinoic acid/i, /トレチノイン/, /維Ａ酸|维A酸/, /트레티노인/],
    msg: {
      ja: "トレチノインは日本では医薬品成分で、化粧品には配合できません。妊娠中は特に避けてください。",
      en: "Tretinoin is a prescription-medicine ingredient in Japan and not allowed in cosmetics. Avoid during pregnancy.",
      zh: "维A酸在日本属于药品成分，不能用于化妆品。孕期尤其应避免。",
      ko: "트레티노인은 일본에서 의약품 성분으로 화장품에 배합할 수 없습니다. 임신 중에는 특히 피하세요.",
    },
  },
  {
    id: "hydroquinone",
    level: "caution",
    patterns: [/hydroquinone/i, /ハイドロキノン|ヒドロキノン/, /氢醌|對苯二酚|对苯二酚/, /하이드로퀴논/],
    msg: {
      ja: "ハイドロキノンは日本でも化粧品に使えますが、海外製品は高濃度のことがあります。刺激や白斑に注意し、濃度を確認してください。",
      en: "Hydroquinone is allowed in Japanese cosmetics, but imported products may be high-strength. Check the concentration; watch for irritation.",
      zh: "氢醌在日本可用于化妆品，但海外产品浓度可能较高。请确认浓度，注意刺激。",
      ko: "하이드로퀴논은 일본에서도 화장품에 사용 가능하지만 해외 제품은 고농도일 수 있습니다. 농도를 확인하고 자극에 주의하세요.",
    },
  },
  {
    id: "formaldehyde",
    level: "warning",
    patterns: [/formaldehyde/i, /formalin/i, /ホルムアルデヒド/, /甲醛/, /포름알데히드/],
    msg: {
      ja: "ホルムアルデヒドは日本の化粧品基準で配合禁止です。",
      en: "Formaldehyde is prohibited in cosmetics in Japan.",
      zh: "甲醛在日本化妆品标准中禁止使用。",
      ko: "포름알데히드는 일본 화장품 기준에서 배합 금지입니다.",
    },
  },
  {
    id: "lead",
    level: "danger",
    patterns: [/\blead\b(?! to)/i, /\bplumb/i, /\bkohl\b/i, /\bsurma\b/i, /鉛(?!筆)/, /铅(?!笔)/, /\b납\b/],
    msg: {
      ja: "鉛を含む可能性があります（一部の海外アイライナー「コール」「スルマ」など）。使用を避けてください。",
      en: "May contain lead (e.g. some imported kohl/surma eyeliners). Avoid using it.",
      zh: "可能含铅（如部分海外眼线粉 kohl/surma）。请避免使用。",
      ko: "납이 포함되었을 수 있습니다(일부 해외 콜/수르마 아이라이너 등). 사용을 피하세요.",
    },
  },
  {
    id: "melatonin",
    level: "warning",
    patterns: [/melatonin/i, /メラトニン/, /褪黑/, /멜라토닌/],
    msg: {
      ja: "メラトニンは日本では医薬品扱いで、サプリとしては販売されていません。個人輸入は2か月分以内が目安です。",
      en: "Melatonin is treated as a medicine in Japan and not sold as a supplement. Personal import is limited to about 2 months' supply.",
      zh: "褪黑素在日本被视为药品，不作为保健品销售。个人进口以2个月用量为限。",
      ko: "멜라토닌은 일본에서 의약품으로 취급되며 보충제로 판매되지 않습니다. 개인 수입은 2개월분 이내가 기준입니다.",
    },
  },
  {
    id: "dhea",
    level: "warning",
    patterns: [/\bDHEA\b/i, /dehydroepiandrosterone/i, /デヒドロエピアンドロステロン/, /脱氢表雄酮/],
    msg: {
      ja: "DHEAは日本では医薬品扱いのホルモン成分です。自己判断での使用は避けてください。",
      en: "DHEA is a hormone treated as a medicine in Japan. Do not use without medical advice.",
      zh: "DHEA在日本属于药品类激素成分，请勿自行服用。",
      ko: "DHEA는 일본에서 의약품으로 취급되는 호르몬 성분입니다. 임의 사용을 피하세요.",
    },
  },
  {
    id: "ephedra",
    level: "danger",
    patterns: [/ephedr/i, /ma huang/i, /麻黄/, /エフェドラ|エフェドリン/, /마황|에페드린/],
    msg: {
      ja: "エフェドラ（麻黄）・エフェドリンは日本では医薬品扱いです。心臓や血圧への重い副作用の報告があります。",
      en: "Ephedra/ephedrine is a medicine in Japan; serious heart and blood-pressure side effects have been reported.",
      zh: "麻黄/麻黄碱在日本属于药品，有严重心脏和血压副作用的报告。",
      ko: "마황/에페드린은 일본에서 의약품으로 취급되며 심장·혈압 관련 심각한 부작용 보고가 있습니다.",
    },
  },
  {
    id: "yohimbe",
    level: "warning",
    patterns: [/yohimb/i, /ヨヒンビン|ヨヒンベ/, /育亨宾/, /요힘빈/],
    msg: {
      ja: "ヨヒンベ・ヨヒンビンは日本では医薬品扱いです。血圧上昇などの副作用があります。",
      en: "Yohimbe/yohimbine is treated as a medicine in Japan and can raise blood pressure.",
      zh: "育亨宾在日本属于药品，可能导致血压升高。",
      ko: "요힘베/요힘빈은 일본에서 의약품으로 취급되며 혈압 상승 등의 부작용이 있습니다.",
    },
  },
  {
    id: "senna",
    level: "caution",
    patterns: [/senna/i, /センナ/, /番泻|番瀉/, /센나/],
    msg: {
      ja: "センナの葉・果実は日本では医薬品扱いです（茎は食品可）。ダイエット茶などに入っていることがあり、下痢や腹痛の原因になります。",
      en: "Senna leaf/pod is a medicine in Japan (stem is allowed in food). Often in 'diet teas'; can cause diarrhoea.",
      zh: "番泻叶/果实在日本属于药品（茎可用于食品），常见于减肥茶，可能引起腹泻。",
      ko: "센나 잎·열매는 일본에서 의약품으로 취급됩니다(줄기는 식품 가능). 다이어트 차에 들어 있는 경우가 있으며 설사의 원인이 됩니다.",
    },
  },
  {
    id: "undeclared_drugs",
    level: "danger",
    patterns: [
      /sibutramin/i, /sildenafil/i, /tadalafil/i, /vardenafil/i, /phenolphthalein/i, /fluoxetin/i,
      /シブトラミン/, /シルデナフィル/, /タダラフィル/, /フェノールフタレイン/,
      /西布曲明/, /西地那非/, /他达拉非/, /酚酞/,
    ],
    msg: {
      ja: "医薬品成分です。ダイエットや精力増強をうたう海外製品で検出され、健康被害が報告されています。使用しないでください。",
      en: "This is a medicinal drug ingredient found in some 'diet' or 'enhancement' products, linked to health harm. Do not use.",
      zh: "这是药品成分，曾在海外减肥或壮阳产品中检出并造成健康损害。请勿使用。",
      ko: "의약품 성분입니다. 다이어트·정력 강화를 내세운 해외 제품에서 검출되어 건강 피해가 보고되었습니다. 사용하지 마세요.",
    },
  },
  {
    id: "thc",
    level: "danger",
    patterns: [/\bTHC\b/, /tetrahydrocannabinol/i, /テトラヒドロカンナビノール/, /四氢大麻酚/],
    msg: {
      ja: "THCは日本では麻薬として規制されています。持ち込み・所持は違法になる可能性があります。",
      en: "THC is a controlled narcotic in Japan. Bringing in or possessing it may be illegal.",
      zh: "THC在日本作为麻醉品受到管制，携带或持有可能违法。",
      ko: "THC는 일본에서 마약으로 규제됩니다. 반입·소지가 불법이 될 수 있습니다.",
    },
  },
  {
    id: "cbd",
    level: "caution",
    patterns: [/\bCBD\b/, /cannabidiol/i, /カンナビジオール/, /大麻二酚/, /hemp extract/i],
    msg: {
      ja: "CBD製品は、THCが基準値を超えて含まれると日本では違法になります。海外製は成分分析書（COA）で確認してください。",
      en: "CBD products are illegal in Japan if THC exceeds the legal limit. Check the certificate of analysis for imported products.",
      zh: "CBD产品若THC超过日本标准即属违法，海外产品请查看成分分析证书（COA）。",
      ko: "CBD 제품은 THC가 기준치를 넘으면 일본에서 불법입니다. 해외 제품은 성분 분석서(COA)로 확인하세요.",
    },
  },
];

export function checkRules(ingredients, rawTexts = []) {
  const haystacks = [
    ...ingredients.flatMap((i) => [i.original, i.english, i.name]),
    ...rawTexts,
  ].filter(Boolean);
  const hits = [];
  for (const rule of RULES) {
    const matched = haystacks.find((h) => rule.patterns.some((p) => p.test(h)));
    if (matched) hits.push({ id: rule.id, level: rule.level, matched, msg: rule.msg });
  }
  return hits;
}
