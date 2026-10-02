window.HKLife=window.HKLife||{};
HKLife.PUNCTUATION_CATALOG={
  "tokenKinds": {
    "period": {
      "glyph": "。",
      "label": "句点",
      "physical": {
        "weight": 0.35,
        "elasticity": 0.6,
        "buoyancy": 0.55
      }
    },
    "comma": {
      "glyph": "、",
      "label": "読点",
      "physical": {
        "weight": 0.18,
        "elasticity": 0.25,
        "buoyancy": 0.65
      }
    },
    "dakuten": {
      "glyph": "゛",
      "label": "濁点",
      "physical": {
        "weight": 0.22,
        "elasticity": 0.4,
        "buoyancy": 0.5
      }
    },
    "handakuten": {
      "glyph": "゜",
      "label": "半濁点",
      "physical": {
        "weight": 0.25,
        "elasticity": 0.75,
        "buoyancy": 0.8
      }
    }
  },
  "pocInterpretations": {
    "period": [
      {
        "id": "ball",
        "label": "ボール",
        "contexts": [
          "playable"
        ],
        "actorBias": {
          "愛": 0.5,
          "移": 0.4
        }
      },
      {
        "id": "egg",
        "label": "卵",
        "contexts": [
          "quiet"
        ],
        "actorBias": {
          "仁": 0.3
        }
      },
      {
        "id": "seed",
        "label": "種",
        "contexts": [
          "diggable"
        ],
        "actorBias": {
          "意": 0.15
        }
      },
      {
        "id": "stone",
        "label": "石ころ",
        "contexts": [
          "walkable"
        ],
        "actorBias": {
          "惡": 0.2
        }
      }
    ],
    "comma": [
      {
        "id": "leaf",
        "label": "葉っぱ",
        "contexts": [
          "walkable"
        ],
        "actorBias": {
          "隱": 0.25
        }
      },
      {
        "id": "tear",
        "label": "涙",
        "contexts": [
          "social"
        ],
        "actorBias": {
          "仁": 0.45
        }
      },
      {
        "id": "tail",
        "label": "しっぽ",
        "contexts": [
          "playable"
        ],
        "actorBias": {
          "希": 0.2
        }
      },
      {
        "id": "hook",
        "label": "針／鉤",
        "contexts": [
          "object"
        ],
        "actorBias": {
          "能": 0.2
        }
      }
    ]
  },
  "transformRules": [
    {
      "inputs": [
        "comma",
        "comma"
      ],
      "output": "dakuten",
      "id": "two-commas-to-dakuten",
      "enabled": false
    },
    {
      "inputs": [
        "period"
      ],
      "output": "handakuten",
      "id": "period-to-handakuten",
      "enabled": false
    }
  ]
};
