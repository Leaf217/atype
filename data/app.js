/**
 * @file app.js
 * @author caixiaowen
 */

import express from 'express';
import cheerio from 'cheerio';
import superagent from 'superagent';
import mapLimit from 'async/mapLimit';
import fs from 'fs';
import path from 'path';
import {DICT} from './config.js';
const {
    host,
    mainPage,
    categoryClass,
    apiTable,
    paramTable,
    apiHtml,
    apiTitle,
    apiParamTable,
    paramColumn,
    neccessColumn,
    urlProp,
    fileName
} = DICT;
const app = express();

let apiData = [];

// 第一步：从页面的chapter栏抓取API下各个分类
function findApiCaterioges() {
    return new Promise(resolve => {
        superagent.get(host + mainPage) // 请求页面地址
        .end((err, sres) => { // 页面获取到的数据
            if (err) {
                throw err;
            }

            let $ = cheerio.load(sres.text); // 用cheerio解析页面数据
            let $api = $(categoryClass);

            $api.each((index, element) => {
                let $eleItem = $(element).find(apiHtml);
                apiData.push({
                    title: $eleItem.attr(urlProp),
                    content: []
                });
            });
            resolve();
        });
    });
}

// 第二步：依次抓取每个分类下的所有API
function findApi() {
    return new Promise(resolve => {
        // 并发处理多个请求
        mapLimit(apiData, 100, (category, callback) => {
            superagent.get(host + category.title)
            .end((err, sres) => {
                let item = [];
                if (err) {
                    throw err;
                }

                let $ = cheerio.load(sres.text);
                $(apiTable).each((index, element) => {
                    let $el = $(element).find(apiHtml);
                    let it = {
                        title: $el.text(),
                        href: $el.attr(urlProp),
                        param: []
                    };
                    item.push(it);
                });
                category.content = item;
                callback();
            });
        }, err => {
            if (err) {
                throw err;
            }
            resolve();
        });
    });
}

// 判断是否必需参数
function isNeccessParam($, obj) {
    // 文档中唯一一条例外数据
    if (obj.title === 'requestPolymerPayment 百度电商开放平台：产品介绍') {
        obj.title = 'requestPolymerPayment';
    }
    let title = obj.title;
    // 特殊符号需转成'-'，首尾不要有特殊符号
    let p = /[\.\,\(\)]/g;
    if (p.test(title)) {
        title = title.replace(p, '-');
        let p3 = /[\-*]$/g;
        while (p3.test(title)) {
            title = title.replace(p3, '');
        }
        let p2 = /[\[\]\ ]/g;
        if (p2.test(title)) {
            title = title.replace(p2, '');
        }
    }
    let $el = $('#' + title);
    // API为h2标题
    let hasH2 = $el.nextAll().filter(apiTitle);
    let $hasTable;
    if (hasH2) {
        // API为h2标题时，需保证不受下面其他API的影响
        $hasTable = $el.nextUntil(apiTitle).filter(apiParamTable);
    }
    else {
        $hasTable = $el.nextAll().filter(apiParamTable);
    }
    // 参数描述写在表格中，所以从表格读取
    if ($hasTable) {
        let par = [];
        $hasTable.first().find(paramTable).each((index, element) => {
            let $param = $(element).find(paramColumn);
            let $neccess = $(element).find(neccessColumn);
            if ($neccess.text() === '是') {
                par.push($param.text());
            }
        });
        obj.param = par;
    }
    return obj;
}

// 读取单个API的必需参数
function findParamOfApi(content) {
    return new Promise(resolve => {
        mapLimit(content, 100, (api, callback) => {
            superagent.get(api.href)
            .end((err, sres) => {
                if (err) {
                    throw err;
                }

                let $ = cheerio.load(sres.text);
                // 判断是否必需参数
                api = isNeccessParam($, api);
                callback();
            });
        }, err => {
            if (err) {
                throw err;
            }
            resolve();
        });
    });
}

// 第三步：遍历所有API各自的必需参数
function mapApiForParam() {
    let allApi = [];
    let len = apiData.length;
    for (let i = 0; i < len; i++) {
        // 挨个读取API的必需参数
        allApi.push(findParamOfApi(apiData[i].content));
    }
    // 必须等到数据全部抓完才返回结果
    return Promise.all(allApi);
}

app.get('/', (req, res) => {
    res.send('开始读取数据');
    // 第一步：从页面的chapter栏抓取API下各个分类
    findApiCaterioges()
    // 第二步：抓取每个分类下的所有API
    .then(() => findApi())
     // 第三步：抓取所有API各自的必需参数
    .then(() => mapApiForParam())
    .then(() => {
        // 第四步：将数据写入文件
        fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(apiData, null, 2));
        console.log(105, '写入文件成功');
    }).catch(err => {
        throw err;
    });
}).listen(8811);
