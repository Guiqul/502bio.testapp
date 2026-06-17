# 502bio.testapp

现代生物基础 / 生命科学导论在线随机题库系统。

在线访问：https://guiqul.github.io/502bio.testapp/

## 分支说明

- `main`：项目主分支，保存源码、题库、文档和投稿流程。
- `gh-pages`：网页发布分支，GitHub Pages 使用这个分支发布在线题库。

## 功能

- 229 道综合题库。
- 支持按章节选择题库。
- 支持随机、顺序、重点题、错题本练习。
- 随机练题采用洗牌队列，一轮未结束前尽量不重复出题。
- 提交后显示标准答案和解析。
- 仅在练习中答对后自动跳转下一题，答错和回看不会自动跳题。
- 已做题回看和错题复习。
- 所有练习记录保存在使用者自己的浏览器本地，不需要登录，也不会互相干扰。

## Word 文档位置

所有整理好的 Word 文档都放在仓库的 `docs/` 文件夹里：

- 题库 Word 版：`docs/complete-question-bank-with-answers.docx`  
  GitHub 链接：https://github.com/Guiqul/502bio.testapp/blob/main/docs/complete-question-bank-with-answers.docx

- 课后题答案：`docs/after-class-question-answers.docx`  
  GitHub 链接：https://github.com/Guiqul/502bio.testapp/blob/main/docs/after-class-question-answers.docx

- 第 1-9 章重点总结：`docs/chapter-1-9-key-points-summary.docx`  
  GitHub 链接：https://github.com/Guiqul/502bio.testapp/blob/main/docs/chapter-1-9-key-points-summary.docx

## 其他文件

- `questions.json` / `questions.js`：网页使用的题库数据。
- `data/base_questions.json`：基础题库。
- `contributions/`：社区投稿题目。
- `scripts/build_question_bank.py`：题库校验与自动生成脚本。

## 投稿新题

本项目开源，欢迎投稿新题。为了保证题库质量，新题不会直接进入线上题库，必须通过 Pull Request，由维护者审核同意并合并。

合并后，GitHub Actions 会自动重建 `questions.json` 和 `questions.js`，并发布到 GitHub Pages。

详细格式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
