// node-sdk使用说明：https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/server-side-sdk/nodejs-sdk/preparation-before-development
const lark = require('@larksuiteoapi/node-sdk');
const Bottleneck = require("bottleneck");

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 25,
});

const LARK_APP_ID = process.env.LARK_APP_ID
const LARK_APP_SECRET = process.env.LARK_APP_SECRET

const BITABLE_APP_TOKEN = process.env.BITABLE_APP_TOKEN
const BITABLE_TABLE_ID = process.env.BITABLE_TABLE_ID

// 开发者复制该Demo后，需要修改Demo里面的"app id", "app secret"为自己应用的appId, appSecret
const client = new lark.Client({
  appId: LARK_APP_ID,
  appSecret: LARK_APP_SECRET,
  disableTokenCache: false
});

function toStatsFieldValue(record) {
  return {
    "项目名称": record.projectName,
    "项目ID": record.projectId,
    "作者": record.author,
    "提交数": record.commits,
    "新增行数": record.additions,
    "删除行数": record.deletions,
    "年月": record.yearMonth
  }
}

function toMultipleStatsFieldValue(records) {
  return records.map(r => {
    return {
      fields: toStatsFieldValue(r)
    }
  })
}

/**
 * 将 git 项目的统计数据插入到飞书表格中
 * 
 * @param {Object} record 包含 git 修改统计数据的对象
 * @returns {Promise<Object>} 插入记录的结果
 */
async function insertStatsRecord(record) {
  // 使用飞书 bitable API 创建记录
  // 该 API 需要指定应用表格的 token 和表格 ID
  // 数据以 fields 属性中的 Map 对象形式传递，每个字段对应表格中的一列
  return client.bitable.appTableRecord.create({
    path: {
      app_token: BITABLE_APP_TOKEN,
      table_id: BITABLE_TABLE_ID,
    },
    data: {
      fields: toStatsFieldValue(record)
    }
  })
}

async function batchInsertStatsRecords(records) {
  return client.bitable.appTableRecord.batchCreate({
    path: {
      app_token: BITABLE_APP_TOKEN,
      table_id: BITABLE_TABLE_ID,
    },
    data: {
      records: toMultipleStatsFieldValue(records)
    }
  })
}

// 使用限流器来包装 insertStatsRecord 方法
const limitedInsertStatsRecord = limiter.wrap(insertStatsRecord);

const limitedbatchInsertStatsRecords = limiter.wrap(batchInsertStatsRecords);

module.exports = { insertStatsRecord, batchInsertStatsRecords, limitedInsertStatsRecord, limitedbatchInsertStatsRecords } 