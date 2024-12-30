# GitLab代码统计工具

## 项目简介
这是一个用于统计GitLab项目代码提交数据的工具，可以收集指定项目在特定时间段内的代码变更统计信息，并将结果保存到飞书多维表格（Bitable）中。

## 主要功能
- 统计指定GitLab项目的代码提交数据
- 支持按年份查询统计数据
- 区分前端和非前端项目的统计方式
- 统计数据包括：
  - 提交次数
  - 代码增加行数
  - 代码删除行数
  - 按作者统计
  - 按月份汇总

## 运行步骤

1. 环境准备
   - 确保已安装 Node.js (建议版本 >= 14)
   - 克隆项目到本地

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置环境变量
   - 在项目根目录创建 `.env` 文件
   - 添加以下配置:
   ```
   GITLAB_SESSION=<你的GitLab会话token>
   GITLAB_URL=<GitLab服务器地址>
   LARK_APP_ID=<飞书应用ID>
   LARK_APP_SECRET=<飞书应用密钥>
   LARK_BITABLE_APP_TOKEN=<飞书多维表格应用Token>
   ```

4. 获取必要的访问凭证
   - GitLab会话token: 从浏览器登录GitLab后获取Cookie中的 `_gitlab_session` 值
   - 飞书相关配置: 从飞书开发者平台获取应用凭证

5. 运行程序
   - 按照使用方法章节的说明执行命令
   - 确保所有环境变量配置正确


## 使用方法

```bash
node src/index.js projectIds=<projectId> [-y=<year>]
```

### 参数说明
- `projectIds`：必填，GitLab项目ID，支持多个项目（用逗号分隔）
- `year`：可选，统计年份，默认为当前年份

### 示例
```bash
# 统计单个项目当年数据
node src/index.js projectIds=12345

# 统计多个项目2023年数据
node src/index.js projectIds=12345,67890 -y=2023
```
