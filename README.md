# IP 灵感库

面向影视 AIGC 和 AI＋IP 学习账号的选题与短视频脚本工作台。

## 在线使用

[打开 IP 灵感库](https://dual-track-content-studio.c821201838.chatgpt.site)

登录后点击「连接 OpenAI」，填写自己的 API Key 即可生成；也可切换「模板试用」体验流程。

本仓库保存项目源代码。上传代码到 GitHub 与部署网站是两个步骤：当前在线版本由 Sites 托管。这个项目需要服务端和 D1 数据库，不能直接作为纯静态 GitHub Pages 页面运行。

## 使用流程

1. 登录，编辑账号名称、目标用户、定位、内容支柱、人设和语气。
2. 连接 OpenAI，填写自己的 API Key 和支持 Responses、结构化输出的模型（默认 `gpt-5.4-mini`）。密钥仅保留在当前页面内存，刷新后需重新填写。
3. 选择 6、8 或 10 个选题。可以输入内容方向、真实笔记，也可以直接按账号画像生成。
4. 选择题目，生成并编辑开头钩子、正文结构、完整口播、结尾互动和发布文案。
5. 保存到内容库，之后可重新打开、继续编辑或复制全文。

没有 API Key 时，可主动切换「模板试用」。模板采用固定结构，不会伪装为 AI 生成。未知的个人事实保留「待补充」。

## 数据与密钥

- D1 按登录用户隔离账号画像、最近一批选题和已保存脚本。
- 每个账号保留最近一批已保存选题；重新生成会替换这一批。内容库保留手动保存的脚本历史。
- 生成会参考该账号最近 15 个已保存标题，以减少重复选题。
- 密钥经同源服务转发到固定的 `https://api.openai.com/v1/responses`，不写入数据库、浏览器存储、提示词或日志。调用设置 `store: false`。
- 用户主动点击生成时，账号画像、素材、历史标题和所选题目会发送到 OpenAI；调用使用用户自己的 API 额度。
- 登录跳转前仅临时保存当前输入、选题、草稿及未提交的账号定位；不保存密钥。未保存内容替换前会确认。
- OpenAI 超时、拒绝、输出缺失或格式错误会显示错误并保留原内容；不会静默退回模板。

## 开发与验证

Node.js 22.13+，沿用现有 Vinext、Cloudflare Workers、D1 和 npm 依赖。

```sh
npm run dev
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/generation.test.mjs
npm run build
```

`tests/storage.integration.mjs` 只接受本地地址。对构建后的 Worker 运行，使用独立测试用户请求头，不修改浏览器登录状态：

```sh
npm start
TEST_ORIGIN=http://127.0.0.1:8787 node --experimental-strip-types tests/storage.integration.mjs
```

开发服务器会剥离直接传入的身份头，因此存储集成检查使用构建后的本地 Worker。测试创建独立的 `test-ip-studio-` 用户记录，不会覆盖现有用户内容。

D1 迁移由 Drizzle 管理。`0001_blushing_masked_marvel.sql` 为已有账号增加画像字段并新增选题池，不修改旧草稿。已有迁移不可重放或修改。

```sh
npm run db:generate
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_blushing_masked_marvel.sql
```

本地验证通过不代表真实 OpenAI 账号调用通过；真实调用需要用户在页面中填写自己的有效 API Key。

## 接口

- `/api/profiles`：账号画像读取与保存
- `/api/topics`：每账号最近一批选题读取与保存
- `/api/drafts`：内容库读取、脚本新增和更新
- `/api/generate`：登录后调用 OpenAI；只返回生成结果，保存由用户流程完成

浏览器 WebMCP 保留 `get_content_workspace` 和 `generate_topic_options`。后者明确使用模板，不调用 OpenAI、不保存，并拒绝覆盖未保存的内容。

## 参考

需求来自用户提供的 [小工具项目说明](https://chatgpt.com/share/6aa9289b-b8fc-83ec-9534-66c6df25a9a7)。
接口依据 [OpenAI 结构化输出文档](https://developers.openai.com/api/docs/guides/structured-outputs) 与 [GPT-5.4 mini 模型文档](https://developers.openai.com/api/docs/models/gpt-5.4-mini)。

## 开源许可

本项目原创部分采用 [MIT 许可证](LICENSE)。你可以在保留版权和许可声明的条件下使用、修改、分发和商用。第三方组件与依赖保留各自的许可证及版权声明；随附声明见 `vendor/` 与 `build/`。
