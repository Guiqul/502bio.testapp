# 贡献新题

欢迎给题库补充新题。为了防止题库被随意改坏，线上题库不会接受直接写入，必须通过 GitHub Pull Request，由仓库维护者审核同意后合并。

## 推荐流程

1. Fork 本仓库。
2. 在 `contributions/` 目录中新建一个 `.json` 文件，例如 `contributions/chapter-2-extra.json`。
3. 参考 `contributions/new-question.example.json` 填写题目。
4. 提交 Pull Request。
5. 自动校验通过后，等待维护者审核。维护者同意并合并后，题库会自动重建并发布到网页。

## 题目格式

```json
{
  "questions": [
    {
      "chapter": "第二章 生命的化学基础",
      "type": "single",
      "prompt": "自然界中存在的葡萄糖的构象主要是？",
      "options": ["为D型、L型两种构象", "为L型构象", "为D型构象", "上述均不对"],
      "answer": "C",
      "explanation": "天然存在并被生物体主要利用的葡萄糖通常为D-葡萄糖。",
      "tags": ["糖类", "易错题"],
      "priority": true,
      "mistake": true,
      "source": "题目来源"
    }
  ]
}
```

## 字段说明

- `chapter`：章节或题库名称。
- `type`：题型，支持 `single`、`multi`、`tf`、`short`。
- `prompt`：题干。
- `options`：选择题选项。判断题和简答题可以不填。
- `answer`：答案。选择题可写选项文字，也可写 `A/B/C/D`；多选题可写数组。
- `explanation`：简要解析。
- `tags`：标签，可选。
- `priority`：是否重点题，可选。
- `mistake`：是否易错题，可选。
- `source`：来源说明，可选但建议填写。
