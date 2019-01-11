/**
 * @file app.js
 * @author caixiaowen  zhuyeqing
 */

import express from 'express';
import cheerio from 'cheerio';
import superagent from 'superagent';
import fs from 'fs';
import path from 'path';
import {DICT} from './config.js';
import {blacklist} from './blacklist.js';

const {
    host,
    mainPage,
    categoryList,
    categoryName,
    apiList,
    apiHtml,
    urlProp,
    paramTable,
    apiTitle,
    apiParamTable,
    paramColumn,
    typeColumn,
    neccessColumn,
    fileName
} = DICT;

const app = express();

let apiData = [];
let html;

function requestContent() {
    return new Promise((resolve, reject) => {
        // 请求主页面
        superagent.get(host + mainPage)

        // 获取到页面数据
        .end((err, sres) => {
            if (err) {
                reject();
            }
            // cheerio解析页面数据
            let $ = cheerio.load(sres.text);
            html = $.html();
            resolve();
        });
    });
}

// 第一步：从sidebar的nav栏抓取API分类 && API名称 && API URL
function findApi() {
    return new Promise((resolve, reject) => {
        let $ = cheerio.load(html);

        // API主列表，内含分类名以及所有API
        let categories = $(categoryList);

        // 获取API分类名称 && API名称 && API URL
        categories.each((i, ele) => {
            // 分类名称
            let eleItem = $(ele).find(categoryName);

            // 存放多个API的信息
            let item = [];
            // 每个分类下的子分类列表
            let apis = $(ele).find(apiList);

            $(apis).each((i, ele) => {

                // 子分类
                let subCategory = $(ele).children().first().text();

                // 判断子分类是否需要被过滤
                if (filterSubcategoryFlag(subCategory)) {
                    return false;
                }

                // 每个子分类下API的a标签列表
                let api = $(ele).find(apiHtml);

                $(api).each((i, ele) => {
                    let apiName = $(ele).text();
                    let apiUrl = $(ele).attr(urlProp);
                    // 获取API参数使用的id
                    let id = apiUrl.match(/\#(\S+)\//)[1];

                    // 判断API名字是否需要被过滤
                    if (filterApiFlag(apiName)) {
                        return;
                    }

                    item.push({

                        // 子分类名称
                        subCategory,

                        // API名称
                        apiName: modifyApiName(apiName),

                        // API URL
                        apiUrl,

                        id,

                        // 下一步中存放参数相关信息
                        param: []
                    });

                });
            });

            // 存入apiData中
            apiData.push({
                categoryName: eleItem.text(),
                content: item
            });
        });
        resolve();
    });
}

// 过滤子目录
function filterSubcategoryFlag(name) {
    return blacklist.subCategory.includes(name);
}

// 过滤API的名字
function filterApiFlag(name) {

    // 分别过滤的是黑名单的API 含有点的API
    return blacklist.apiName.includes(name) || /\./g.test(name);
}

// 修改API的名字
function modifyApiName(name) {
    name = /\(.*\)/g.test(name) ? name.replace(/\(.*\)/g, '') : name;
    return name;
}

// 第二步：抓取参数 && 类型 && 是否必需
function getParams() {
    return new Promise((resolve, reject) => {
        // TODO 需要并行请求，否则没有内容
        apiData.forEach(eachCategory => {
            let apis = eachCategory.content;
            apis.forEach(eachApi => {
                let id = eachApi.id;

                let $ = cheerio.load(html);
                let $el = $('#' + id);



                // API参数的标题名称
                let paramObjTit = ['Object参数说明', 'OBJECT参数说明', 'Object参数', 'options参数说明', '参数说明'];

                let hasTable = $el.html();

                // let title = hasTable.first().prev().find('strong').text();

                // 删掉冒号和空格
                // title = title.replace(/\：|\:|\s/g, '');

                // 从表格读取参数
                // 判断是否有表格 且 第一个表格前一个相邻元素的标题是否是paramObjName中的一个
                // if (hasTable && paramObjTit.includes(title)) {
                //     let par = {};
                //     hasTable.first().find(paramTable).each((index, element) => {
                //         let $param = $(element).find(paramColumn);
                //         let $type = $(element).find(typeColumn);
                //         let $neccess = $(element).find(neccessColumn);
                //         par = {
                //             name: $param.text(),
                //             type: $type.text(),
                //             required: $neccess.text()
                //         };
                //         element.param.push(par);
                //     });
                // }
            });
        });
        resolve();
    });
}



app.get('/', (req, res) => {
    res.send('开始读取数据');

    requestContent()

    // 第一步：从页面nav栏中抓取API分类 && API名称 && API URL
    .then(() => findApi())


    // 第二步：抓取所有API各自的参数及详情
    .then(() => getParams())

    // 第四步：将数据写入文件
    .then(() => {
        fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(apiData, null, 2));
        console.log(105, '写入文件成功');
    }).catch(err => {
        throw err;
    });
}).listen(8811);

