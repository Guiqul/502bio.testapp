# 502bio.testapp

现代生物基础 / 生命科学导论在线随机题库系统。

在线访问：https://guiqul.github.io/502bio.testapp/

## 功能

- 229 道综合题库
- 按章节选择题库
- 随机、顺序、重点题、错题本练习
- 提交后显示标准答案和解析
- 仅在练习中答对后自动跳转下一题，答错和回看不会自动跳题
- 已做题回看和错题复习
- 所有练习记录保存在使用者自己的浏览器本地，不需要登录，也不会互相干扰

## 文件

- `questions.json` / `questions.js`：网页使用的题库数据
- `data/base_questions.json`：基础题库
- `contributions/`：社区投稿题目
- `docs/complete-question-bank-with-answers.docx`：整理出的综合题库 Word 文档

## 投稿新题

本项目开源，欢迎投稿新题。为了保证题库质量，新题不会直接进入线上题库，必须通过 Pull Request，由维护者审核同意并合并。

合并后，GitHub Actions 会自动重建 `questions.json` 和 `questions.js`，并发布到 GitHub Pages。

详细格式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
